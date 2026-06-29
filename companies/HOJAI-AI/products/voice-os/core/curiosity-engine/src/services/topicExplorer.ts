/**
 * Topic Explorer
 * Explores topics in depth and breadth
 */

import { TopicExploration } from "../types/index.js";

// Topic relationship map
const SUB_TOPICS: Record<string, string[]> = {
  work: ["career", "team", "boss", "colleagues", "projects", "deadlines", "salary", "growth"],
  career: ["skills", "interviews", "goals", "networking", "promotion", "learning"],
  family: ["parents", "siblings", "children", "spouse", "extended family", "traditions"],
  health: ["exercise", "diet", "sleep", "stress", "mental health", "habits"],
  finance: ["savings", "investing", "budget", "debt", "income", "retirement"],
  relationships: ["friends", "dating", "family", "networking", "communication"],
  travel: ["destinations", "planning", "experiences", "culture", "memories"],
  technology: ["AI", "apps", "devices", "innovation", "digital life"],
  education: ["learning", "courses", "books", "skills", "teaching"],
  creativity: ["art", "music", "writing", "design", "projects"],
};

export class TopicExplorer {
  private userTopics: Map<string, TopicExploration> = new Map();

  /**
   * Start exploring a topic
   */
  startExploration(topic: string): TopicExploration {
    const exploration: TopicExploration = {
      topic,
      subTopics: SUB_TOPICS[topic.toLowerCase()] || [],
      userKnowledgeLevel: 1,
      interestLevel: 5,
      questionsAsked: 0,
    };

    this.userTopics.set(topic.toLowerCase(), exploration);
    return exploration;
  }

  /**
   * Get next sub-topic to explore
   */
  getNextSubTopic(topic: string): string | null {
    const exploration = this.userTopics.get(topic.toLowerCase());
    if (!exploration || exploration.subTopics.length === 0) return null;

    const asked = exploration.questionsAsked;
    if (asked < exploration.subTopics.length) {
      return exploration.subTopics[asked];
    }
    return null;
  }

  /**
   * Update topic knowledge
   */
  updateKnowledge(topic: string, knowledgeLevel: number, interestLevel: number): void {
    const exploration = this.userTopics.get(topic.toLowerCase());
    if (exploration) {
      exploration.userKnowledgeLevel = Math.max(1, Math.min(10, knowledgeLevel));
      exploration.interestLevel = Math.max(1, Math.min(10, interestLevel));
    }
  }

  /**
   * Increment question count
   */
  incrementQuestions(topic: string): void {
    const exploration = this.userTopics.get(topic.toLowerCase());
    if (exploration) {
      exploration.questionsAsked++;
    }
  }

  /**
   * Get topic exploration data
   */
  getExploration(topic: string): TopicExploration | null {
    return this.userTopics.get(topic.toLowerCase()) || null;
  }

  /**
   * Find related topics
   */
  getRelatedTopics(topic: string): string[] {
    const normalized = topic.toLowerCase();
    const related: string[] = [];

    for (const [key, subTopics] of Object.entries(SUB_TOPICS)) {
      if (key === normalized || subTopics.some((s) => s.includes(normalized))) {
        related.push(key);
      }
    }

    return related;
  }
}

export const topicExplorer = new TopicExplorer();