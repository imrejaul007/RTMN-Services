/**
 * Waitron → BuzzLocal Weather Connector
 *
 * Connects Waitron's demand prediction to BuzzLocal's weather service
 * Enables real weather-based demand forecasting
 *
 * Flow: Waitron Twin (7AM) → Weather API → Demand Prediction
 *
 * @module waitron-weather-connector
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

export interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'partly_cloudy' | 'cloudy' | 'light_rain' | 'rain' | 'heavy_rain' | 'storm' | 'fog' | 'hot' | 'cold';
  humidity: number;
  windSpeed: number;
  precipitation: number;
  feelsLike: number;
  visibility: number;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  forecast?: {
    hourly: Array<{
      hour: number;
      condition: string;
      temp: number;
      precipChance: number;
    }>;
  };
  timestamp: string;
}

export interface WeatherAlert {
  id: string;
  type: 'rain' | 'storm' | 'heat' | 'cold' | 'fog';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  startTime: string;
  endTime: string;
}

export interface DemandMultiplier {
  delivery: number;      // Multiplier for delivery demand
  dineIn: number;        // Multiplier for dine-in demand
  takeaway: number;      // Multiplier for takeaway demand
  overall: number;       // Overall demand multiplier
  reason: string;        // Explanation for the multipliers
}

export interface WeatherPrediction {
  weather: WeatherData;
  demandMultiplier: DemandMultiplier;
  recommendations: string[];
  alerts: WeatherAlert[];
  confidence: number;
  generatedAt: string;
}

export class WeatherConnector {
  private client: AxiosInstance;
  private cache: Map<string, { data: WeatherData; expiry: number }> = new Map();
  private defaultLocation = {
    latitude: 12.9716,    // Bangalore
    longitude: 77.5946,
    name: 'Bangalore'
  };

  constructor(config?: {
    baseUrl?: string;
    apiKey?: string;
    cacheTtlMs?: number;
    logger?: winston.Logger;
  }) {
    const baseUrl = config?.baseUrl || process.env.BUZZLOCAL_WEATHER_URL || 'http://localhost:4301';
    const apiKey = config?.apiKey || process.env.BUZZLOCAL_API_KEY || '';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      }
    });

    if (config?.logger) {
      logger = config.logger;
    }

    logger.info('WeatherConnector initialized', { baseUrl });
  }

  /**
   * Get current weather for a location
   * Uses cache to avoid excessive API calls
   */
  async getWeather(location?: {
    latitude: number;
    longitude: number;
    name?: string;
  }): Promise<WeatherData> {
    const loc = location || this.defaultLocation;
    const cacheKey = `weather:${loc.latitude}:${loc.longitude}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      logger.debug('Weather cache hit', { location: loc.name });
      return cached.data;
    }

    try {
      logger.info('Fetching weather from BuzzLocal', { location: loc });

      const response = await this.client.get('/api/weather', {
        params: {
          latitude: loc.latitude,
          longitude: loc.longitude
        }
      });

      const weatherData: WeatherData = {
        temperature: response.data.temperature || response.data.temp || 28,
        condition: this.normalizeCondition(response.data.condition),
        humidity: response.data.humidity || 65,
        windSpeed: response.data.windSpeed || response.data.wind_speed || 0,
        precipitation: response.data.precipitation || 0,
        feelsLike: response.data.feelsLike || response.data.feels_like || response.data.temperature || 28,
        visibility: response.data.visibility || 10,
        location: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          name: loc.name || 'Unknown'
        },
        timestamp: new Date().toISOString()
      };

      // Parse forecast if available
      if (response.data.forecast?.hourly) {
        weatherData.forecast = {
          hourly: response.data.forecast.hourly.map((h: any) => ({
            hour: h.hour,
            condition: this.normalizeCondition(h.condition),
            temp: h.temp,
            precipChance: h.precipChance || 0
          }))
        };
      }

      // Cache for 15 minutes
      this.cache.set(cacheKey, {
        data: weatherData,
        expiry: Date.now() + 15 * 60 * 1000
      });

      logger.info('Weather fetched successfully', {
        condition: weatherData.condition,
        temp: weatherData.temperature
      });

      return weatherData;
    } catch (error: any) {
      logger.error('Failed to fetch weather', {
        error: error.message,
        location: loc
      });

      // Return default weather on failure (graceful degradation)
      return this.getDefaultWeather(loc);
    }
  }

  /**
   * Get weather alerts for a location
   */
  async getAlerts(location?: {
    latitude: number;
    longitude: number;
  }, radiusKm: number = 10): Promise<WeatherAlert[]> {
    const loc = location || this.defaultLocation;

    try {
      const response = await this.client.get('/api/alerts', {
        params: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          radius: radiusKm * 1000 // Convert to meters
        }
      });

      return (response.data.alerts || []).map((alert: any) => ({
        id: alert.id || `alert_${Date.now()}`,
        type: alert.type || 'rain',
        severity: alert.severity || 'low',
        title: alert.title || 'Weather Alert',
        message: alert.message || '',
        startTime: alert.startTime || alert.start_time || new Date().toISOString(),
        endTime: alert.endTime || alert.end_time || new Date().toISOString()
      }));
    } catch (error: any) {
      logger.warn('Failed to fetch weather alerts', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate demand multipliers based on weather conditions
   * These multipliers affect Waitron's demand prediction
   */
  calculateDemandMultiplier(weather: WeatherData): DemandMultiplier {
    const multipliers: DemandMultiplier = {
      delivery: 1.0,
      dineIn: 1.0,
      takeaway: 1.0,
      overall: 1.0,
      reason: ''
    };

    const reasons: string[] = [];

    // Rain conditions - increases delivery, decreases dine-in
    if (weather.condition === 'rain' || weather.condition === 'heavy_rain' || weather.condition === 'storm') {
      multipliers.delivery = 1.35;      // +35% delivery
      multipliers.dineIn = 0.65;        // -35% dine-in
      multipliers.takeaway = 1.15;      // +15% takeaway
      reasons.push('Heavy rain increases delivery demand');
    } else if (weather.condition === 'light_rain') {
      multipliers.delivery = 1.20;      // +20% delivery
      multipliers.dineIn = 0.85;        // -15% dine-in
      multipliers.takeaway = 1.10;      // +10% takeaway
      reasons.push('Light rain increases delivery demand');
    }

    // Hot weather - cold beverages, lighter food
    if (weather.temperature > 32 || weather.condition === 'hot') {
      multipliers.dineIn = 0.90;        // -10% dine-in (people stay home)
      multipliers.delivery = 1.10;      // +10% delivery
      reasons.push('Hot weather reduces dine-in traffic');
    }

    // Cold weather - hot food, comfort eating
    if (weather.temperature < 20 || weather.condition === 'cold') {
      multipliers.dineIn = 1.15;        // +15% dine-in
      multipliers.delivery = 0.95;      // -5% delivery
      reasons.push('Cold weather increases dine-in traffic');
    }

    // Fog - reduces evening traffic
    if (weather.condition === 'fog') {
      multipliers.dineIn = 0.80;        // -20% dine-in
      multipliers.delivery = 1.10;      // +10% delivery
      reasons.push('Fog reduces evening dine-in');
    }

    // High humidity - comfort food demand
    if (weather.humidity > 80) {
      multipliers.takeaway = 1.10;      // +10% takeaway
      reasons.push('High humidity increases comfort food demand');
    }

    // Calculate overall multiplier (weighted average)
    multipliers.overall = (
      multipliers.delivery * 0.4 +
      multipliers.dineIn * 0.35 +
      multipliers.takeaway * 0.25
    );

    multipliers.reason = reasons.length > 0
      ? reasons.join('; ')
      : 'Normal weather conditions';

    logger.info('Demand multipliers calculated', { multipliers });

    return multipliers;
  }

  /**
   * Get complete weather prediction for Waitron
   * Combines weather data, alerts, and demand multipliers
   */
  async getWeatherPrediction(location?: {
    latitude: number;
    longitude: number;
    name?: string;
  }): Promise<WeatherPrediction> {
    const loc = location || this.defaultLocation;

    // Fetch weather and alerts in parallel
    const [weather, alerts] = await Promise.all([
      this.getWeather(loc),
      this.getAlerts(loc)
    ]);

    // Calculate demand multipliers
    const demandMultiplier = this.calculateDemandMultiplier(weather);

    // Generate recommendations based on weather
    const recommendations = this.generateRecommendations(weather, demandMultiplier);

    // Calculate confidence based on data quality
    let confidence = 0.85;
    if (!weather.forecast) confidence -= 0.1;
    if (alerts.length > 0) confidence += 0.05;
    if (weather.visibility < 5) confidence -= 0.05;

    return {
      weather,
      demandMultiplier,
      recommendations,
      alerts,
      confidence: Math.min(0.95, Math.max(0.70, confidence)),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate operational recommendations based on weather
   */
  private generateRecommendations(weather: WeatherData, multiplier: DemandMultiplier): string[] {
    const recommendations: string[] = [];

    // Staffing recommendations
    if (multiplier.delivery > 1.2) {
      recommendations.push('Increase delivery staff by 20-30%');
      recommendations.push('Pre-position delivery bikes for rush');
    }
    if (multiplier.dineIn > 1.1) {
      recommendations.push('Add servers for expected dine-in surge');
      recommendations.push('Open additional tables if available');
    }

    // Inventory recommendations
    if (weather.condition.includes('rain')) {
      recommendations.push('Stock up on delivery packaging');
      recommendations.push('Prepare comfort food menu items');
    }
    if (weather.temperature > 32) {
      recommendations.push('Increase cold beverage inventory');
      recommendations.push('Prepare lighter menu options');
    }

    // Kitchen recommendations
    if (multiplier.delivery > 1.15) {
      recommendations.push('Prioritize delivery orders in kitchen');
      recommendations.push('Pre-prep popular delivery items');
    }

    // Marketing recommendations
    if (multiplier.delivery > 1.2) {
      recommendations.push('Activate delivery promotions');
      recommendations.push('Send delivery-focused push notifications');
    }

    return recommendations;
  }

  /**
   * Normalize weather condition to standard format
   */
  private normalizeCondition(condition: string): WeatherData['condition'] {
    if (!condition) return 'sunny';

    const lower = condition.toLowerCase().replace(/[_\s]+/g, '_');

    const conditionMap: Record<string, WeatherData['condition']> = {
      'clear': 'sunny',
      'sunny': 'sunny',
      'partly_cloudy': 'partly_cloudy',
      'partlycloudy': 'partly_cloudy',
      'cloudy': 'cloudy',
      'overcast': 'cloudy',
      'light_rain': 'light_rain',
      'lightrain': 'light_rain',
      'drizzle': 'light_rain',
      'rain': 'rain',
      'heavy_rain': 'heavy_rain',
      'heavyrain': 'heavy_rain',
      'storm': 'storm',
      'thunderstorm': 'storm',
      'fog': 'fog',
      'mist': 'fog',
      'hot': 'hot',
      'heat': 'hot',
      'cold': 'cold',
      'winter': 'cold'
    };

    return conditionMap[lower] || 'partly_cloudy';
  }

  /**
   * Return default weather on API failure (graceful degradation)
   */
  private getDefaultWeather(location: { latitude: number; longitude: number; name?: string }): WeatherData {
    logger.warn('Using default weather data');

    return {
      temperature: 28,
      condition: 'partly_cloudy',
      humidity: 65,
      windSpeed: 5,
      precipitation: 0,
      feelsLike: 29,
      visibility: 10,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name || 'Unknown'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear weather cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Weather cache cleared');
  }

  /**
   * Health check for weather service
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; service: string }> {
    const start = Date.now();

    try {
      await this.client.get('/health', { timeout: 2000 });
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        service: 'buzzlocal-weather'
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        service: 'buzzlocal-weather'
      };
    }
  }
}

// Export singleton instance
export const weatherConnector = new WeatherConnector();

export default WeatherConnector;