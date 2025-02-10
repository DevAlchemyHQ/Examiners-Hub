import React, { useState, useEffect } from 'react';
import { Map as MapIcon, Loader2, BookOpen, Search, X } from 'lucide-react';
import { QuailMapViewer } from './QuailMapViewer';
import { useQuailMapStore } from '../../store/quailMapStore';

interface Region {
  id: string;
  name: string;
  url: string;
}

export const QuailMaps: React.FC = () => {
  const { maps, isLoading, error, fetchMaps } = useQuailMapStore();
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const filteredMaps = maps.filter(map => 
    map.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[300px_1fr] gap-6 h-[calc(100vh-180px)]">
      {/* Index Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <BookOpen className="text-indigo-500" />
            Map Index
          </h2>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search maps..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            ) : (
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400" />
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto p-2">
          {filteredMaps.length === 0 ? (
            <div className="text-center p-4 text-slate-500 dark:text-gray-400">
              No maps found matching "{searchQuery}"
            </div>
          ) : (
            filteredMaps.map((map) => (
              <button
                key={map.id}
                onClick={() => setSelectedRegion(map)}
                className={`w-full p-3 rounded-lg text-left transition-all mb-2 ${
                  selectedRegion?.id === map.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800'
                    : 'hover:bg-slate-50 dark:hover:bg-gray-700'
                } border border-transparent hover:border-slate-200 dark:hover:border-gray-600`}
              >
                <div className="font-medium text-slate-800 dark:text-white">
                  {map.name}
                </div>
                <div className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                  Network Map
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Map Viewer Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
        {selectedRegion ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <MapIcon className="text-indigo-500" />
                {selectedRegion.name} Network Map
              </h2>
            </div>
            <div className="flex-1">
              <QuailMapViewer
                url={selectedRegion.url}
                title={`${selectedRegion.name} Network Map`}
                onClose={() => setSelectedRegion(null)}
                embedded={true}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
            <div className="text-center">
              <MapIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a map from the index to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};