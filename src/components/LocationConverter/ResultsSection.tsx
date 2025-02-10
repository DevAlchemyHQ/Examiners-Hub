import React from 'react';
import { MapPin, Navigation, MapPinOff, Copy, Check } from 'lucide-react';
import { LocationData } from '../../types/location';
import { usePostcode } from '../../hooks/usePostcode';

interface ResultsSectionProps {
  locationData: LocationData | null;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({ locationData }) => {
  const { postcode, isLoading, error } = usePostcode(
    locationData?.coordinates.lat,
    locationData?.coordinates.lng
  );
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!locationData) return null;

  const results = [
    {
      id: 'osref',
      icon: MapPin,
      label: 'OS Grid Reference',
      value: locationData.osGrid,
    },
    {
      id: 'postcode',
      icon: MapPinOff,
      label: 'Nearest Postcode',
      value: isLoading ? 'Searching...' : error ? error : postcode || 'No postcode available',
      loading: isLoading,
    },
    {
      id: 'coords',
      icon: Navigation,
      label: 'Coordinates',
      value: `${locationData.coordinates.lat.toFixed(6)}, ${locationData.coordinates.lng.toFixed(6)}`,
    },
  ];

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <div
          key={result.id}
          className="p-3 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <result.icon size={16} className="text-indigo-500" />
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase">
                {result.label}
              </div>
              <div className="font-medium text-slate-900">
                {result.loading ? (
                  <span className="text-slate-400">Searching...</span>
                ) : (
                  result.value
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => handleCopy(result.value, result.id)}
            disabled={result.loading || !result.value}
            className={`p-2 rounded-lg transition-colors ${
              copiedField === result.id
                ? 'bg-green-100 text-green-600'
                : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
            }`}
            title="Copy to clipboard"
          >
            {copiedField === result.id ? (
              <Check size={16} />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>
      ))}
    </div>
  );
};