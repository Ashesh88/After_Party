const jwt = require('jsonwebtoken');
const GameSession = require('../models/GameSession');
const Message = require('../models/Message');
const User = require('../models/User');
const ticTacToe = require('../games/ticTacToe');

const setupSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.userId}`);
    const userId = socket.user.userId;

    // Fetch user from DB to always get the latest roomId
    let roomId = socket.user.roomId;
    try {
      const dbUser = await User.findById(userId);
      if (dbUser && dbUser.roomId) {
        roomId = dbUser.roomId.toString();
        socket.user.roomId = roomId;
      }
    } catch (err) {
      console.error('Error fetching user for socket:', err);
    }

    if (roomId) {
      const roomChannel = `room:${roomId}`;
      socket.join(roomChannel);
      socket.to(roomChannel).emit('presence:online', { userId });

      // Chat
      socket.on('chat:message', async (data) => {
        try {
          const content = typeof data === 'object' ? data.content : data;
          const type = (typeof data === 'object' && data.type) ? data.type : 'text';

          if (!content || !content.trim()) return;

          const message = new Message({
            roomId,
            senderId: userId,
            type,
            content,
          });
          await message.save();
          await message.populate('senderId', 'displayName avatar');
          // Broadcast to entire room
          io.to(roomChannel).emit('chat:message', message);
        } catch (err) {
          console.error('chat:message error:', err);
        }
      });

      socket.on('chat:typing', ({ isTyping }) => {
        socket.to(roomChannel).emit('chat:typing', { userId, isTyping });
      });

      socket.on('chat:seen', ({ messageId }) => {
        socket.to(roomChannel).emit('chat:seen', { messageId, seenBy: userId });
      });

      socket.on('chat:vanish', () => {
        socket.to(roomChannel).emit('chat:vanish');
      });

      // Watch Together
      socket.on('watch:load', ({ videoId }) => {
        socket.to(roomChannel).emit('watch:load', { videoId });
      });

      socket.on('watch:sync', (data) => {
        socket.to(roomChannel).emit('watch:sync', data);
      });

      socket.on('watch:state', (data) => {
        socket.to(roomChannel).emit('watch:state', data);
      });

      socket.on('watch:reaction', ({ emoji }) => {
        socket.to(roomChannel).emit('watch:reaction', { emoji, userId });
      });

      socket.on('watch:join', () => {
        socket.to(roomChannel).emit('watch:join', { userId });
      });

      socket.on('watch:leave', () => {
        socket.to(roomChannel).emit('watch:leave', { userId });
      });

      // WebRTC Call Signaling
      socket.on('webrtc:call-user', ({ callType, callerName, callerAvatar }) => {
        socket.to(roomChannel).emit('webrtc:incoming-call', {
          callerId: userId,
          callerName,
          callerAvatar,
          callType: callType || 'video',
        });
      });

      socket.on('webrtc:accept-call', () => {
        socket.to(roomChannel).emit('webrtc:call-accepted');
      });

      socket.on('webrtc:reject-call', () => {
        socket.to(roomChannel).emit('webrtc:call-rejected');
      });

      socket.on('webrtc:signal', ({ signal }) => {
        socket.to(roomChannel).emit('webrtc:signal', { signal, senderId: userId });
      });

      socket.on('webrtc:hangup', () => {
        socket.to(roomChannel).emit('webrtc:hangup', { senderId: userId });
      });

      socket.on('webrtc:end', () => {
        socket.to(roomChannel).emit('webrtc:hangup', { senderId: userId });
      });

      socket.on('webrtc:offer', (offer) => {
        socket.to(roomChannel).emit('webrtc:offer', { offer, senderId: userId });
      });

      socket.on('webrtc:answer', (answer) => {
        socket.to(roomChannel).emit('webrtc:answer', { answer, senderId: userId });
      });

      socket.on('webrtc:ice-candidate', (candidate) => {
        socket.to(roomChannel).emit('webrtc:ice-candidate', { candidate, senderId: userId });
      });

      // Location
      socket.on('location:update', ({ lat, lng, timestamp }) => {
        socket.to(roomChannel).emit('location:update', { userId, lat, lng, timestamp });
      });

      socket.on('location:stop', () => {
        socket.to(roomChannel).emit('location:stop', { userId });
      });

      // Goals sync
      socket.on('goal:update', (data) => {
        socket.to(roomChannel).emit('goal:update', data);
      });

      // Games
      socket.on('game:start', async ({ gameType, partnerId }) => {
        try {
          let initialState = {};
          if (gameType === 'tic-tac-toe') {
            initialState = {
              board: Array(9).fill(null),
              currentPlayer: userId,
              xPlayer: userId,
              oPlayer: partnerId,
            };
          }
          
          const session = new GameSession({
            roomId,
            gameType,
            state: initialState,
          });
          await session.save();
          
          io.to(roomChannel).emit('game:start', { session });
        } catch (error) {
          console.error('Error starting game:', error);
        }
      });

      socket.on('game:move', async ({ sessionId, move }) => {
        try {
          const session = await GameSession.findById(sessionId);
          if (!session || session.status !== 'active') return;

          if (session.gameType === 'tic-tac-toe') {
            const { valid, newState, winner } = ticTacToe.validateMove(session.state, move, userId);
            if (valid) {
              session.state = newState;
              if (winner) {
                session.status = 'finished';
                if (winner !== 'draw') {
                  session.winner = winner;
                }
              }
              await session.save();
              io.to(roomChannel).emit('game:move', { session });
            }
          }
          // other games can be handled here...
        } catch (error) {
          console.error('Error processing game move:', error);
        }
      });

      socket.on('game:end', async ({ sessionId, scores, winnerId }) => {
        try {
          const session = await GameSession.findById(sessionId);
          if (session) {
            session.status = 'finished';
            if (scores) session.scores = scores;
            if (winnerId) session.winner = winnerId;
            await session.save();
            io.to(roomChannel).emit('game:end', { session });
          }
        } catch (error) {
          console.error('Error ending game:', error);
        }
      });
    }

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.userId}`);
      if (roomId) {
        socket.to(`room:${roomId}`).emit('presence:offline', { userId });
      }
    });
  });
};

module.exports = { setupSocket };
