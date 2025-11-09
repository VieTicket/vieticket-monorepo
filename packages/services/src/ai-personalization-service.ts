import OpenAI from 'openai';

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
  preferences: {
    categories: string[];
    priceRange: { min: number; max: number };
    locations: string[];
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
    availableEvents: EventForRecommendation[]
  ): Promise<RecommendationResult[]> {
    console.log('🤖 AI Personalization: Starting recommendation generation');
    console.log('📊 User Behavior:', {
      searchQueries: userBehavior.searchQueries.length,
      viewedEvents: userBehavior.viewedEvents.length,
      clickedEvents: userBehavior.clickedEvents.length,
      categories: userBehavior.preferences.categories,
      locations: userBehavior.preferences.locations
    });
    console.log('🎯 Available Events:', availableEvents.length);

    try {
      if (!this.openai) {
        console.warn('⚠️ OpenAI not configured, falling back to keyword-based recommendations');
        return this.getFallbackRecommendations(userBehavior, availableEvents);
      }

      console.log('✅ OpenAI configured, using AI-powered analysis');

      // Analyze user preferences using AI
      const userProfile = await this.generateUserProfile(userBehavior);
      console.log('👤 Generated User Profile:', userProfile);
      
      // Score events based on user profile
      const recommendations = await Promise.all(
        availableEvents.map(async (event) => {
          const score = await this.calculateEventScore(event, userProfile, userBehavior);
          const reason = this.generateRecommendationReason(event, userProfile);
          
          console.log(`📈 Event "${event.title}" score: ${(score * 100).toFixed(1)}%`);
          
          return {
            event,
            score,
            reason
          };
        })
      );

      // Sort by score and return top recommendations
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      console.log('🎉 Top Recommendations Generated:', sortedRecommendations.map(r => ({
        title: r.event.title,
        score: (r.score * 100).toFixed(1) + '%',
        reason: r.reason
      })));

      return sortedRecommendations;

    } catch (error) {
      console.error('❌ AI recommendation error:', error);
      return this.getFallbackRecommendations(userBehavior, availableEvents);
    }
  }

  /**
   * Generate user profile using AI analysis
   */
  private async generateUserProfile(userBehavior: UserBehavior): Promise<string> {
    if (!this.openai) return '';

    const behaviorText = this.formatUserBehaviorForAI(userBehavior);
    console.log('🔍 Analyzing user behavior text:', behaviorText.substring(0, 200) + '...');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an AI that analyzes user behavior to create a concise user profile for event recommendations. Respond with only the key interests, preferences, and patterns in 2-3 sentences."
          },
          {
            role: "user",
            content: `Analyze this user's event browsing behavior and create a profile:\n\n${behaviorText}`
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      const profile = response.choices[0]?.message?.content || '';
      console.log('🧠 AI Generated Profile:', profile);
      return profile;
    } catch (error) {
      console.error('❌ Error generating user profile:', error);
      return '';
    }
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
        console.log('📊 Using AI embeddings for semantic analysis');
        // Get embeddings for user profile and event
        const [userEmbedding, eventEmbedding] = await Promise.all([
          this.getEmbedding(userProfile),
          this.getEmbedding(this.formatEventForEmbedding(event))
        ]);

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(userEmbedding, eventEmbedding);
        score += similarity * 0.6; // 60% weight for AI similarity
        console.log(`🎯 AI similarity score: ${(similarity * 100).toFixed(1)}%`);
      }

      // Add category preference score
      const categoryScore = this.calculateCategoryScore(event, userBehavior);
      score += categoryScore * 0.2; // 20% weight
      console.log(`📂 Category score: ${(categoryScore * 100).toFixed(1)}%`);

      // Add location preference score
      const locationScore = this.calculateLocationScore(event, userBehavior);
      score += locationScore * 0.1; // 10% weight
      console.log(`📍 Location score: ${(locationScore * 100).toFixed(1)}%`);

      // Add price preference score
      const priceScore = this.calculatePriceScore(event, userBehavior);
      score += priceScore * 0.1; // 10% weight
      console.log(`💰 Price score: ${(priceScore * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('❌ Error calculating event score:', error);
      // Fallback to simple keyword matching
      score = this.calculateKeywordScore(event, userBehavior);
      console.log(`🔤 Fallback keyword score: ${(score * 100).toFixed(1)}%`);
    }

    const finalScore = Math.max(0, Math.min(1, score));
    console.log(`✅ Final score for "${event.title}": ${(finalScore * 100).toFixed(1)}%`);
    return finalScore; // Normalize between 0-1
  }

  /**
   * Get text embedding using OpenAI
   */
  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.openai) return [];

    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      return response.data[0]?.embedding || [];
    } catch (error) {
      console.error('Error getting embedding:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;

    const dotProduct = a.reduce((sum, a_i, i) => sum + a_i * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, a_i) => sum + a_i * a_i, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, b_i) => sum + b_i * b_i, 0));

    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
  }

  /**
   * Format user behavior for AI analysis
   */
  private formatUserBehaviorForAI(userBehavior: UserBehavior): string {
    const searchQueries = userBehavior.searchQueries.slice(-10).join(', ');
    const viewedEvents = userBehavior.viewedEvents.slice(-5).map(e => `${e.title} (${e.category})`).join(', ');
    const clickedEvents = userBehavior.clickedEvents.slice(-5).map(e => `${e.title} (${e.category})`).join(', ');
    
    return `
Search queries: ${searchQueries}
Viewed events: ${viewedEvents}
Clicked events: ${clickedEvents}
Preferred categories: ${userBehavior.preferences.categories.join(', ')}
Price range: ${userBehavior.preferences.priceRange.min} - ${userBehavior.preferences.priceRange.max}
Preferred locations: ${userBehavior.preferences.locations.join(', ')}
    `.trim();
  }

  /**
   * Format event for embedding
   */
  private formatEventForEmbedding(event: EventForRecommendation): string {
    return `${event.title} ${event.description || ''} ${event.category || ''} ${event.location || ''}`.trim();
  }

  /**
   * Calculate category preference score
   */
  private calculateCategoryScore(event: EventForRecommendation, userBehavior: UserBehavior): number {
    if (!event.category) return 0;
    
    const categoryCount = userBehavior.preferences.categories.filter(
      cat => cat.toLowerCase() === event.category?.toLowerCase()
    ).length;
    
    return Math.min(1, categoryCount / Math.max(1, userBehavior.preferences.categories.length));
  }

  /**
   * Calculate location preference score
   */
  private calculateLocationScore(event: EventForRecommendation, userBehavior: UserBehavior): number {
    if (!event.location) return 0;
    
    const locationMatch = userBehavior.preferences.locations.some(
      loc => event.location?.toLowerCase().includes(loc.toLowerCase())
    );
    
    return locationMatch ? 1 : 0;
  }

  /**
   * Calculate price preference score
   */
  private calculatePriceScore(event: EventForRecommendation, userBehavior: UserBehavior): number {
    if (!event.price) return 0.5; // Neutral score for free events
    
    const { min, max } = userBehavior.preferences.priceRange;
    if (event.price >= min && event.price <= max) return 1;
    if (event.price < min) return Math.max(0, 1 - (min - event.price) / min);
    if (event.price > max) return Math.max(0, 1 - (event.price - max) / event.price);
    
    return 0;
  }

  /**
   * Simple keyword-based scoring fallback
   */
  private calculateKeywordScore(event: EventForRecommendation, userBehavior: UserBehavior): number {
    const eventText = this.formatEventForEmbedding(event).toLowerCase();
    const userQueries = userBehavior.searchQueries.join(' ').toLowerCase();
    
    let score = 0;
    const keywords = userQueries.split(/\s+/).filter(w => w.length > 2);
    
    keywords.forEach(keyword => {
      if (eventText.includes(keyword)) {
        score += 0.1;
      }
    });
    
    return Math.min(1, score);
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(event: EventForRecommendation, userProfile: string): string {
    const reasons = [];
    
    if (userProfile && event.category) {
      reasons.push(`Matches your interest in ${event.category.toLowerCase()} events`);
    }
    
    if (event.location) {
      reasons.push(`Located in ${event.location}`);
    }
    
    if (reasons.length === 0) {
      reasons.push('Recommended based on your browsing history');
    }
    
    return reasons.join(' • ');
  }

  /**
   * Fallback recommendations when AI is not available
   */
  private getFallbackRecommendations(
    userBehavior: UserBehavior,
    availableEvents: EventForRecommendation[]
  ): RecommendationResult[] {
    return availableEvents
      .map(event => ({
        event,
        score: this.calculateKeywordScore(event, userBehavior),
        reason: 'Based on your search history'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}

// Export singleton instance
export const aiPersonalizationService = new AIPersonalizationService();