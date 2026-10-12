'use client';
import { useEffect, useRef } from 'react';
import { useSocketStore } from '../lib/store/socketStore';
import { useAuthStore } from '../lib/store/authStore';
import { useCallStore } from '../lib/store/callStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, 
  Minimize2, Maximize2, User, SwitchCamera, MonitorUp, ScreenShare
} from 'lucide-react';

export default function CallOverlay() {
  const socket = useSocketStore(state => state.socket);

  const {
    callStatus,
    callType,
    isMuted,
    isVideoOff,
    isMinimized,
    isScreenSharing,
    callDuration,
    partnerInfo,
    incomingCaller,
    localStream,
    remoteStream,
    facingMode,
    isSwitchingCamera,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleMinimize,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    setIncomingCall,
    incrementDuration,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const miniRemoteVideoRef = useRef<HTMLVideoElement>(null);
  const dragConstraintsRef = useRef<HTMLDivElement>(null);
  const expandedStageRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleSwitchCamera = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isSwitchingCamera) return;

    try {
      await switchCamera();
      const currentMode = useCallStore.getState().facingMode;
      toast.success(currentMode === 'environment' ? 'Switched to back camera' : 'Switched to front camera', {
        id: 'switch-camera-toast',
      });
    } catch (err: any) {
      toast.error('Could not switch camera. Check camera permissions.');
    }
  };

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

    const handleIncoming = (data: any) => {
      const currentUserId = useAuthStore.getState().user?._id;
      if (data?.callerId && currentUserId && data.callerId.toString() === currentUserId.toString()) return;
      setIncomingCall(data);
    };

    const handleSignal = ({ signal, senderId }: any) => {
      const currentUserId = useAuthStore.getState().user?._id;
      if (senderId && currentUserId && senderId.toString() === currentUserId.toString()) return;
      useCallStore.getState().handleIncomingSignal(signal);
    };

    const handleAccepted = (data?: any) => {
      const currentUserId = useAuthStore.getState().user?._id;
      if (data?.receiverId && currentUserId && data.receiverId.toString() === currentUserId.toString()) return;
      useCallStore.getState().handleCallAccepted(socket, data);
    };

    const handleRejected = (data?: any) => {
      const currentUserId = useAuthStore.getState().user?._id;
      if (data?.receiverId && currentUserId && data.receiverId.toString() === currentUserId.toString()) return;
      toast('Partner was unable to answer');
      useCallStore.getState().endCall(null);
    };

    const handleHangup = (data?: any) => {
      const currentUserId = useAuthStore.getState().user?._id;
      if (data?.senderId && currentUserId && data.senderId.toString() === currentUserId.toString()) return;
      toast('Call ended');
      useCallStore.getState().endCall(null);
    };

    socket.on('webrtc:incoming-call', handleIncoming);
    socket.on('webrtc:signal', handleSignal);
    socket.on('webrtc:call-accepted', handleAccepted);
    socket.on('webrtc:call-rejected', handleRejected);
    socket.on('webrtc:hangup', handleHangup);

    return () => {
      socket.off('webrtc:incoming-call', handleIncoming);
      socket.off('webrtc:signal', handleSignal);
      socket.off('webrtc:call-accepted', handleAccepted);
      socket.off('webrtc:call-rejected', handleRejected);
      socket.off('webrtc:hangup', handleHangup);
    };
  }, [socket, setIncomingCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callStatus === 'idle') return null;

  return (
    <>
      {/* 1. INCOMING CALL MODAL (WhatsApp Style with Ringing Melody) */}
      <AnimatePresence>
        {callStatus === 'incoming' && incomingCaller && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              className="relative w-full max-w-sm rounded-[36px] glass-panel border border-pink-500/30 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden"
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
                  {incomingCaller.callerName || 'Your Partner'}
                </h3>
                <p className="text-xs text-pink-300 font-semibold uppercase tracking-wider mb-8 flex items-center justify-center gap-1.5 animate-pulse">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
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

      {/* 3. ACTIVE CONNECTED CALL: MINIMIZED (Chota Floating PiP Window - Draggable) */}
      <div 
        ref={dragConstraintsRef} 
        className="fixed inset-3 pointer-events-none z-[95]"
      >
        <AnimatePresence>
          {callStatus === 'connected' && isMinimized && (
            <motion.div
              drag
              dragConstraints={dragConstraintsRef}
              dragElastic={0.08}
              dragMomentum={false}
              onDragStart={() => {
                isDraggingRef.current = true;
              }}
              onDragEnd={() => {
                setTimeout(() => {
                  isDraggingRef.current = false;
                }, 150);
              }}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute right-2 bottom-20 w-36 sm:w-44 h-52 sm:h-60 rounded-3xl glass-panel border border-pink-500/40 shadow-[0_15px_40px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col group cursor-grab active:cursor-grabbing pointer-events-auto touch-none select-none"
              onClick={() => {
                if (!isDraggingRef.current) {
                  toggleMinimize();
                }
              }}
              title="Drag to move anywhere / Tap to expand"
            >
              {/* Subtle top drag handle bar like WhatsApp/Telegram */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
                <div className="w-8 h-1 rounded-full bg-white/40 shadow-sm" />
              </div>

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
                  title="Expand full screen"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90 z-20"
                >
                  <Maximize2 size={13} />
                </button>

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[9px] font-mono font-bold text-emerald-400 z-20">
                  {formatDuration(callDuration)}
                </div>
              </div>

              {/* Quick mini bottom controls */}
              <div 
                className="p-2 bg-[#0c0c18] border-t border-white/10 flex items-center justify-between z-20"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isMuted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                </button>

                <button
                  onClick={() => endCall(socket)}
                  className="p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-all shadow-md cursor-pointer active:scale-95"
                >
                  <PhoneOff size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. ACTIVE CONNECTED CALL: EXPANDED (Bada WhatsApp-Style Interface) */}
      <AnimatePresence>
        {callStatus === 'connected' && !isMinimized && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl h-[88vh] max-h-[780px] rounded-[36px] glass-panel border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
            >
              {/* WhatsApp Call Header */}
              <div className="shrink-0 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/50 to-transparent relative z-20">
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

                {/* Minimize Button */}
                <button
                  onClick={toggleMinimize}
                  title="Minimize Call"
                  className="px-3.5 py-2 rounded-2xl bg-white/[0.1] hover:bg-white/[0.2] border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  <Minimize2 size={15} />
                  <span>Minimize</span>
                </button>
              </div>

              {/* Main Stage Video Display */}
              <div 
                ref={expandedStageRef} 
                className="flex-1 relative bg-black overflow-hidden flex items-center justify-center"
              >
                {/* Remote Partner Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Fallback Avatar view if audio call or camera off */}
                {(!remoteStream || callType === 'audio') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-tr from-[#0a0a14] via-[#101026] to-[#0a0a14] pointer-events-none select-none">
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

                {/* Local User PiP Tile - Draggable Anywhere Like WhatsApp */}
                {callType === 'video' && (
                  <motion.div
                    drag
                    dragConstraints={expandedStageRef}
                    dragElastic={0.08}
                    dragMomentum={false}
                    className="absolute bottom-24 right-4 sm:bottom-24 sm:right-6 w-32 h-44 sm:w-40 sm:h-52 rounded-2xl overflow-hidden glass-panel border border-white/25 shadow-2xl z-20 bg-black cursor-grab active:cursor-grabbing touch-none select-none flex flex-col group"
                    title="Drag anywhere on screen"
                  >
                    {/* Drag Handle Indicator */}
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                      <div className="w-6 h-1 rounded-full bg-white/40 shadow-sm" />
                    </div>

                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover pointer-events-none ${isVideoOff ? 'hidden' : 'block'} ${facingMode === 'user' ? '-scale-x-100' : 'scale-x-100'}`}
                    />

                    {isVideoOff && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d18] p-2 text-center select-none pointer-events-none">
                        <VideoOff size={22} className="text-rose-400 mb-1" />
                        <span className="text-[10px] font-bold text-slate-300">Camera Off</span>
                        <span className="text-[9px] text-slate-500">Tap below to turn on</span>
                      </div>
                    )}

                    {/* Quick Mini Toggle Overlay on hover/tap */}
                    <div className="absolute bottom-1.5 right-1.5 left-1.5 flex items-center justify-between gap-1 z-30 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVideo();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`p-1.5 rounded-lg border text-xs shadow-md transition-all cursor-pointer ${
                          isVideoOff
                            ? 'bg-rose-500/80 text-white border-rose-400'
                            : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                        }`}
                        title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                      >
                        {isVideoOff ? <VideoOff size={12} /> : <Video size={12} />}
                      </button>

                      <button
                        onClick={handleSwitchCamera}
                        disabled={isSwitchingCamera || isVideoOff}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`p-1.5 rounded-lg border text-xs shadow-md transition-all cursor-pointer ${
                          isVideoOff
                            ? 'opacity-40 cursor-not-allowed bg-black/40 text-slate-500 border-white/10'
                            : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                        }`}
                        title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
                      >
                        <SwitchCamera size={12} className={isSwitchingCamera ? 'animate-spin' : ''} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`p-1.5 rounded-lg border text-xs shadow-md transition-all cursor-pointer ${
                          isMuted
                            ? 'bg-rose-500/80 text-white border-rose-400'
                            : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                        }`}
                        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                      >
                        {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Floating WhatsApp-Style Bottom Control Dock - Always 100% visible & centered */}
                <div 
                  className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-3 sm:gap-5 px-5 sm:px-6 py-3 rounded-full bg-[#090913]/90 backdrop-blur-2xl border border-white/15 shadow-[0_15px_45px_rgba(0,0,0,0.85)] pointer-events-auto"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {/* 1. Mute / Unmute Button */}
                  <button
                    onClick={toggleMute}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                      isMuted
                        ? 'bg-rose-500/25 text-rose-300 border-2 border-rose-500/60 shadow-rose-500/20'
                        : 'bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/15'
                    }`}
                    title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  >
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>

                  {/* 2. Video Toggle Button */}
                  {callType === 'video' && (
                    <button
                      onClick={toggleVideo}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                        isVideoOff
                          ? 'bg-rose-500/25 text-rose-300 border-2 border-rose-500/60 shadow-rose-500/20'
                          : 'bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/15'
                      }`}
                      title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                      {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                    </button>
                  )}

                  {/* 3. Switch / Flip Camera Button (Front <-> Back) */}
                  {callType === 'video' && !isScreenSharing && (
                    <button
                      onClick={handleSwitchCamera}
                      disabled={isSwitchingCamera || isVideoOff}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                        isVideoOff
                          ? 'opacity-40 cursor-not-allowed bg-white/[0.08] text-slate-500 border border-white/10'
                          : 'bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/15'
                      }`}
                      title={facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
                    >
                      <SwitchCamera size={22} className={isSwitchingCamera ? 'animate-spin text-pink-400' : ''} />
                    </button>
                  )}

                  {/* 4. Screen Share Toggle (Discord Style Tab / Audio + Video Sharing) */}
                  {callType === 'video' && (
                    <button
                      onClick={async () => {
                        try {
                          if (isScreenSharing) {
                            await stopScreenShare();
                            toast.success('Screen share stopped. Camera restored.');
                          } else {
                            await startScreenShare();
                            toast.success('Sharing screen with tab/system audio! 📺', { duration: 4000 });
                          }
                        } catch (err: any) {
                          if (err?.name !== 'NotAllowedError') {
                            toast.error('Could not share screen. Check permissions.');
                          }
                        }
                      }}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                        isScreenSharing
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-2 border-pink-400 shadow-[0_0_20px_rgba(244,63,142,0.6)] animate-pulse'
                          : 'bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/15'
                      }`}
                      title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen & Audio (Netflix, Tab, etc.)'}
                    >
                      <MonitorUp size={22} />
                    </button>
                  )}

                  {/* 5. Red End Call Button */}
                  <button
                    onClick={() => endCall(socket)}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xl shadow-rose-500/50 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    title="End Call"
                  >
                    <PhoneOff size={26} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
