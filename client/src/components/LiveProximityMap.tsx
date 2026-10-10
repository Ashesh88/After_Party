'use client';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationData } from '../hooks/useLocation';

interface LiveProximityMapProps {
  userLocation: LocationData | null;
  partnerLocation: LocationData | null;
  userName: string;
  partnerName: string;
  userAvatar?: string;
  partnerAvatar?: string;
  recenterTrigger: number;
}

// Controller component to smoothly pan/zoom map on coordinate changes
function MapViewController({
  userLocation,
  partnerLocation,
  recenterTrigger,
}: {
  userLocation: LocationData | null;
  partnerLocation: LocationData | null;
  recenterTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (userLocation && partnerLocation) {
      // Frame both partners with padding
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [partnerLocation.lat, partnerLocation.lng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1.2 });
    } else if (partnerLocation) {
      map.flyTo([partnerLocation.lat, partnerLocation.lng], 15, { duration: 1.2 });
    }
  }, [
    map,
    userLocation?.lat,
    userLocation?.lng,
    partnerLocation?.lat,
    partnerLocation?.lng,
    recenterTrigger,
  ]);

  return null;
}

export default function LiveProximityMap({
  userLocation,
  partnerLocation,
  userName,
  partnerName,
  userAvatar,
  partnerAvatar,
  recenterTrigger,
}: LiveProximityMapProps) {
  // Default coordinates (e.g. New Delhi fallback if no GPS yet)
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  const initialCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : partnerLocation
    ? [partnerLocation.lat, partnerLocation.lng]
    : defaultCenter;

  // Custom User Marker DivIcon (Glowing Rose/Pink)
  const userIcon = useMemo(() => {
    const avatarContent = userAvatar
      ? `<img src="${userAvatar}" class="w-full h-full object-cover rounded-full" />`
      : `<span class="text-xs font-black text-white">${(userName || 'Y').charAt(0).toUpperCase()}</span>`;

    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="map-radar-pulse bg-pink-500/40"></div>
          <div class="relative w-10 h-10 rounded-full bg-gradient-to-tr from-pink-600 to-rose-400 p-[2px] shadow-lg shadow-pink-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-full h-full rounded-full bg-[#0d0e1a] flex items-center justify-center overflow-hidden">
              ${avatarContent}
            </div>
          </div>
          <div class="absolute -bottom-5 px-2 py-0.5 rounded-full bg-pink-600/90 text-[10px] font-extrabold text-white uppercase tracking-wider shadow whitespace-nowrap">
            You
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22],
    });
  }, [userName, userAvatar]);

  // Custom Partner Marker DivIcon (Glowing Purple/Cyan)
  const partnerIcon = useMemo(() => {
    const avatarContent = partnerAvatar
      ? `<img src="${partnerAvatar}" class="w-full h-full object-cover rounded-full" />`
      : `<span class="text-xs font-black text-white">${(partnerName || 'P').charAt(0).toUpperCase()}</span>`;

    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="map-radar-pulse bg-cyan-400/40"></div>
          <div class="relative w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-[2px] shadow-lg shadow-cyan-500/50 flex items-center justify-center border-2 border-white">
            <div class="w-full h-full rounded-full bg-[#0d0e1a] flex items-center justify-center overflow-hidden">
              ${avatarContent}
            </div>
          </div>
          <div class="absolute -bottom-5 px-2 py-0.5 rounded-full bg-cyan-600/90 text-[10px] font-extrabold text-white uppercase tracking-wider shadow whitespace-nowrap max-w-[80px] truncate">
            ${partnerName || 'Partner'}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22],
    });
  }, [partnerName, partnerAvatar]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={initialCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ background: '#0b0c16' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        <MapViewController
          userLocation={userLocation}
          partnerLocation={partnerLocation}
          recenterTrigger={recenterTrigger}
        />

        {/* Connection Polyline when both are online */}
        {userLocation && partnerLocation && (
          <Polyline
            positions={[
              [userLocation.lat, userLocation.lng],
              [partnerLocation.lat, partnerLocation.lng],
            ]}
            pathOptions={{
              color: '#ec4899',
              weight: 3,
              dashArray: '8, 8',
              opacity: 0.8,
            }}
          />
        )}

        {/* User Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup className="custom-popup">
              <div className="text-slate-900 font-bold text-xs p-1">
                <span className="text-pink-600 font-black">You are here 📍</span>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Accuracy: {userLocation.accuracy ? `~${Math.round(userLocation.accuracy)}m` : 'High'}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Partner Marker */}
        {partnerLocation && (
          <Marker position={[partnerLocation.lat, partnerLocation.lng]} icon={partnerIcon}>
            <Popup className="custom-popup">
              <div className="text-slate-900 font-bold text-xs p-1">
                <span className="text-cyan-600 font-black">{partnerName || 'Partner'} 💕</span>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Live proximity active
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
