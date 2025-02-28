import { BaseTool, ToolCall, ToolCallResult } from '../base/BaseTool';
import { WeatherArgs, WeatherResponse } from '../weather/types';

interface CityWeather {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
}

export class FakeWeatherTool extends BaseTool {
  name = 'get_current_weather';  // Keep the same name as it's replacing the original weather tool
  description = 'Get simulated weather in a given location (for testing purposes)';
  parameters = {
    location: {
      type: 'string',
      description: 'The city and state, e.g. San Francisco, CA',
    },
    unit: {
      type: 'string',
      enum: ['celsius', 'fahrenheit'],
      description: 'The unit of temperature to return',
      optional: true
    }
  };

  private cityData: Map<string, CityWeather> = new Map([
    ['Tokyo, Japan', {
      temperature: 18,
      description: 'Clear sky with cherry blossoms',
      humidity: 65,
      windSpeed: 8
    }],
    ['San Francisco, CA', {
      temperature: 19,
      description: 'Foggy morning, sunny afternoon',
      humidity: 75,
      windSpeed: 12
    }],
    ['New York, NY', {
      temperature: 15,
      description: 'Bustling city under partly cloudy skies',
      humidity: 60,
      windSpeed: 15
    }],
    ['London, UK', {
      temperature: 12,
      description: 'Light drizzle with occasional tea breaks',
      humidity: 80,
      windSpeed: 10
    }],
    ['Sydney, Australia', {
      temperature: 25,
      description: 'Perfect beach weather with coastal breeze',
      humidity: 70,
      windSpeed: 14
    }],
    ['Paris, France', {
      temperature: 16,
      description: 'Romantic evening with scattered croissants',
      humidity: 68,
      windSpeed: 9
    }],
    ['Dubai, UAE', {
      temperature: 35,
      description: 'Hot and luxurious with golden sunsets',
      humidity: 45,
      windSpeed: 11
    }],
    ['Mumbai, India', {
      temperature: 30,
      description: 'Warm with spicy street food aroma',
      humidity: 78,
      windSpeed: 13
    }],
    ['Rio de Janeiro, Brazil', {
      temperature: 28,
      description: 'Carnival atmosphere with beach vibes',
      humidity: 72,
      windSpeed: 16
    }],
    ['Vancouver, Canada', {
      temperature: 14,
      description: 'Mountains meet ocean under clear skies',
      humidity: 70,
      windSpeed: 11
    }]
  ]);

  private defaultWeather: CityWeather = {
    temperature: 22,
    description: 'Pleasant weather with a chance of code',
    humidity: 65,
    windSpeed: 10
  };

  async execute(toolCall: ToolCall): Promise<ToolCallResult> {
    try {
      const args = JSON.parse(toolCall.function.arguments) as WeatherArgs;
      
      if (!this.validateArgs(args)) {
        throw new Error('Invalid arguments provided');
      }

      const unit = args.unit || 'celsius';
      const location = args.location;
      
      // Debug logging
      console.log('Weather request for location:', location);
      console.log('Available cities:', Array.from(this.cityData.keys()));
      
      // Try to find the exact match first
      let weatherData = this.cityData.get(location);
      
      // If no exact match, try normalized match
      if (!weatherData) {
        const normalizeLocation = (loc: string) => 
          loc.toLowerCase().replace(/[\s,]+/g, ' ').trim();
        
        const locationNorm = normalizeLocation(location);
        const cityMatch = Array.from(this.cityData.keys()).find(city => 
          normalizeLocation(city) === locationNorm ||
          // Also match just the city part (before the comma)
          normalizeLocation(city.split(',')[0]) === locationNorm
        );
        
        if (cityMatch) {
          weatherData = this.cityData.get(cityMatch);
          console.log('Found match:', cityMatch, 'for input:', location);
        } else {
          console.log('No match found for:', location);
        }
      }
      
      // If still no match, use default
      weatherData = weatherData || this.defaultWeather;
      console.log('Selected weather data:', weatherData);

      // Convert temperature if needed
      const temperature = unit === 'fahrenheit' 
        ? this.celsiusToFahrenheit(weatherData.temperature)
        : weatherData.temperature;

      const response: WeatherResponse = {
        location: args.location,
        temperature,
        description: weatherData.description,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        unit,
        timestamp: new Date().toISOString()
      };

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(response)
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  protected validateArgs(args: WeatherArgs): boolean {
    if (!args.location || typeof args.location !== 'string') {
      return false;
    }
    if (args.unit && !['celsius', 'fahrenheit'].includes(args.unit)) {
      return false;
    }
    return true;
  }

  private celsiusToFahrenheit(celsius: number): number {
    return Math.round((celsius * 9/5) + 32);
  }
}
