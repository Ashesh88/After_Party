// 3D UNO Party - Official Rule Engine & Turn Arbiter
// Implements 108-card official deck, action cards, wild shifts, uno calls, and smart bot AI

const UNO_COLORS = ['red', 'blue', 'green', 'yellow'];
const UNO_COLOR_HEX = {
    red: 0xef4444,
    blue: 0x3b82f6,
    green: 0x10b981,
    yellow: 0xf59e0b,
    wild: 0x8b5cf6
};

class UnoCard {
    constructor(id, color, value) {
        this.id = id; // Unique string identifier
        this.color = color; // 'red' | 'blue' | 'green' | 'yellow' | 'wild'
        this.value = value; // '0'-'9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'
    }

    isAction() {
        return ['skip', 'reverse', 'draw2'].includes(this.value);
    }

    isWild() {
        return this.value === 'wild' || this.value === 'wild4';
    }

    getPoints() {
        if (this.isWild()) return 50;
        if (this.isAction()) return 20;
        return parseInt(this.value, 10) || 0;
    }

    getLabel() {
        if (this.value === 'draw2') return '+2';
        if (this.value === 'wild4') return '+4';
        if (this.value === 'wild') return 'WILD';
        if (this.value === 'skip') return 'SKIP';
        if (this.value === 'reverse') return 'REV';
        return this.value.toUpperCase();
    }
}

class UnoGameLogic {
    constructor(options = {}) {
        this.playersCount = options.playersCount || 2;
        this.playerNames = options.playerNames || ['You', 'Bot'];
        this.onStateChange = options.onStateChange || null;
        this.onEvent = options.onEvent || null; // Callback for animations / sound triggers

        this.deck = [];
        this.discardPile = [];
        this.playersHands = []; // Array of card arrays
        this.currentPlayer = 0;
        this.direction = 1; // 1 = clockwise / forward, -1 = counter-clockwise
        this.activeColor = null; // Current color that must be matched
        this.cardCount = 0;
        this.saidUno = [false, false, false, false];
        this.unoCatchWindow = null; // tracks if player can be caught for missing UNO
        this.isGameOver = false;
        this.winner = null;
        this.scores = [0, 0, 0, 0];

        this.initDeck();
    }

    // Build standard 108 cards
    initDeck() {
        this.deck = [];
        let idCounter = 1;

        // 4 Colors
        UNO_COLORS.forEach(color => {
            // One 0 per color
            this.deck.push(new UnoCard(`c_${idCounter++}`, color, '0'));

            // Two of 1-9 per color
            for (let num = 1; num <= 9; num++) {
                this.deck.push(new UnoCard(`c_${idCounter++}`, color, String(num)));
                this.deck.push(new UnoCard(`c_${idCounter++}`, color, String(num)));
            }

            // Two of Skip, Reverse, Draw2 per color
            ['skip', 'reverse', 'draw2'].forEach(action => {
                this.deck.push(new UnoCard(`c_${idCounter++}`, color, action));
                this.deck.push(new UnoCard(`c_${idCounter++}`, color, action));
            });
        });

        // 4 Wild and 4 Wild Draw Four
        for (let i = 0; i < 4; i++) {
            this.deck.push(new UnoCard(`c_${idCounter++}`, 'wild', 'wild'));
            this.deck.push(new UnoCard(`c_${idCounter++}`, 'wild', 'wild4'));
        }

        this.shuffle(this.deck);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Start a fresh round
    startNewGame() {
        this.initDeck();
        this.discardPile = [];
        this.playersHands = Array.from({ length: this.playersCount }, () => []);
        this.currentPlayer = 0;
        this.direction = 1;
        this.saidUno = Array.from({ length: this.playersCount }, () => false);
        this.unoCatchWindow = null;
        this.isGameOver = false;
        this.winner = null;

        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            for (let p = 0; p < this.playersCount; p++) {
                this.playersHands[p].push(this.drawCardFromDeck());
            }
        }

        // Draw first card for discard pile (must not be Wild+4 for starting card)
        let firstCard = this.drawCardFromDeck();
        while (firstCard.value === 'wild4') {
            this.deck.unshift(firstCard);
            this.shuffle(this.deck);
            firstCard = this.drawCardFromDeck();
        }

        this.discardPile.push(firstCard);
        this.activeColor = firstCard.color === 'wild' ? UNO_COLORS[Math.floor(Math.random() * 4)] : firstCard.color;

        // Handle initial action card if top card on game start
        if (firstCard.value === 'skip') {
            this.currentPlayer = this.getNextPlayerIndex(1);
        } else if (firstCard.value === 'reverse') {
            this.direction *= -1;
            if (this.playersCount === 2) {
                this.currentPlayer = 1; // Dealer plays first in 2-player reverse start
            } else {
                this.currentPlayer = this.playersCount - 1;
            }
        } else if (firstCard.value === 'draw2') {
            const victim = this.currentPlayer;
            this.giveCardsToPlayer(victim, 2);
            this.currentPlayer = this.getNextPlayerIndex(1);
        }

        this.notifyState();
    }

