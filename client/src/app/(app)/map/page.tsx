'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useSocketStore } from '../../../lib/store/socketStore';
import { useLocation } from '../../../hooks/useLocation';
import { useAuthStore } from '../../../lib/store/authStore';
import { MapPin, Navigation, Compass, Heart } from 'lucide-react';

// Dynamically import Leaflet with ssr: false to prevent "window is not defined" error during production build
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

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
  const { isSharing, location, partnerLocation, startSharing, stopSharing } = useLocation(socket);
  const [partner, setPartner] = useState<{ displayName: string; avatar?: string } | null>(null);
  const [LInstance, setLInstance] = useState<any>(null);

  // Load Leaflet only on client
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      setLInstance(leaflet.default);
    });
  }, []);

  useEffect(() => {
    import('../../../lib/api').then(({ default: api }) => {
      api.get('/rooms/mine').then(res => {
        const members = res.data.room?.members || [];
        const otherMember = members.find((m: any) => m._id !== user?._id);
        if (otherMember) {
          setPartner({ displayName: otherMember.displayName, avatar: otherMember.avatar });
        }
      }).catch(() => {});
    });
  }, [user]);

  const defaultCenter: [number, number] = [28.6139, 77.2090]; // Default New Delhi or fallback
  const center: [number, number] = location ? [location.lat, location.lng] : defaultCenter;

  const distance = location && partnerLocation
    ? calculateDistance(location.lat, location.lng, partnerLocation.lat, partnerLocation.lng)
    : null;

  return (
    <div className="relative min-h-screen bg-[#07070f] flex flex-col pb-28">
      {/* Ambient background lighting */}
      <div className="ambient-glow-pink -top-24 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-24 -right-20 pointer-events-none" />

      {/* Header Bar */}
      <header className="p-4 sm:p-5 max-w-xl mx-auto w-full relative z-20">
        <div className="p-4 rounded-3xl glass-panel shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Live Proximity Map</h2>
              <span className="text-[10px] text-pink-400 font-semibold uppercase tracking-wider">
                {isSharing ? 'Sharing Live GPS' : 'Sharing is Paused'}
              </span>
            </div>
          </div>

          <button
            onClick={isSharing ? stopSharing : startSharing}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
              isSharing 
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30' 
                : 'btn-sexy text-white'
            }`}
          >
            {isSharing ? 'Stop Sharing' : 'Share Location'}
          </button>
        </div>
      </header>

      {/* Distance Status Card */}
      {distance && (
        <div className="px-4 max-w-xl mx-auto w-full mb-3 relative z-20">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-transparent glass-panel border border-pink-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-pink-400 animate-pulse" />
              <span className="text-xs font-bold text-white">Distance to Partner:</span>
            </div>
            <span className="text-sm font-black text-pink-300 font-mono tracking-wide">
              {distance} km away
            </span>
          </div>
        </div>
      )}

      {/* Map Canvas */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 relative z-10">
        <div className="w-full h-[460px] sm:h-[500px] rounded-[32px] overflow-hidden glass-panel border border-white/10 shadow-2xl relative">
          {typeof window !== 'undefined' && LInstance ? (
            <MapContainer
              center={center}
              zoom={13}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />

              {location && (
                <Marker position={[location.lat, location.lng]}>
                  <Popup>
                    <div className="text-slate-900 font-bold text-xs p-1">
                      You are here 📍
                    </div>
                  </Popup>
                </Marker>
              )}

              {partnerLocation && (
                <Marker position={[partnerLocation.lat, partnerLocation.lng]}>
                  <Popup>
                    <div className="text-slate-900 font-bold text-xs p-1">
                      {partner?.displayName || 'Partner'} 💕
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Compass size={36} className="text-pink-400 animate-spin mb-3" />
              <span className="text-xs font-semibold">Initializing satellite map...</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
