import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export interface LocationData {
  lat: number;
  lng: number;
  updatedAt: string;
}

export const useLocation = (socket: Socket | null) => {
  const [isSharing, setIsSharing] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationData | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('location:update', (data: LocationData) => {
      setPartnerLocation(data);
    });

    socket.on('location:stop', () => {
      setPartnerLocation(null);
    });

    return () => {
      socket.off('location:update');
      socket.off('location:stop');
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [socket, watchId]);

  const startSharing = () => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const data = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: new Date().toISOString()
        };
        setLocation(data);
        if (socket) {
          socket.emit('location:update', data);
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    setWatchId(id);
    setIsSharing(true);
  };

  const stopSharing = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (socket) {
      socket.emit('location:stop');
    }
    setIsSharing(false);
  };

  return { isSharing, location, startSharing, stopSharing, partnerLocation };
};
