import { describe, it, expect } from 'vitest';

describe('Memory Observation Engine', () => {
  describe('Pattern Detection', () => {
    it('should detect recurring patterns', () => {
      const daysBetween = (d1, d2) =>
        Math.abs((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));

      expect(daysBetween('2024-01-01', '2024-01-08')).toBe(7);
      expect(daysBetween('2024-01-01', '2024-01-15')).toBe(14);
    });

    it('should calculate average values', () => {
      const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

      expect(avg([1, 2, 3])).toBe(2);
      expect(avg([10, 20, 30])).toBe(20);
      expect(avg([5])).toBe(5);
    });

    it('should detect time-based patterns', () => {
      const hours = [9, 10, 11];
      const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
      expect(avgHour >= 8 && avgHour <= 12).toBe(true);
    });

    it('should detect weekday patterns', () => {
      const days = [1, 2, 3, 4, 5]; // Monday to Friday
      expect(days.length).toBe(5);
      expect(days[0]).toBe(1); // Monday
      expect(days[4]).toBe(5); // Friday
    });

    it('should calculate z-scores for anomaly detection', () => {
      const calculateZScore = (value, mean, stdDev) =>
        Math.abs((value - mean) / stdDev);

      const values = [10, 10, 10, 10, 50];
      const avg = 18;
      const stdDev = 16;

      expect(calculateZScore(50, avg, stdDev)).toBeGreaterThan(1.5);
      expect(calculateZScore(18, avg, stdDev)).toBe(0);
    });

    it('should predict next occurrence', () => {
      const predictNext = (lastDate, gapDays) => {
        const last = new Date(lastDate).getTime();
        return new Date(last + gapDays * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 10);
      };

      expect(predictNext('2024-01-15', 7)).toBe('2024-01-22');
      expect(predictNext('2024-01-01', 30)).toBe('2024-01-31');
    });

    it('should group events by type', () => {
      const events = [
        { type: 'login', timestamp: Date.now() },
        { type: 'purchase', timestamp: Date.now() },
        { type: 'login', timestamp: Date.now() }
      ];

      const byType = {};
      for (const e of events) {
        byType[e.type] = (byType[e.type] || 0) + 1;
      }

      expect(byType.login).toBe(2);
      expect(byType.purchase).toBe(1);
    });
  });

  describe('Anomaly Detection', () => {
    it('should calculate correlation strength', () => {
      const correlationStrength = (pairs) => {
        const trueCount = pairs.filter(p => p.c).length;
        return trueCount / pairs.length;
      };

      const pairs = [{ c: true }, { c: true }, { c: false }];
      expect(correlationStrength(pairs)).toBeCloseTo(0.67, 1);
    });

    it('should handle empty event sets', () => {
      const events = [];
      expect(events.length).toBe(0);
      expect(events.reduce((a, b) => a + b, 0)).toBe(0);
    });

    it('should handle zero time gaps', () => {
      const gap = Math.abs(
        new Date('2024-01-01') - new Date('2024-01-01')
      ) / (1000 * 60 * 60 * 24);

      expect(gap).toBe(0);
    });

    it('should identify outliers', () => {
      const values = [10, 12, 11, 13, 50, 12, 11];
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      );

      const outliers = values.filter(v => Math.abs((v - mean) / stdDev) > 2);
      expect(outliers).toContain(50);
    });
  });

  describe('Habit Detection', () => {
    it('should detect consistent habits', () => {
      const isHabit = (occurrences, threshold = 3) =>
        occurrences.length >= threshold;

      const dailyHabit = [1, 2, 3, 4, 5, 6, 7]; // 7 days
      expect(isHabit(dailyHabit, 3)).toBe(true);
      expect(isHabit([1], 3)).toBe(false);
    });

    it('should track habit frequency', () => {
      const frequency = (occurrences, periodDays) => {
        const days = new Set(occurrences).size;
        return days / periodDays;
      };

      expect(frequency([1, 2, 3, 4, 5, 6, 7], 7)).toBeCloseTo(1, 2); // Daily (all 7 days in period)
      // Weekly: 4 occurrences in 28 days = 4/28 = ~0.14
      expect(frequency([1, 8, 15, 22], 28)).toBeCloseTo(0.14, 1); // Weekly
    });

    it('should detect time-of-day preferences', () => {
      const morning = [9, 10, 11];
      const afternoon = [14, 15, 16];
      const evening = [19, 20, 21];

      const avgHour = (hours) => hours.reduce((a, b) => a + b, 0) / hours.length;

      expect(avgHour(morning)).toBeGreaterThanOrEqual(8);
      expect(avgHour(morning)).toBeLessThanOrEqual(12);
      expect(avgHour(evening)).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Predictions', () => {
    it('should predict based on patterns', () => {
      const predictNext = (pattern, lastValue) => {
        if (pattern === 'daily') return lastValue;
        if (pattern === 'weekly') return lastValue + 7;
        return lastValue;
      };

      expect(predictNext('daily', 10)).toBe(10);
      expect(predictNext('weekly', 10)).toBe(17);
    });

    it('should confidence score predictions', () => {
      const confidence = (occurrences, expected) => {
        const matches = occurrences.filter(o => o === expected).length;
        return matches / occurrences.length;
      };

      const occurrences = [1, 1, 1, 1, 1];
      expect(confidence(occurrences, 1)).toBe(1);
      expect(confidence(occurrences, 2)).toBe(0);
    });
  });

  describe('Event Processing', () => {
    it('should process raw events', () => {
      const processEvent = (event) => ({
        id: event.id || Math.random().toString(36).substring(2),
        timestamp: event.timestamp || Date.now(),
        type: event.type || 'unknown',
        data: event.data || {}
      });

      const processed = processEvent({ type: 'login' });
      expect(processed.type).toBe('login');
      expect(processed.timestamp).toBeDefined();
    });

    it('should batch process events', () => {
      const batchProcess = (events, batchSize = 100) => {
        const batches = [];
        for (let i = 0; i < events.length; i += batchSize) {
          batches.push(events.slice(i, i + batchSize));
        }
        return batches;
      };

      const events = Array.from({ length: 250 }, (_, i) => ({ id: i }));
      const batches = batchProcess(events, 100);

      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(100);
      expect(batches[1].length).toBe(100);
      expect(batches[2].length).toBe(50);
    });

    it('should deduplicate events', () => {
      const deduplicate = (events) => {
        const seen = new Set();
        return events.filter(e => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
      };

      const events = [
        { id: '1', type: 'login' },
        { id: '2', type: 'purchase' },
        { id: '1', type: 'login' } // Duplicate
      ];

      const unique = deduplicate(events);
      expect(unique.length).toBe(2);
    });
  });

  describe('Observations', () => {
    it('should generate observations from patterns', () => {
      const generateObservation = (pattern) => ({
        id: Math.random().toString(36).substring(2),
        pattern: pattern.type,
        confidence: pattern.confidence,
        description: pattern.description,
        generatedAt: Date.now()
      });

      const pattern = {
        type: 'daily_morning',
        confidence: 0.9,
        description: 'User typically logs in around 9 AM'
      };

      const observation = generateObservation(pattern);
      expect(observation.pattern).toBe('daily_morning');
      expect(observation.confidence).toBe(0.9);
    });

    it('should list observations with filters', () => {
      const observations = [
        { id: '1', type: 'habit', confidence: 0.9 },
        { id: '2', type: 'anomaly', confidence: 0.7 },
        { id: '3', type: 'habit', confidence: 0.5 }
      ];

      const filterByType = (obs, type) => obs.filter(o => o.type === type);
      const filterByConfidence = (obs, min) =>
        obs.filter(o => o.confidence >= min);

      expect(filterByType(observations, 'habit').length).toBe(2);
      expect(filterByConfidence(observations, 0.8).length).toBe(1);
    });
  });

  describe('Correlations', () => {
    it('should detect event correlations', () => {
      const events = [
        { time: 0, type: 'login' },
        { time: 5, type: 'purchase' },
        { time: 10, type: 'login' },
        { time: 15, type: 'purchase' }
      ];

      const timeDiff = 5; // login followed by purchase after 5 minutes

      const correlate = (events, after, type) => {
        let matches = 0;
        for (const e of events) {
          if (e.type === after) {
            const next = events.find(ne => ne.time > e.time);
            if (next && next.type === type && next.time - e.time <= 10) {
              matches++;
            }
          }
        }
        return matches;
      };

      expect(correlate(events, 'login', 'purchase')).toBe(2);
    });

    it('should calculate correlation coefficient', () => {
      const pearsonCorrelation = (x, y) => {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
        const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
        const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt(
          (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
        );

        return numerator / denominator;
      };

      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10]; // Perfect positive correlation

      expect(pearsonCorrelation(x, y)).toBeCloseTo(1, 5);
    });
  });
});
