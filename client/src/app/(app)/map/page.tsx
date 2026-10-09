'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSocketStore } from '../../../lib/store/socketStore';
import { useLocation } from '../../../hooks/useLocation';
import { useAuthStore } from '../../../lib/store/authStore';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const heartIcon = new L.DivIcon({
  html: '<div style="font-size: 24px; animation: pulse-glow 2s infinite;">❤️</div>',
  className: 'custom-heart-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const partnerIcon = new L.DivIcon({
  html: '<div style="font-size: 24px; animation: pulse-glow 2s infinite; filter: hue-rotate(90deg);">💖</div>',
  className: 'custom-heart-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
}

export default function MapPage() {
  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);
  const { isSharing, startSharing, stopSharing, partnerLocation } = useLocation(socket);
  
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMyLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  const distance = myLocation && partnerLocation 
    ? calculateDistance(myLocation[0], myLocation[1], partnerLocation.lat, partnerLocation.lng)
    : null;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col relative">
      <header className="p-4 bg-surface/90 backdrop-blur-md absolute top-0 w-full z-10 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="font-bold">Map 📍</h1>
          {distance && <p className="text-xs text-primary">{distance} km apart</p>}
        </div>
        <button
          onClick={isSharing ? stopSharing : startSharing}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            isSharing 
              ? 'bg-white/10 text-white hover:bg-white/20' 
              : 'bg-primary text-white shadow-lg shadow-primary/30'
          }`}
        >
          {isSharing ? 'Stop Sharing' : 'Share Location'}
        </button>
      </header>

      <div className="flex-1 z-0 bg-background">
        {myLocation ? (
          <MapContainer 
            center={myLocation} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            <Marker position={myLocation} icon={heartIcon}>
              <Popup className="dark-popup">
                <div className="text-center font-bold">You</div>
              </Popup>
            </Marker>

            {partnerLocation && (
              <Marker position={[partnerLocation.lat, partnerLocation.lng]} icon={partnerIcon}>
                <Popup>
                  <div className="text-center">
                    <div className="font-bold">Partner</div>
                    <div className="text-xs text-gray-500">
                      Updated {new Date(partnerLocation.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {(partnerLocation || myLocation) && (
              <MapUpdater center={partnerLocation ? [partnerLocation.lat, partnerLocation.lng] : myLocation} />
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-white/50">
            Getting your location...
          </div>
        )}
      </div>
    </div>
  );
}
