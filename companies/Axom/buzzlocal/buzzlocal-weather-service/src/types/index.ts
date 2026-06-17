/**
 * BuzzLocal Weather Service - Types
 *
 * Localized weather intelligence
 */

export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    area: string;
    city: string;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy' | 'partly_cloudy';
    description: string;
    icon: string;
    uvIndex: number;
    visibility: number;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  alerts: WeatherAlert[];
  updatedAt: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  precipitation: number;
  humidity: number;
}

export interface DailyForecast {
  date: string;
  dayName: string;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAlert {
  id: string;
  type: 'rain' | 'heat' | 'storm' | 'flood' | 'air_quality' | 'uv' | 'wind';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  actionable: boolean;
  recommendations?: string[];
}
