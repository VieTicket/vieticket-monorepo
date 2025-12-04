"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { authClient } from "@/lib/auth/auth-client";

// Define types locally to avoid import issues for now
export interface UserBehavior {
  searchQueries: string[];
  viewedEvents: Array<{
    id: string;
    title: string;
    description?: string;
    category?: string;
    location?: string;
    price?: number;
    timestamp: number;
  }>;
  clickedEvents: Array<{
    id: string;
    title: string;
    description?: string;
    category?: string;
    timestamp: number;
  }>;
  // NEW: Detailed engagement tracking
  eventEngagement: Array<{
    eventId: string;
    eventTitle: string;
    category?: string;
    location?: string;
    price?: number;
    timeSpent: number; // seconds spent on event details page
    engagementDepth: number; // 0-1 score (scroll, interactions, etc.)
    timestamp: number;
    source: "list" | "search" | "recommendation"; // How they found the event
  }>;
  preferences: {
    categories: string[];
    priceRange: { min: number; max: number };
    locations: string[];
    dateRanges: string[]; // Track preferred date ranges like "today", "this-week", "this-month"
    // Timestamps to track when each filter was last applied (for recency-based prioritization)
    filterTimestamps?: {
      price?: number; // Last time price filter was applied
      location?: number; // Last time location filter was applied
      category?: number; // Last time category filter was applied
    };
  };
}

export interface EventForRecommendation {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  price?: number;
  poster_url?: string;
  created_at?: string;
}

export interface RecommendationResult {
  event: EventForRecommendation;
  score: number;
  reason: string;
}

const STORAGE_KEYS = {
  USER_BEHAVIOR: "vieticket_user_behavior",
  RECOMMENDATIONS: "vieticket_recommendations",
  LAST_UPDATE: "vieticket_last_update",
} as const;

// Function to get user-specific storage keys
const getUserStorageKeys = (userId: string | null) => {
  const userSuffix = userId ? `_${userId}` : "_anonymous";
  return {
    USER_BEHAVIOR: `${STORAGE_KEYS.USER_BEHAVIOR}${userSuffix}`,
    RECOMMENDATIONS: `${STORAGE_KEYS.RECOMMENDATIONS}${userSuffix}`,
    LAST_UPDATE: `${STORAGE_KEYS.LAST_UPDATE}${userSuffix}`,
    BEHAVIOR_HASH: `vieticket_behavior_hash${userSuffix}`,
  };
};

/**
 * Hook to track user behavior and store in localStorage per user
 */
