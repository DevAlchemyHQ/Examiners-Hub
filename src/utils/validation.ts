export const validateWhat3Words = (words: string): boolean => {
  // Validate format: three words separated by dots
  const pattern = /^[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+$/;
  return pattern.test(words);
};

export const validateCoordinates = (lat: number, lng: number): boolean => {
  // Validate latitude (-90 to 90) and longitude (-180 to 180)
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const validateOSGrid = (grid: string): boolean => {
  // Remove all spaces and validate OS Grid Reference format
  const cleanGrid = grid.replace(/\s+/g, '').toUpperCase();
  const pattern = /^[A-Z]{2}\d{6}$/;
  return pattern.test(cleanGrid);
};