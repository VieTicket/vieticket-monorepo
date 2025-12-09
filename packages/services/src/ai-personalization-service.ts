import OpenAI from "openai";
import crypto from "crypto";

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
  eventEngagement?: Array<{
    eventId: string;
    eventTitle: string;
    category?: string;
    location?: string;
    price?: number;
    timeSpent: number; // seconds
    engagementDepth: number; // 0-1 score
    timestamp: number;
    source: "list" | "search" | "recommendation";
  }>;
  preferences: {
    categories: string[];
    priceRange: { min: number; max: number };
    locations: string[];
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

export class AIPersonalizationService {
  private openai: OpenAI | null = null;
  // Simple in-memory cache for generated user profiles
  private profileCache: Map<string, { profile: string; expiresAt: number }> =
    new Map();
  private defaultProfileTtlSeconds = Number(
    process.env.PROFILE_CACHE_TTL_SECONDS || "3600"
  ); // 1 hour default
  private defaultUseGptProfile = process.env.USE_GPT_PROFILE !== "false";

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Generate personalized event recommendations using AI
   */
  async getPersonalizedRecommendations(
    userBehavior: UserBehavior,
    availableEvents: EventForRecommendation[],
    options?: { useGptProfile?: boolean; forceProfileRefresh?: boolean }
  ): Promise<RecommendationResult[]> {
    console.log("AI Personalization: Starting recommendation generation");
    console.log("📊 User Behavior:", {
      searchQueries: userBehavior.searchQueries.length,
      viewedEvents: userBehavior.viewedEvents.length,
      clickedEvents: userBehavior.clickedEvents.length,
      categories: userBehavior.preferences.categories,
      locations: userBehavior.preferences.locations,
    });
    console.log("Available Events:", availableEvents.length);

    try {
      if (!this.openai) {
        console.warn(
          "⚠️ OpenAI not configured, falling back to keyword-based recommendations"
        );
        return this.getFallbackRecommendations(userBehavior, availableEvents);
      }

      console.log("✅ OpenAI configured, using AI-powered analysis");

      // Optionally analyze user preferences using AI (GPT profile)
      const useGpt = options?.useGptProfile ?? this.defaultUseGptProfile;
      let userProfile = "";
      if (useGpt && this.openai) {
        const forceRefresh = options?.forceProfileRefresh ?? false;
        userProfile = await this.generateUserProfile(userBehavior, {
          forceRefresh,
        });
        console.log("👤 Generated User Profile:", userProfile);
      } else {
        console.log(
          "ℹ️ Skipping GPT profile generation (useGptProfile=false or OpenAI not configured)"
        );
      }

      // Score events based on user profile
      const recommendations = await Promise.all(
        availableEvents.map(async (event) => {
          const score = await this.calculateEventScore(
            event,
            userProfile,
            userBehavior
          );
          const reason = this.generateRecommendationReason(event, userProfile);

          console.log(
            `Event "${event.title}" score: ${(score * 100).toFixed(1)}%`
          );

          return {
            event,
            score,
            reason,
          };
        })
      );

      // Sort by score and return top recommendations
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      console.log(
        "🎉 Top Recommendations Generated:",
        sortedRecommendations.map((r) => ({
          title: r.event.title,
          score: (r.score * 100).toFixed(1) + "%",
          reason: r.reason,
        }))
      );

      return sortedRecommendations;
    } catch (error) {
      console.error("AI recommendation error:", error);
      return this.getFallbackRecommendations(userBehavior, availableEvents);
    }
  }

  /**
   * Generate user profile using AI analysis
   */
  private async generateUserProfile(
    userBehavior: UserBehavior,
    opts?: { forceRefresh?: boolean }
  ): Promise<string> {
    if (!this.openai) return "";

    const behaviorText = this.formatUserBehaviorForAI(userBehavior);
    console.log(
      "🔍 Analyzing user behavior text:",
      behaviorText.substring(0, 200) + "..."
    );

    // Use a hash of the behaviorText as cache key
    const key = this.hashString(behaviorText);
    const now = Date.now();
    const ttl = this.defaultProfileTtlSeconds * 1000;

    if (!opts?.forceRefresh) {
      const cached = this.profileCache.get(key);
      if (cached && cached.expiresAt > now) {
        console.log("Profile cache hit");
        return cached.profile;
      }
    } else {
      console.log("♻️ Force refresh requested for profile");
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an AI that analyzes user behavior to create a concise user profile for event recommendations. Respond with only the key interests, preferences, and patterns in 2-3 sentences.",
          },
          {
            role: "user",
            content: `Analyze this user's event browsing behavior and create a profile:\n\n${behaviorText}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      const profile = response.choices[0]?.message?.content || "";
      console.log("🧠 AI Generated Profile:", profile);

      // store in cache
      try {
        this.profileCache.set(key, { profile, expiresAt: now + ttl });
        // clean up small portion of expired entries occasionally
        if (this.profileCache.size > 5000) {
          for (const [k, v] of this.profileCache) {
            if (v.expiresAt <= now) this.profileCache.delete(k);
          }
        }
      } catch (e) {
        // cache failures should not break recommendation flow
        console.warn("⚠️ Failed to write profile cache:", e);
      }

      return profile;
    } catch (error) {
      console.error("Error generating user profile:", error);
      return "";
    }
  }

  private hashString(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  /**
   * Calculate event score using semantic similarity
   */
  private async calculateEventScore(
    event: EventForRecommendation,
    userProfile: string,
    userBehavior: UserBehavior
  ): Promise<number> {
    let score = 0;
    console.log(`🧮 Calculating score for "${event.title}"`);

    try {
      if (this.openai && userProfile) {
        console.log("📊 Using AI embeddings for semantic analysis");
        // Get embeddings for user profile and event
        const [userEmbedding, eventEmbedding] = await Promise.all([
          this.getEmbedding(userProfile),
          this.getEmbedding(this.formatEventForEmbedding(event)),
        ]);

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(userEmbedding, eventEmbedding);
        score += similarity * 0.6; // 60% weight for AI similarity (INCREASED for academic requirements)
        console.log(`AI similarity score: ${(similarity * 100).toFixed(1)}%`);
      }

      // Add category preference score
      const categoryScore = this.calculateCategoryScore(event, userBehavior);
      score += categoryScore * 0.15; // 15% weight (Reduced to prioritize AI)
      console.log(`📂 Category score: ${(categoryScore * 100).toFixed(1)}%`);

      // Add location preference score
      const locationScoreResult = this.calculateLocationScore(
        event,
        userBehavior
      );
      score += locationScoreResult.score * 0.1; // 10% weight (Reduced to prioritize AI)
      console.log(
        `Location score: ${(locationScoreResult.score * 100).toFixed(1)}% (explicit: ${locationScoreResult.isExplicit})`
      );

      // Add price preference score
      const priceScoreResult = this.calculatePriceScore(event, userBehavior);
      score += priceScoreResult.score * 0.15; // 15% weight (Keep price important for user experience)
      console.log(
        `💰 Price score: ${(priceScoreResult.score * 100).toFixed(1)}% (explicit: ${priceScoreResult.isExplicit})`
      );

      // Apply engagement bonus for events user spent significant time on
      const engagementBonus = this.calculateEngagementBonus(event, userBehavior);
      score += engagementBonus * 0.1; // 10% weight for engagement
      console.log(`👁️ Engagement bonus: +${(engagementBonus * 100).toFixed(1)}%`);

      // Apply recency-based bonus for explicit filter matches
      // More recent filters get higher priority
      const recencyBonus = this.calculateRecencyBonus(
        locationScoreResult,
        priceScoreResult,
        userBehavior
      );
      score += recencyBonus;
      console.log(`⏰ Recency bonus: +${(recencyBonus * 100).toFixed(1)}%`);
    } catch (error) {
      console.error("Error calculating event score:", error);
      // Fallback to simple keyword matching
      score = this.calculateKeywordScore(event, userBehavior);
      console.log(`🔤 Fallback keyword score: ${(score * 100).toFixed(1)}%`);
    }

    const finalScore = Math.max(0, Math.min(1, score));
    console.log(
      `✅ Final score for "${event.title}": ${(finalScore * 100).toFixed(1)}%`
    );
    return finalScore; // Normalize between 0-1
  }

  /**
   * Get text embedding using OpenAI or fallback to simulated embeddings
   */
  private async getEmbedding(text: string): Promise<number[]> {
    // Try OpenAI first
    if (this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
        });

        return response.data[0]?.embedding || [];
      } catch (error: any) {
        // If quota exceeded, fall back to simulated embeddings
        if (error?.status === 429 || error?.message?.includes('quota')) {
          console.warn("⚠️ OpenAI quota exceeded, using simulated embeddings");
          return this.generateSimulatedEmbedding(text);
        }
        console.error("Error getting embedding:", error);
        return this.generateSimulatedEmbedding(text);
      }
    }

    // No OpenAI configured, use simulated
    return this.generateSimulatedEmbedding(text);
  }

  /**
   * Generate simulated embedding based on keyword analysis
   * This creates a deterministic 384-dimensional vector based on text features
   * Not as sophisticated as OpenAI but still demonstrates the concept
   */
  private generateSimulatedEmbedding(text: string): number[] {
    const lowerText = text.toLowerCase();
    const words: string[] = lowerText.match(/\b\w+\b/g) || [];
    
    // Create a 384-dimensional vector (smaller than OpenAI's 1536)
    const dimension = 384;
    const embedding: number[] = new Array(dimension).fill(0);
    
    // Feature 1: Word presence (first 100 dimensions)
    const commonWords = [
      'concert', 'music', 'rock', 'pop', 'jazz', 'classical', 'live', 'band',
      'sports', 'football', 'soccer', 'basketball', 'tennis', 'game', 'match',
      'theater', 'drama', 'comedy', 'musical', 'play', 'show', 'performance',
      'festival', 'exhibition', 'art', 'culture', 'food', 'wine', 'beer',
      'outdoor', 'indoor', 'family', 'kids', 'children', 'adult', 'nightlife',
      'conference', 'workshop', 'seminar', 'training', 'education', 'business',
      'charity', 'fundraising', 'community', 'local', 'international', 'national'
    ];
    
    commonWords.forEach((word, i) => {
      if (i < 100 && words.includes(word)) {
        embedding[i] = 1.0;
      }
    });
    
    // Feature 2: Text length indicator (dimensions 100-110)
    const lengthScore = Math.min(words.length / 100, 1);
    for (let i = 100; i < 110; i++) {
      embedding[i] = lengthScore;
    }
    
    // Feature 3: Category hints (dimensions 110-150)
    const categories = {
      'music': ['concert', 'music', 'band', 'singer', 'acoustic', 'festival'],
      'sports': ['sports', 'game', 'match', 'tournament', 'championship'],
      'arts': ['theater', 'art', 'exhibition', 'museum', 'gallery'],
      'food': ['food', 'wine', 'beer', 'dining', 'restaurant', 'cuisine'],
      'business': ['conference', 'seminar', 'workshop', 'business', 'professional']
    };
    
    Object.entries(categories).forEach(([category, keywords], catIdx) => {
      const score = keywords.filter(kw => lowerText.includes(kw)).length / keywords.length;
      const startIdx = 110 + (catIdx * 8);
      for (let i = 0; i < 8; i++) {
        embedding[startIdx + i] = score;
      }
    });
    
    // Feature 4: Sentiment/emotion words (dimensions 150-200)
    const positiveWords = ['exciting', 'amazing', 'great', 'fantastic', 'wonderful', 'best'];
    const negativeWords = ['boring', 'bad', 'worst', 'terrible', 'awful'];
    
    let sentiment = 0;
    positiveWords.forEach(w => { if (lowerText.includes(w)) sentiment += 0.2; });
    negativeWords.forEach(w => { if (lowerText.includes(w)) sentiment -= 0.2; });
    sentiment = Math.max(-1, Math.min(1, sentiment));
    
    for (let i = 150; i < 200; i++) {
      embedding[i] = sentiment;
    }
    
    // Feature 5: Hash-based features for uniqueness (dimensions 200-384)
    const hash = this.hashText(text);
    for (let i = 200; i < dimension; i++) {
      const hashValue = parseInt(hash.slice((i - 200) % hash.length, (i - 200) % hash.length + 2), 16);
      embedding[i] = (hashValue / 255) - 0.5; // Normalize to [-0.5, 0.5]
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  /**
   * Simple hash function for text to number conversion
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0) return 0;

    const dotProduct = vecA.reduce((sum: number, a_i: number, i: number) => sum + a_i * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum: number, a_i: number) => sum + a_i * a_i, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum: number, b_i: number) => sum + b_i * b_i, 0));

    return magnitudeA && magnitudeB
      ? dotProduct / (magnitudeA * magnitudeB)
      : 0;
  }

  /**
   * Format user behavior for AI analysis
   */
  private formatUserBehaviorForAI(userBehavior: UserBehavior): string {
    const searchQueries = userBehavior.searchQueries.slice(-10).join(", ");

    // Calculate category frequency to show accumulated interest
    const categoryCounts: Record<string, number> = {};
    [...userBehavior.viewedEvents, ...userBehavior.clickedEvents].forEach(
      (e) => {
        if (e.category) {
          const cat = e.category;
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      }
    );

    const topInterests = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, count]) => `${cat} (${count}x)`)
      .join(", ");

    const viewedEvents = userBehavior.viewedEvents
      .slice(-5)
      .map((e) => `${e.title} (${e.category})`)
      .join(", ");
    const clickedEvents = userBehavior.clickedEvents
      .slice(-5)
      .map((e) => `${e.title} (${e.category})`)
      .join(", ");

    // Include high-engagement events (user spent significant time)
    const highEngagementEvents = (userBehavior.eventEngagement || [])
      .filter((e) => e.timeSpent >= 30 || e.engagementDepth >= 0.5) // 30+ seconds or 50%+ scroll
      .slice(-5)
      .map((e) => `${e.eventTitle} (${e.category}, ${Math.round(e.timeSpent)}s, ${Math.round(e.engagementDepth * 100)}% engaged)`)
      .join(", ");

    return `
Search queries: ${searchQueries}
Top Interests (Frequency): ${topInterests}
Viewed events: ${viewedEvents}
Clicked events: ${clickedEvents}
High engagement events: ${highEngagementEvents || "None yet"}
Preferred categories: ${userBehavior.preferences.categories.join(", ")}
Price range: ${userBehavior.preferences.priceRange.min} - ${userBehavior.preferences.priceRange.max}
Preferred locations: ${userBehavior.preferences.locations.join(", ")}
    `.trim();
  }

  /**
   * Format event for embedding
   * Includes price to ensure AI considers budget constraints
   */
  private formatEventForEmbedding(event: EventForRecommendation): string {
    const priceText =
      event.price !== undefined ? `Price: ${event.price} VND` : "Free event";
    return `${event.title} ${event.description || ""} ${event.category || ""} ${event.location || ""} ${priceText}`.trim();
  }

  /**
   * Calculate category preference score
   * Uses both explicit preferences (filters) and implicit behavior (views/clicks)
   */
  private calculateCategoryScore(
    event: EventForRecommendation,
    userBehavior: UserBehavior
  ): number {
    if (!event.category) return 0;

    const targetCategory = event.category.toLowerCase();

    // 1. Explicit Preference Score (from current filters/preferences)
    // If the user has explicitly selected this category in filters, give it a solid base score.
    const isExplicitlyPreferred = userBehavior.preferences.categories.some(
      (cat) => cat.toLowerCase() === targetCategory
    );

    // 2. Implicit Interest Score (from historical behavior)
    // Calculate how often the user interacts with this category relative to others.
    const viewedCount = userBehavior.viewedEvents.filter(
      (e) => e.category?.toLowerCase() === targetCategory
    ).length;
    const clickedCount = userBehavior.clickedEvents.filter(
      (e) => e.category?.toLowerCase() === targetCategory
    ).length;

    // We consider the last 20 interactions to keep it recent but accumulated
    const totalInteractions = Math.min(
      20,
      userBehavior.viewedEvents.length + userBehavior.clickedEvents.length
    );

    let interactionScore = 0;
    if (totalInteractions > 0) {
      // Clicks are weighted double compared to views
      const weightedCount = viewedCount + clickedCount * 2;
      // Normalize against total interactions (with a dampening factor to avoid 100% on first view)
      interactionScore = weightedCount / (totalInteractions + 2);
    }

    // Combine:
    // - If explicitly preferred: Start at 0.8 (Strong signal)
    // - Add interaction score (up to 0.2)

    let score = isExplicitlyPreferred ? 0.8 : 0;
    score += Math.min(0.2, interactionScore);

    return Math.min(1, score);
  }

  /**
   * Calculate location preference score
   * Considers both explicit filter and historical interest
   */
  private calculateLocationScore(
    event: EventForRecommendation,
    userBehavior: UserBehavior
  ): { score: number; isExplicit: boolean } {
    if (!event.location) return { score: 0, isExplicit: false };

    // 1. Explicit Preference
    const locationMatch = userBehavior.preferences.locations.some((loc) =>
      event.location?.toLowerCase().includes(loc.toLowerCase())
    );
    if (locationMatch) return { score: 1, isExplicit: true };

    // 2. Implicit History
    // If no explicit match, check if user frequently views this location
    const locationCounts: Record<string, number> = {};
    userBehavior.viewedEvents.forEach((e) => {
      if (e.location) {
        const loc = e.location.toLowerCase();
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }
    });

    // Check if event location matches any historical location
    const eventLoc = event.location.toLowerCase();
    let maxHistoryScore = 0;

    Object.entries(locationCounts).forEach(([loc, count]) => {
      // Check for partial matches (e.g. "Da Nang" in "Da Nang, Vietnam")
      if (eventLoc.includes(loc) || loc.includes(eventLoc)) {
        // Score based on frequency. 3+ visits = high score (0.75)
        const score = Math.min(0.8, count * 0.25);
        if (score > maxHistoryScore) maxHistoryScore = score;
      }
    });

    return { score: maxHistoryScore, isExplicit: false };
  }

  /**
   * Calculate price preference score
   * Considers both explicit filter and historical average price
   */
  private calculatePriceScore(
    event: EventForRecommendation,
    userBehavior: UserBehavior
  ): { score: number; isExplicit: boolean } {
    if (event.price === undefined || event.price === null)
      return { score: 0.5, isExplicit: false }; // Neutral score for unknown price
    if (event.price === 0) return { score: 0.8, isExplicit: false }; // Good score for free events unless user hates them

    const { min, max } = userBehavior.preferences.priceRange;

    // Check if the current filter is the "default" wide range (effectively no filter)
    // Assuming default is 0 to 10,000,000+
    const isDefaultRange = min === 0 && max >= 10000000;

    // 1. Explicit Filter Score
    // If user has a specific filter active, strict adherence is important
    if (!isDefaultRange) {
      if (event.price >= min && event.price <= max)
        return { score: 1, isExplicit: true };
      // Decay score for items outside range
      if (event.price < min)
        return {
          score: Math.max(0, 1 - (min - event.price) / min),
          isExplicit: false,
        };
      if (event.price > max)
        return {
          score: Math.max(0, 1 - (event.price - max) / event.price),
          isExplicit: false,
        };
    }

    // 2. Implicit History Score (only if no strict filter or to boost matches)
    // Calculate average price of events the user has shown interest in
    // Note: We primarily use viewedEvents as they contain price info
    const interactions = userBehavior.viewedEvents;
    const validPrices = interactions
      .map((e) => e.price)
      .filter((p): p is number => p !== undefined && p !== null);

    if (validPrices.length > 0) {
      const avgPrice =
        validPrices.reduce((a, b) => a + b, 0) / validPrices.length;

      // Calculate proximity to average price
      // We allow a wider variance for price (e.g. 50% deviation is still okay)
      const diff = Math.abs(event.price - avgPrice);
      const percentDiff = diff / Math.max(1, avgPrice);

      // Score: 1.0 at exact match, decaying to 0 at >100% difference
      const historyScore = Math.max(0, 1 - percentDiff);

      // If we are in default range, use history score
      if (isDefaultRange) return { score: historyScore, isExplicit: false };
    }

    // Default fallback if no history and no specific filter
    return { score: 0.5, isExplicit: false };
  }

  /**
   * Calculate recency bonus based on filter timestamps
   * More recent filters get higher priority
   * Events matching ANY recent filter get bonus based on filter recency
   */
  private calculateRecencyBonus(
    locationResult: { score: number; isExplicit: boolean },
    priceResult: { score: number; isExplicit: boolean },
    userBehavior: UserBehavior
  ): number {
    const timestamps = userBehavior.preferences.filterTimestamps;
    if (!timestamps) return 0;

    const now = Date.now();

    // Calculate bonus for EACH matching filter independently
    // This ensures events matching older filters still get some bonus
    let totalBonus = 0;

    // Price filter bonus
    if (priceResult.isExplicit && timestamps.price) {
      const priceAgeMinutes = (now - timestamps.price) / (1000 * 60);
      // Decay over 2 hours (120 min) to minimum 10% (was 1 hour / 50%)
      const priceDecay = Math.max(0.1, Math.min(1, 1 - priceAgeMinutes / 120));
      const priceBonus = 0.2 * priceDecay; // Base 20% for price match
      totalBonus += priceBonus;
      console.log(
        `  💰 Price filter match: ${priceAgeMinutes.toFixed(1)} min ago, decay: ${(priceDecay * 100).toFixed(0)}%, bonus: +${(priceBonus * 100).toFixed(1)}%`
      );
    }

    // Location filter bonus
    if (locationResult.isExplicit && timestamps.location) {
      const locationAgeMinutes = (now - timestamps.location) / (1000 * 60);
      // Decay over 2 hours (120 min) to minimum 10% (was 1 hour / 50%)
      const locationDecay = Math.max(
        0.1,
        Math.min(1, 1 - locationAgeMinutes / 120)
      );
      const locationBonus = 0.2 * locationDecay; // Base 20% for location match
      totalBonus += locationBonus;
      console.log(
        `  Location filter match: ${locationAgeMinutes.toFixed(1)} min ago, decay: ${(locationDecay * 100).toFixed(0)}%, bonus: +${(locationBonus * 100).toFixed(1)}%`
      );
    }

    // Extra bonus if matching BOTH filters (compound effect)
    if (
      priceResult.isExplicit &&
      locationResult.isExplicit &&
      timestamps.price &&
      timestamps.location
    ) {
      const compoundBonus = 0.15; // Additional 15% for matching both
      totalBonus += compoundBonus;
      console.log(
        `  🎁 Compound bonus (matches both filters): +${(compoundBonus * 100).toFixed(1)}%`
      );
    }

    return totalBonus;
  }

  /**
   * Calculate engagement bonus based on similar events user spent time on
   * Higher bonus for events similar to those with high time spent + engagement depth
   */
  private calculateEngagementBonus(
    event: EventForRecommendation,
    userBehavior: UserBehavior
  ): number {
    const engagements = userBehavior.eventEngagement || [];
    if (engagements.length === 0) return 0;

    let maxBonus = 0;

    // Check if this exact event was previously engaged with
    const previousEngagement = engagements.find(e => e.eventId === event.id);
    if (previousEngagement) {
      // Strong bonus if user previously spent time on THIS event
      const timeScore = Math.min(previousEngagement.timeSpent / 300, 1); // Max at 5 minutes
      const depthScore = previousEngagement.engagementDepth;
      maxBonus = Math.max(maxBonus, (timeScore + depthScore) / 2 * 0.8); // Up to 80% bonus
      console.log(`  🔁 Previous engagement: ${previousEngagement.timeSpent}s, depth: ${(depthScore * 100).toFixed(0)}%`);
      return maxBonus;
    }

    // Check for similar events (same category/location/price range)
    const similarEngagements = engagements.filter(e => {
      const categoryMatch = event.category && e.category === event.category;
      const locationMatch = event.location && e.location === event.location;
      const priceMatch = event.price && e.price && 
        Math.abs(event.price - e.price) < event.price * 0.5; // Within 50% price range
      
      return categoryMatch || locationMatch || priceMatch;
    });

    if (similarEngagements.length === 0) return 0;

    // Calculate average engagement quality for similar events
    similarEngagements.forEach(engagement => {
      const timeScore = Math.min(engagement.timeSpent / 300, 1); // Max at 5 minutes
      const depthScore = engagement.engagementDepth;
      const qualityScore = (timeScore + depthScore) / 2;
      
      // Apply decay based on how long ago this engagement was
      const ageMinutes = (Date.now() - engagement.timestamp) / (1000 * 60);
      const recencyFactor = Math.max(0.3, Math.min(1, 1 - ageMinutes / (60 * 24 * 7))); // Decay over 1 week
      
      const bonus = qualityScore * recencyFactor * 0.5; // Up to 50% bonus for similar events
      maxBonus = Math.max(maxBonus, bonus);
    });

    if (maxBonus > 0.1) {
      console.log(`  🎯 Similar engagement found: ${similarEngagements.length} events, max bonus: ${(maxBonus * 100).toFixed(1)}%`);
    }

    return maxBonus;
  }

  /**
   * Simple keyword-based scoring fallback
   */
  private calculateKeywordScore(
    event: EventForRecommendation,
    userBehavior: UserBehavior
  ): number {
    const eventText = this.formatEventForEmbedding(event).toLowerCase();
    const userQueries = userBehavior.searchQueries.join(" ").toLowerCase();

    let score = 0;
    const keywords = userQueries.split(/\s+/).filter((w) => w.length > 2);

    keywords.forEach((keyword) => {
      if (eventText.includes(keyword)) {
        score += 0.1;
      }
    });

    return Math.min(1, score);
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(
    event: EventForRecommendation,
    userProfile: string
  ): string {
    const reasons = [];

    if (userProfile && event.category) {
      reasons.push(
        `Matches your interest in ${event.category.toLowerCase()} events`
      );
    }

    if (event.location) {
      reasons.push(`Located in ${event.location}`);
    }

    if (reasons.length === 0) {
      reasons.push("Recommended based on your browsing history");
    }

    return reasons.join(" • ");
  }

  /**
   * Fallback recommendations when AI is not available
   */
  private getFallbackRecommendations(
    userBehavior: UserBehavior,
    availableEvents: EventForRecommendation[]
  ): RecommendationResult[] {
    return availableEvents
      .map((event) => ({
        event,
        score: this.calculateKeywordScore(event, userBehavior),
        reason: "Based on your search history",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}

// Export singleton instance
export const aiPersonalizationService = new AIPersonalizationService();
