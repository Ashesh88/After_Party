// PeerJS P2P WebRTC Multiplayer Manager with Real-Time Video Call & Voice Chat

class MultiplayerManager {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.peer = null;
        this.conn = null;
        this.mediaCall = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isHost = false;
        this.myPeerId = null;
        this.remotePeerId = null;
        this.myColor = 'w';
        this.connected = false;
        this.isAudioMuted = false;
        this.isVideoMuted = false;
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `ZEN-${code}`;
    }

    createRoom(customCode = null) {
        const roomCode = customCode || this.generateRoomCode();
        this.isHost = true;
        this.myColor = 'w';

        if (this.peer) this.peer.destroy();

        this.peer = new Peer(roomCode, {
            debug: 1
        });

        this.peer.on('open', (id) => {
            this.myPeerId = id;
            if (this.callbacks.onRoomCreated) {
                this.callbacks.onRoomCreated(id);
            }
        });

        this.peer.on('connection', (connection) => {
            this.conn = connection;
            this.remotePeerId = connection.peer;
            this.setupConnectionHandlers();
        });

        this.setupMediaListeners();

        this.peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            if (err.type === 'unavailable-id') {
                this.createRoom();
            } else if (this.callbacks.onError) {
                this.callbacks.onError(err);
            }
        });
    }

    joinRoom(roomCode) {
        this.isHost = false;
        this.myColor = 'b';
        this.remotePeerId = roomCode;

        if (this.peer) this.peer.destroy();

        this.peer = new Peer({
            debug: 1
        });

        this.peer.on('open', (id) => {
            this.myPeerId = id;
            this.conn = this.peer.connect(roomCode, {
                reliable: true
            });
            this.setupConnectionHandlers();
        });

        this.setupMediaListeners();

        this.peer.on('error', (err) => {
            console.error('PeerJS join error:', err);
            if (this.callbacks.onError) {
                this.callbacks.onError(err);
            }
        });
    }

    setupConnectionHandlers() {
        if (!this.conn) return;

        this.conn.on('open', () => {
            this.connected = true;
            this.remotePeerId = this.conn.peer;
            if (this.callbacks.onConnected) {
                this.callbacks.onConnected({
                    isHost: this.isHost,
                    myColor: this.myColor,
                    remotePeerId: this.remotePeerId
                });
            }

            if (this.isHost && this.callbacks.getHostSettings) {
                const settings = this.callbacks.getHostSettings();
                this.send({
                    type: 'init_match',
                    settings: settings
                });
            }
        });

        this.conn.on('data', (data) => {
            this.handleIncomingData(data);
        });

        this.conn.on('close', () => {
            this.connected = false;
            this.endCall();
            if (this.callbacks.onDisconnected) {
                this.callbacks.onDisconnected();
            }
        });

        this.conn.on('error', (err) => {
            console.error('Connection data error:', err);
        });
    }

    // WebRTC Audio / Video Call Integration
    setupMediaListeners() {
        if (!this.peer) return;

        this.peer.on('call', async (incomingCall) => {
            this.mediaCall = incomingCall;
            try {
                if (!this.localStream) {
                    this.localStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    });
                    if (this.callbacks.onLocalStream) {
                        this.callbacks.onLocalStream(this.localStream);
                    }
                }
                this.mediaCall.answer(this.localStream);
                this.handleCallStream(this.mediaCall);
            } catch (err) {
                console.warn('Could not get local camera/mic to answer, answering audio only:', err);
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    this.mediaCall.answer(this.localStream);
                    this.handleCallStream(this.mediaCall);
                } catch (e2) {
                    console.error('Cannot access media devices:', e2);
                }
            }
        });
    }

    async startVideoCall() {
        if (!this.peer || !this.remotePeerId) {
            throw new Error('Not connected to a friend yet!');
        }

        try {
            if (!this.localStream) {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                if (this.callbacks.onLocalStream) {
                    this.callbacks.onLocalStream(this.localStream);
                }
            }

            this.mediaCall = this.peer.call(this.remotePeerId, this.localStream);
            this.handleCallStream(this.mediaCall);
            return true;
        } catch (err) {
            console.error('Failed to start video call:', err);
            throw err;
        }
    }

    handleCallStream(call) {
        if (!call) return;

        call.on('stream', (remoteStream) => {
            this.remoteStream = remoteStream;
            if (this.callbacks.onRemoteStream) {
                this.callbacks.onRemoteStream(remoteStream);
            }
        });

        call.on('close', () => {
            this.remoteStream = null;
            if (this.callbacks.onCallEnded) {
                this.callbacks.onCallEnded();
            }
        });

        call.on('error', (err) => {
            console.error('MediaCall error:', err);
        });
    }

    toggleMic() {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                this.isAudioMuted = !this.isAudioMuted;
                audioTracks[0].enabled = !this.isAudioMuted;
                return !this.isAudioMuted; // true = unmuted, false = muted
            }
        }
        return false;
    }

    toggleCam() {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            if (videoTracks.length > 0) {
                this.isVideoMuted = !this.isVideoMuted;
                videoTracks[0].enabled = !this.isVideoMuted;
                return !this.isVideoMuted; // true = active, false = disabled
            }
        }
        return false;
    }

    endCall() {
        if (this.mediaCall) {
            this.mediaCall.close();
            this.mediaCall = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.remoteStream = null;
        if (this.callbacks.onCallEnded) {
            this.callbacks.onCallEnded();
        }
    }

    handleIncomingData(data) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'init_match':
                if (this.callbacks.onMatchInit) {
                    this.callbacks.onMatchInit(data.settings);
                }
                break;
            case 'move':
                if (this.callbacks.onRemoteMove) {
                    this.callbacks.onRemoteMove(data.move);
                }
                break;
            case 'chat':
                if (this.callbacks.onChatMessage) {
                    this.callbacks.onChatMessage(data.text, data.sender);
                }
                break;
            case 'emoji':
                if (this.callbacks.onEmojiReaction) {
                    this.callbacks.onEmojiReaction(data.emoji, data.sender);
                }
                break;
            case 'resign':
                if (this.callbacks.onOpponentResign) {
                    this.callbacks.onOpponentResign();
                }
                break;
        }
    }

    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    sendMove(move) {
        this.send({ type: 'move', move: move });
    }

    sendChat(text, sender = 'Player') {
        this.send({ type: 'chat', text: text, sender: sender });
    }

    sendEmoji(emoji, sender = 'Player') {
        this.send({ type: 'emoji', emoji: emoji, sender: sender });
    }

    disconnect() {
        this.endCall();
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        this.connected = false;
    }
}

window.MultiplayerManager = MultiplayerManager;
