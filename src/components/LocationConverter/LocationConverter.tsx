import React, { useState } from 'react';
import { Map } from './Map';
import { InputSection } from './InputSection';
import { ResultsSection } from './ResultsSection';
import { useLocationConverter } from '../../hooks/useLocationConverter';

export const LocationConverter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'osgrid' | 'postcode' | 'coords'>('osgrid');
  const [shouldFlyTo, setShouldFlyTo] = useState(true);
  const {
    locationData,
    updateFromCoordinates,
    updateFromOSGrid,
    error,
    isLoading,
    recentSearches,
    clearRecentSearches
  } = useLocationConverter();

  const handleTabChange = (tab: 'osgrid' | 'postcode' | 'coords') => {
    setActiveTab(tab);
  };

  const handleCoordinatesSubmit = (lat: number, lng: number) => {
    setShouldFlyTo(true);
    updateFromCoordinates(lat, lng);
  };

  const handleOSGridSubmit = (grid: string) => {
    setShouldFlyTo(true);
    updateFromOSGrid(grid);
  };

  const handleMapLocationUpdate = (lat: number, lng: number) => {
    setShouldFlyTo(false);
    updateFromCoordinates(lat, lng);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-[calc(100vh-120px)]">
        {/* Left Panel */}
        <div className="p-4 border-r border-slate-200 dark:border-gray-700 overflow-y-auto">
          <div className="space-y-4">
            <InputSection
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onCoordinatesSubmit={handleCoordinatesSubmit}
              onOSGridSubmit={handleOSGridSubmit}
              isLoading={isLoading}
              error={error}
            />
            
            {locationData && (
              <ResultsSection locationData={locationData} />
            )}

            {recentSearches.length > 0 && (
              <div className="border-t border-slate-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-600 dark:text-gray-300">
                    Recent Searches
                  </h3>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1.5">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (search.type === 'osgrid') {
                          handleOSGridSubmit(search.value);
                        } else {
                          handleCoordinatesSubmit(search.coordinates.lat, search.coordinates.lng);
                        }
                      }}
                      className="w-full p-2 text-left text-sm bg-slate-50 dark:bg-gray-700 rounded hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="font-medium text-slate-700 dark:text-gray-200">
                        {search.type === 'osgrid' ? search.value : 'Coordinates'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-gray-400">
                        {search.type === 'osgrid' 
                          ? `${search.coordinates.lat.toFixed(6)}, ${search.coordinates.lng.toFixed(6)}`
                          : search.value
                        }
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Panel */}
        <div className="relative">
          <Map
            location={locationData}
            onLocationUpdate={handleMapLocationUpdate}
            shouldFlyTo={shouldFlyTo}
          />
        </div>
      </div>
    </div>
  );
};