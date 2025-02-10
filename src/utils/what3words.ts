import { Coordinates } from '../types/location';

const API_KEY = 'E0MEJEV0';
const BASE_URL = 'https://api.what3words.com/v3';

interface What3WordsError {
  error: {
    code: string;
    message: string;
  };
}

interface What3WordsCoordinatesResponse {
  coordinates: {
    lat: number;
    lng: number;
  };
  words: string;
}

interface What3WordsAddressResponse {
  coordinates: {
    lat: number;
    lng: number;
  };
  words: string;
}

const handleApiResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  
  if (!response.ok || data.error) {
    const error = new Error(data.error?.message || `API Error: ${response.status}`);
    // @ts-ignore
    error.code = data.error?.code;
    throw error;
  }
  
  return data as T;
};

export const convertToCoordinates = async (words: string): Promise<Coordinates> => {
  if (!words?.trim()) {
    throw new Error('What3words address is required');
  }

  try {
    const cleanWords = words.toLowerCase().trim();
    const url = new URL(`${BASE_URL}/convert-to-coordinates`);
    url.searchParams.append('key', API_KEY);
    url.searchParams.append('words', cleanWords);

    const response = await fetch(url.toString());
    const data = await handleApiResponse<What3WordsCoordinatesResponse>(response);
    
    if (!data.coordinates?.lat || !data.coordinates?.lng) {
      throw new Error('Invalid coordinates in API response');
    }
    
    return {
      lat: data.coordinates.lat,
      lng: data.coordinates.lng
    };
  } catch (error) {
    if (error instanceof Error) {
      // Preserve the original error message and code
      throw error;
    }
    throw new Error('Failed to convert what3words to coordinates');
  }
};

export const convertToWhat3Words = async (lat: number, lng: number): Promise<string> => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Valid latitude and longitude are required');
  }

  try {
    const url = new URL(`${BASE_URL}/convert-to-3wa`);
    url.searchParams.append('key', API_KEY);
    url.searchParams.append('coordinates', `${lat},${lng}`);

    const response = await fetch(url.toString());
    const data = await handleApiResponse<What3WordsAddressResponse>(response);
    
    if (!data.words) {
      throw new Error('No words found in API response');
    }
    
    return data.words;
  } catch (error) {
    if (error instanceof Error) {
      // Preserve the original error message and code
      throw error;
    }
    throw new Error('Failed to convert coordinates to what3words');
  }
};