    drawCardFromDeck() {
        if (this.deck.length === 0) {
            // Reshuffle discard pile except top card
            if (this.discardPile.length <= 1) {
                // Failsafe: recreate deck if discard is empty
                this.initDeck();
            } else {
                const top = this.discardPile.pop();
                this.deck = this.discardPile;
                this.discardPile = [top];
                this.shuffle(this.deck);
            }
        }
        return this.deck.pop();
    }

    getTopCard() {
        return this.discardPile[this.discardPile.length - 1];
    }

    getNextPlayerIndex(steps = 1) {
        let next = (this.currentPlayer + steps * this.direction) % this.playersCount;
        while (next < 0) next += this.playersCount;
        return next;
    }

    giveCardsToPlayer(playerIdx, count) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            const card = this.drawCardFromDeck();
            this.playersHands[playerIdx].push(card);
            drawn.push(card);
        }
        // If player had UNO protection, reset it since they have >1 card
        if (this.playersHands[playerIdx].length > 1) {
            this.saidUno[playerIdx] = false;
        }
        return drawn;
    }

    // Check if card is legally playable
    isCardPlayable(card) {
        if (!card) return false;
        const top = this.getTopCard();
        if (!top) return true;

        // Wild & Wild+4 can always be played
        if (card.isWild()) return true;

        // Match active color
        if (card.color === this.activeColor) return true;

        // Match card value / symbol (e.g., 7 on 7, skip on skip)
        if (card.value === top.value) return true;

        return false;
    }

    getPlayableCards(playerIdx) {
        const hand = this.playersHands[playerIdx] || [];
        return hand.filter(c => this.isCardPlayable(c));
    }

    // Player action: Call UNO!
    callUno(playerIdx) {
        const hand = this.playersHands[playerIdx];
        if (hand.length <= 2) {
            this.saidUno[playerIdx] = true;
            if (this.unoCatchWindow === playerIdx) {
                this.unoCatchWindow = null;
            }
            if (this.onEvent) {
                this.onEvent('uno_called', { playerIdx, playerName: this.playerNames[playerIdx] });
            }
            this.notifyState();
            return true;
        }
        return false;
    }

    // Opponent catches player who didn't say UNO
    catchUno(catcherIdx, targetIdx) {
        if (targetIdx === undefined) {
            targetIdx = (catcherIdx === 0) ? 1 : 0;
        }
        if (this.playersHands[targetIdx].length === 1 && !this.saidUno[targetIdx]) {
            // Penalty: target draws 2 cards
            const penaltyCards = this.giveCardsToPlayer(targetIdx, 2);
            this.unoCatchWindow = null;
            if (this.onEvent) {
                this.onEvent('uno_caught', {
                    catcherIdx,
                    targetIdx,
                    catcherName: this.playerNames[catcherIdx],
                    targetName: this.playerNames[targetIdx],
                    count: 2
                });
            }
            this.notifyState();
            return true;
        }
        return false;
    }

    // Play a card
    playCard(playerIdx, cardId, chosenColor = null) {
        if (this.isGameOver) return { success: false, reason: 'game_over' };
        if (playerIdx !== this.currentPlayer) return { success: false, reason: 'not_your_turn' };

        const hand = this.playersHands[playerIdx];
        const cardIndex = hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return { success: false, reason: 'card_not_found' };

        const card = hand[cardIndex];
        if (!this.isCardPlayable(card)) return { success: false, reason: 'illegal_card' };

        // Handle Uno flag: if playing leaves player with 1 card and they didn't call UNO, flag for catch
        if (hand.length === 2 && !this.saidUno[playerIdx]) {
            this.unoCatchWindow = playerIdx;
        }

        // Remove card from hand and push to discard
        hand.splice(cardIndex, 1);
        this.discardPile.push(card);

        // Check victory
        if (hand.length === 0) {
            this.handleVictory(playerIdx);
            return { success: true, winner: playerIdx, card };
        }

        // Action card effects
        let effect = null;
        let nextPlayerStep = 1;

        if (card.isWild()) {
            this.activeColor = chosenColor || UNO_COLORS[Math.floor(Math.random() * 4)];
            if (card.value === 'wild4') {
                const victim = this.getNextPlayerIndex(1);
                this.giveCardsToPlayer(victim, 4);
                nextPlayerStep = 2; // victim skips turn
                effect = 'wild4';
            } else {
                effect = 'wild';
            }
        } else {
            this.activeColor = card.color;

            if (card.value === 'skip') {
                nextPlayerStep = 2; // next player skipped
                effect = 'skip';
            } else if (card.value === 'reverse') {
                if (this.playersCount === 2) {
                    // Official 2-player UNO rule: Reverse acts as Skip!
                    nextPlayerStep = 2;
                    effect = 'reverse_2p_skip';
                } else {
                    this.direction *= -1;
                    nextPlayerStep = 1;
                    effect = 'reverse';
                }
            } else if (card.value === 'draw2') {
                const victim = this.getNextPlayerIndex(1);
                this.giveCardsToPlayer(victim, 2);
                nextPlayerStep = 2; // victim skips turn
                effect = 'draw2';
            }
        }

        if (this.onEvent) {
            this.onEvent('card_played', {
                playerIdx,
                card,
                effect,
                activeColor: this.activeColor,
                remainingCards: hand.length
            });
        }

        this.currentPlayer = this.getNextPlayerIndex(nextPlayerStep);
        this.notifyState();
        return { success: true, card, effect, nextPlayer: this.currentPlayer };
    }

    // Player draws card from pile
    playerDrawCard(playerIdx) {
        if (this.isGameOver) return null;
        if (playerIdx !== this.currentPlayer) return null;

        const drawn = this.drawCardFromDeck();
        this.playersHands[playerIdx].push(drawn);

        // If player had 1 card previously, reset UNO protection
        if (this.playersHands[playerIdx].length > 1) {
            this.saidUno[playerIdx] = false;
        }

        const isPlayable = this.isCardPlayable(drawn);

        if (this.onEvent) {
            this.onEvent('card_drawn', {
                playerIdx,
                card: drawn,
                isPlayable
            });
        }

        this.notifyState();
        return { card: drawn, isPlayable };
    }

    // Pass turn (after drawing a card that wasn't played)
    passTurn(playerIdx) {
        if (this.isGameOver) return;
        if (playerIdx !== this.currentPlayer) return;

        this.currentPlayer = this.getNextPlayerIndex(1);
        if (this.onEvent) {
            this.onEvent('turn_passed', { playerIdx, nextPlayer: this.currentPlayer });
        }
        this.notifyState();
    }

    handleVictory(winnerIdx) {
        this.isGameOver = true;
        this.winner = winnerIdx;

        // Calculate points won from all opponents' cards
        let roundPoints = 0;
        this.playersHands.forEach((hand, idx) => {
            if (idx !== winnerIdx) {
                hand.forEach(card => {
                    roundPoints += card.getPoints();
                });
            }
        });
        this.scores[winnerIdx] += roundPoints;

        if (this.onEvent) {
            this.onEvent('game_won', {
                winnerIdx,
                winnerName: this.playerNames[winnerIdx],
                roundPoints,
                totalScore: this.scores[winnerIdx]
            });
        }
        this.notifyState();
    }

    // Strategic AI Logic for Bot
    getBestBotMove(botIdx) {
        const hand = this.playersHands[botIdx];
        const playable = this.getPlayableCards(botIdx);

        // Check if bot should call UNO! (has 2 cards before playing)
        const shouldCallUno = hand.length === 2;

        if (playable.length === 0) {
            return { action: 'draw', shouldCallUno };
        }

        // Count bot's colors in hand to pick best wild color or prioritize color match
        const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
        hand.forEach(c => {
            if (c.color !== 'wild' && colorCounts[c.color] !== undefined) {
                colorCounts[c.color]++;
            }
        });
        const dominantColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b, 'red');

        // Opponent status: if opponent has 1 or 2 cards left, bot gets aggressive with +4, +2, or Skip
        const opponentIdx = this.getNextPlayerIndex(1);
        const opponentCardCount = this.playersHands[opponentIdx].length;
        const isOpponentThreat = opponentCardCount <= 2;

        let selectedCard = null;

        if (isOpponentThreat) {
            // Priority 1: +4 or +2 or Skip to stop opponent
            const attackCard = playable.find(c => c.value === 'wild4' || c.value === 'draw2' || c.value === 'skip');
            if (attackCard) selectedCard = attackCard;
        }

        // Priority 2: Action card matching current color/type
        if (!selectedCard) {
            const actionCard = playable.find(c => c.isAction());
            if (actionCard) selectedCard = actionCard;
        }

        // Priority 3: Highest point normal card (to discard high numbers first)
        if (!selectedCard) {
            const normalCards = playable.filter(c => !c.isWild());
            if (normalCards.length > 0) {
                normalCards.sort((a, b) => b.getPoints() - a.getPoints());
                selectedCard = normalCards[0];
            }
        }

        // Priority 4: Wild cards if no other normal card
        if (!selectedCard) {
            selectedCard = playable.find(c => c.isWild()) || playable[0];
        }

        const chosenColor = selectedCard.isWild() ? dominantColor : null;

        return {
            action: 'play',
            card: selectedCard,
            chosenColor,
            shouldCallUno
        };
    }

    notifyState() {
        if (this.onStateChange) {
            this.onStateChange(this.getStateSnapshot());
        }
    }

    getStateSnapshot() {
        return {
            currentPlayer: this.currentPlayer,
            direction: this.direction,
            activeColor: this.activeColor,
            topCard: this.getTopCard(),
            deckCount: this.deck.length,
            playersCardsCount: this.playersHands.map(h => h.length),
            isGameOver: this.isGameOver,
            winner: this.winner,
            scores: this.scores,
            saidUno: this.saidUno
        };
    }
}

window.UnoCard = UnoCard;
window.UnoGameLogic = UnoGameLogic;
window.UNO_COLORS = UNO_COLORS;
window.UNO_COLOR_HEX = UNO_COLOR_HEX;
