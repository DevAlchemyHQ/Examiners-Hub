import { useState, useEffect } from 'react';
import { coordinatesToPostcode } from '../utils/geocoding';

export const usePostcode = (lat?: number, lng?: number) => {
  const [postcode, setPostcode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPostcode = async () => {
      if (!lat || !lng) {
        setPostcode(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await coordinatesToPostcode(lat, lng);
        if (isMounted) {
          setPostcode(result);
        }
      } catch (err) {
        if (isMounted) {
          setError('No postcode found for this location');
          setPostcode(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPostcode();
    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  return { postcode, isLoading, error };
};