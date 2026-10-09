import { useEffect, useRef, useState, MutableRefObject } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';

export const useWebRTC = (
  socket: Socket | null,
  localVideoRef: MutableRefObject<HTMLVideoElement | null>,
  remoteVideoRef: MutableRefObject<HTMLVideoElement | null>
) => {
  const [inCall, setInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const peerRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc:offer', async (offer) => {
      if (!streamRef.current) {
        await startLocalStream();
      }
      answerCall(offer);
    });

    socket.on('webrtc:answer', (answer) => {
      peerRef.current?.signal(answer);
    });

    socket.on('webrtc:ice-candidate', (candidate) => {
      peerRef.current?.signal(candidate);
    });

    socket.on('webrtc:end', () => {
      endCall(false);
    });

    return () => {
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('webrtc:end');
    };
  }, [socket]);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Failed to get media", err);
    }
  };

  const startCall = async () => {
    const stream = await startLocalStream();
    if (!stream || !socket) return;

    setInCall(true);

    const peer = new Peer({
      initiator: true,
      trickle: true,
      stream,
    });

    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        socket.emit('webrtc:offer', data);
      } else if ('candidate' in data) {
        socket.emit('webrtc:ice-candidate', data);
      }
    });

    peer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peerRef.current = peer;
  };

  const answerCall = (offer: any) => {
    if (!streamRef.current || !socket) return;

    setInCall(true);

    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream: streamRef.current,
    });

    peer.on('signal', (data) => {
      if (data.type === 'answer') {
        socket.emit('webrtc:answer', data);
      } else if ('candidate' in data) {
        socket.emit('webrtc:ice-candidate', data);
      }
    });

    peer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.signal(offer);
    peerRef.current = peer;
  };

  const endCall = (emit = true) => {
    if (emit && socket) {
      socket.emit('webrtc:end');
    }
    peerRef.current?.destroy();
    streamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    
    setInCall(false);
    setIsScreenSharing(false);
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      
      const videoTrack = stream.getVideoTracks()[0];
      
      if (peerRef.current && streamRef.current) {
        const sender = peerRef.current.streams[0].getVideoTracks()[0];
        peerRef.current.replaceTrack(sender, videoTrack, streamRef.current);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsScreenSharing(true);

      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Error sharing screen", err);
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    
    if (peerRef.current && streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const currentSender = peerRef.current.streams[0].getVideoTracks()[0];
      peerRef.current.replaceTrack(currentSender, videoTrack, streamRef.current);
    }

    if (localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }

    setIsScreenSharing(false);
  };

  return { startCall, endCall, inCall, startScreenShare, stopScreenShare, isScreenSharing };
};
