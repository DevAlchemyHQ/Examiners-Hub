import React, { useState } from 'react';
import { AlertCircle, Search, MapPin } from 'lucide-react';
import { validateCoordinates, validateOSGrid } from '../../utils/validation';
import { postcodeToCoordinates } from '../../utils/geocoding';

interface InputSectionProps {
  activeTab: 'osgrid' | 'postcode' | 'coords';
  onTabChange: (tab: 'osgrid' | 'postcode' | 'coords') => void;
  onCoordinatesSubmit: (lat: number, lng: number) => void;
  onOSGridSubmit: (grid: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const InputSection: React.FC<InputSectionProps> = ({
  activeTab,
  onTabChange,
  onCoordinatesSubmit,
  onOSGridSubmit,
  isLoading,
  error
}) => {
  const [inputs, setInputs] = useState({
    lat: '',
    lng: '',
    osgrid: '',
    postcode: ''
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    try {
      switch (activeTab) {
        case 'coords':
          const lat = Number(inputs.lat);
          const lng = Number(inputs.lng);
          if (!validateCoordinates(lat, lng)) {
            throw new Error('Invalid coordinates');
          }
          onCoordinatesSubmit(lat, lng);
          break;
          
        case 'osgrid':
          const formattedGrid = inputs.osgrid.toUpperCase().replace(/\s+/g, ' ').trim();
          if (!validateOSGrid(formattedGrid)) {
            throw new Error('Invalid OS Grid reference');
          }
          onOSGridSubmit(formattedGrid);
          break;

        case 'postcode':
          if (!inputs.postcode.trim()) {
            throw new Error('Enter a postcode');
          }
          const coords = await postcodeToCoordinates(inputs.postcode);
          onCoordinatesSubmit(coords.lat, coords.lng);
          break;
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Invalid input');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg overflow-hidden border border-slate-200">
        <button
          onClick={() => onTabChange('osgrid')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'osgrid'
              ? 'bg-indigo-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          OS Grid
        </button>
        <button
          onClick={() => onTabChange('postcode')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'postcode'
              ? 'bg-indigo-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Postcode
        </button>
        <button
          onClick={() => onTabChange('coords')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'coords'
              ? 'bg-indigo-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Coords
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {activeTab === 'coords' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="text"
                name="lat"
                value={inputs.lat}
                onChange={handleInputChange}
                placeholder="Latitude"
                className="w-full p-2 pl-8 text-sm border border-slate-200 rounded-lg"
              />
              <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="relative">
              <input
                type="text"
                name="lng"
                value={inputs.lng}
                onChange={handleInputChange}
                placeholder="Longitude"
                className="w-full p-2 pl-8 text-sm border border-slate-200 rounded-lg"
              />
              <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        )}

        {activeTab === 'osgrid' && (
          <div className="relative">
            <input
              type="text"
              name="osgrid"
              value={inputs.osgrid}
              onChange={handleInputChange}
              placeholder="OS Grid reference (e.g., TQ 123 456)"
              className="w-full p-2 pl-8 text-sm border border-slate-200 rounded-lg uppercase"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        )}

        {activeTab === 'postcode' && (
          <div className="relative">
            <input
              type="text"
              name="postcode"
              value={inputs.postcode}
              onChange={handleInputChange}
              placeholder="Enter UK postcode"
              className="w-full p-2 pl-8 text-sm border border-slate-200 rounded-lg uppercase"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-lg text-sm transition-colors ${
            isLoading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          {isLoading ? 'Searching...' : 'Search Location'}
        </button>
      </form>

      {(validationError || error) && (
        <div className="flex items-start gap-2 p-2 bg-red-50 text-red-600 text-sm rounded-lg">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <p>{validationError || error}</p>
        </div>
      )}
    </div>
  );
};