// Trust History Service - Track and manage trust score changes

import { v4 as uuidv4 } from "uuid";
import {
  TrustHistoryEntry,
  TrustScore,
  TrustLevel,
  TrustFactor,
  PaginationParams,
  PaginatedResponse
} from "../types";

/**
 * In-memory history storage
 */
const historyStore: Map<string, TrustHistoryEntry[]> = new Map();
const MAX_HISTORY_ENTRIES = 1000;

/**
 * Trust History Service class
 */
export class TrustHistoryService {
  /**
   * Record a trust score change
   */
  recordTrustChange(
    entityId: string,
    newScore: TrustScore,
    previousScore?: TrustScore,
    trigger?: string,
    notes?: string
  ): TrustHistoryEntry {
    const changeType = this.determineChangeType(newScore.score, previousScore?.score);
    const changeAmount = previousScore
      ? newScore.score - previousScore.score
      : newScore.score;

    const entry: TrustHistoryEntry = {
      id: uuidv4(),
      entityId,
      timestamp: new Date().toISOString(),
      score: newScore.score,
      level: newScore.level,
      changeType,
      changeAmount,
      trigger: trigger || this.getDefaultTrigger(changeType),
      factors: newScore.factors,
      notes
    };

    this.addToHistory(entityId, entry);
    return entry;
  }

  /**
   * Record initial trust score
   */
  recordInitialScore(entityId: string, score: TrustScore): TrustHistoryEntry {
    return this.recordTrustChange(
      entityId,
      score,
      undefined,
      "INITIAL_TRUST_ASSESSMENT",
      "Initial trust score calculated for new entity"
    );
  }

  /**
   * Get trust history for an entity
   */
  getHistory(entityId: string, pagination?: PaginationParams): TrustHistoryEntry[] {
    const history = historyStore.get(entityId) || [];

    if (!pagination) {
      return history.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    return this.paginateHistory(history, pagination);
  }

  /**
   * Get paginated history
   */
  getPaginatedHistory(
    entityId: string,
    pagination: PaginationParams
  ): PaginatedResponse<TrustHistoryEntry> {
    const history = this.getHistory(entityId);
    const sortedHistory = history.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return pagination.sortOrder === "DESC" ? bTime - aTime : aTime - bTime;
    });

    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const items = sortedHistory.slice(start, end);
    const totalPages = Math.ceil(sortedHistory.length / pagination.limit);

