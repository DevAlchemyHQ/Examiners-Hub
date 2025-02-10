import { Coordinates } from '../types/location';

// Constants for OS Grid calculations
const GRID_LETTERS = {
  SV: [0, 0], SW: [1, 0], SX: [2, 0], SY: [3, 0], SZ: [4, 0],
  TV: [0, 1], TW: [1, 1], TX: [2, 1], TY: [3, 1], TZ: [4, 1]
};

export const convertToOSGrid = (lat: number, lng: number): string => {
  // This is a simplified conversion - in a real application,
  // you would use a more accurate conversion algorithm
  const x = Math.floor((lng + 5.2) * 100000);
  const y = Math.floor((lat - 49.8) * 100000);
  
  // Calculate grid square
  const gridX = Math.floor(x / 100000);
  const gridY = Math.floor(y / 100000);
  
  // Find grid letters
  const gridLetters = Object.entries(GRID_LETTERS).find(
    ([_, [x, y]]) => x === gridX && y === gridY
  )?.[0] || 'TQ';
  
  // Calculate eastings and northings
  const eastings = String(x % 100000).padStart(5, '0').slice(0, 3);
  const northings = String(y % 100000).padStart(5, '0').slice(0, 3);
  
  return `${gridLetters} ${eastings} ${northings}`;
};

export const convertFromOSGrid = (grid: string): Coordinates => {
  // Remove all spaces and convert to uppercase
  const cleanGrid = grid.replace(/\s+/g, '').toUpperCase();
  
  // Extract components
  const letters = cleanGrid.substring(0, 2);
  const eastings = cleanGrid.substring(2, 5);
  const northings = cleanGrid.substring(5, 8);
  
  const [gridX, gridY] = GRID_LETTERS[letters as keyof typeof GRID_LETTERS] || [2, 1];
  
  const x = gridX * 100000 + parseInt(eastings) * 100;
  const y = gridY * 100000 + parseInt(northings) * 100;
  
  return {
    lat: (y / 100000) + 49.8,
    lng: (x / 100000) - 5.2
  };
};