import { useState } from 'react';
import { LocationData } from '../types/location';
import { convertToOSGrid, convertFromOSGrid } from '../utils/osGrid';

interface RecentSearch {
  type: 'osgrid' | 'coords';
  value: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

const MAX_RECENT_SEARCHES = 5;

export const useLocationConverter = () => {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const addToRecentSearches = (search: RecentSearch) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => 
        !(s.type === search.type && s.value === search.value)
      );
      return [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  const updateFromCoordinates = async (lat: number, lng: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const osGrid = convertToOSGrid(lat, lng);
      
      setLocationData({
        coordinates: { lat, lng },
        osGrid
      });

      addToRecentSearches({
        type: 'coords',
        value: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        coordinates: { lat, lng }
      });
    } catch (err) {
      console.error('Error updating from coordinates:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLocationData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFromOSGrid = async (grid: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const coordinates = convertFromOSGrid(grid);
      
      setLocationData({
        coordinates,
        osGrid: grid.toUpperCase()
      });

      addToRecentSearches({
        type: 'osgrid',
        value: grid.toUpperCase(),
        coordinates
      });
    } catch (err) {
      console.error('Error updating from OS Grid:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLocationData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    locationData,
    updateFromCoordinates,
    updateFromOSGrid,
    error,
    isLoading,
    recentSearches,
    clearRecentSearches
  };
};