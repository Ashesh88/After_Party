import { create } from 'zustand';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';
import { soundService } from '../soundService';

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected';
export type CallType = 'video' | 'audio';

export interface PartnerInfo {
  _id?: string;
  displayName: string;
  avatar?: string;
}

interface CallState {
  callStatus: CallStatus;
  callType: CallType;
  isMuted: boolean;
  isVideoOff: boolean;
  isMinimized: boolean;
  callDuration: number;
  partnerInfo: PartnerInfo | null;
  incomingCaller: { callerId: string; callerName: string; callerAvatar?: string; callType: CallType } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peer: Peer.Instance | null;

  // Actions
  setPartnerInfo: (info: PartnerInfo | null) => void;
  startCall: (
    socket: Socket | null, 
    type: CallType, 
    partnerInfo: PartnerInfo | null, 
    myInfo: { displayName: string; avatar?: string } | null
  ) => Promise<void>;
  acceptCall: (socket: Socket | null) => Promise<void>;
  rejectCall: (socket: Socket | null) => void;
  endCall: (socket: Socket | null) => void;
  handleCallAccepted: (socket: Socket | null, data?: any) => void;
  handleIncomingSignal: (signal: any) => void;
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
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

let pendingSignals: any[] = [];

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
      soundService.playIncomingRingtone();
      set({ 
        incomingCaller, 
        callStatus: 'incoming', 
        callType: incomingCaller.callType,
        partnerInfo: { _id: incomingCaller.callerId, displayName: incomingCaller.callerName, avatar: incomingCaller.callerAvatar }
      });
    } else {
      soundService.stop();
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
    pendingSignals = [];

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

      // Play outgoing ringtone ("tuuut... tuuut...")
      soundService.playOutgoingTone();

      // Emit incoming call alert to partner (with targetUserId if available)
      socket.emit('webrtc:call-user', {
        callType: type,
        callerName: myInfo?.displayName || 'Partner',
        callerAvatar: myInfo?.avatar,
        targetUserId: partnerInfo?._id,
      });
    } catch (err) {
      console.error('Failed to get media devices for startCall:', err);
      soundService.stop();
      set({ callStatus: 'idle' });
      throw err;
    }
  },

  handleCallAccepted: (socket, data?: any) => {
    const { callStatus, peer: existingPeer } = get();
    // Guard against multiple invocations
    if (callStatus === 'connected' && existingPeer && !existingPeer.destroyed) {
      console.log('Call already in progress, ignoring duplicate accept');
      return;
    }

    // Partner accepted our call! Stop outgoing ringtone and transition caller to connected state
    soundService.playConnectTone();
    const { localStream, partnerInfo, incomingCaller } = get();

    set({ callStatus: 'connected' });

    if (!localStream) {
      console.error('No localStream available when call was accepted');
      return;
    }

    const targetUserId = partnerInfo?._id || incomingCaller?.callerId || data?.receiverId;

    try {
      if (existingPeer) {
        try { existingPeer.destroy(); } catch {}
      }

      // Caller initiates the WebRTC offer peer
      const peer = new Peer({
        initiator: true,
        trickle: true,
        stream: localStream,
        config: { iceServers: ICE_SERVERS },
      });

      peer.on('signal', (signal) => {
        socket?.emit('webrtc:signal', { signal, targetUserId });
      });

      peer.on('stream', (remoteStream) => {
        console.log('Caller received remote stream');
        set({ remoteStream });
      });

      peer.on('error', (err) => {
        console.warn('Caller peer error/warning:', err);
        if (peer.destroyed && get().peer === peer) {
          get().endCall(socket);
        }
      });

      peer.on('close', () => {
        console.log('Caller peer closed');
        if (get().peer === peer && get().callStatus === 'connected') {
          get().endCall(socket);
        }
      });

      // Drain any signals that arrived early
      while (pendingSignals.length > 0) {
        const sig = pendingSignals.shift();
        try {
          peer.signal(sig);
        } catch (e) {
          console.warn('Ignored redundant signal on caller:', e);
        }
      }

      set({ peer });
    } catch (err) {
      console.error('Failed to create initiator peer:', err);
    }
  },

  acceptCall: async (socket) => {
    const { incomingCaller, callStatus, peer: existingPeer } = get();
    if (!socket || !incomingCaller) return;
    if (callStatus === 'connected' && existingPeer && !existingPeer.destroyed) {
      console.log('Call already in progress, ignoring duplicate acceptCall');
      return;
    }

    soundService.playConnectTone();

    try {
      if (existingPeer) {
        try { existingPeer.destroy(); } catch {}
      }

      const isVideo = incomingCaller.callType === 'video';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });

      set({
        localStream: stream,
        callStatus: 'connected',
        callType: incomingCaller.callType,
        partnerInfo: { _id: incomingCaller.callerId, displayName: incomingCaller.callerName, avatar: incomingCaller.callerAvatar },
        incomingCaller: null,
        callDuration: 0,
        isMuted: false,
        isVideoOff: false,
      });

      const callerId = incomingCaller.callerId;

      // Tell caller we accepted (include callerId directly)
      socket.emit('webrtc:accept-call', { callerId });

      // Receiver creates non-initiator peer
      const peer = new Peer({
        initiator: false,
        trickle: true,
        stream,
        config: { iceServers: ICE_SERVERS },
      });

      peer.on('signal', (signal) => {
        socket.emit('webrtc:signal', { signal, targetUserId: callerId });
      });

      peer.on('stream', (remoteStream) => {
        console.log('Receiver received remote stream');
        set({ remoteStream });
      });

      peer.on('error', (err) => {
        console.warn('Receiver peer error/warning:', err);
        if (peer.destroyed && get().peer === peer) {
          get().endCall(socket);
        }
      });

      peer.on('close', () => {
        console.log('Receiver peer closed');
        if (get().peer === peer && get().callStatus === 'connected') {
          get().endCall(socket);
        }
      });

      // Drain any signals that arrived early
      while (pendingSignals.length > 0) {
        const sig = pendingSignals.shift();
        try {
          peer.signal(sig);
        } catch (e) {
          console.warn('Ignored redundant signal on receiver:', e);
        }
      }

      set({ peer });
    } catch (err) {
      console.error('Failed to accept call:', err);
      soundService.stop();
      get().rejectCall(socket);
    }
  },

  handleIncomingSignal: (signal) => {
    const { peer } = get();
    if (peer && !peer.destroyed) {
      try {
        peer.signal(signal);
      } catch (e) {
        console.warn('Ignored duplicate or invalid WebRTC signal:', e);
      }
    } else {
      const sigStr = JSON.stringify(signal);
      if (!pendingSignals.some(s => JSON.stringify(s) === sigStr)) {
        pendingSignals.push(signal);
      }
    }
  },

  rejectCall: (socket) => {
    soundService.stop();
    const { incomingCaller, partnerInfo } = get();
    if (socket) {
      socket.emit('webrtc:reject-call', { callerId: incomingCaller?.callerId || partnerInfo?._id });
    }
    set({ callStatus: 'idle', incomingCaller: null });
  },

  endCall: (socket) => {
    soundService.stop();
    const { peer, localStream, callStatus, partnerInfo, incomingCaller } = get();
    if (callStatus === 'idle') return;

    if (socket) {
      socket.emit('webrtc:hangup', {
        targetUserId: partnerInfo?._id || incomingCaller?.callerId,
      });
    }

    if (peer) {
      try {
        peer.destroy();
      } catch {}
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    pendingSignals = [];

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
