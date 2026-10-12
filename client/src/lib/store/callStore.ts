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
  facingMode: 'user' | 'environment';
  isSwitchingCamera: boolean;
  isScreenSharing: boolean;

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
  switchCamera: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
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
  facingMode: 'user',
  isSwitchingCamera: false,
  isScreenSharing: false,

  setPartnerInfo: (partnerInfo) => set({ partnerInfo }),

  setIncomingCall: (incomingCaller) => {
    if (incomingCaller) {
      soundService.playIncomingRingtone();

      // Browser native system notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`${incomingCaller.callerName || 'Your partner'} is calling you! 📞`, {
            body: `${incomingCaller.callType === 'video' ? 'Incoming Video Call 📹' : 'Incoming Voice Call 📞'}. Tap to answer!`,
            icon: incomingCaller.callerAvatar || '/icon-192x192.png',
            tag: 'incoming-call',
          });
        } catch {}
      }

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

  switchCamera: async () => {
    const { localStream, peer, isVideoOff, facingMode, isSwitchingCamera, callType } = get();
    if (!localStream || isSwitchingCamera || callType !== 'video') return;

    const currentVideoTrack = localStream.getVideoTracks()[0];
    if (!currentVideoTrack) return;

    set({ isSwitchingCamera: true });
    const nextFacingMode: 'user' | 'environment' = facingMode === 'user' ? 'environment' : 'user';

    try {
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: nextFacingMode } },
          audio: false,
        });
      } catch {
        // Fallback for browsers or devices that only support ideal constraint
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacingMode },
          audio: false,
        });
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        set({ isSwitchingCamera: false });
        return;
      }

      // Preserve current camera enabled/disabled state
      newVideoTrack.enabled = !isVideoOff;

      // 1. Swap track in WebRTC peer connection
      if (peer) {
        if (typeof (peer as any).replaceTrack === 'function') {
          try {
            (peer as any).replaceTrack(currentVideoTrack, newVideoTrack, localStream);
          } catch (e) {
            console.warn('peer.replaceTrack warning:', e);
          }
        }
        if ((peer as any)._pc) {
          try {
            const senders = (peer as any)._pc.getSenders();
            const videoSender = senders.find((s: any) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          } catch (e) {
            console.warn('videoSender.replaceTrack warning:', e);
          }
        }
      }

      // 2. Stop old video track to release hardware camera
      currentVideoTrack.stop();

      // 3. Update local stream
      localStream.removeTrack(currentVideoTrack);
      localStream.addTrack(newVideoTrack);

      // 4. Create new MediaStream instance so React video refs rebind automatically
      const updatedStream = new MediaStream([
        ...localStream.getAudioTracks(),
        newVideoTrack,
      ]);

      set({
        localStream: updatedStream,
        facingMode: nextFacingMode,
        isSwitchingCamera: false,
      });
    } catch (err) {
      console.error('Failed to switch camera:', err);
      set({ isSwitchingCamera: false });
      throw err;
    }
  },

  startScreenShare: async () => {
    const { localStream, peer, isScreenSharing } = get();
    if (!localStream || isScreenSharing) return;

    try {
      // Capture system/tab audio along with display video (Discord-style)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as any,
      });

      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (!screenVideoTrack) return;

      const currentVideoTrack = localStream.getVideoTracks()[0];
      const micAudioTrack = localStream.getAudioTracks()[0];
      const screenAudioTrack = screenStream.getAudioTracks()[0];

      // 1. Swap video track in WebRTC peer
      if (peer && currentVideoTrack) {
        if (typeof (peer as any).replaceTrack === 'function') {
          try {
            (peer as any).replaceTrack(currentVideoTrack, screenVideoTrack, localStream);
          } catch (e) {
            console.warn('peer.replaceTrack warning on screenshare video:', e);
          }
        }
        if ((peer as any)._pc) {
          try {
            const senders = (peer as any)._pc.getSenders();
            const videoSender = senders.find((s: any) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(screenVideoTrack);
            }
          } catch (e) {
            console.warn('videoSender.replaceTrack warning on screenshare video:', e);
          }
        }
      }

      // 2. Mix mic audio + screen tab audio so partner hears BOTH microphone & movie audio!
      let outgoingAudioTrack: MediaStreamTrack | null = micAudioTrack || null;
      let audioMixContext: AudioContext | null = null;

      if (screenAudioTrack) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioMixContext = new AudioContextClass();
            const dest = audioMixContext.createMediaStreamDestination();

            // Screen audio source
            const screenSource = audioMixContext.createMediaStreamSource(new MediaStream([screenAudioTrack]));
            screenSource.connect(dest);

            // Mic audio source (if user has mic track)
            if (micAudioTrack) {
              const micSource = audioMixContext.createMediaStreamSource(new MediaStream([micAudioTrack]));
              micSource.connect(dest);
            }

            const mixedTrack = dest.stream.getAudioTracks()[0];
            if (mixedTrack) {
              outgoingAudioTrack = mixedTrack;
            }
          }
        } catch (mixErr) {
          console.warn('Audio mixing fallback to screen audio track:', mixErr);
          outgoingAudioTrack = screenAudioTrack;
        }

        // Swap audio track in WebRTC peer sender so partner actually receives the movie sound!
        if (peer && outgoingAudioTrack) {
          if (typeof (peer as any).replaceTrack === 'function' && micAudioTrack) {
            try {
              (peer as any).replaceTrack(micAudioTrack, outgoingAudioTrack, localStream);
            } catch (e) {
              console.warn('peer.replaceTrack warning on audio:', e);
            }
          }
          if ((peer as any)._pc) {
            try {
              const senders = (peer as any)._pc.getSenders();
              const audioSender = senders.find((s: any) => s.track && s.track.kind === 'audio');
              if (audioSender) {
                await audioSender.replaceTrack(outgoingAudioTrack);
              }
            } catch (e) {
              console.warn('audioSender.replaceTrack warning on audio:', e);
            }
          }
        }
      }

      // 3. Update local stream
      if (currentVideoTrack) {
        localStream.removeTrack(currentVideoTrack);
      }
      localStream.addTrack(screenVideoTrack);

      const activeAudioTracks = outgoingAudioTrack ? [outgoingAudioTrack] : localStream.getAudioTracks();

      const updatedStream = new MediaStream([
        ...activeAudioTracks,
        screenVideoTrack,
      ]);

      set({
        localStream: updatedStream,
        isScreenSharing: true,
      });

      // Handle user stopping screen share via Chrome native floating bar ("Stop sharing")
      screenVideoTrack.onended = () => {
        if (audioMixContext) {
          try { audioMixContext.close(); } catch {}
        }
        get().stopScreenShare();
      };
    } catch (err) {
      console.error('Failed to start screen share:', err);
      throw err;
    }
  },

  stopScreenShare: async () => {
    const { localStream, peer, isScreenSharing, isVideoOff, facingMode } = get();
    if (!localStream || !isScreenSharing) return;

    try {
      const currentScreenTrack = localStream.getVideoTracks()[0];

      // Re-acquire camera stream
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode === 'environment' ? { exact: 'environment' } : 'user' },
        audio: false,
      });

      const cameraVideoTrack = cameraStream.getVideoTracks()[0];
      cameraVideoTrack.enabled = !isVideoOff;

      // 1. Swap track back in WebRTC peer
      if (peer && currentScreenTrack) {
        if (typeof (peer as any).replaceTrack === 'function') {
          try {
            (peer as any).replaceTrack(currentScreenTrack, cameraVideoTrack, localStream);
          } catch (e) {
            console.warn('peer.replaceTrack warning on stopping screenshare:', e);
          }
        }
        if ((peer as any)._pc) {
          try {
            const senders = (peer as any)._pc.getSenders();
            const videoSender = senders.find((s: any) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(cameraVideoTrack);
            }
          } catch (e) {
            console.warn('videoSender.replaceTrack warning on stopping screenshare:', e);
          }
        }
      }

      // Stop screenshare tracks
      if (currentScreenTrack) {
        currentScreenTrack.stop();
      }

      // Remove any extra screen audio tracks
      const micAudioTrack = localStream.getAudioTracks()[0];

      const updatedStream = new MediaStream(
        micAudioTrack ? [micAudioTrack, cameraVideoTrack] : [cameraVideoTrack]
      );

      set({
        localStream: updatedStream,
        isScreenSharing: false,
      });
    } catch (err) {
      console.error('Failed to stop screen share and restore camera:', err);
      set({ isScreenSharing: false });
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
      facingMode: 'user',
      isSwitchingCamera: false,
      isScreenSharing: false,
    });
  },
}));
