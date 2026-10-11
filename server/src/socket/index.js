const jwt = require('jsonwebtoken');
const GameSession = require('../models/GameSession');
const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');
const ticTacToe = require('../games/ticTacToe');

const onlineUsers = new Set();
const activeLocations = new Map(); // roomId -> Map(userId -> locationPayload)
const ludoRooms = new Map(); // sessionCode -> { hostId, players: [{ userId, playerName, role, socketId }] }
const poolRooms = new Map(); // sessionCode -> { hostId, players: [{ userId, playerName, role, socketId }] }
const carromRooms = new Map(); // sessionCode -> { hostId, players: [{ userId, playerName, role, socketId }] }

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
    const userId = socket.user.userId;
    console.log(`User connected: ${userId}`);

    // Join personal user channel for direct friend invitations and calls
    socket.join(`user:${userId}`);
    onlineUsers.add(userId.toString());
    io.emit('presence:online', { userId });

    // Helpers to get current active room
    const getActiveRoomChannel = () => {
      for (const r of socket.rooms) {
        if (r.startsWith('room:')) {
          return r;
        }
      }
      return null;
    };

    const getActiveRoomId = () => {
      const channel = getActiveRoomChannel();
      return channel ? channel.replace('room:', '') : null;
    };

    // Room switch / join live handler
    socket.on('room:switch', (data) => {
      const newRoomId = data?.roomId;
      for (const r of socket.rooms) {
        if (r.startsWith('room:')) {
          socket.leave(r);
        }
      }
      if (newRoomId) {
        const newChannel = `room:${newRoomId}`;
        socket.join(newChannel);
        socket.user.roomId = newRoomId;
        socket.to(newChannel).emit('presence:online', { userId });
      } else {
        socket.user.roomId = null;
      }
    });

    // Query online status and lastSeen for friends/room members
    socket.on('presence:query', async (targetUserIds, callback) => {
      if (typeof callback === 'function') {
        const statusMap = {};
        const ids = Array.isArray(targetUserIds) ? targetUserIds : [];
        
        try {
          // Query lastSeen from DB for requested IDs
          const users = await User.find({ _id: { $in: ids } }).select('_id lastSeen').lean();
          const lastSeenMap = {};
          users.forEach(u => {
            lastSeenMap[u._id.toString()] = u.lastSeen;
          });

          ids.forEach(id => {
            const strId = id.toString();
            statusMap[strId] = {
              online: onlineUsers.has(strId),
              lastSeen: lastSeenMap[strId] || null,
            };
          });
        } catch (err) {
          console.error('Error fetching presence query:', err);
          ids.forEach(id => {
            const strId = id.toString();
            statusMap[strId] = {
              online: onlineUsers.has(strId),
              lastSeen: null,
            };
          });
        }

        callback(statusMap);
      }
    });

    // Fetch user from DB to always get the latest roomId on initial connection
    let initialRoomId = socket.user.roomId;
    try {
      const dbUser = await User.findById(userId);
      if (dbUser && dbUser.roomId) {
        initialRoomId = dbUser.roomId.toString();
        socket.user.roomId = initialRoomId;
      }
    } catch (err) {
      console.error('Error fetching user for socket:', err);
    }

    if (initialRoomId) {
      const roomChannel = `room:${initialRoomId}`;
      socket.join(roomChannel);
      socket.to(roomChannel).emit('presence:online', { userId });
    }

    // Chat
    socket.on('chat:message', async (data) => {
      try {
        const content = typeof data === 'object' ? data.content : data;
        const type = (typeof data === 'object' && data.type) ? data.type : 'text';
        const currentRoomId = getActiveRoomId();
        const currentChannel = getActiveRoomChannel();

        if (!content || !content.trim() || !currentRoomId || !currentChannel) return;

        const message = new Message({
          roomId: currentRoomId,
          senderId: userId,
          type,
          content,
        });
        await message.save();
        await message.populate('senderId', 'displayName avatar');
        // Broadcast message to entire room
        io.to(currentChannel).emit('chat:message', message);

        // Also broadcast an explicit message notification to room members outside active chat
        socket.to(currentChannel).emit('chat:notification', {
          senderId: userId,
          senderName: message.senderId?.displayName || 'Your partner',
          senderAvatar: message.senderId?.avatar || '',
          content: content.length > 80 ? content.slice(0, 80) + '...' : content,
          type,
          timestamp: message.createdAt,
          roomId: currentRoomId,
        });
      } catch (err) {
        console.error('chat:message error:', err);
      }
    });

    socket.on('chat:typing', ({ isTyping }) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('chat:typing', { userId, isTyping });
      }
    });

    socket.on('chat:seen', ({ messageId }) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('chat:seen', { messageId, seenBy: userId });
      }
    });

    socket.on('chat:vanish', () => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('chat:vanish');
      }
    });

    // Mood Theme
    socket.on('mood:set', async ({ mood }) => {
      try {
        const validMoods = ['love', 'angry', 'just_friends', 'sad', 'horny'];
        if (!mood || !validMoods.includes(mood)) return;

        const currentRoomId = getActiveRoomId();
        const currentChannel = getActiveRoomChannel();
        if (!currentRoomId || !currentChannel) return;

        const user = await User.findById(userId);
        const room = await Room.findById(currentRoomId);
        if (!user || !room) return;

        if (!room.moodTheme) {
          room.moodTheme = {
            current: 'love',
            updatedBy: user._id,
            updatedByName: user.displayName || 'Partner',
            updatedAt: new Date(),
            history: [],
          };
        }

        const setByName = user.displayName || 'Partner';
        const setTime = new Date();

        room.moodTheme.current = mood;
        room.moodTheme.updatedBy = user._id;
        room.moodTheme.updatedByName = setByName;
        room.moodTheme.updatedAt = setTime;

        room.moodTheme.history.unshift({
          mood,
          setBy: user._id,
          setName: setByName,
          createdAt: setTime,
        });

        if (room.moodTheme.history.length > 40) {
          room.moodTheme.history = room.moodTheme.history.slice(0, 40);
        }

        await room.save();

        io.to(currentChannel).emit('mood:update', {
          moodTheme: room.moodTheme,
          changedBy: {
            _id: user._id,
            displayName: setByName,
          },
        });
      } catch (err) {
        console.error('mood:set error:', err);
      }
    });

    // Watch Together
    socket.on('watch:load', (data) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('watch:load', data);
      }
    });

    socket.on('watch:sync', (data) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('watch:sync', data);
      }
    });

    socket.on('watch:state', (data) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('watch:state', data);
      }
    });

    socket.on('watch:reaction', ({ emoji }) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('watch:reaction', { emoji, userId });
      }
    });

    socket.on('watch:join', () => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('watch:join', { userId });
      }
    });

    socket.on('watch:leave', () => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('watch:leave', { userId });
      }
    });

    // Planned Event sync
    socket.on('room:event-update', (data) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('room:event-update', data);
      }
    });

    // WebRTC Call Signaling (Prioritize direct user channel, fallback to room broadcast)
    socket.on('webrtc:call-user', ({ callType, callerName, callerAvatar, targetUserId }) => {
      const payload = {
        callerId: userId,
        callerName,
        callerAvatar,
        callType: callType || 'video',
      };
      if (targetUserId && targetUserId.toString() !== userId.toString()) {
        io.to(`user:${targetUserId}`).emit('webrtc:incoming-call', payload);
      } else {
        const currentChannel = getActiveRoomChannel();
        if (currentChannel) {
          socket.to(currentChannel).emit('webrtc:incoming-call', payload);
        }
      }
    });

    socket.on('webrtc:accept-call', (data) => {
      const callerId = data?.callerId;
      const payload = { receiverId: userId };
      if (callerId && callerId.toString() !== userId.toString()) {
        io.to(`user:${callerId}`).emit('webrtc:call-accepted', payload);
      } else {
        const currentChannel = getActiveRoomChannel();
        if (currentChannel) {
          socket.to(currentChannel).emit('webrtc:call-accepted', payload);
        }
      }
    });

    socket.on('webrtc:reject-call', (data) => {
      const callerId = data?.callerId;
      const payload = { receiverId: userId };
      if (callerId && callerId.toString() !== userId.toString()) {
        io.to(`user:${callerId}`).emit('webrtc:call-rejected', payload);
      } else {
        const currentChannel = getActiveRoomChannel();
        if (currentChannel) {
          socket.to(currentChannel).emit('webrtc:call-rejected', payload);
        }
      }
    });

    socket.on('webrtc:signal', ({ signal, targetUserId }) => {
      const payload = { signal, senderId: userId };
      if (targetUserId && targetUserId.toString() !== userId.toString()) {
        io.to(`user:${targetUserId}`).emit('webrtc:signal', payload);
      } else {
        const currentChannel = getActiveRoomChannel();
        if (currentChannel) {
          socket.to(currentChannel).emit('webrtc:signal', payload);
        }
      }
    });

    socket.on('webrtc:hangup', (data) => {
      const targetUserId = data?.targetUserId;
      const payload = { senderId: userId };
      if (targetUserId && targetUserId.toString() !== userId.toString()) {
        io.to(`user:${targetUserId}`).emit('webrtc:hangup', payload);
      } else {
        const currentChannel = getActiveRoomChannel();
        if (currentChannel) {
          socket.to(currentChannel).emit('webrtc:hangup', payload);
        }
      }
    });

    socket.on('webrtc:end', (data) => {
      const targetUserId = data?.targetUserId;
      const payload = { senderId: userId };
      if (targetUserId && targetUserId.toString() !== userId.toString()) {
        io.to(`user:${targetUserId}`).emit('webrtc:hangup', payload);
      } else {
        const currentChannel = getActiveRoomChannel();
        if (currentChannel) {
          socket.to(currentChannel).emit('webrtc:hangup', payload);
        }
      }
    });

    socket.on('webrtc:offer', (offer) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('webrtc:offer', { offer, senderId: userId });
      }
    });

    socket.on('webrtc:answer', (answer) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('webrtc:answer', { answer, senderId: userId });
      }
    });

    socket.on('webrtc:ice-candidate', (candidate) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('webrtc:ice-candidate', { candidate, senderId: userId });
      }
    });

    // Location
    socket.on('location:update', (data) => {
      const currentChannel = getActiveRoomChannel();
      const currentRoomId = getActiveRoomId();
      if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;

      const locPayload = {
        userId,
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy || null,
        speed: data.speed || null,
        heading: data.heading || null,
        updatedAt: data.updatedAt || new Date().toISOString(),
      };

      if (currentRoomId) {
        if (!activeLocations.has(currentRoomId)) {
          activeLocations.set(currentRoomId, new Map());
        }
        activeLocations.get(currentRoomId).set(userId.toString(), locPayload);
      }

      if (currentChannel) {
        socket.to(currentChannel).emit('location:update', locPayload);
      }
    });

    socket.on('location:stop', () => {
      const currentChannel = getActiveRoomChannel();
      const currentRoomId = getActiveRoomId();
      if (currentRoomId && activeLocations.has(currentRoomId)) {
        activeLocations.get(currentRoomId).delete(userId.toString());
      }
      if (currentChannel) {
        socket.to(currentChannel).emit('location:stop', { userId });
      }
    });

    socket.on('location:query', () => {
      const currentRoomId = getActiveRoomId();
      if (currentRoomId && activeLocations.has(currentRoomId)) {
        const roomMap = activeLocations.get(currentRoomId);
        roomMap.forEach((loc, memberId) => {
          if (memberId !== userId.toString()) {
            socket.emit('location:update', loc);
          }
        });
      }
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('location:request');
      }
    });

    // Goals sync
    socket.on('goal:update', (data) => {
      const currentChannel = getActiveRoomChannel();
      if (currentChannel) {
        socket.to(currentChannel).emit('goal:update', data);
      }
    });

    // Games
    socket.on('game:start', async ({ gameType, partnerId }) => {
      try {
        const currentRoomId = getActiveRoomId();
        const currentChannel = getActiveRoomChannel();
        if (!currentRoomId || !currentChannel) return;

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
          roomId: currentRoomId,
          gameType,
          state: initialState,
        });
        await session.save();
        
        io.to(currentChannel).emit('game:start', { session });
      } catch (error) {
        console.error('Error starting game:', error);
      }
    });

    socket.on('game:move', async ({ sessionId, move }) => {
      try {
        const currentChannel = getActiveRoomChannel();
        if (!currentChannel) return;

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
            io.to(currentChannel).emit('game:move', { session });
          }
        }
      } catch (error) {
        console.error('Error processing game move:', error);
      }
    });

    socket.on('game:end', async ({ sessionId, scores, winnerId }) => {
      try {
        const currentChannel = getActiveRoomChannel();
        if (!currentChannel) return;

        const session = await GameSession.findById(sessionId);
        if (session) {
          session.status = 'finished';
          if (scores) session.scores = scores;
          if (winnerId) session.winner = winnerId;
          await session.save();
          io.to(currentChannel).emit('game:end', { session });
        }
      } catch (error) {
        console.error('Error ending game:', error);
      }
    });

    // Direct Friend Game Challenge / Invite Handlers
    socket.on('game:invite', (data) => {
      const targetUserId = data?.targetUserId;
      if (!targetUserId) return;
      io.to(`user:${targetUserId}`).emit('game:invite:received', {
        senderId: userId,
        senderName: data.senderName || 'Your Friend',
        senderAvatar: data.senderAvatar,
        game: data.game || 'chess',
        sessionCode: data.sessionCode,
      });
    });

    socket.on('game:invite:accept', (data) => {
      const targetUserId = data?.targetUserId;
      if (!targetUserId) return;
      io.to(`user:${targetUserId}`).emit('game:invite:accepted', {
        acceptedBy: userId,
        game: data.game || 'chess',
        sessionCode: data.sessionCode,
      });
    });

    socket.on('game:invite:decline', (data) => {
      const targetUserId = data?.targetUserId;
      if (!targetUserId) return;
      io.to(`user:${targetUserId}`).emit('game:invite:declined', {
        declinedBy: userId,
        game: data.game || 'chess',
      });
    });

    // Real-Time Chess Match Events
    socket.on('chess:join', ({ sessionCode, role, playerName }) => {
      if (!sessionCode) return;
      socket.join(`chess:${sessionCode}`);
      socket.to(`chess:${sessionCode}`).emit('chess:opponent_joined', {
        role,
        playerName,
        userId,
      });
    });

    socket.on('chess:move', ({ sessionCode, move, fen }) => {
      if (!sessionCode) return;
      socket.to(`chess:${sessionCode}`).emit('chess:move', {
        move,
        fen,
        senderId: userId,
      });
    });

    socket.on('chess:chat', ({ sessionCode, text, senderName }) => {
      if (!sessionCode) return;
      socket.to(`chess:${sessionCode}`).emit('chess:chat', {
        text,
        senderName,
        senderId: userId,
        timestamp: Date.now(),
      });
    });

    socket.on('chess:emoji', ({ sessionCode, emoji }) => {
      if (!sessionCode) return;
      socket.to(`chess:${sessionCode}`).emit('chess:emoji', {
        emoji,
        senderId: userId,
      });
    });

    socket.on('chess:rematch', ({ sessionCode }) => {
      if (!sessionCode) return;
      socket.to(`chess:${sessionCode}`).emit('chess:rematch', {
        senderId: userId,
      });
    });

    socket.on('chess:resign', ({ sessionCode, role }) => {
      if (!sessionCode) return;
      socket.to(`chess:${sessionCode}`).emit('chess:resign', {
        senderId: userId,
        role,
      });
    });

    socket.on('chess:leave', ({ sessionCode }) => {
      if (!sessionCode) return;
      socket.leave(`chess:${sessionCode}`);
      socket.to(`chess:${sessionCode}`).emit('chess:opponent_left', {
        senderId: userId,
      });
    });

    // Real-Time Ludo Match Events
    socket.on('ludo:join', ({ sessionCode, role, playerName, targetCount }) => {
      if (!sessionCode) return;
      socket.join(`ludo:${sessionCode}`);

      let room = ludoRooms.get(sessionCode);
      if (!room) {
        room = { hostId: userId, players: [], targetCount: targetCount || 2 };
        ludoRooms.set(sessionCode, room);
      }

      // Assign role
      let assignedRole = role;
      if (!assignedRole) {
        const roleOrder = ['red', 'green', 'yellow', 'blue'];
        const usedRoles = room.players.map(p => p.role);
        assignedRole = roleOrder.find(r => !usedRoles.includes(r)) || 'yellow';
      }

      const existingIdx = room.players.findIndex(p => p.userId?.toString() === userId?.toString());
      const playerObj = {
        userId,
        playerName: playerName || 'Player',
        role: assignedRole,
        socketId: socket.id,
      };

      if (existingIdx >= 0) {
        room.players[existingIdx] = playerObj;
      } else {
        room.players.push(playerObj);
      }

      socket.emit('ludo:joined_ack', {
        sessionCode,
        role: assignedRole,
        players: room.players,
      });

      socket.to(`ludo:${sessionCode}`).emit('ludo:opponent_joined', {
        role: assignedRole,
        playerName: playerObj.playerName,
        userId,
        players: room.players,
      });
    });

    socket.on('ludo:start_game', ({ sessionCode, activePlayerIds, playerNames }) => {
      if (!sessionCode) return;
      io.in(`ludo:${sessionCode}`).emit('ludo:game_started', {
        sessionCode,
        activePlayerIds,
        playerNames,
      });
    });

    socket.on('ludo:roll', ({ sessionCode, playerId, roll }) => {
      if (!sessionCode) return;
      socket.to(`ludo:${sessionCode}`).emit('ludo:roll', {
        playerId,
        roll,
        senderId: userId,
      });
    });

    socket.on('ludo:move', ({ sessionCode, playerId, tokenIndex, roll }) => {
      if (!sessionCode) return;
      socket.to(`ludo:${sessionCode}`).emit('ludo:move', {
        playerId,
        tokenIndex,
        roll,
        senderId: userId,
      });
    });

    socket.on('ludo:restart', ({ sessionCode }) => {
      if (!sessionCode) return;
      socket.to(`ludo:${sessionCode}`).emit('ludo:restart', {
        senderId: userId,
      });
    });

    socket.on('ludo:chat', ({ sessionCode, message, senderName }) => {
      if (!sessionCode) return;
      socket.to(`ludo:${sessionCode}`).emit('ludo:chat', {
        message,
        senderName,
        senderId: userId,
        timestamp: Date.now(),
      });
    });

    socket.on('ludo:leave', ({ sessionCode }) => {
      if (!sessionCode) return;
      socket.leave(`ludo:${sessionCode}`);
      const room = ludoRooms.get(sessionCode);
      if (room) {
        room.players = room.players.filter(p => p.userId?.toString() !== userId?.toString());
        if (room.players.length === 0) {
          ludoRooms.delete(sessionCode);
        }
      }
      socket.to(`ludo:${sessionCode}`).emit('ludo:opponent_left', {
        senderId: userId,
        players: room ? room.players : [],
      });
    });

    // Real-Time 8-Ball Pool Match Events
    socket.on('pool:join', ({ sessionCode, role, playerName }) => {
      if (!sessionCode) return;
      socket.join(`pool:${sessionCode}`);

      let room = poolRooms.get(sessionCode);
      if (!room) {
        room = { hostId: userId, players: [] };
        poolRooms.set(sessionCode, room);
      }

      let assignedRole = role || (room.players.length === 0 ? 'p1' : 'p2');
      const playerObj = {
        userId,
        playerName: playerName || (assignedRole === 'p1' ? 'Player 1' : 'Player 2'),
        role: assignedRole,
        socketId: socket.id,
      };

      const existingIdx = room.players.findIndex(p => p.userId?.toString() === userId?.toString());
      if (existingIdx >= 0) {
        room.players[existingIdx] = playerObj;
      } else {
        room.players.push(playerObj);
      }

      socket.emit('pool:joined_ack', {
        sessionCode,
        role: assignedRole,
        players: room.players,
      });

      socket.to(`pool:${sessionCode}`).emit('pool:opponent_joined', {
        role: assignedRole,
        playerName: playerObj.playerName,
        userId,
        players: room.players,
      });
    });

    socket.on('pool:shot', ({ sessionCode, power, aimAngle, cueBallX, cueBallZ }) => {
      if (!sessionCode) return;
      socket.to(`pool:${sessionCode}`).emit('pool:shot', {
        power,
        aimAngle,
        cueBallX,
        cueBallZ,
        senderId: userId,
      });
    });

    socket.on('pool:sync_balls', ({ sessionCode, ballsData, currentTurn, playerGroups }) => {
      if (!sessionCode) return;
      socket.to(`pool:${sessionCode}`).emit('pool:sync_balls', {
        ballsData,
        currentTurn,
        playerGroups,
        senderId: userId,
      });
    });

    socket.on('pool:rematch', ({ sessionCode }) => {
      if (!sessionCode) return;
      socket.to(`pool:${sessionCode}`).emit('pool:rematch', {
        senderId: userId,
      });
    });

    socket.on('pool:chat', ({ sessionCode, message, senderName }) => {
      if (!sessionCode) return;
      socket.to(`pool:${sessionCode}`).emit('pool:chat', {
        message,
        senderName,
        senderId: userId,
        timestamp: Date.now(),
      });
    });

    socket.on('pool:leave', ({ sessionCode }) => {
      if (!sessionCode) return;
      socket.leave(`pool:${sessionCode}`);
      const room = poolRooms.get(sessionCode);
      if (room) {
        room.players = room.players.filter(p => p.userId?.toString() !== userId?.toString());
        if (room.players.length === 0) poolRooms.delete(sessionCode);
      }
      socket.to(`pool:${sessionCode}`).emit('pool:opponent_left', {
        senderId: userId,
        players: room ? room.players : [],
      });
    });

    // ----------------- CARROM MULTIPLAYER -----------------
    socket.on('carrom:join', ({ sessionCode, role, playerName }) => {
      if (!sessionCode) return;
      socket.join(`carrom:${sessionCode}`);

      let room = carromRooms.get(sessionCode);
      if (!room) {
        room = { hostId: userId, players: [] };
        carromRooms.set(sessionCode, room);
      }

      const existingIdx = room.players.findIndex(p => p.userId?.toString() === userId?.toString());
      const playerInfo = {
        userId,
        playerName: playerName || socket.user?.displayName || 'Player',
        role: role || (room.players.length === 0 ? 'p1' : 'p2'),
        socketId: socket.id,
      };

      if (existingIdx >= 0) {
        room.players[existingIdx] = playerInfo;
      } else {
        room.players.push(playerInfo);
      }

      socket.emit('carrom:joined_ack', {
        sessionCode,
        assignedRole: playerInfo.role,
        players: room.players,
      });

      socket.to(`carrom:${sessionCode}`).emit('carrom:opponent_joined', {
        playerName: playerInfo.playerName,
        role: playerInfo.role,
        players: room.players,
      });
    });

    socket.on('carrom:shot', ({ sessionCode, power, aimAngle, strikerX }) => {
      if (!sessionCode) return;
      socket.to(`carrom:${sessionCode}`).emit('carrom:shot', {
        power,
        aimAngle,
        strikerX,
        senderId: userId,
      });
    });

    socket.on('carrom:sync_pieces', ({ sessionCode, piecesData, scores, currentTurn }) => {
      if (!sessionCode) return;
      socket.to(`carrom:${sessionCode}`).emit('carrom:sync_pieces', {
        piecesData,
        scores,
        currentTurn,
        senderId: userId,
      });
    });

    socket.on('carrom:rematch', ({ sessionCode }) => {
      if (!sessionCode) return;
      socket.to(`carrom:${sessionCode}`).emit('carrom:rematch', { senderId: userId });
    });

    socket.on('carrom:chat', ({ sessionCode, message, senderName }) => {
      if (!sessionCode) return;
      socket.to(`carrom:${sessionCode}`).emit('carrom:chat', {
        message,
        senderName,
        senderId: userId,
        timestamp: Date.now(),
      });
    });

    socket.on('carrom:leave', ({ sessionCode }) => {
      if (!sessionCode) return;
      socket.leave(`carrom:${sessionCode}`);
      const room = carromRooms.get(sessionCode);
      if (room) {
        room.players = room.players.filter(p => p.userId?.toString() !== userId?.toString());
        if (room.players.length === 0) carromRooms.delete(sessionCode);
      }
      socket.to(`carrom:${sessionCode}`).emit('carrom:opponent_left', {
        senderId: userId,
        players: room ? room.players : [],
      });
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);
      onlineUsers.delete(userId.toString());
      const now = new Date();
      try {
        await User.findByIdAndUpdate(userId, { lastSeen: now });
      } catch (err) {
        console.error('Error updating user lastSeen on disconnect:', err);
      }

      io.emit('presence:offline', { userId, lastSeen: now });
      const currentChannel = getActiveRoomChannel();
      const currentRoomId = getActiveRoomId();
      if (currentRoomId && activeLocations.has(currentRoomId)) {
        activeLocations.get(currentRoomId).delete(userId.toString());
      }
      if (currentChannel) {
        socket.to(currentChannel).emit('presence:offline', { userId, lastSeen: now });
        socket.to(currentChannel).emit('location:stop', { userId });
      }
    });
  });
};

module.exports = { setupSocket };
