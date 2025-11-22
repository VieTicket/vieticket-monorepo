import { NextRequest, NextResponse } from 'next/server';
import { 
  aiPersonalizationService,
  type UserBehavior,
  type EventForRecommendation,
  type RecommendationResult
} from "@vieticket/services/ai-personalization";

// Using advanced AI personalization service with:
// - GPT-3.5-turbo for user profile generation  
// - Semantic embeddings for event matching
// - 60% AI scoring + 40% traditional rules
// - True AI personalization vs simple keyword matching

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userBehavior, events, useGptProfile }: { 
      userBehavior: UserBehavior; 
      events: EventForRecommendation[];
      useGptProfile?: boolean;
    } = body;

    // Validate input
    if (!userBehavior || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid input: userBehavior and events array required' },
        { status: 400 }
      );
    }

    // Get AI-powered recommendations using advanced service
    const recommendations = await aiPersonalizationService.getPersonalizedRecommendations(
      userBehavior,
      events,
      { useGptProfile: useGptProfile ?? true }
    );

    return NextResponse.json({
      success: true,
      recommendations,
      metadata: {
        totalEvents: events.length,
        recommendationCount: recommendations.length,
        hasUserHistory: userBehavior.viewedEvents.length > 0 || userBehavior.searchQueries.length > 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI Recommendations API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Recommendations API - Use POST method with userBehavior and events',
    endpoints: {
      POST: '/api/ai-recommendations',
      body: {
        userBehavior: 'UserBehavior object',
        events: 'Array of EventForRecommendation objects'
      }
    }
  });
}