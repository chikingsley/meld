import { OpenWeatherResponse, WeatherResponse } from './types';

export class WeatherAPI {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

  constructor() {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENWEATHER_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  async getWeather(location: string, unit: 'celsius' | 'fahrenheit' = 'celsius'): Promise<WeatherResponse> {
    try {
      const units = unit === 'celsius' ? 'metric' : 'imperial';
      const url = `${this.baseUrl}?q=${encodeURIComponent(location)}&units=${units}&appid=${this.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }

      const data = await response.json() as OpenWeatherResponse;
      
      return {
        location: data.name,
        temperature: data.main.temp,
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        unit: unit,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
