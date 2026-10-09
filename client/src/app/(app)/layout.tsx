'use client';
import { useEffect } from 'react';
import BottomNav from '../../components/BottomNav';
import { useSocketStore } from '../../lib/store/socketStore';
import { useAuthStore } from '../../lib/store/authStore';

import CallOverlay from '../../components/CallOverlay';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { connectSocket, disconnectSocket } = useSocketStore();
  const token = useAuthStore((state) => state.token);
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    fetchMe();
    if (token) {
      connectSocket(token);
    }
    return () => {
      disconnectSocket();
    };
  }, [token, connectSocket, disconnectSocket, fetchMe]);

  return (
    <div className="pb-24">
      {children}
      <CallOverlay />
      <BottomNav />
    </div>
  );
}
