import { create } from 'zustand';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected';
export type CallType = 'video' | 'audio';

interface CallState {
  callStatus: CallStatus;
  callType: CallType;
  isMuted: boolean;
  isVideoOff: boolean;
  isMinimized: boolean;
  callDuration: number;
  partnerInfo: { displayName: string; avatar?: string } | null;
  incomingCaller: { callerId: string; callerName: string; callerAvatar?: string; callType: CallType } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peer: Peer.Instance | null;

  // Actions
  setPartnerInfo: (info: { displayName: string; avatar?: string } | null) => void;
  startCall: (socket: Socket | null, type: CallType, partnerInfo: { displayName: string; avatar?: string } | null, myInfo: { displayName: string; avatar?: string } | null) => Promise<void>;
  acceptCall: (socket: Socket | null) => Promise<void>;
  rejectCall: (socket: Socket | null) => void;
  endCall: (socket: Socket | null) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleMinimize: () => void;
  setIncomingCall: (caller: { callerId: string; callerName: string; callerAvatar?: string; callType: CallType } | null) => void;
  incrementDuration: () => void;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const useCallStore = create<CallState>((set, get) => ({
  callStatus: 'idle',
  callType: 'video',
  isMuted: false,
  isVideoOff: false,
  isMinimized: false,
  callDuration: 0,
  partnerInfo: null,
  incomingCaller: null,
  localStream: null,
  remoteStream: null,
  peer: null,

  setPartnerInfo: (partnerInfo) => set({ partnerInfo }),

  setIncomingCall: (incomingCaller) => {
    if (incomingCaller) {
      set({ incomingCaller, callStatus: 'incoming', callType: incomingCaller.callType });
    } else {
      set({ incomingCaller, callStatus: 'idle' });
    }
  },

  incrementDuration: () => set((state) => ({ callDuration: state.callDuration + 1 })),

  toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // Invert: if currently muted, enable it
      });
      set({ isMuted: !isMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff; // Invert: if currently off, enable it
      });
      set({ isVideoOff: !isVideoOff });
    }
  },

  startCall: async (socket, type, partnerInfo, myInfo) => {
    if (!socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true,
      });

      set({
        localStream: stream,
        callStatus: 'outgoing',
        callType: type,
        partnerInfo,
        callDuration: 0,
        isMuted: false,
        isVideoOff: false,
        isMinimized: false,
      });

      // Inform partner via socket
      socket.emit('webrtc:call-user', {
        callType: type,
        callerName: myInfo?.displayName || 'Partner',
        callerAvatar: myInfo?.avatar,
      });

      const peer = new Peer({
        initiator: true,
        trickle: true,
        stream,
        config: { iceServers: ICE_SERVERS },
      });

      peer.on('signal', (signal) => {
        socket.emit('webrtc:signal', { signal });
      });

      peer.on('stream', (remoteStream) => {
        set({ remoteStream, callStatus: 'connected' });
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        get().endCall(socket);
      });

      peer.on('close', () => {
        get().endCall(socket);
      });

      set({ peer });
    } catch (err) {
      console.error('Failed to get media devices:', err);
      set({ callStatus: 'idle' });
      throw err;
    }
  },

  acceptCall: async (socket) => {
    const { incomingCaller } = get();
    if (!socket || !incomingCaller) return;

    try {
      const isVideo = incomingCaller.callType === 'video';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });

      set({
        localStream: stream,
        callStatus: 'connected',
        callType: incomingCaller.callType,
        partnerInfo: { displayName: incomingCaller.callerName, avatar: incomingCaller.callerAvatar },
        incomingCaller: null,
        callDuration: 0,
        isMuted: false,
        isVideoOff: false,
      });

      socket.emit('webrtc:accept-call');

      const peer = new Peer({
        initiator: false,
        trickle: true,
        stream,
        config: { iceServers: ICE_SERVERS },
      });

      peer.on('signal', (signal) => {
        socket.emit('webrtc:signal', { signal });
      });

      peer.on('stream', (remoteStream) => {
        set({ remoteStream, callStatus: 'connected' });
      });

      peer.on('error', (err) => {
        console.error('Peer error on accept:', err);
        get().endCall(socket);
      });

      peer.on('close', () => {
        get().endCall(socket);
      });

      set({ peer });
    } catch (err) {
      console.error('Failed to accept call:', err);
      get().rejectCall(socket);
    }
  },

  rejectCall: (socket) => {
    if (socket) {
      socket.emit('webrtc:reject-call');
    }
    set({ callStatus: 'idle', incomingCaller: null });
  },

  endCall: (socket) => {
    const { peer, localStream, callStatus } = get();
    if (callStatus === 'idle') return;

    if (socket) {
      socket.emit('webrtc:hangup');
    }

    if (peer) {
      try {
        peer.destroy();
      } catch {}
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    set({
      callStatus: 'idle',
      localStream: null,
      remoteStream: null,
      peer: null,
      incomingCaller: null,
      callDuration: 0,
      isMinimized: false,
    });
  },
}));