export function useUserTracking() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || null;

  // Memoize storage keys to prevent re-creation on every render
  const userStorageKeys = useMemo(() => getUserStorageKeys(userId), [userId]);

  // Debug: Log user context for AI personalization (reduced frequency)
  if (Math.random() < 0.1) {
    // Only log 10% of the time to reduce noise
    console.log("🧑‍💻 AI Personalization User Context:", {
      userId: userId || "anonymous",
      isAuthenticated: !!session?.user,
      userRole: session?.user?.role || "none",
    });
  }

  const [userBehavior, setUserBehavior] = useState<UserBehavior>(() => {
    if (typeof window === "undefined") return getDefaultBehavior();

    try {
      const keys = getUserStorageKeys(userId);
      const stored = localStorage.getItem(keys.USER_BEHAVIOR);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure backward compatibility - add missing fields
        if (!parsed.eventEngagement) {
          parsed.eventEngagement = [];
        }
        if (!parsed.preferences) {
          parsed.preferences = {
            categories: [],
            priceRange: { min: 0, max: 10000000 },
            locations: [],
            dateRanges: [],
          };
        } else {
          // Add missing dateRanges field to existing preferences
          if (!parsed.preferences.dateRanges) {
            parsed.preferences.dateRanges = [];
          }
        }
        return parsed;
      }
      return getDefaultBehavior();
    } catch {
      return getDefaultBehavior();
    }
  });

  // Clear data when user changes (logout/login with different user)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // If user changed, attempt to hydrate behavior for the new user from localStorage
      const lastUserId = localStorage.getItem("vieticket_last_user_id");
      const currentUserId = userId || "anonymous";

      if (lastUserId && lastUserId !== currentUserId) {
        // Instead of wiping behavior, try to load the stored behavior for the current user so
        // switching between accounts preserves per-user data.
        try {
          const keys = getUserStorageKeys(userId);
          const stored = localStorage.getItem(keys.USER_BEHAVIOR);
          if (stored) {
            const parsed = JSON.parse(stored);
            // Ensure shape compatibility
            if (!parsed.eventEngagement) parsed.eventEngagement = [];
            if (!parsed.preferences) {
              parsed.preferences = {
                categories: [],
                priceRange: { min: 0, max: 10000000 },
                locations: [],
                dateRanges: [],
              };
            } else if (!parsed.preferences.dateRanges) {
              parsed.preferences.dateRanges = [];
            }
            setUserBehavior(parsed);
            console.log(
              "👤 User switched from",
              lastUserId,
              "to",
              currentUserId,
              "- hydrated behavior from localStorage"
            );
          } else {
            // No stored behavior for new user, reset to default
            console.log(
              "👤 User switched from",
              lastUserId,
              "to",
              currentUserId,
              "- no stored behavior, using default"
            );
            setUserBehavior(getDefaultBehavior());
          }
        } catch (err) {
          console.error("Failed to hydrate behavior for new user:", err);
          setUserBehavior(getDefaultBehavior());
        }
      }

      // Persist last user id
      localStorage.setItem("vieticket_last_user_id", currentUserId);
    }
  }, [userId]);

  // Use ref to track previous behavior để avoid infinite loops
  const prevBehaviorRef = useRef<string>("");

  // Save to localStorage whenever behavior changes (with user-specific key)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Serialize current behavior để compare
    const currentBehaviorString = JSON.stringify(userBehavior);

    // Only save if behavior actually changed
    if (currentBehaviorString !== prevBehaviorRef.current) {
      try {
        // Only log occasionally to reduce noise
        if (Math.random() < 0.2) {
          console.log("💾 Saving user behavior to localStorage:", {
            userId: userId || "anonymous",
            searches: userBehavior.searchQueries.length,
            views: userBehavior.viewedEvents.length,
            clicks: userBehavior.clickedEvents.length,
            engagements: userBehavior.eventEngagement.length,
          });
        }

        // Get fresh storage keys to avoid stale references
        const keys = getUserStorageKeys(userId);
        localStorage.setItem(keys.USER_BEHAVIOR, currentBehaviorString);
        localStorage.setItem(keys.LAST_UPDATE, Date.now().toString());

        // Update ref to current value
        prevBehaviorRef.current = currentBehaviorString;
      } catch (error) {
        console.error("Failed to save user behavior:", error);
      }
    }
  }, [userBehavior, userId]); // Remove userStorageKeys from dependencies

  const trackSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    const trimmedQuery = query.trim();
    
    setUserBehavior((prev: UserBehavior) => {
      // Remove duplicate if exists (to track recency)
      const filteredQueries = prev.searchQueries.filter(q => q !== trimmedQuery);
      
      return {
        ...prev,
        searchQueries: [
          ...filteredQueries.slice(-99), // Keep last 100 queries for better AI analysis
          trimmedQuery,
        ],
      };
    });
  }, []);

  const trackEventView = useCallback(
    (event: {
      id: string;
      title: string;
      description?: string;
      category?: string;
      location?: string;
      price?: number;
    }) => {
      setUserBehavior((prev: UserBehavior) => {
        const newViewedEvent = {
          ...event,
          timestamp: Date.now(),
        };

        // Remove duplicate if exists, then add to end
        const filteredEvents = prev.viewedEvents.filter(
          (e: any) => e.id !== event.id
        );

        return {
          ...prev,
          viewedEvents: [
            ...filteredEvents.slice(-49), // Keep last 50 viewed events
            newViewedEvent,
          ],
          preferences: {
            ...prev.preferences,
            categories: event.category
              ? updatePreferenceArray(
                  prev.preferences.categories,
                  event.category
                )
              : prev.preferences.categories,
            locations: event.location
              ? updatePreferenceArray(
                  prev.preferences.locations,
                  event.location
                )
              : prev.preferences.locations,
            priceRange: event.price
              ? updatePriceRange(prev.preferences.priceRange, event.price)
              : prev.preferences.priceRange,
          },
        };
      });
    },
    []
  );

  const trackEventClick = useCallback(
    (event: {
      id: string;
      title: string;
      description?: string;
      category?: string;
    }) => {
      setUserBehavior((prev: UserBehavior) => {
        const newClickedEvent = {
          ...event,
          timestamp: Date.now(),
        };

        // Remove duplicate if exists, then add to end
        const filteredEvents = prev.clickedEvents.filter(
          (e: any) => e.id !== event.id
        );

        return {
          ...prev,
          clickedEvents: [
            ...filteredEvents.slice(-49), // Keep last 50 clicked events
            newClickedEvent,
          ],
          preferences: {
            ...prev.preferences,
            categories: event.category
              ? updatePreferenceArray(
                  prev.preferences.categories,
                  event.category
                )
              : prev.preferences.categories,
          },
        };
      });
    },
    []
  );

  // NEW: Track detailed engagement on event details page
  const trackEventEngagement = useCallback(
    (engagement: {
      eventId: string;
      eventTitle: string;
      category?: string;
      location?: string;
      price?: number;
      timeSpent: number; // seconds
      engagementDepth: number; // 0-1 score
      source?: "list" | "search" | "recommendation";
    }) => {
      setUserBehavior((prev: UserBehavior) => {
        const newEngagement = {
          ...engagement,
          source: engagement.source || "list",
          timestamp: Date.now(),
        };

        // Remove old engagement for same event, add new one
        const filteredEngagements = prev.eventEngagement.filter(
          (e) => e.eventId !== engagement.eventId
        );

        return {
          ...prev,
          eventEngagement: [
            ...filteredEngagements.slice(-49), // Keep last 50 engagements for better analysis
            newEngagement,
          ],
          preferences: {
            ...prev.preferences,
            categories: engagement.category
              ? updatePreferenceArray(
                  prev.preferences.categories,
                  engagement.category
                )
              : prev.preferences.categories,
            locations: engagement.location
              ? updatePreferenceArray(
                  prev.preferences.locations,
                  engagement.location
                )
              : prev.preferences.locations,
            priceRange: engagement.price
              ? updatePriceRange(prev.preferences.priceRange, engagement.price)
              : prev.preferences.priceRange,
          },
        };
      });
    },
    []
  );

  // NEW: Track filter selections to learn user preferences
  const trackFilterSelection = useCallback(
    (
      filterType: "location" | "category" | "price" | "date",
      value: string | { min: number; max: number }
    ) => {
      setUserBehavior((prev: UserBehavior) => {
        const updatedPreferences = { ...prev.preferences };

        if (
          filterType === "location" &&
          typeof value === "string" &&
          value !== "all"
        ) {
          updatedPreferences.locations = updatePreferenceArray(
            prev.preferences.locations,
            value
          );
          console.log("Tracked location filter:", value);
        } else if (
          filterType === "category" &&
          typeof value === "string" &&
          value !== "all"
        ) {
          updatedPreferences.categories = updatePreferenceArray(
            prev.preferences.categories,
            value
          );
          console.log("🏷️ Tracked category filter:", value);
        } else if (filterType === "price" && typeof value === "object") {
          updatedPreferences.priceRange = {
            min: Math.min(updatedPreferences.priceRange.min, value.min),
            max: Math.max(updatedPreferences.priceRange.max, value.max),
          };
          console.log("💰 Tracked price filter:", value);
        } else if (
          filterType === "date" &&
          typeof value === "string" &&
          value !== "all"
        ) {
          updatedPreferences.dateRanges = updatePreferenceArray(
            prev.preferences.dateRanges,
            value
          );
          console.log("📅 Tracked date filter:", value);
        }

        return {
          ...prev,
          preferences: updatedPreferences,
        };
      });
    },
    []
  ); // Empty dependencies to make it stable

  // NEW: Track multiple active filters simultaneously to maintain complete filter state
  const trackCurrentFilters = useCallback(
    (filters: {
      location?: string;
      category?: string;
      price?: string;
      date?: string;
    }) => {
      setUserBehavior((prev: UserBehavior) => {
        // IMPORTANT: Merge with existing preferences to retain history
        // Instead of resetting, we accumulate interests
        const updatedPreferences = { ...prev.preferences };

        // Track if any actual changes were made
        let hasChanges = false;

        // Initialize filterTimestamps if not exists
        if (!updatedPreferences.filterTimestamps) {
          updatedPreferences.filterTimestamps = {};
        }

        const now = Date.now();

        // Only add preferences for active filters
        if (filters.location && filters.location !== "all") {
          const newLocations = updatePreferenceArray(
            updatedPreferences.locations,
            filters.location
          );
          // Check if actually changed (new item added or moved to end)
          const actuallyChanged = JSON.stringify(newLocations) !== JSON.stringify(updatedPreferences.locations);
          if (actuallyChanged) hasChanges = true;
          
          updatedPreferences.locations = newLocations;
          // ALWAYS update timestamp, even if location already exists (tracks recency)
          updatedPreferences.filterTimestamps.location = now;
          console.log(
            "Location filter timestamp updated:",
            new Date(now).toISOString(),
            "- Current preferences:",
            newLocations
          );
        } else if (
          filters.location === "all" &&
          updatedPreferences.filterTimestamps.location
        ) {
          // Clear timestamp when filter is removed
          delete updatedPreferences.filterTimestamps.location;
          hasChanges = true;
          console.log("Location filter timestamp cleared (removed filter)");
        }

        if (filters.category && filters.category !== "all") {
          const newCategories = updatePreferenceArray(
            updatedPreferences.categories,
            filters.category
          );
          // Check if actually changed (new item added or moved to end)
          const actuallyChanged = JSON.stringify(newCategories) !== JSON.stringify(updatedPreferences.categories);
          if (actuallyChanged) hasChanges = true;
          
          updatedPreferences.categories = newCategories;
          // ALWAYS update timestamp, even if category already exists (tracks recency)
          updatedPreferences.filterTimestamps.category = now;
          console.log(
            "🏷️ Category filter timestamp updated:",
            new Date(now).toISOString(),
            "- Current preferences:",
            newCategories
          );
        } else if (
          filters.category === "all" &&
          updatedPreferences.filterTimestamps.category
        ) {
          // Clear timestamp when filter is removed
          delete updatedPreferences.filterTimestamps.category;
          hasChanges = true;
          console.log("🏷️ Category filter timestamp cleared (removed filter)");
        }

        if (filters.price && filters.price !== "all") {
          const [min, max] = filters.price.split("-").map(Number);
          if (min !== undefined && max !== undefined) {
            // Track the SPECIFIC price range user just selected (not expanded range)
            // This ensures recency tracking reflects actual user intent
            const priceRangeChanged = 
              updatedPreferences.priceRange.min !== min ||
              updatedPreferences.priceRange.max !== max;
            
            if (priceRangeChanged) {
              hasChanges = true;
              // Set to the EXACT range user selected (don't expand/accumulate)
              updatedPreferences.priceRange = { min, max };
            }
            
            // ALWAYS update timestamp when price filter is selected, even if same range
            updatedPreferences.filterTimestamps.price = now;
            console.log(
              "💰 Price filter timestamp updated:",
              new Date(now).toISOString(),
              "- Price range:",
              updatedPreferences.priceRange
            );
          }
        } else if (
          filters.price === "all" &&
          updatedPreferences.filterTimestamps.price
        ) {
          // Clear timestamp when filter is removed
          delete updatedPreferences.filterTimestamps.price;
          hasChanges = true;
          console.log("💰 Price filter timestamp cleared (removed filter)");
        }

        if (filters.date && filters.date !== "all") {
          const newDateRanges = updatePreferenceArray(
            updatedPreferences.dateRanges || [],
            filters.date
          );
          if (
            newDateRanges.length !==
            (updatedPreferences.dateRanges || []).length
          )
            hasChanges = true;
          updatedPreferences.dateRanges = newDateRanges;
        }

        // CRITICAL: Only invalidate cache if filters were ADDED or REMOVED (not just timestamp updates)
        // This allows recency bonus to work without forcing full AI recalculation every time
        const filterCountChanged =
          updatedPreferences.locations.length !==
            prev.preferences.locations.length ||
          updatedPreferences.categories.length !==
            prev.preferences.categories.length ||
          updatedPreferences.priceRange.min !==
            prev.preferences.priceRange.min ||
          updatedPreferences.priceRange.max !== prev.preferences.priceRange.max;

        if (hasChanges && filterCountChanged && typeof window !== "undefined") {
          try {
            const keys = getUserStorageKeys(userId);
            localStorage.removeItem(keys.RECOMMENDATIONS);
            localStorage.removeItem(keys.BEHAVIOR_HASH);
            console.log("🗑️ Cache invalidated due to filter addition/removal");
            console.log(
              "✅ Updated preferences:",
              JSON.stringify(
                {
                  categories: updatedPreferences.categories,
                  locations: updatedPreferences.locations,
                  priceRange: updatedPreferences.priceRange,
                  dateRanges: updatedPreferences.dateRanges,
                  timestamps: updatedPreferences.filterTimestamps,
                },
                null,
                2
              )
            );
          } catch (e) {
            console.warn("Failed to invalidate cache:", e);
          }
        } else if (hasChanges) {
          console.log(
            "⏰ Filter timestamps updated (cache preserved for performance)"
          );
        }

        return {
          ...prev,
          preferences: updatedPreferences,
        };
      });
    },
    [userId]
  ); // Add userId dependency

  const clearBehavior = useCallback(() => {
    setUserBehavior(getDefaultBehavior());
    if (typeof window !== "undefined") {
      // Remove user-specific keys
      try {
        const keys = getUserStorageKeys(userId);
        localStorage.removeItem(keys.USER_BEHAVIOR);
        localStorage.removeItem(keys.RECOMMENDATIONS);
        localStorage.removeItem(keys.LAST_UPDATE);
        localStorage.removeItem(keys.BEHAVIOR_HASH);
      } catch (e) {
        // Fallback to generic removals (shouldn't happen)
        localStorage.removeItem(STORAGE_KEYS.USER_BEHAVIOR);
        localStorage.removeItem(STORAGE_KEYS.RECOMMENDATIONS);
        localStorage.removeItem(STORAGE_KEYS.LAST_UPDATE);
      }
    }
  }, []);

  return {
    userBehavior,
    trackSearch,
    trackEventView,
    trackEventClick,
    trackEventEngagement,
    trackFilterSelection, // Add new function
    trackCurrentFilters, // Add complete filter tracking function
    clearBehavior,
  };
}

