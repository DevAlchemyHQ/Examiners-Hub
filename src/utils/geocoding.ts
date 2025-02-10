import { Coordinates } from '../types/location';

const POSTCODES_API = 'https://api.postcodes.io';

const handleApiError = (error: any) => {
  if (error.response?.status === 404) {
    throw new Error('No postcode found for this location');
  }
  if (error.response?.status === 429) {
    throw new Error('Too many requests. Please try again later.');
  }
  throw new Error('Service temporarily unavailable');
};

export async function postcodeToCoordinates(postcode: string): Promise<Coordinates> {
  try {
    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    const response = await fetch(
      `${POSTCODES_API}/postcodes/${encodeURIComponent(cleanPostcode)}`
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Invalid postcode');
      }
      throw new Error('Service temporarily unavailable');
    }

    const data = await response.json();
    
    if (!data.result?.latitude || !data.result?.longitude) {
      throw new Error('Invalid postcode data');
    }
    
    return {
      lat: data.result.latitude,
      lng: data.result.longitude
    };
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function coordinatesToPostcode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `${POSTCODES_API}/postcodes?lon=${lng}&lat=${lat}&limit=1&radius=2000`
    );
    
    if (!response.ok) {
      throw new Error('Service temporarily unavailable');
    }

    const data = await response.json();
    
    if (!data.result?.[0]?.postcode) {
      throw new Error('No postcode found for this location');
    }
    
    return data.result[0].postcode;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}