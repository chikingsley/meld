export interface WeatherArgs {
  location: string;
  unit?: 'celsius' | 'fahrenheit';
}

export interface WeatherResponse {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  unit: string;
  timestamp: string;
}

export interface OpenWeatherResponse {
  weather: [{
    description: string;
    main: string;
  }];
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  name: string;
}