/**
 * Hook to get AI-powered recommendations with user-specific storage
 */
export function useAIRecommendations() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || null;

  // Memoize storage keys to prevent re-creation on every render
  const userStorageKeys = useMemo(() => getUserStorageKeys(userId), [userId]);

  const [recommendations, setRecommendations] = useState<
    RecommendationResult[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, hydrate recommendations from per-user cache if available (no TTL - permanent personalization)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const cached = localStorage.getItem(userStorageKeys.RECOMMENDATIONS);
      if (cached) {
        const parsed = JSON.parse(cached) as RecommendationResult[];
        setRecommendations(parsed);
        console.log(
          "💾 Hydrated cached recommendations for user",
          userId || "anonymous",
          "(permanent personalization)"
        );
      }
    } catch (err) {
      // Ignore hydration errors
      console.debug("Failed to hydrate cached recommendations:", err);
    }
  }, [userStorageKeys]);

  const getRecommendations = useCallback(
    async (events: EventForRecommendation[]) => {
      if (typeof window === "undefined") return;

      // Get fresh storage keys for current user to avoid stale closures
      const currentUserStorageKeys = getUserStorageKeys(userId);

      console.log("Getting AI recommendations for user:", {
        userId: userId || "anonymous",
        eventCount: events.length,
        storageKey: currentUserStorageKeys.USER_BEHAVIOR,
      });

      setIsLoading(true);
      setError(null);

      try {
        // Get user behavior from localStorage (user-specific)
        const behaviorData = localStorage.getItem(
          currentUserStorageKeys.USER_BEHAVIOR
        );
        if (!behaviorData) {
          console.log(
            "📭 No user behavior data found for user:",
            userId || "anonymous"
          );
          setRecommendations([]);
          return;
        }

        const userBehavior = JSON.parse(behaviorData);
        console.log(
          "📊 User behavior loaded for user:",
          userId || "anonymous",
          {
            searches: userBehavior.searchQueries.length,
            views: userBehavior.viewedEvents.length,
            clicks: userBehavior.clickedEvents.length,
            engagements: userBehavior.eventEngagement.length,
          }
        );

        // Check if we have cached recommendations và behavior hasn't changed significantly
        const cachedRecommendations = localStorage.getItem(
          currentUserStorageKeys.RECOMMENDATIONS
        );

        // Get current behavior hash để detect significant changes (not time-based)
        // CRITICAL: DO NOT SORT arrays - order matters for recency!
        // Most recent items are at END of arrays, sorting would destroy this info
        const currentBehaviorHash = JSON.stringify({
          searches: userBehavior.searchQueries.slice(-10), // Last 10 for hash
          categories: userBehavior.preferences?.categories || [], // NO SORT - preserve recency!
          categoriesCount: (userBehavior.preferences?.categories || []).length,
          locations: userBehavior.preferences?.locations || [], // NO SORT - preserve recency!
          locationsCount: (userBehavior.preferences?.locations || []).length,
          priceRange: userBehavior.preferences?.priceRange || {
            min: 0,
            max: 10000000,
          },
          dateRanges: userBehavior.preferences?.dateRanges || [], // NO SORT
          viewedEvents: userBehavior.viewedEvents
            .slice(-20)
            .map((e: any) => e.id), // Track last 20 IDs for hash (increased sensitivity)
          viewedCount: userBehavior.viewedEvents.length, // Track total count
          clickedEvents: userBehavior.clickedEvents
            .slice(-20)
            .map((e: any) => e.id), // Track last 20 IDs for hash (increased sensitivity)
          clickedCount: userBehavior.clickedEvents.length, // Track total count
          // Include engagement data - high engagement events should influence recommendations more
          engagementEvents: (userBehavior.eventEngagement || [])
            .slice(-20)
            .map((e: any) => ({ id: e.eventId, time: e.timeSpent, depth: e.engagementDepth })),
          engagementCount: (userBehavior.eventEngagement || []).length,
          // CRITICAL: Include timestamps to detect when user re-selects same filters
          filterTimestamps: userBehavior.preferences?.filterTimestamps || {},
        });
        const lastBehaviorHash =
          localStorage.getItem(currentUserStorageKeys.BEHAVIOR_HASH) || "";

        const behaviorChanged = currentBehaviorHash !== lastBehaviorHash;
        const shouldUseCached = cachedRecommendations && !behaviorChanged; // No time restriction - permanent cache

        // Debug: Log behavior hash comparison with detailed breakdown
        console.log("🔍 Behavior hash comparison:", {
          behaviorChanged,
          hashChanged: currentBehaviorHash !== lastBehaviorHash,
          willUseCached: shouldUseCached,
          preferences: {
            categories: userBehavior.preferences?.categories || [],
            locations: userBehavior.preferences?.locations || [],
            priceRange: userBehavior.preferences?.priceRange,
            views: userBehavior.viewedEvents.length,
            clicks: userBehavior.clickedEvents.length,
          },
          hashPreview: {
            current: currentBehaviorHash.substring(0, 100) + "...",
            last: lastBehaviorHash.substring(0, 100) + "...",
          },
        });

        setIsLoading(true);
        setError(null);

        try {
          // Get user behavior from localStorage (user-specific)
          const behaviorData = localStorage.getItem(
            currentUserStorageKeys.USER_BEHAVIOR
          );
          if (!behaviorData) {
            console.log(
              "📭 No user behavior data found for user:",
              userId || "anonymous"
            );
            setRecommendations([]);
            return;
          }

          const userBehavior = JSON.parse(behaviorData);
          console.log(
            "📊 User behavior loaded for user:",
            userId || "anonymous",
            {
              searches: userBehavior.searchQueries.length,
              views: userBehavior.viewedEvents.length,
              clicks: userBehavior.clickedEvents.length,
              engagements: userBehavior.eventEngagement.length,
            }
          );

          // Check if we have cached recommendations và behavior hasn't changed significantly
          const cachedRecommendations = localStorage.getItem(
            currentUserStorageKeys.RECOMMENDATIONS
          );

          // Get current behavior hash để detect significant changes (not time-based)
          const currentBehaviorHash = JSON.stringify({
            searches: userBehavior.searchQueries,
            categories: userBehavior.preferences?.categories || [],
            locations: userBehavior.preferences?.locations || [],
            priceRange: userBehavior.preferences?.priceRange || {
              min: 0,
              max: 10000000,
            }, // Include price preferences!
            dateRanges: userBehavior.preferences?.dateRanges || [], // Include date preferences!
            viewedEvents: userBehavior.viewedEvents.slice(-10), // Only track recent 10 for hash
            clickedEvents: userBehavior.clickedEvents.slice(-10),
          });
          const lastBehaviorHash =
            localStorage.getItem(currentUserStorageKeys.BEHAVIOR_HASH) || "";

          const behaviorChanged = currentBehaviorHash !== lastBehaviorHash;
          const shouldUseCached = cachedRecommendations && !behaviorChanged; // No time restriction - permanent cache

          // Debug: Log behavior hash comparison
          console.log("🔍 Behavior hash comparison:", {
            behaviorChanged,
            currentPreferences: userBehavior.preferences,
            hashChanged: currentBehaviorHash !== lastBehaviorHash,
            willUseCached: shouldUseCached,
          });

          if (shouldUseCached) {
            console.log(
              "💾 Using cached recommendations for user:",
              userId || "anonymous",
              "(permanent personalization)"
            );
            const cached = JSON.parse(cachedRecommendations);
            // Filter cached recommendations to only include events that still exist
            const validRecommendations = cached.filter(
              (rec: RecommendationResult) =>
                events.some((event) => event.id === rec.event.id)
            );
            setRecommendations(validRecommendations);
            return;
          }

          // Call AI recommendations API
          const response = await fetch("/api/ai-recommendations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userBehavior,
              events,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to get recommendations");
          }

          const result = await response.json();

          // Debug log the recommendations with scores
          console.log(
            "✅ AI recommendations received for user:",
            userId || "anonymous"
          );
          console.log(
            "Event Scores (Top 10):",
            result.recommendations
              .slice(0, 10)
              .map((rec: RecommendationResult) => ({
                title: rec.event.title.substring(0, 30) + "...",
                score: `${(rec.score * 100).toFixed(1)}%`,
                reason: rec.reason.substring(0, 50) + "...",
              }))
          );

          setRecommendations(result.recommendations);

          // Cache the results với behavior hash (user-specific)
          localStorage.setItem(
            currentUserStorageKeys.RECOMMENDATIONS,
            JSON.stringify(result.recommendations)
          );
          localStorage.setItem(
            currentUserStorageKeys.BEHAVIOR_HASH,
            currentBehaviorHash
          );
          localStorage.setItem(
            currentUserStorageKeys.LAST_UPDATE,
            Date.now().toString()
          );
        } catch (err) {
          console.error(
            "Error getting recommendations for user:",
            userId || "anonymous",
            err
          );
          setError(
            err instanceof Error ? err.message : "Failed to get recommendations"
          );
          setRecommendations([]);
        } finally {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error getting recommendations for user:", err);
      }
    },
    [userId]
  ); // Remove userStorageKeys from dependencies

  return {
    recommendations,
    isLoading,
    error,
    getRecommendations,
  };
}

