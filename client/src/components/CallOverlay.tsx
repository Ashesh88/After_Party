'use client';
import { useEffect, useRef, useState } from 'react';
import { useSocketStore } from '../lib/store/socketStore';
import { useAuthStore } from '../lib/store/authStore';
import { useCallStore } from '../lib/store/callStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, 
  Minimize2, Maximize2, User, Sparkles, Volume2 
} from 'lucide-react';

export default function CallOverlay() {
  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);

  const {
    callStatus,
    callType,
    isMuted,
    isVideoOff,
    isMinimized,
    callDuration,
    partnerInfo,
    incomingCaller,
    localStream,
    remoteStream,
    peer,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleMinimize,
    setIncomingCall,
    incrementDuration,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const miniRemoteVideoRef = useRef<HTMLVideoElement>(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isMinimized, callStatus]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (miniRemoteVideoRef.current && remoteStream) {
      miniRemoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isMinimized, callStatus]);

  // Call timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        incrementDuration();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus, incrementDuration]);

  // Socket signaling listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc:incoming-call', (data: any) => {
      setIncomingCall(data);
    });

    socket.on('webrtc:signal', ({ signal }: any) => {
      if (peer) {
        try {
          peer.signal(signal);
        } catch (e) {
          console.error('Error signaling peer:', e);
        }
      }
    });

    socket.on('webrtc:call-accepted', () => {
      // Remote accepted
    });

    socket.on('webrtc:call-rejected', () => {
      toast('Partner was unable to answer', { icon: '📞' });
      endCall(null);
    });

    socket.on('webrtc:hangup', () => {
      toast('Call ended', { icon: '📞' });
      endCall(null);
    });

    return () => {
      socket.off('webrtc:incoming-call');
      socket.off('webrtc:signal');
      socket.off('webrtc:call-accepted');
      socket.off('webrtc:call-rejected');
      socket.off('webrtc:hangup');
    };
  }, [socket, peer, endCall, setIncomingCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callStatus === 'idle') return null;

  return (
    <>
      {/* 1. INCOMING CALL MODAL (WhatsApp Style) */}
      <AnimatePresence>
        {callStatus === 'incoming' && incomingCaller && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              className="relative w-full max-w-sm rounded-[36px] glass-panel border border-pink-500/30 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="ambient-glow-pink -top-20 -left-20 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="relative w-24 h-24 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full bg-pink-500/20 animate-ping" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-1 shadow-[0_0_30px_rgba(244,63,142,0.4)]">
                    <div className="w-full h-full rounded-full bg-[#0c0c18] flex items-center justify-center overflow-hidden">
                      {incomingCaller.callerAvatar ? (
                        <img src={incomingCaller.callerAvatar} alt="Caller" className="w-full h-full object-cover" />
                      ) : (
                        <User size={36} className="text-pink-400" />
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mb-1">
                  {incomingCaller.callerName}
                </h3>
                <p className="text-xs text-pink-300 font-semibold uppercase tracking-wider mb-8 flex items-center justify-center gap-1.5">
                  <span>{incomingCaller.callType === 'video' ? 'Incoming Video Call 📹' : 'Incoming Voice Call 📞'}</span>
                </p>

                {/* WhatsApp Green / Red Action Buttons */}
                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => rejectCall(socket)}
                      className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <PhoneOff size={26} />
                    </button>
                    <span className="text-[11px] font-bold text-slate-400">Decline</span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => acceptCall(socket)}
                      className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-transform hover:scale-110 active:scale-95 cursor-pointer animate-bounce"
                    >
                      <Phone size={26} />
                    </button>
                    <span className="text-[11px] font-bold text-emerald-400">Accept</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. OUTGOING CALL SCREEN */}
      <AnimatePresence>
        {callStatus === 'outgoing' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm rounded-[36px] glass-panel border border-purple-500/30 p-8 text-center shadow-2xl overflow-hidden"
            >
              <div className="relative w-24 h-24 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-1">
                  <div className="w-full h-full rounded-full bg-[#0c0c18] flex items-center justify-center overflow-hidden">
                    {partnerInfo?.avatar ? (
                      <img src={partnerInfo.avatar} alt="Partner" className="w-full h-full object-cover" />
                    ) : (
                      <User size={36} className="text-purple-400" />
                    )}
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-black text-white mb-1">
                {partnerInfo?.displayName || 'Partner'}
              </h3>
              <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider mb-8 animate-pulse">
                Ringing partner space... 💕
              </p>

              <button
                onClick={() => endCall(socket)}
                className="w-16 h-16 mx-auto rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <PhoneOff size={26} />
              </button>
              <span className="text-[11px] font-bold text-slate-400 mt-2 block">Cancel</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. ACTIVE CONNECTED CALL: MINIMIZED (Chota Floating PiP Window) */}
      <AnimatePresence>
        {callStatus === 'connected' && isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed right-4 bottom-24 z-50 w-36 sm:w-44 h-52 sm:h-60 rounded-3xl glass-panel border border-pink-500/40 shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col group cursor-pointer"
            onClick={toggleMinimize}
            title="Click to expand (Bada karein)"
          >
            {/* Video preview / Avatar */}
            <div className="relative flex-1 bg-black">
              <video
                ref={miniRemoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {(!remoteStream || callType === 'audio') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d18] p-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-pink-500/20 border border-pink-500/30 p-1 mb-1">
                    {partnerInfo?.avatar ? (
                      <img src={partnerInfo.avatar} alt="Partner" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User size={20} className="text-pink-400" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-white truncate max-w-full">
                    {partnerInfo?.displayName || 'Partner'}
                  </span>
                </div>
              )}

              {/* Expand badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimize();
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
              >
                <Maximize2 size={13} />
              </button>

              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[9px] font-mono font-bold text-emerald-400">
                {formatDuration(callDuration)}
              </div>
            </div>

            {/* Quick mini bottom controls */}
            <div 
              className="p-2 bg-[#0c0c18] border-t border-white/10 flex items-center justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={toggleMute}
                className={`p-2 rounded-xl transition-all ${
                  isMuted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
              </button>

              <button
                onClick={() => endCall(socket)}
                className="p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-all shadow-md"
              >
                <PhoneOff size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. ACTIVE CONNECTED CALL: EXPANDED (Bada WhatsApp-Style Interface) */}
      <AnimatePresence>
        {callStatus === 'connected' && !isMinimized && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl h-[92vh] max-h-[820px] rounded-[36px] glass-panel border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
            >
              {/* WhatsApp Call Header */}
              <div className="shrink-0 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent relative z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-[2px]">
                    <div className="w-full h-full rounded-[14px] bg-[#0c0c18] flex items-center justify-center overflow-hidden">
                      {partnerInfo?.avatar ? (
                        <img src={partnerInfo.avatar} alt="Partner" className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-pink-400" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                      {partnerInfo?.displayName || 'Partner'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-emerald-300">
                        {formatDuration(callDuration)}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                        • {callType === 'video' ? 'HD Video' : 'HD Voice'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chota (Minimize) Button */}
                <button
                  onClick={toggleMinimize}
                  title="Chota karein (Minimize to floating badge)"
                  className="px-3 py-1.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  <Minimize2 size={15} />
                  <span className="hidden sm:inline">Chota karein</span>
                </button>
              </div>

              {/* Main Stage Video Display */}
              <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
                {/* Remote Partner Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Fallback Avatar view if audio call or camera off */}
                {(!remoteStream || callType === 'audio') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-tr from-[#0a0a14] via-[#101026] to-[#0a0a14]">
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-pink-500/30 to-purple-600/30 border border-pink-500/40 p-2 shadow-[0_0_50px_rgba(244,63,142,0.3)] animate-float mb-4">
                      <div className="w-full h-full rounded-full bg-[#0a0a14] flex items-center justify-center overflow-hidden">
                        {partnerInfo?.avatar ? (
                          <img src={partnerInfo.avatar} alt="Partner" className="w-full h-full object-cover" />
                        ) : (
                          <User size={60} className="text-pink-400" />
                        )}
                      </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mb-1">
                      {partnerInfo?.displayName || 'Partner'}
                    </h2>
                    <span className="text-xs text-pink-300 font-semibold font-mono tracking-wider">
                      {formatDuration(callDuration)}
                    </span>
                  </div>
                )}

                {/* Local User PiP Tile */}
                {callType === 'video' && (
                  <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden glass-panel border border-white/20 shadow-2xl z-20 bg-black">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                    />
                    {isVideoOff && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d18] p-2 text-center">
                        <VideoOff size={20} className="text-slate-500 mb-1" />
                        <span className="text-[10px] text-slate-400">Camera Off</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom WhatsApp-Style Control Dock */}
              <div className="shrink-0 p-5 sm:p-6 bg-[#0a0a14]/95 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-center gap-4 sm:gap-6 z-20">
                {/* 1. Mute / Unmute Button */}
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/20'
                      : 'bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10'
                  }`}
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>

                {/* 2. Video Toggle Button */}
                {callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                      isVideoOff
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/20'
                        : 'bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10'
                    }`}
                    title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                  >
                    {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                  </button>
                )}

                {/* 3. Red End Call Button */}
                <button
                  onClick={() => endCall(socket)}
                  className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xl shadow-rose-500/40 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  title="End Call"
                >
                  <PhoneOff size={26} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
