/**
 * 🧠 TOLEE MEM0 ENGINE
 * Intelligent, self-improving long-term memory layer inspired by mem0ai/mem0.
 * Capabilities:
 * 1. Automatic Preference & Fact Extraction from natural chat (non-blocking).
 * 2. Semantic & Category-aware Memory Retrieval for LLM context injection.
 * 3. Smart Deduplication & Conflict Resolution (updates outdated facts).
 * 4. Optional Mem0 Cloud API synchronization when MEM0_API_KEY is configured.
 */

import { prisma } from '@/lib/prisma';

export interface ExtractedFact {
  category: 'personal' | 'preference' | 'travel' | 'work' | 'finance' | 'family';
  key: string;
  value: string;
}

export class ToleeMem0Engine {
  /**
   * Fast, deterministic heuristic rules for instant fact extraction
   * without incurring extra LLM billing or latency.
   */
  private static extractHeuristicFacts(text: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    const t = text.trim();
    const lower = t.toLowerCase();

    // 1. City / Location
    const cityMatch = lower.match(
      /(?:i live in|i'm located in|i stay in|main\s+([a-zA-Z]+)\s+me\s+rehta\s+hoon|mera\s+shehar\s+([a-zA-Z]+)\s+hai|home town is\s+([a-zA-Z]+))\s*([a-zA-Z]+)?/i
    );
    if (cityMatch) {
      const city = cityMatch[1] || cityMatch[2] || cityMatch[3] || cityMatch[4];
      if (city && city.length > 2 && !['a', 'the', 'my', 'is'].includes(city.toLowerCase())) {
        facts.push({
          category: 'personal',
          key: 'home_city',
          value: city.charAt(0).toUpperCase() + city.slice(1).toLowerCase(),
        });
      }
    }

    // 2. Direct Name Declaration
    const nameMatch = lower.match(/(?:my name is|mera naam|call me)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      if (!['tolee', 'ai', 'user', 'assistant'].includes(name.toLowerCase())) {
        facts.push({
          category: 'personal',
          key: 'preferred_name',
          value: name,
        });
      }
    }

    // 3. Profession / Work Role
    const jobMatch = lower.match(
      /(?:i work as a|i am a|i'm a|main ek|profile is|looking for jobs? as|meri job)\s+([a-zA-Z0-9\s\/\+\#]+?)(?:\s+(?:developer|engineer|manager|designer|analyst|specialist|freelancer|consultant|student|doctor|lawyer|teacher))/i
    );
    if (jobMatch) {
      const role = (jobMatch[0].replace(/^(?:i work as a|i am a|i'm a|main ek|profile is|looking for jobs? as|meri job)\s+/i, '')).trim();
      if (role.length > 2) {
        facts.push({
          category: 'work',
          key: 'profession_role',
          value: role,
        });
      }
    }

    // 4. Movie / Entertainment Preferences
    if (lower.includes('movie') || lower.includes('film') || lower.includes('cinema')) {
      if (/(?:hate|dislike|pasand nahi|mat dikhao)\s+(?:horror|action|romantic|comedy|sci-fi|thriller)/i.test(lower)) {
        const genre = lower.match(/\b(horror|action|romantic|comedy|sci-fi|thriller)\b/i)?.[1];
        if (genre) {
          facts.push({
            category: 'preference',
            key: 'disliked_movie_genre',
            value: genre.toLowerCase(),
          });
        }
      } else if (/(?:love|like|favorite|pasand hai|fan of)\s+([a-zA-Z\s]+?)\s+(?:movies|films)/i.test(lower)) {
        const genre = lower.match(/(?:love|like|favorite|pasand hai|fan of)\s+([a-zA-Z\s]+?)\s+(?:movies|films)/i)?.[1];
        if (genre) {
          facts.push({
            category: 'preference',
            key: 'favorite_movie_genre',
            value: genre.trim(),
          });
        }
      }
    }

    // 5. Travel & Hotel Preferences
    if (lower.includes('hotel') || lower.includes('flight') || lower.includes('travel') || lower.includes('stay')) {
      const budgetMatch = lower.match(/(?:budget|under|max|around)\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)?(?:\s*k)?)/i);
      if (budgetMatch) {
        facts.push({
          category: 'travel',
          key: 'hotel_travel_budget',
          value: `Under ₹${budgetMatch[1]} per night`,
        });
      }
      if (lower.includes('5 star') || lower.includes('5-star') || lower.includes('luxury')) {
        facts.push({ category: 'travel', key: 'hotel_tier_preference', value: '5-Star Luxury' });
      } else if (lower.includes('3 star') || lower.includes('3-star') || lower.includes('budget hotel')) {
        facts.push({ category: 'travel', key: 'hotel_tier_preference', value: '3-Star / Budget Friendly' });
      }
    }

    // 6. Food & Dietary Preferences
    if (lower.includes('vegetarian') || lower.includes('shakahari') || lower.includes('veg only')) {
      facts.push({ category: 'preference', key: 'dietary_preference', value: 'Strict Vegetarian' });
    } else if (lower.includes('non-veg') || lower.includes('non veg') || lower.includes('mansahari')) {
      facts.push({ category: 'preference', key: 'dietary_preference', value: 'Non-Vegetarian' });
    } else if (lower.includes('vegan')) {
      facts.push({ category: 'preference', key: 'dietary_preference', value: 'Vegan' });
    }

    return facts;
  }

  /**
   * 1. Extract and store facts from message in the background.
   * Resolves conflicts by updating existing keys instead of creating duplicates.
   */
  public static async extractAndStoreMemories(
    userId: string,
    userMessage: string,
    aiResponse?: string
  ): Promise<ExtractedFact[]> {
    if (!userId || !userMessage || userMessage.trim().length < 5) return [];

    try {
      const facts = this.extractHeuristicFacts(userMessage);
      if (facts.length === 0) return [];

      for (const fact of facts) {
        // Conflict resolution: check if key exists for this user
        const existing = await prisma.aIMemory.findFirst({
          where: {
            userId,
            key: fact.key,
          },
        });

        if (existing) {
          if (existing.value.toLowerCase() !== fact.value.toLowerCase()) {
            await prisma.aIMemory.update({
              where: { id: existing.id },
              data: {
                value: fact.value,
                category: fact.category,
                updatedAt: new Date(),
              },
            });
            console.log(`[ToleeMem0] Updated memory fact for ${userId}: ${fact.key} -> ${fact.value}`);
          }
        } else {
          await prisma.aIMemory.create({
            data: {
              userId,
              key: fact.key,
              value: fact.value,
              category: fact.category,
              isSensitive: false,
            },
          });
          console.log(`[ToleeMem0] Stored new memory fact for ${userId}: ${fact.key} -> ${fact.value}`);
        }
      }

      // Optional: Sync with Mem0 Cloud if configured
      if (process.env.MEM0_API_KEY) {
        this.syncWithMem0Cloud(userId, userMessage, aiResponse).catch((err) => {
          console.warn('[ToleeMem0] Cloud sync notice:', err?.message);
        });
      }

      return facts;
    } catch (err: any) {
      console.warn('[ToleeMem0] Memory extraction error:', err?.message);
      return [];
    }
  }

  /**
   * 2. Semantic & Category-Ranked Memory Retrieval for Context Injection.
   * Matches user's current query intent with stored memory keys/values.
   */
  public static async getRelevantMemories(
    userId: string,
    currentQuery: string,
    limit = 8
  ): Promise<Array<{ key: string; value: string; category: string; score: number }>> {
    if (!userId) return [];

    try {
      const allMemories = await prisma.aIMemory.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 30, // inspect last 30 memories
      });

      if (allMemories.length === 0) return [];

      const qTokens = (currentQuery || '').toLowerCase().split(/[\s,.\?!;:]+/).filter((w) => w.length > 2);
      const isTravelQuery = /\b(hotel|flight|trip|tour|travel|stay|vacation|room|train|irctc|goa|mumbai|delhi)\b/i.test(currentQuery);
      const isMovieQuery = /\b(movie|film|cinema|theatre|theater|showtime|ticket|actor|actress|bms|bookmyshow)\b/i.test(currentQuery);
      const isJobQuery = /\b(job|apply|career|resume|cv|hiring|company|interview|developer|role|naukri|linkedin)\b/i.test(currentQuery);
      const isFoodQuery = /\b(food|restaurant|dinner|lunch|breakfast|eat|swiggy|zomato|cafe|cuisine)\b/i.test(currentQuery);

      const scored = allMemories.map((m: any) => {
        let score = 1; // base score

        // Category boosts
        if (isTravelQuery && m.category === 'travel') score += 15;
        if (isMovieQuery && (m.key.includes('movie') || m.key.includes('genre'))) score += 15;
        if (isJobQuery && m.category === 'work') score += 15;
        if (isFoodQuery && (m.key.includes('diet') || m.key.includes('food'))) score += 15;

        // Core Identity always gets priority baseline
        if (m.key === 'preferred_name' || m.key === 'home_city' || m.key === 'native_language') {
          score += 8;
        }

        // Token match boost
        const keyLower = m.key.toLowerCase();
        const valLower = m.value.toLowerCase();
        for (const token of qTokens) {
          if (keyLower.includes(token) || valLower.includes(token)) {
            score += 5;
          }
        }

        return {
          key: m.key,
          value: m.value,
          category: m.category,
          score,
        };
      });

      // Sort by relevance score descending
      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, limit);
    } catch (err: any) {
      console.warn('[ToleeMem0] Relevance search error:', err?.message);
      return [];
    }
  }

  /**
   * 3. Mem0 Cloud API sync (when MEM0_API_KEY is present)
   */
  private static async syncWithMem0Cloud(
    userId: string,
    userMessage: string,
    aiResponse?: string
  ): Promise<void> {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) return;

    const messages = [{ role: 'user', content: userMessage }];
    if (aiResponse) {
      messages.push({ role: 'assistant', content: aiResponse });
    }

    await fetch('https://api.mem0.ai/v1/memories/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({
        messages,
        user_id: userId,
        output_format: 'v1.1',
      }),
    });
  }
}