/**
 * Hook to track page views and automatically analyze user behavior
 */
export function usePageViewTracking() {
  const { trackEventView } = useUserTracking();

  const trackPageView = useCallback(
    (pageType: string, data?: Record<string, any>) => {
      // Track different types of page views
      switch (pageType) {
        case "event-detail":
          if (data?.event) {
            trackEventView({
              id: data.event.id,
              title: data.event.title,
              description: data.event.description,
              category: data.event.category,
              location: data.event.location,
              price: data.event.price,
            });
          }
          break;
        // Add more page types as needed
      }
    },
    [trackEventView]
  );

  return { trackPageView };
}

// Helper functions
function getDefaultBehavior(): UserBehavior {
  return {
    searchQueries: [],
    viewedEvents: [],
    clickedEvents: [],
    eventEngagement: [], // Add missing field
    preferences: {
      categories: [],
      priceRange: { min: 0, max: 10000000 }, // 10M VND default max
      locations: [],
      dateRanges: [], // Add default empty date ranges
      filterTimestamps: {}, // Initialize empty timestamps
    },
  };
}

function updatePreferenceArray(current: string[], newItem: string): string[] {
  if (!newItem) return current;
  
  // Remove item if it already exists (to move it to the end for recency)
  const filtered = current.filter(item => item !== newItem);
  
  // Add to end to track recency. Keep last 50 items to balance memory and history
  return [...filtered.slice(-49), newItem];
}

function updatePriceRange(
  current: { min: number; max: number },
  price: number
): { min: number; max: number } {
  return {
    min: Math.min(current.min, price),
    max: Math.max(current.max, price),
  };
}
