'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from '../../components/BottomNav';
import { useSocketStore } from '../../lib/store/socketStore';
import { useAuthStore } from '../../lib/store/authStore';

import CallOverlay from '../../components/CallOverlay';
import MoodThemeModal from '../../components/MoodThemeModal';
import MoodAtmosphereOverlay from '../../components/MoodAtmosphereOverlay';
import RoomInviteNotification from '../../components/RoomInviteNotification';
import MessageNotificationToast from '../../components/MessageNotificationToast';
import HeartbeatOverlay from '../../components/HeartbeatOverlay';
import { useMoodStore } from '../../lib/store/moodStore';
import { useGameStore } from '../../lib/store/gameStore';

import { registerPushSubscription } from '../../lib/pushSubscription';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connectSocket, disconnectSocket, socket } = useSocketStore();
  const token = useAuthStore((state) => state.token);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const { fetchMood, updateFromSocket } = useMoodStore();
  const activeGame = useGameStore((state) => state.activeGame);
  const isChatPage = pathname === '/chat';

  useEffect(() => {
    fetchMe();
    fetchMood();
    if (token) {
      connectSocket(token);
      registerPushSubscription().catch(() => {});
    }
  }, [token, connectSocket, fetchMe, fetchMood]);

  useEffect(() => {
    if (!socket) return;
    socket.on('mood:update', updateFromSocket);
    return () => {
      socket.off('mood:update', updateFromSocket);
    };
  }, [socket, updateFromSocket]);

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${activeGame || isChatPage ? 'pb-0' : 'pb-24'}`}>
      {/* Global Ambient Mood Glow Blobs */}
      <div className="ambient-glow-mood-primary -top-28 -left-24 pointer-events-none fixed z-0" />
      <div className="ambient-glow-mood-secondary top-72 -right-28 pointer-events-none fixed z-0" />

      {/* Floating dynamic mood atmosphere particles */}
      <MoodAtmosphereOverlay />

      <div className="relative z-10">{children}</div>
      <BottomNav />
      <CallOverlay />
      <MoodThemeModal />
      <RoomInviteNotification />
      <MessageNotificationToast />
      <HeartbeatOverlay />
    </div>
  );
}
