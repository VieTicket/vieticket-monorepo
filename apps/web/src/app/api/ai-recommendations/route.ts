import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Define types locally
interface UserBehavior {
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
  };
}

interface EventForRecommendation {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  price?: number;
  poster_url?: string;
  created_at?: string;
}

interface RecommendationResult {
  event: EventForRecommendation;
  score: number;
  reason: string;
}

// Simple AI service implementation with BALANCED SCORING WEIGHTS
// NEW WEIGHT DISTRIBUTION (Total max ~125%):
// - Base Score: 15% (increased from 10%)
// - Keywords: 25% max (reduced from 60%) - 20% + 5% exact bonus
// - Category: 25% max (reduced from 30%)
// - Location: 20% max (reduced from 25%)
// - Price Range: 15% max (unchanged)
// - Engagement: 25% max (unchanged - most important behavioral signal)
// - Freshness: -5% max (unchanged)
class SimpleAIService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async getPersonalizedRecommendations(
    userBehavior: UserBehavior,
    availableEvents: EventForRecommendation[]
  ): Promise<RecommendationResult[]> {
    try {
      if (!this.openai) {
        return this.getFallbackRecommendations(userBehavior, availableEvents);
      }

      // 🎯 DEBUG: Start AI recommendation process
      console.log("🤖 STARTING AI RECOMMENDATIONS CALCULATION");
      console.log(`📋 Processing ${availableEvents.length} available events`);
      console.log(
        `👤 User has ${userBehavior.searchQueries.length} search queries, ${userBehavior.viewedEvents.length} viewed events`
      );
      console.log("────────────────────────────────────────");

      // Simple scoring based on keyword matching and preferences
      const recommendations = availableEvents.map((event) => {
        const score = this.calculateSimpleScore(event, userBehavior);
        const reason = this.generateRecommendationReason(event, userBehavior);

        return {
          event,
          score,
          reason,
        };
      });

      // Sort by score and return top recommendations
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // 📈 DEBUG: Score statistics
      const scores = recommendations.map((r) => r.score);
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      console.log("📈 SCORING STATISTICS:");
      console.log(`   📊 Average Score: ${(avgScore * 100).toFixed(1)}%`);
      console.log(`   📈 Highest Score: ${(maxScore * 100).toFixed(1)}%`);
      console.log(`   📉 Lowest Score: ${(minScore * 100).toFixed(1)}%`);
      console.log(
        `   🎯 Score Range: ${((maxScore - minScore) * 100).toFixed(1)}% spread`
      );
      console.log("────────────────────────────────────────");

      // 🏆 DEBUG: Final ranking with detailed info
      console.log("════════════════════════════════════════");
      console.log("🏆 FINAL AI RECOMMENDATIONS RANKING:");
      console.log("════════════════════════════════════════");
      sortedRecommendations.forEach((rec, index) => {
        const medal =
          index === 0
            ? "🥇"
            : index === 1
              ? "🥈"
              : index === 2
                ? "🥉"
                : `${index + 1}.`;
        console.log(`${medal} "${rec.event.title}"`);
        console.log(`   📊 Score: ${(rec.score * 100).toFixed(1)}%`);
        console.log(`   🏷️  Category: ${rec.event.category || "N/A"}`);
        console.log(`   📍 Location: ${rec.event.location || "N/A"}`);
        console.log(
          `   💰 Price: ${rec.event.price ? rec.event.price.toLocaleString() + "đ" : "Free"}`
        );
        console.log(`   💡 Reason: ${rec.reason}`);
        console.log(`   ─────────────────────────────────`);
      });
      console.log("════════════════════════════════════════");

      return sortedRecommendations;
    } catch (error) {
      console.error("AI recommendation error:", error);
      return this.getFallbackRecommendations(userBehavior, availableEvents);
    }
  }

  private calculateSimpleScore(
    event: EventForRecommendation,
    userBehavior: UserBehavior
  ): number {
    let score = 0;
    let scoringDetails: string[] = [];

    // 🧠 DEBUG: Log user behavior context (only for first event to avoid spam)
    if (Math.random() < 0.05) {
      // Only 5% chance to log user context
      console.log("👤 USER BEHAVIOR CONTEXT for AI Scoring:");
      console.log(
        `   🔍 Search Queries: [${userBehavior.searchQueries.slice(-3).join(", ")}] (${userBehavior.searchQueries.length} total)`
      );
      console.log(
        `   🏷️  Preferred Categories: [${userBehavior.preferences?.categories?.join(", ") || "none"}]`
      );
      console.log(
        `   📍 Preferred Locations: [${userBehavior.preferences?.locations?.join(", ") || "none"}]`
      );
      console.log(
        `   💰 Price Range: ${userBehavior.preferences?.priceRange ? `${userBehavior.preferences.priceRange.min.toLocaleString()}-${userBehavior.preferences.priceRange.max.toLocaleString()}đ` : "any"}`
      );
      console.log(
        `   👀 Recent Views: ${userBehavior.viewedEvents.length} events`
      );
      console.log(
        `   👆 Recent Clicks: ${userBehavior.clickedEvents.length} events`
      );
      console.log(
        `   ⚡ Engagements: ${userBehavior.eventEngagement?.length || 0} deep interactions`
      );
      console.log(`   ════════════════════════════════════════`);
    }

    // BASE SCORE - All events start with 15% (increased for better balance)
    score += 0.15;
    scoringDetails.push("Base: 15%");

    // 1. SEARCH KEYWORD MATCHING (0-25% bonus) - Balanced priority with behavior patterns
    const searchText = userBehavior.searchQueries.join(" ").toLowerCase();
    const eventText =
      `${event.title} ${event.description || ""} ${event.category || ""} ${event.location || ""}`.toLowerCase();

    if (searchText) {
      const searchWords = searchText.split(/\s+/).filter((w) => w.length > 2);
      let keywordMatches = 0;
      let exactMatches = 0;

      searchWords.forEach((keyword) => {
        if (eventText.includes(keyword)) {
          keywordMatches++;
          // Bonus for exact matches in title
          if (event.title.toLowerCase().includes(keyword)) {
            exactMatches++;
          }
        }
      });

      if (searchWords.length > 0) {
        const matchRatio = keywordMatches / searchWords.length;
        // More balanced scoring - less dominant than before
        const keywordScore = Math.pow(matchRatio, 0.7) * 0.2; // 0-20% bonus (reduced from 50%)
        const exactBonus = exactMatches * 0.05; // +5% per exact title match (reduced from 10%)

        score += keywordScore + exactBonus;
        scoringDetails.push(
          `Keywords (${keywordMatches}/${searchWords.length}): +${((keywordScore + exactBonus) * 100).toFixed(1)}%`
        );
      }
    }

    // 2. CATEGORY PREFERENCE (0-25% bonus) - Balanced preference boost
    if (event.category && userBehavior.preferences.categories.length > 0) {
      const categoryFrequency = userBehavior.preferences.categories.filter(
        (cat) =>
          cat.toLowerCase() === event.category?.toLowerCase() ||
          event.category?.toLowerCase().includes(cat.toLowerCase())
      ).length;

      if (categoryFrequency > 0) {
        // More frequent category = higher bonus (reduced from 30% to 25%)
        const categoryScore = Math.min(categoryFrequency * 0.12, 0.25); // Max 25%
        score += categoryScore;
        scoringDetails.push(
          `Category match (${event.category}): +${(categoryScore * 100).toFixed(1)}%`
        );
      }
    }

    // 3. LOCATION PREFERENCE (0-20% bonus) - Location affinity
    if (event.location && userBehavior.preferences.locations.length > 0) {
      const locationFrequency = userBehavior.preferences.locations.filter(
        (loc) => {
          const normalizedEventLoc =
            event.location?.toLowerCase().replace(/\s+/g, "") || "";
          const normalizedPrefLoc = loc.toLowerCase().replace(/\s+/g, "");
          return (
            normalizedEventLoc.includes(normalizedPrefLoc) ||
            normalizedPrefLoc.includes(normalizedEventLoc)
          );
        }
      ).length;

      if (locationFrequency > 0) {
        const locationScore = Math.min(locationFrequency * 0.1, 0.2); // Max 20% (reduced from 25%)
        score += locationScore;
        scoringDetails.push(
          `Location match (${event.location}): +${(locationScore * 100).toFixed(1)}%`
        );
      }
    }

    // 4. PRICE RANGE PREFERENCE (0-15% bonus)
    if (event.price && userBehavior.preferences.priceRange) {
      const { min, max } = userBehavior.preferences.priceRange;
      if (event.price >= min && event.price <= max) {
        // Give higher bonus for prices closer to user's sweet spot
        const midPrice = (min + max) / 2;
        const distance = Math.abs(event.price - midPrice) / (max - min);
        const priceScore = (1 - distance) * 0.15; // Closer to sweet spot = higher score
        score += priceScore;
        scoringDetails.push(
          `Price preference (${event.price.toLocaleString()}đ): +${(priceScore * 100).toFixed(1)}%`
        );
      }
    }

    // 5. RECENT INTERACTION BOOST (0-25% bonus) - Enhanced with engagement depth - KEPT SAME
    const recentViews = userBehavior.viewedEvents.filter(
      (ve) =>
        ve.category === event.category ||
        ve.location === event.location ||
        (ve.title &&
          event.title &&
          ve.title
            .toLowerCase()
            .includes(event.title.toLowerCase().split(" ")[0]))
    );

    const recentClicks = userBehavior.clickedEvents.filter(
      (ce) =>
        ce.category === event.category ||
        (ce.title &&
          event.title &&
          ce.title
            .toLowerCase()
            .includes(event.title.toLowerCase().split(" ")[0]))
    );

    // Deep engagement tracking - Most important behavioral signal
    const deepEngagement = (userBehavior.eventEngagement || []).filter(
      (ee) =>
        ee.eventId === event.id || // Same event
        ee.category === event.category || // Same category
        (ee.location &&
          event.location &&
          ee.location.includes(event.location.substring(0, 5))) // Similar location
    );

    let engagementScore = 0;
    const totalInteractions = recentViews.length + recentClicks.length * 2; // Clicks worth more

    if (totalInteractions > 0) {
      const basicInteractionScore = Math.min(totalInteractions * 0.03, 0.12); // Base interaction score
      engagementScore += basicInteractionScore;
      scoringDetails.push(
        `Basic interactions (${totalInteractions}): +${(basicInteractionScore * 100).toFixed(1)}%`
      );
    }

    // Deep engagement bonus (much more valuable)
    if (deepEngagement.length > 0) {
      const avgTimeSpent =
        deepEngagement.reduce((sum, e) => sum + e.timeSpent, 0) /
        deepEngagement.length;
      const avgDepth =
        deepEngagement.reduce((sum, e) => sum + e.engagementDepth, 0) /
        deepEngagement.length;

      // Time bonus: 30s+ = good engagement, 120s+ = excellent
      const timeBonus = Math.min(avgTimeSpent / 120, 1) * 0.1; // Max 10% for time

      // Depth bonus: High scroll/interaction depth
      const depthBonus = avgDepth * 0.08; // Max 8% for engagement depth

      // Frequency bonus: Multiple engagements show real interest
      const frequencyBonus = Math.min(deepEngagement.length * 0.02, 0.06); // Max 6% for frequency

      const totalEngagementBonus = timeBonus + depthBonus + frequencyBonus;
      engagementScore += totalEngagementBonus;

      scoringDetails.push(
        `Deep engagement (${deepEngagement.length}x, ${avgTimeSpent.toFixed(0)}s, ${(avgDepth * 100).toFixed(0)}% depth): +${(totalEngagementBonus * 100).toFixed(1)}%`
      );
    }

    score += Math.min(engagementScore, 0.25); // Cap total engagement bonus at 25%

    // 6. FRESHNESS PENALTY - Slightly prefer newer events
    if (event.created_at) {
      const eventDate = new Date(event.created_at);
      const daysSinceCreated =
        (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated > 30) {
        const freshnessPenalty = Math.min(
          (daysSinceCreated - 30) * 0.001,
          0.05
        ); // Max -5%
        score -= freshnessPenalty;
        scoringDetails.push(
          `Freshness penalty (${Math.round(daysSinceCreated)} days): -${(freshnessPenalty * 100).toFixed(1)}%`
        );
      }
    }

    // Ensure score is between 0 and 1
    score = Math.max(0, Math.min(1, score));

    // 🔍 DEBUG: Log detailed scoring breakdown for each event
    console.log(`📊 Event Score Breakdown: "${event.title}"`);
    console.log(`   📈 Final Score: ${(score * 100).toFixed(1)}%`);
    console.log(`   📋 Details: ${scoringDetails.join(" | ")}`);
    console.log(`   🏷️  Category: ${event.category || "N/A"}`);
    console.log(`   📍 Location: ${event.location || "N/A"}`);
    console.log(
      `   💰 Price: ${event.price ? event.price.toLocaleString() + "đ" : "N/A"}`
    );
    console.log(`   ────────────────────────────────────────`);

    return score;
  }

  private generateRecommendationReason(
    event: EventForRecommendation,
    userBehavior: UserBehavior
  ): string {
    const reasons = [];

    if (
      event.category &&
      userBehavior.preferences.categories.includes(event.category)
    ) {
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

  private getFallbackRecommendations(
    userBehavior: UserBehavior,
    availableEvents: EventForRecommendation[]
  ): RecommendationResult[] {
    return availableEvents
      .map((event) => ({
        event,
        score: this.calculateSimpleScore(event, userBehavior),
        reason: "Based on your search history",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}

const aiService = new SimpleAIService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userBehavior,
      events,
    }: {
      userBehavior: UserBehavior;
      events: EventForRecommendation[];
    } = body;

    // Validate input
    if (!userBehavior || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid input: userBehavior and events array required" },
        { status: 400 }
      );
    }

    // Get AI-powered recommendations
    const recommendations = await aiService.getPersonalizedRecommendations(
      userBehavior,
      events
    );

    return NextResponse.json({
      success: true,
      recommendations,
      metadata: {
        totalEvents: events.length,
        recommendationCount: recommendations.length,
        hasUserHistory:
          userBehavior.viewedEvents.length > 0 ||
          userBehavior.searchQueries.length > 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("AI Recommendations API Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "AI Recommendations API - Use POST method with userBehavior and events",
    endpoints: {
      POST: "/api/ai-recommendations",
      body: {
        userBehavior: "UserBehavior object",
        events: "Array of EventForRecommendation objects",
      },
    },
  });
}
