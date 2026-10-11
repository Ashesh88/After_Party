// 3D UNO Party - Official Classic Rule Engine & Turn Arbiter
// Strict Classic UNO rules: 108 cards, exact distribution, same-symbol matching,
// turn order, Skip, 2p Reverse as Skip, Draw Two (+2, no stacking), Wild,
// Wild Draw Four (+4) Challenge system, UNO call and catch penalties, and 500-pt scoring.

const UNO_COLORS = ['red', 'blue', 'green', 'yellow'];
const UNO_COLOR_HEX = {
    red: 0xb91c1c,
    blue: 0x1d4ed8,
    green: 0x047857,
    yellow: 0xd97706,
    wild: 0x7c3aed
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
        this.activeColor = null; // Current active color that must be matched
        this.saidUno = [false, false, false, false];
        this.unoCatchWindow = null; // tracks if player can be caught for missing UNO
        this.isGameOver = false;
        this.winner = null;
        this.scores = Array.from({ length: this.playersCount }, () => 0);
        this.matchTargetScore = 500;
        this.matchWinner = null;

        // Turn draw status
        this.hasDrawnThisTurn = false;
        this.drawnCardId = null;

        // Pending Wild Draw 4 challenge
        this.pendingChallenge = null;

        this.initDeck();
    }

    // Build standard 108 cards:
    // 4 Colors (25 cards each = 100):
    //   - One 0 per color (4)
    //   - Two each of 1-9 per color (72)
    //   - Two each of Skip, Reverse, Draw2 per color (24)
    // 8 Wild cards:
    //   - 4 Wild
    //   - 4 Wild Draw Four
    // Total = 108 cards
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

    // Start a fresh match (resets cumulative scores to 0)
    startNewGame() {
        this.scores = Array.from({ length: this.playersCount }, () => 0);
        this.matchWinner = null;
        this.startNewRound();
    }

    // Start a new round (preserves cumulative scores)
    startNewRound() {
        this.initDeck();
        this.discardPile = [];
        this.playersHands = Array.from({ length: this.playersCount }, () => []);
        this.currentPlayer = 0;
        this.direction = 1;
        this.saidUno = Array.from({ length: this.playersCount }, () => false);
        this.unoCatchWindow = null;
        this.isGameOver = false;
        this.winner = null;
        this.hasDrawnThisTurn = false;
        this.drawnCardId = null;
        this.pendingChallenge = null;

        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            for (let p = 0; p < this.playersCount; p++) {
                this.playersHands[p].push(this.drawCardFromDeck());
            }
        }

        // Draw first card for discard pile (must be a standard number card 0-9 for fair clean start)
        let firstCard = this.drawCardFromDeck();
        while (firstCard.isWild() || firstCard.isAction()) {
            this.deck.unshift(firstCard);
            this.shuffle(this.deck);
            firstCard = this.drawCardFromDeck();
        }

        this.discardPile.push(firstCard);
        this.activeColor = firstCard.color;
        this.currentPlayer = 0; // Human always starts round cleanly

        this.notifyState();
    }

    drawCardFromDeck() {
        if (this.deck.length === 0) {
            // Reshuffle discard pile except top card
            if (this.discardPile.length <= 1) {
                // Failsafe: recreate deck if discard is completely empty
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
        // If player had UNO protection, reset it since they now have >1 card
        if (this.playersHands[playerIdx].length > 1) {
            this.saidUno[playerIdx] = false;
        }
        return drawn;
    }

    // Check if card is legally playable
    // Classic rules:
    // 1. Wild cards can always be played
    // 2. Card color matches activeColor
    // 3. Card value matches topCard.value (number on number OR symbol on symbol: reverse on reverse, skip on skip, draw2 on draw2 across any colors)
    // 4. If player has already drawn a card this turn, only that drawn card can be played!
    isCardPlayable(card, playerIdx = null) {
        if (!card) return false;

        // If checking for the active player and they have already drawn this turn, only the drawn card is legal
        if (playerIdx !== null && playerIdx === this.currentPlayer && this.hasDrawnThisTurn) {
            if (card.id !== this.drawnCardId) return false;
        }

        const top = this.getTopCard();
        if (!top) return true;

        // Wild & Wild+4 can always be played
        if (card.isWild()) return true;

        // Match active color
        if (card.color === this.activeColor) return true;

        // Match card value / symbol (e.g., 7 on 7, skip on skip, reverse on reverse, draw2 on draw2)
        if (card.value === top.value) return true;

        return false;
    }

    getPlayableCards(playerIdx) {
        const hand = this.playersHands[playerIdx] || [];
        return hand.filter(c => this.isCardPlayable(c, playerIdx));
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
        if (this.pendingChallenge) return { success: false, reason: 'pending_challenge' };

        const hand = this.playersHands[playerIdx];
        const cardIndex = hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return { success: false, reason: 'card_not_found' };

        const card = hand[cardIndex];
        if (!this.isCardPlayable(card, playerIdx)) return { success: false, reason: 'illegal_card' };

        // If player has drawn this turn, only that drawn card can be played
        if (this.hasDrawnThisTurn && cardId !== this.drawnCardId) {
            return { success: false, reason: 'can_only_play_drawn_card' };
        }

        const prevActiveColor = this.activeColor;

        // Check if playing leaves player with 1 card and they didn't call UNO
        if (hand.length === 2 && !this.saidUno[playerIdx]) {
            this.unoCatchWindow = playerIdx;
        }

        // Check if Wild+4 play is illegal under official Classic UNO rules:
        // A Wild+4 is illegal if the player currently holds any other card matching prevActiveColor
        let wasWild4Illegal = false;
        if (card.value === 'wild4') {
            wasWild4Illegal = hand.some(c => c.id !== cardId && c.color === prevActiveColor);
        }

        // Remove card from hand and push to discard
        hand.splice(cardIndex, 1);
        this.discardPile.push(card);

        // Reset drawn status for the turn
        this.hasDrawnThisTurn = false;
        this.drawnCardId = null;

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
                effect = 'wild4';
                const challenger = this.getNextPlayerIndex(1);

                // Set pending challenge
                this.pendingChallenge = {
                    playerIdx,
                    challengerIdx: challenger,
                    card,
                    chosenColor: this.activeColor,
                    wasIllegal: wasWild4Illegal
                };

                if (this.onEvent) {
                    this.onEvent('wild4_played', {
                        playerIdx,
                        challengerIdx: challenger,
                        activeColor: this.activeColor,
                        wasIllegal: wasWild4Illegal
                    });
                }

                this.notifyState();
                return { success: true, card, effect: 'wild4', pendingChallenge: true };
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
                nextPlayerStep = 2; // victim draws 2 and skips turn (NO STACKING allowed)
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

    // Resolve Wild Draw Four challenge
    // didChallenge = true: Challenger checks if +4 player had a matching color
    // didChallenge = false: Challenger accepts +4 penalty without challenge
    resolveWild4Challenge(challengerIdx, didChallenge) {
        if (!this.pendingChallenge) return false;
        const { playerIdx, wasIllegal, card } = this.pendingChallenge;
        this.pendingChallenge = null;

        if (didChallenge) {
            if (wasIllegal) {
                // Succeeded! The player who played +4 was guilty (held matching activeColor)
                // Guilty player draws 4 penalty cards
                this.giveCardsToPlayer(playerIdx, 4);
                // Challenger loses NO turn and draws NO cards! Challenger plays next
                this.currentPlayer = challengerIdx;

                if (this.onEvent) {
                    this.onEvent('wild4_challenge_result', {
                        success: true,
                        guiltyPlayer: playerIdx,
                        challenger: challengerIdx,
                        penaltyCount: 4
                    });
                }
            } else {
                // Failed! Player who played +4 was innocent (had no matching activeColor)
                // Challenger must draw 6 cards (4 + 2 penalty) and lose their turn!
                this.giveCardsToPlayer(challengerIdx, 6);
                // Next turn skips challenger
                this.currentPlayer = this.getNextPlayerIndex(2);

                if (this.onEvent) {
                    this.onEvent('wild4_challenge_result', {
                        success: false,
                        guiltyPlayer: null,
                        challenger: challengerIdx,
                        penaltyCount: 6
                    });
                }
            }
        } else {
            // Accepted: Challenger draws 4 cards and loses their turn
            this.giveCardsToPlayer(challengerIdx, 4);
            this.currentPlayer = this.getNextPlayerIndex(2);

            if (this.onEvent) {
                this.onEvent('wild4_accepted', {
                    victim: challengerIdx,
                    penaltyCount: 4
                });
            }
        }

        this.notifyState();
        return true;
    }

    // Player draws card from pile
    playerDrawCard(playerIdx) {
        if (this.isGameOver) return null;
        if (playerIdx !== this.currentPlayer) return null;
        if (this.hasDrawnThisTurn) return null; // Can only draw once per turn in Classic UNO

        const drawn = this.drawCardFromDeck();
        this.playersHands[playerIdx].push(drawn);
        this.hasDrawnThisTurn = true;
        this.drawnCardId = drawn.id;

        // If player had 1 card previously, reset UNO protection
        if (this.playersHands[playerIdx].length > 1) {
            this.saidUno[playerIdx] = false;
        }

        const isPlayable = this.isCardPlayable(drawn, playerIdx);

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
        // In classic rules, you cannot pass without drawing!
        if (!this.hasDrawnThisTurn) return;

        this.hasDrawnThisTurn = false;
        this.drawnCardId = null;
        this.currentPlayer = this.getNextPlayerIndex(1);

        if (this.onEvent) {
            this.onEvent('turn_passed', { playerIdx, nextPlayer: this.currentPlayer });
        }
        this.notifyState();
    }

    handleVictory(winnerIdx) {
        this.isGameOver = true;
        this.winner = winnerIdx;

        // Calculate points won from all opponents' cards:
        // Number cards: face value (0-9)
        // Skip, Reverse, Draw Two: 20 points each
        // Wild, Wild Draw Four: 50 points each
        let roundPoints = 0;
        this.playersHands.forEach((hand, idx) => {
            if (idx !== winnerIdx) {
                hand.forEach(card => {
                    roundPoints += card.getPoints();
                });
            }
        });
        this.scores[winnerIdx] += roundPoints;

        // First player to reach 500 cumulative points wins the match!
        const isMatchWon = this.scores[winnerIdx] >= this.matchTargetScore;
        if (isMatchWon) {
            this.matchWinner = winnerIdx;
        }

        if (this.onEvent) {
            this.onEvent('game_won', {
                winnerIdx,
                winnerName: this.playerNames[winnerIdx],
                roundPoints,
                totalScore: this.scores[winnerIdx],
                isMatchWon,
                matchWinnerName: isMatchWon ? this.playerNames[winnerIdx] : null
            });
        }
        this.notifyState();
    }

    // Strategic AI Logic for Bot
    getBestBotMove(botIdx) {
        const hand = this.playersHands[botIdx] || [];
        const playable = this.getPlayableCards(botIdx);

        // Uno shout check: if bot has 2 cards and will play 1, bot shouts UNO!
        const shouldCallUno = (hand.length === 2 && playable.length > 0);

        if (playable.length === 0) {
            return { action: 'draw', shouldCallUno: false };
        }

        // Count colors in hand to pick dominant color for wilds
        const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
        hand.forEach(c => {
            if (colorCounts[c.color] !== undefined) colorCounts[c.color]++;
        });
        let dominantColor = 'red';
        let maxColorCount = -1;
        Object.entries(colorCounts).forEach(([col, cnt]) => {
            if (cnt > maxColorCount) {
                maxColorCount = cnt;
                dominantColor = col;
            }
        });

        // Priority 1: Match color/number with standard number card
        let selectedCard = null;
        const colorMatches = playable.filter(c => !c.isWild() && !c.isAction() && c.color === this.activeColor);
        if (colorMatches.length > 0) {
            selectedCard = colorMatches[0];
        }

        // Priority 2: Same number / symbol across colors
        if (!selectedCard) {
            const top = this.getTopCard();
            const symbolMatches = playable.filter(c => !c.isWild() && top && c.value === top.value);
            if (symbolMatches.length > 0) {
                selectedCard = symbolMatches[0];
            }
        }

        // Priority 3: Action card (Skip, Reverse, +2)
        if (!selectedCard) {
            const actionCard = playable.find(c => c.isAction());
            if (actionCard) selectedCard = actionCard;
        }

        // Priority 4: Wild cards when needed
        if (!selectedCard) {
            // Prefer standard Wild before Wild+4 to avoid challenge risk
            const simpleWild = playable.find(c => c.value === 'wild');
            if (simpleWild) {
                selectedCard = simpleWild;
            } else {
                selectedCard = playable.find(c => c.value === 'wild4') || playable[0];
            }
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
            saidUno: this.saidUno,
            hasDrawnThisTurn: this.hasDrawnThisTurn,
            drawnCardId: this.drawnCardId,
            pendingChallenge: this.pendingChallenge,
            matchWinner: this.matchWinner
        };
    }
}

// Module export for Node.js test runner and browser window object
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UnoCard, UnoGameLogic, UNO_COLORS, UNO_COLOR_HEX };
}
if (typeof window !== 'undefined') {
    window.UnoCard = UnoCard;
    window.UnoGameLogic = UnoGameLogic;
    window.UNO_COLORS = UNO_COLORS;
    window.UNO_COLOR_HEX = UNO_COLOR_HEX;
}
