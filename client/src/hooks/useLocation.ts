import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  updatedAt: string;
}

export const useLocation = (socket: Socket | null) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationData | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const isSharingRef = useRef(false);
  const locationRef = useRef<LocationData | null>(null);

  useEffect(() => {
    isSharingRef.current = isSharing;
    locationRef.current = location;
  }, [isSharing, location]);

  // Socket event listeners for location sync
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data: LocationData) => {
      if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setPartnerLocation({
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy ?? null,
          speed: data.speed ?? null,
          heading: data.heading ?? null,
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    };

    const handleLocationStop = () => {
      setPartnerLocation(null);
    };

    const handleLocationRequest = () => {
      if (isSharingRef.current && locationRef.current) {
        socket.emit('location:update', locationRef.current);
      }
    };

    socket.on('location:update', handleLocationUpdate);
    socket.on('location:stop', handleLocationStop);
    socket.on('location:request', handleLocationRequest);

    // Query active room partner location immediately upon loading
    socket.emit('location:query');

    return () => {
      socket.off('location:update', handleLocationUpdate);
      socket.off('location:stop', handleLocationStop);
      socket.off('location:request', handleLocationRequest);
    };
  }, [socket]);

  // Clean up geolocation on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (socket) {
      socket.emit('location:stop');
    }
    setIsSharing(false);
    setIsLocating(false);
  }, [socket]);

  const startSharing = useCallback(() => {
    setError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser or environment.');
      return;
    }

    setIsLocating(true);

    const onPositionSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      setIsSharing(true);
      setError(null);

      const locData: LocationData = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        updatedAt: new Date().toISOString(),
      };

      setLocation(locData);
      if (socket) {
        socket.emit('location:update', locData);
      }
    };

    // 1. First get instant current position with high accuracy
    navigator.geolocation.getCurrentPosition(
      onPositionSuccess,
      (err) => {
        console.warn('High accuracy geolocation error:', err.message, 'Trying fallback...');
        if (err.code === 1) { // PERMISSION_DENIED
          setIsLocating(false);
          setIsSharing(false);
          setError('Location permission was denied. Please allow location access in your browser or device settings.');
          return;
        }

        // 2. Fallback to standard/cached accuracy if GPS lock takes too long indoors
        navigator.geolocation.getCurrentPosition(
          onPositionSuccess,
          (fallbackErr) => {
            setIsLocating(false);
            setIsSharing(false);
            if (fallbackErr.code === 1) {
              setError('Location permission was denied. Please allow location access in your browser or device settings.');
            } else if (fallbackErr.code === 2) {
              setError('Position unavailable. Please ensure GPS/Location is enabled on your device.');
            } else if (fallbackErr.code === 3) {
              setError('Location request timed out. Please check your GPS connection and try again.');
            } else {
              setError(fallbackErr.message || 'Unable to retrieve your location.');
            }
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );

    // 3. Clear existing watch if active
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // 4. Register continuous watchPosition
    try {
      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          const locData: LocationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            updatedAt: new Date().toISOString(),
          };
          setLocation(locData);
          if (socket) {
            socket.emit('location:update', locData);
          }
        },
        (watchErr) => {
          console.warn('Geolocation watchPosition warning:', watchErr.message);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 5000 }
      );
      watchIdRef.current = wid;
    } catch (e) {
      console.error('Error starting watchPosition:', e);
    }
  }, [socket]);

  return {
    isSharing,
    isLocating,
    error,
    location,
    partnerLocation,
    startSharing,
    stopSharing,
    clearError: () => setError(null),
  };
};
