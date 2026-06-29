/**
 * Inside Joke Manager
 * Manages relationship-specific inside jokes
 */

import { InsideJoke } from "../types/index.js";

export class InsideJokeManager {
  private jokes: Map<string, InsideJoke[]> = new Map();

  /**
   * Add an inside joke for a relationship
   */
  addJoke(
    relationshipId: string,
    content: string,
    context: string,
    tags: string[] = []
  ): InsideJoke {
    const joke: InsideJoke = {
      id: `joke_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      relationshipId,
      content,
      context,
      createdAt: new Date(),
      usageCount: 0,
      lastUsed: new Date(),
      tags,
    };

    const existing = this.jokes.get(relationshipId) || [];
    existing.push(joke);
    this.jokes.set(relationshipId, existing);

    return joke;
  }

  /**
   * Get random inside joke for relationship
   */
  getRandomJoke(relationshipId: string): InsideJoke | null {
    const jokes = this.jokes.get(relationshipId) || [];
    if (jokes.length === 0) return null;

    // Weight by recency and usage
    const weighted = jokes.map((j) => ({
      joke: j,
      weight: 1 / (j.usageCount + 1) * (Date.now() - j.lastUsed.getTime()),
    }));

    // Normalize weights
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    const normalized = weighted.map((w) => w.weight / totalWeight);

    // Random selection based on weights
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < jokes.length; i++) {
      cumulative += normalized[i];
      if (random <= cumulative) {
        jokes[i].usageCount++;
        jokes[i].lastUsed = new Date();
        return jokes[i];
      }
    }

    return jokes[0];
  }

  /**
   * Recall a specific joke
   */
  recallJoke(relationshipId: string, topic: string): InsideJoke | null {
    const jokes = this.jokes.get(relationshipId) || [];
    return jokes.find((j) => j.tags.includes(topic)) || null;
  }

  /**
   * Get all jokes for a relationship
   */
  getJokes(relationshipId: string): InsideJoke[] {
    return this.jokes.get(relationshipId) || [];
  }
}

export const insideJokeManager = new InsideJokeManager();