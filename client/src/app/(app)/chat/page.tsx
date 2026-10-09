'use client';
import { useState, useEffect, useRef } from 'react';
import { useSocketStore } from '../../../lib/store/socketStore';
import { useAuthStore } from '../../../lib/store/authStore';
import api from '../../../lib/api';
import { Message } from '../../../lib/types';
import { motion } from 'framer-motion';
import { Send, CheckCheck, Sparkles, MessageCircleHeart } from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partner, setPartner] = useState<{ displayName: string; avatar?: string } | null>(null);

  const socket = useSocketStore(state => state.socket);
  const user = useAuthStore(state => state.user);
  const room = useAuthStore(state => state.room);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch partner info
  useEffect(() => {
    api.get('/rooms/mine').then(res => {
      const members = res.data.room?.members || [];
      const otherMember = members.find((m: any) => m._id !== user?._id);
      if (otherMember) {
        setPartner({ displayName: otherMember.displayName, avatar: otherMember.avatar });
      }
    }).catch(() => {});
  }, [user]);

  // Load message history
  useEffect(() => {
    api.get('/messages').then(res => {
      if (res.data.messages) {
        setMessages(res.data.messages.reverse());
        scrollToBottom();
      }
    }).catch(console.error);
  }, []);

  // Socket listener
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => {
        // Prevent duplicate appending
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();

      const sender = typeof msg.senderId === 'object' ? (msg.senderId as any)._id : msg.senderId;
      if (sender !== user?._id) {
        socket.emit('chat:seen', { messageId: msg._id });
      }
    });

    socket.on('chat:typing', (data: { isTyping: boolean; userId?: string; senderId?: string }) => {
      const typingUser = data.userId || data.senderId;
      if (typingUser !== user?._id) {
        setPartnerTyping(data.isTyping);
      }
    });

    socket.on('chat:seen', (data: { messageId: string }) => {
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, seen: true } : m));
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:seen');
    };
  }, [socket, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = input.trim();
    if (!content || !socket) return;

    // Send via socket
    socket.emit('chat:message', {
      content,
      type: 'text',
    });

    socket.emit('chat:typing', { isTyping: false });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (socket) {
      socket.emit('chat:typing', { isTyping: e.target.value.length > 0 });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#07070f] flex flex-col pb-24">
      {/* Ambient background glows */}
      <div className="ambient-glow-pink -top-24 -left-20 pointer-events-none" />
      <div className="ambient-glow-purple -bottom-24 -right-20 pointer-events-none" />

      {/* Modern Header */}
      <header className="sticky top-0 z-30 p-4 border-b border-white/[0.08] bg-[#0c0c18]/85 backdrop-blur-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-[2px] shadow-lg shadow-pink-500/20">
            <div className="w-full h-full rounded-[14px] bg-[#0d0d18] flex items-center justify-center overflow-hidden">
              {partner?.avatar ? (
                <img src={partner.avatar} alt="Partner" className="w-full h-full object-cover" />
              ) : (
                <MessageCircleHeart size={20} className="text-pink-400" />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#07070f]" />
          </div>

          <div>
            <h2 className="text-sm font-black text-white leading-tight">
              {partner?.displayName || 'Your Partner'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-pink-400 font-semibold">
                {partnerTyping ? 'Typing a whisper...' : 'Connected in your private room'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] font-bold text-pink-300 uppercase tracking-widest flex items-center gap-1">
          <Sparkles size={11} />
          <span>Encrypted Space</span>
        </div>
      </header>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 relative z-10 max-w-2xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-3 shadow-[0_0_20px_rgba(244,63,142,0.2)]">
              <MessageCircleHeart size={32} />
            </div>
            <h3 className="font-extrabold text-white text-base">Your Private Chat</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Leave sweet notes, whispers, and updates. Everything stays private between both of you.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const senderId = typeof msg.senderId === 'object' ? (msg.senderId as any)._id : msg.senderId;
            const isMe = senderId === user?._id;

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg._id || i}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm font-medium shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-tr-sm shadow-pink-500/20'
                      : 'glass-panel text-slate-100 rounded-tl-sm border-white/10'
                  }`}
                >
                  {msg.content}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 px-1">
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && (
                    <CheckCheck size={13} className={msg.seen ? 'text-pink-400' : 'text-slate-500'} />
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar with Enter-To-Send Support */}
      <div className="sticky bottom-20 z-30 p-4 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSend} className="p-2 rounded-full glass-panel border-white/[0.12] shadow-2xl flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Write a whisper to your love... (Press Enter to send)"
            className="flex-1 bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none font-medium"
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full btn-sexy text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer shadow-lg shadow-pink-500/30"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
