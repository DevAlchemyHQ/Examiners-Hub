import { useImageLayoutStore, MIN_GRID_WIDTH, MAX_GRID_WIDTH } from '../store/layoutStore';

export const useGridWidth = () => {
  const gridWidth = useImageLayoutStore((state) => state.gridWidth);
  const setGridWidth = useImageLayoutStore((state) => state.setGridWidth);
  return {
    gridWidth,
    setGridWidth,
    MIN_WIDTH: MIN_GRID_WIDTH,
    MAX_WIDTH: MAX_GRID_WIDTH,
  };
};