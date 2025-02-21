import { BaseTool, ToolCall, ToolCallResult } from '../base/BaseTool';
import { WeatherAPI } from './api';
import { WeatherArgs } from './types';

export class WeatherTool extends BaseTool {
  name = 'get_real_weather';
  description = 'Get real-time weather information for a given location using OpenWeatherMap API';
  parameters = {
    location: {
      type: 'string',
      description: 'The city and state/country, e.g. "San Francisco, CA" or "London, UK"'
    },
    unit: {
      type: 'string',
      enum: ['celsius', 'fahrenheit'],
      description: 'The unit of temperature to return',
      optional: true
    }
  };

  private api: WeatherAPI;

  constructor() {
    super();
    this.api = new WeatherAPI();
  }

  async execute(toolCall: ToolCall): Promise<ToolCallResult> {
    try {
      const args = JSON.parse(toolCall.function.arguments) as WeatherArgs;
      
      if (!this.validateArgs(args)) {
        throw new Error('Invalid arguments provided');
      }

      const weatherData = await this.api.getWeather(args.location, args.unit);

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(weatherData)
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
}
