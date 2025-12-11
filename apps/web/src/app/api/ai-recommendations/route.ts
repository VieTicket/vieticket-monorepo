import { NextRequest, NextResponse } from "next/server";
import {
  aiPersonalizationService,
  type UserBehavior,
  type EventForRecommendation,
  type RecommendationResult,
} from "@vieticket/services/ai-personalization";

// Using advanced AI personalization service with:
// - GPT-3.5-turbo for user profile generation
// - Semantic embeddings for event matching
// - 60% AI scoring + 40% traditional rules
// - True AI personalization vs simple keyword matching

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userBehavior,
      events,
      useGptProfile,
    }: {
      userBehavior: UserBehavior;
      events: EventForRecommendation[];
      useGptProfile?: boolean;
    } = body;

    // Validate input
    if (!userBehavior || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid input: userBehavior and events array required" },
        { status: 400 }
      );
    }

    // Get AI-powered recommendations using advanced service
    let recommendations: RecommendationResult[];
    let usedFallback = false;

    try {
      recommendations =
        await aiPersonalizationService.getPersonalizedRecommendations(
          userBehavior,
          events,
          { useGptProfile: useGptProfile ?? true }
        );
    } catch (aiError: any) {
      // Fallback to simple rule-based recommendations if OpenAI quota exceeded
      console.warn("AI service failed, using fallback logic:", aiError.message);
      usedFallback = true;
      
      // Simple fallback: sort by category match and popularity
      const userCategories = new Set(
        userBehavior.viewedEvents.map(e => e.category).filter(Boolean)
      );
      
      recommendations = events
        .map(event => {
          let score = 0;
          const reasons: string[] = [];
          
          // Category match (40%)
          if (event.category && userCategories.has(event.category)) {
            score += 0.4;
            reasons.push(`Matches your interest in ${event.category}`);
          }
          
          // Location match (20%)
          const userLocations = userBehavior.viewedEvents.map(e => e.location);
          if (event.location && userLocations.includes(event.location)) {
            score += 0.2;
            reasons.push(`Similar location to events you viewed`);
          }
          
          // Random factor (20%) for variety
          score += Math.random() * 0.2;
          
          if (reasons.length === 0) {
            reasons.push('Based on your viewing history');
          }
          
          return {
            event,
            score,
            reason: reasons.join(', '),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }

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
        usedFallback,
        fallbackReason: usedFallback ? "OpenAI quota exceeded" : undefined,
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
