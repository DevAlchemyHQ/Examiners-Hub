import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Cloud, CloudRain, Sun, CloudLightning, CloudSnow, CloudFog, Loader2 } from 'lucide-react';

interface WeatherData {
  temp: number;
  condition: string;
}

export const WeatherDate: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,weather_code'
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();
        
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: getWeatherCondition(data.current.weather_code)
        });
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError('Unable to load weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = () => {
    if (!weather) return <Cloud className="w-4 h-4" />;
    
    switch (weather.condition.toLowerCase()) {
      case 'rain':
      case 'drizzle':
        return <CloudRain className="w-4 h-4" />;
      case 'clear':
        return <Sun className="w-4 h-4" />;
      case 'thunderstorm':
        return <CloudLightning className="w-4 h-4" />;
      case 'snow':
        return <CloudSnow className="w-4 h-4" />;
      case 'fog':
      case 'mist':
        return <CloudFog className="w-4 h-4" />;
      default:
        return <Cloud className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-gray-300">
      <span>{format(new Date(), 'EEE, d MMM')}</span>
      <span className="w-px h-3 bg-slate-200 dark:bg-gray-700" />
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : error ? (
        <Cloud className="w-4 h-4" />
      ) : weather ? (
        <div className="flex items-center gap-1">
          {getWeatherIcon()}
          <span>{weather.temp}°C</span>
        </div>
      ) : null}
    </div>
  );
};

// Helper function to convert weather codes to conditions
function getWeatherCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Rain showers';
  if (code <= 94) return 'Thunderstorm';
  return 'Cloudy';
}