    return {
      items,
      total: sortedHistory.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasMore: pagination.page < totalPages
    };
  }

  /**
   * Get history within a date range
   */
  getHistoryInRange(
    entityId: string,
    startDate: Date,
    endDate: Date
  ): TrustHistoryEntry[] {
    const history = historyStore.get(entityId) || [];
    return history.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    }).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get history by change type
   */
  getHistoryByChangeType(
    entityId: string,
    changeType: TrustHistoryEntry["changeType"]
  ): TrustHistoryEntry[] {
    const history = historyStore.get(entityId) || [];
    return history.filter(entry => entry.changeType === changeType);
  }

  /**
   * Get history by trust level
   */
  getHistoryByLevel(entityId: string, level: TrustLevel): TrustHistoryEntry[] {
    const history = historyStore.get(entityId) || [];
    return history.filter(entry => entry.level === level);
  }

  /**
   * Get recent history entries
   */
  getRecentHistory(entityId: string, limit: number = 10): TrustHistoryEntry[] {
    const history = this.getHistory(entityId);
    return history.slice(0, limit);
  }

  /**
   * Get history statistics for an entity
   */
  getHistoryStatistics(entityId: string): {
    totalChanges: number;
    increases: number;
    decreases: number;
    stable: number;
    averageChange: number;
    largestIncrease: number;
    largestDecrease: number;
    firstRecord: TrustHistoryEntry | null;
    lastRecord: TrustHistoryEntry | null;
  } {
    const history = this.getHistory(entityId);

    if (history.length === 0) {
      return {
        totalChanges: 0,
        increases: 0,
        decreases: 0,
        stable: 0,
        averageChange: 0,
        largestIncrease: 0,
        largestDecrease: 0,
        firstRecord: null,
        lastRecord: null
      };
    }

    let increases = 0;
    let decreases = 0;
    let stable = 0;
    let totalChange = 0;
    let largestIncrease = 0;
    let largestDecrease = 0;

    for (const entry of history) {
      switch (entry.changeType) {
        case "INCREASE":
          increases++;
          largestIncrease = Math.max(largestIncrease, entry.changeAmount);
          totalChange += entry.changeAmount;
          break;
        case "DECREASE":
          decreases++;
          largestDecrease = Math.max(largestDecrease, Math.abs(entry.changeAmount));
          totalChange += entry.changeAmount;
          break;
        case "STABLE":
          stable++;
          break;
      }
    }

    return {
      totalChanges: history.length,
      increases,
      decreases,
      stable,
      averageChange: history.length > 0 ? totalChange / history.length : 0,
      largestIncrease,
      largestDecrease,
      firstRecord: history[history.length - 1],
      lastRecord: history[0]
    };
  }

  /**
   * Get all entities with history changes
   */
  getEntitiesWithHistory(): string[] {
    return Array.from(historyStore.keys());
  }

  /**
   * Delete history for an entity
   */
  deleteHistory(entityId: string): boolean {
    return historyStore.delete(entityId);
  }

  /**
   * Prune old history entries
   */
  pruneHistory(maxEntries: number = MAX_HISTORY_ENTRIES): number {
    let totalPruned = 0;

    for (const [entityId, history] of historyStore.entries()) {
      if (history.length > maxEntries) {
        const prunedCount = history.length - maxEntries;
        const sortedHistory = history.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        historyStore.set(entityId, sortedHistory.slice(0, maxEntries));
        totalPruned += prunedCount;
      }
    }

    return totalPruned;
  }

  /**
   * Export history for an entity
   */
  exportHistory(entityId: string, format: "json" | "csv" = "json"): string {
    const history = this.getHistory(entityId);

    if (format === "csv") {
      const headers = [
        "id",
        "entityId",
        "timestamp",
        "score",
        "level",
        "changeType",
        "changeAmount",
        "trigger",
        "notes"
      ].join(",");

      const rows = history.map(entry => [
        entry.id,
        entry.entityId,
        entry.timestamp,
        entry.score.toString(),
        entry.level,
        entry.changeType,
        entry.changeAmount.toString(),
        `"${entry.trigger}"`,
        entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : ""
      ].join(","));

      return [headers, ...rows].join("\n");
    }

    return JSON.stringify(history, null, 2);
  }

  /**
   * Import history for an entity
   */
  importHistory(entityId: string, historyData: TrustHistoryEntry[]): number {
    const existingHistory = historyStore.get(entityId) || [];
    const newHistory = [...historyData, ...existingHistory];

    // Sort and limit
    const sortedHistory = newHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_HISTORY_ENTRIES);

    historyStore.set(entityId, sortedHistory);
    return historyData.length;
  }

  /**
   * Compare two points in history
   */
  compareHistoryPoints(
    entityId: string,
    point1Id: string,
    point2Id: string
  ): {
    scoreChange: number;
    levelChange: boolean;
    factorsChanged: string[];
    timeDifference: number;
  } | null {
    const history = historyStore.get(entityId) || [];
    const point1 = history.find(e => e.id === point1Id);
    const point2 = history.find(e => e.id === point2Id);

    if (!point1 || !point2) return null;

    const time1 = new Date(point1.timestamp).getTime();
    const time2 = new Date(point2.timestamp).getTime();

    const factorsChanged = point1.factors
      .filter(f1 => {
        const f2 = point2.factors.find(f => f.type === f1.type);
        return !f2 || f1.score !== f2.score;
      })
      .map(f => f.type);

    return {
      scoreChange: point1.score - point2.score,
      levelChange: point1.level !== point2.level,
      factorsChanged,
      timeDifference: Math.abs(time2 - time1)
    };
  }

  /**
   * Get history trend for an entity
   */
  getHistoryTrend(entityId: string, days: number = 30): {
    trend: "IMPROVING" | "DECLINING" | "STABLE";
    averageScore: number;
    scoreChange: number;
    dataPoints: Array<{ date: string; score: number }>;
  } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = this.getHistoryInRange(entityId, startDate, endDate);

    if (history.length === 0) {
      return {
        trend: "STABLE",
        averageScore: 0,
        scoreChange: 0,
        dataPoints: []
      };
    }

    const dataPoints = history.map(h => ({
      date: h.timestamp,
      score: h.score
    }));

    const averageScore = history.reduce((sum, h) => sum + h.score, 0) / history.length;
    const scoreChange = history[0].score - history[history.length - 1].score;

    let trend: "IMPROVING" | "DECLINING" | "STABLE";
    if (scoreChange > 5) {
      trend = "IMPROVING";
    } else if (scoreChange < -5) {
      trend = "DECLINING";
    } else {
      trend = "STABLE";
    }

    return {
      trend,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreChange: Math.round(scoreChange * 100) / 100,
      dataPoints: dataPoints.reverse()
    };
  }

  /**
   * Add entry to history
   */
  private addToHistory(entityId: string, entry: TrustHistoryEntry): void {
    const history = historyStore.get(entityId) || [];
    history.unshift(entry);

    // Limit history size
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.pop();
    }

    historyStore.set(entityId, history);
  }

  /**
   * Determine change type
   */
  private determineChangeType(
    newScore: number,
    previousScore?: number
  ): TrustHistoryEntry["changeType"] {
    if (previousScore === undefined) return "INITIAL";

    const change = newScore - previousScore;
    if (Math.abs(change) < 1) return "STABLE";
    return change > 0 ? "INCREASE" : "DECREASE";
  }

  /**
   * Get default trigger message
   */
  private getDefaultTrigger(changeType: TrustHistoryEntry["changeType"]): string {
    switch (changeType) {
      case "INCREASE":
        return "TRUST_SCORE_INCREASED";
      case "DECREASE":
        return "TRUST_SCORE_DECREASED";
      case "STABLE":
        return "TRUST_SCORE_STABLE";
      case "INITIAL":
        return "INITIAL_TRUST_ASSESSMENT";
      default:
        return "UNKNOWN_TRIGGER";
    }
  }

  /**
   * Paginate history
   */
  private paginateHistory(
    history: TrustHistoryEntry[],
    pagination: PaginationParams
  ): TrustHistoryEntry[] {
    const sorted = history.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return pagination.sortOrder === "DESC" ? bTime - aTime : aTime - bTime;
    });

    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;

    return sorted.slice(start, end);
  }
}

export default TrustHistoryService;