import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';
import { Navigation, Layers, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { LocationData } from '../../types/location';

const DEFAULT_POSITION: [number, number] = [51.5074, -0.1278];
const DEFAULT_ZOOM = 13;
const SEARCH_ZOOM = 17;

const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const basemaps = {
  'Street': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  'Satellite': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  'Terrain': {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
  },
  'Street Detailed': {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>'
  }
} as const;

interface MapProps {
  location: LocationData | null;
  onLocationUpdate: (lat: number, lng: number) => void;
  shouldFlyTo: boolean;
}

const MapController: React.FC<{ location: LocationData | null }> = ({ location }) => {
  const map = useMap();

  useEffect(() => {
    if (location?.coordinates) {
      const { lat, lng } = location.coordinates;
      if (isValidCoordinate(lat, lng)) {
        map.setView([lat, lng], SEARCH_ZOOM, {
          animate: false
        });
      }
    }
  }, [location, map]);

  return null;
};

const isValidCoordinate = (lat: number, lng: number): boolean => {
  return !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;
};

const DraggableMarker: React.FC<{
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}> = ({ position, onPositionChange }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (isValidCoordinate(lat, lng)) {
        onPositionChange(lat, lng);
      }
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      icon={defaultIcon}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          const { lat, lng } = position;
          if (isValidCoordinate(lat, lng)) {
            onPositionChange(lat, lng);
          }
        },
      }}
    />
  );
};

export const Map: React.FC<MapProps> = ({ location, onLocationUpdate }) => {
  const [selectedBasemap, setSelectedBasemap] = useState<keyof typeof basemaps>('Street Detailed');
  const [showBasemapControl, setShowBasemapControl] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const getPosition = (): [number, number] => {
    if (location?.coordinates) {
      const { lat, lng } = location.coordinates;
      if (isValidCoordinate(lat, lng)) {
        return [lat, lng];
      }
    }
    return DEFAULT_POSITION;
  };

  const position = getPosition();

  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (isValidCoordinate(latitude, longitude)) {
            onLocationUpdate(latitude, longitude);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
      <MapContainer
        center={position}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          attribution={basemaps[selectedBasemap].attribution}
          url={basemaps[selectedBasemap].url}
        />
        <ZoomControl position="bottomright" />
        <DraggableMarker
          position={position}
          onPositionChange={onLocationUpdate}
        />
        <MapController location={location} />
      </MapContainer>

      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleCurrentLocation}
          disabled={isLocating}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Get Current Location"
        >
          {isLocating ? (
            <Loader2 size={20} className="text-slate-600 animate-spin" />
          ) : (
            <Navigation size={20} className="text-slate-600" />
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowBasemapControl(!showBasemapControl)}
            className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors"
            title="Change Basemap"
          >
            <Layers size={20} className="text-slate-600" />
          </button>
          {showBasemapControl && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 min-w-[120px]">
              {Object.keys(basemaps).map((map) => (
                <button
                  key={map}
                  onClick={() => {
                    setSelectedBasemap(map as keyof typeof basemaps);
                    setShowBasemapControl(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                    selectedBasemap === map ? 'text-indigo-500 font-medium' : 'text-slate-600'
                  }`}
                >
                  {map}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};