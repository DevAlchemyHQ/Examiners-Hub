import { useState, useEffect } from 'react';
import { useMetadataStore } from '../store/metadataStore';

export const useGridWidth = () => {
  const { sessionState, updateSessionState } = useMetadataStore();
  const [gridWidth, setGridWidth] = useState(() => {
    // Initialize from session state if available, otherwise default to 4
    return sessionState?.gridWidth || 4;
  });

  // Restore grid width from session state on mount
  useEffect(() => {
    if (sessionState?.gridWidth && sessionState.gridWidth !== gridWidth) {
      setGridWidth(sessionState.gridWidth);
    }
  }, [sessionState?.gridWidth]);

  // Save grid width to session state when it changes
  useEffect(() => {
    updateSessionState({ gridWidth });
  }, [gridWidth, updateSessionState]);

  return { gridWidth, setGridWidth };
};