'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSocketStore } from '../../../lib/store/socketStore';
import { useLocation } from '../../../hooks/useLocation';
import { useAuthStore } from '../../../lib/store/authStore';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  Heart, 
  AlertCircle, 
  ExternalLink, 
  RotateCw, 
  ShieldCheck,
  Radio
} from 'lucide-react';

// Dynamic import with SSR disabled to guarantee Leaflet only renders on client
const LiveProximityMap = dynamic(() => import('../../../components/LiveProximityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
      <Compass size={36} className="text-pink-400 animate-spin mb-3" />
      <span className="text-xs font-bold text-slate-300">Loading Satellite Map...</span>
      <span className="text-[10px] text-slate-500 mt-1">Initializing GPS modules</span>
    </div>
  ),
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapPage() {
  const socket = useSocketStore((state) => state.socket);
  const user = useAuthStore((state) => state.user);
  const {
    isSharing,
    isLocating,
    error,
    location,
    partnerLocation,
    startSharing,
    stopSharing,
    clearError,
  } = useLocation(socket);

  const [partner, setPartner] = useState<{ displayName: string; avatar?: string } | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);

  // Fetch partner info from room
  useEffect(() => {
    import('../../../lib/api').then(({ default: api }) => {
      api
        .get('/rooms/mine')
        .then((res) => {
          const members = res.data.room?.members || [];
          const otherMember = members.find((m: any) => m._id !== user?._id);
          if (otherMember) {
            setPartner({ displayName: otherMember.displayName, avatar: otherMember.avatar });
          }
        })
        .catch(() => {});
    });
  }, [user]);

  const rawDistance =
    location && partnerLocation
      ? calculateDistance(location.lat, location.lng, partnerLocation.lat, partnerLocation.lng)
      : null;

  const formattedDistance =
    rawDistance !== null
      ? rawDistance < 0.05
        ? 'Together right now 💕 (Within 50m)'
        : rawDistance < 1
        ? `${Math.round(rawDistance * 1000)} meters away`
        : `${rawDistance.toFixed(1)} km away`
      : null;

  const openGoogleMapsDirections = () => {
    if (!partnerLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${partnerLocation.lat},${partnerLocation.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative min-h-screen bg-[#07070f] flex flex-col pb-28">
      {/* Ambient background glow */}
      <div className="ambient-glow-pink -top-24 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-24 -right-20 pointer-events-none" />

      {/* Top Header Card */}
      <header className="p-4 sm:p-5 max-w-2xl mx-auto w-full relative z-20">
        <div className="p-4 sm:p-5 rounded-3xl glass-panel shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-inner">
              <MapPin size={24} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-tight">Live Proximity Map</h1>
                {isSharing && (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {isLocating
                  ? 'Acquiring GPS coordinates...'
                  : isSharing
                  ? 'Broadcasting live position to your partner'
                  : 'Location sharing is currently inactive'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {location && (
              <button
                onClick={() => setRecenterTrigger((prev) => prev + 1)}
                title="Re-center map"
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              >
                <RotateCw size={16} />
              </button>
            )}

            <button
              onClick={isSharing ? stopSharing : startSharing}
              disabled={isLocating}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                isLocating
                  ? 'bg-pink-500/50 text-white cursor-wait'
                  : isSharing
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'btn-sexy text-white hover:brightness-110 active:scale-95'
              }`}
            >
              {isLocating ? (
                <>
                  <Compass size={14} className="animate-spin text-white" />
                  <span>Connecting GPS...</span>
                </>
              ) : isSharing ? (
                <>
                  <Radio size={14} className="text-rose-400" />
                  <span>Stop Sharing</span>
                </>
              ) : (
                <>
                  <Navigation size={14} className="text-white" />
                  <span>Share Location</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Geolocation Permission or Device GPS Error Banner */}
      {error && (
        <div className="px-4 max-w-2xl mx-auto w-full mb-3 relative z-20">
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 shadow-xl flex items-start justify-between gap-3 backdrop-blur-md">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-rose-200">Location Access Notice</h4>
                <p className="text-[11px] text-rose-300/90 mt-0.5 leading-relaxed">{error}</p>
                <div className="text-[10px] text-rose-400/80 mt-1.5 font-medium">
                  Tip: If using Chrome/Safari, click the lock/settings icon in the URL bar and select &quot;Allow Location&quot;.
                </div>
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-xs text-rose-400 hover:text-rose-200 font-bold px-2 py-1 rounded-lg bg-rose-900/50 shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Distance & Navigation Card */}
      {formattedDistance && partnerLocation && (
        <div className="px-4 max-w-2xl mx-auto w-full mb-3 relative z-20">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 glass-panel border border-pink-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                <Heart size={20} className="animate-pulse text-pink-400" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-300">
                  Distance to {partner?.displayName || 'Partner'}
                </span>
                <div className="text-base font-black text-white font-mono mt-0.5">
                  {formattedDistance}
                </div>
              </div>
            </div>

            <button
              onClick={openGoogleMapsDirections}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-1.5 shadow"
            >
              <span>Get Directions</span>
              <ExternalLink size={13} className="text-pink-300" />
            </button>
          </div>
        </div>
      )}

      {/* Partner Sharing Waiting Status */}
      {isSharing && !partnerLocation && (
        <div className="px-4 max-w-2xl mx-auto w-full mb-3 relative z-20">
          <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <p className="text-[11px] text-cyan-200">
                You are live! When <strong className="text-white">{partner?.displayName || 'your partner'}</strong> opens this map and shares location, they will appear here in real time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 relative z-10">
        <div className="w-full h-[480px] sm:h-[540px] rounded-[32px] overflow-hidden glass-panel border border-white/10 shadow-2xl relative">
          <LiveProximityMap
            userLocation={location}
            partnerLocation={partnerLocation}
            userName={user?.displayName || 'You'}
            partnerName={partner?.displayName || 'Partner'}
            userAvatar={user?.avatar}
            partnerAvatar={partner?.avatar}
            recenterTrigger={recenterTrigger}
          />
        </div>

        {/* Privacy & E2E Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-center text-slate-500 text-[11px]">
          <ShieldCheck size={14} className="text-pink-400/80" />
          <span>Real-time coordinates are streamed peer-to-peer via secure sockets and are never saved to database.</span>
        </div>
      </main>
    </div>
  );
}
