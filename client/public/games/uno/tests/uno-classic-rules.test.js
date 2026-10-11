// Test Suite: Classic UNO Rules Engine Verification
const { UnoCard, UnoGameLogic, UNO_COLORS } = require('../js/uno-rules.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
    totalTests++;
    if (!condition) {
        console.error(`FAILED: ${testName}`);
        throw new Error(`Assertion failed: ${testName}`);
    } else {
        console.log(`PASSED: ${testName}`);
        passedTests++;
    }
}

console.log('--- STARTING UNO CLASSIC RULES TESTS ---');

// 1. Deck Composition Test (Exactly 108 cards)
{
    const game = new UnoGameLogic();
    assert(game.deck.length === 108, 'Deck must contain exactly 108 cards');

    const counts = { numbers: 0, actions: 0, wilds: 0, wild4s: 0, zeros: 0 };
    UNO_COLORS.forEach(color => {
        const colorCards = game.deck.filter(c => c.color === color);
        assert(colorCards.length === 25, `Each color (${color}) must have exactly 25 cards`);

        const zeros = colorCards.filter(c => c.value === '0');
        assert(zeros.length === 1, `Color ${color} must have exactly one 0 card`);

        for (let i = 1; i <= 9; i++) {
            const numCards = colorCards.filter(c => c.value === String(i));
            assert(numCards.length === 2, `Color ${color} must have two copies of number ${i}`);
        }

        ['skip', 'reverse', 'draw2'].forEach(act => {
            const actCards = colorCards.filter(c => c.value === act);
            assert(actCards.length === 2, `Color ${color} must have two ${act} cards`);
        });
    });

    const standardWilds = game.deck.filter(c => c.value === 'wild');
    assert(standardWilds.length === 4, 'Deck must contain exactly 4 Wild cards');

    const wildFours = game.deck.filter(c => c.value === 'wild4');
    assert(wildFours.length === 4, 'Deck must contain exactly 4 Wild Draw Four cards');
}

// 2. Deal and Starter Card Test
{
    const game = new UnoGameLogic({ playersCount: 2 });
    game.startNewGame();
    assert(game.playersHands[0].length === 7, 'Player 1 must receive exactly 7 cards');
    assert(game.playersHands[1].length === 7, 'Player 2 must receive exactly 7 cards');
    assert(game.currentPlayer === 0, 'Player 1 (human) must always start round cleanly');

    const topCard = game.getTopCard();
    assert(!topCard.isWild(), 'Starter discard card cannot be Wild');
    assert(!topCard.isAction(), 'Starter discard card cannot be Action card');
}

// 3. Card Matching Rules (Same color, same number, same symbol across colors)
{
    const game = new UnoGameLogic({ playersCount: 2 });
    game.discardPile = [new UnoCard('c_top', 'red', 'reverse')];
    game.activeColor = 'red';

    // Same color
    assert(game.isCardPlayable(new UnoCard('c_1', 'red', '5')), 'Same color card is playable');

    // Same symbol, DIFFERENT color (Yellow Reverse on Red Reverse)
    assert(game.isCardPlayable(new UnoCard('c_2', 'yellow', 'reverse')), 'Same symbol (Reverse on Reverse) across different colors is playable');

    // Wild cards
    assert(game.isCardPlayable(new UnoCard('c_3', 'wild', 'wild')), 'Wild is always playable');
    assert(game.isCardPlayable(new UnoCard('c_4', 'wild', 'wild4')), 'Wild+4 is always playable');

    // Non-matching card
    assert(!game.isCardPlayable(new UnoCard('c_5', 'green', '7')), 'Different color and different symbol cannot be played');
}

// 4. Special Action Cards: Skip & 2-Player Reverse
{
    const game = new UnoGameLogic({ playersCount: 2 });
    game.startNewGame();
    game.currentPlayer = 0;
    game.activeColor = 'blue';
    game.discardPile = [new UnoCard('c_top', 'blue', '3')];

    // Play Skip: skips next player, so Player 0 plays again in 2p game
    const blueSkip = new UnoCard('c_skip', 'blue', 'skip');
    game.playersHands[0] = [blueSkip, new UnoCard('c_rem', 'blue', '5')];
    const skipRes = game.playCard(0, blueSkip.id);
    assert(skipRes.success, 'Skip played successfully');
    assert(game.currentPlayer === 0, 'In 2p game, Skip allows current player to play again');

    // Play Reverse: in 2p game, acts as Skip (current player plays again)
    game.activeColor = 'blue';
    game.discardPile = [new UnoCard('c_top2', 'blue', '4')];
    const blueRev = new UnoCard('c_rev', 'blue', 'reverse');
    game.playersHands[0] = [blueRev, new UnoCard('c_rem2', 'blue', '5')];
    const revRes = game.playCard(0, blueRev.id);
    assert(revRes.success, 'Reverse played successfully');
    assert(game.currentPlayer === 0, 'In 2p game, Reverse acts like Skip and lets current player play again');
}

// 5. Draw Two (+2) Penalty & No Stacking
{
    const game = new UnoGameLogic({ playersCount: 2 });
    game.startNewGame();
    game.currentPlayer = 0;
    game.activeColor = 'green';
    game.discardPile = [new UnoCard('c_top', 'green', '1')];

    const initialP2Count = game.playersHands[1].length;
    const greenDraw2 = new UnoCard('c_d2', 'green', 'draw2');
    game.playersHands[0] = [greenDraw2, new UnoCard('c_rem', 'green', '2')];

    const d2Res = game.playCard(0, greenDraw2.id);
    assert(d2Res.success, 'Draw Two played successfully');
    assert(game.playersHands[1].length === initialP2Count + 2, 'Victim must draw 2 penalty cards');
    assert(game.currentPlayer === 0, 'In 2-player game, Draw Two skips victim so current player plays again');
}

// 6. Draw Limit and Passing Rule
{
    const game = new UnoGameLogic({ playersCount: 2 });
    game.startNewGame();
    game.currentPlayer = 0;

    // Cannot pass without drawing
    assert(!game.hasDrawnThisTurn, 'Must not have drawn flag at start of turn');
    game.passTurn(0);
    assert(game.currentPlayer === 0, 'Cannot pass turn without drawing first');

    // Draw 1 card
    const initialDeckCount = game.deck.length;
    const initialHandCount = game.playersHands[0].length;
    const drawRes = game.playerDrawCard(0);
    assert(drawRes !== null, 'Player drew a card');
    assert(game.playersHands[0].length === initialHandCount + 1, 'Hand has 1 more card');
    assert(game.hasDrawnThisTurn, 'hasDrawnThisTurn flag is set');

    // Cannot draw twice in same turn
    const secondDraw = game.playerDrawCard(0);
    assert(secondDraw === null, 'Cannot draw more than 1 card per turn in Classic UNO');

    // Scenario: Can play any matching card in hand after drawing
    const gameDrawPlay = new UnoGameLogic({ playersCount: 2 });
    gameDrawPlay.startNewGame();
    gameDrawPlay.currentPlayer = 0;
    gameDrawPlay.activeColor = 'blue';
    gameDrawPlay.discardPile = [new UnoCard('c_top', 'blue', '5')];
    const matchBlue = new UnoCard('c_b7', 'blue', '7');
    gameDrawPlay.playersHands[0] = [matchBlue];
    gameDrawPlay.playerDrawCard(0);
    assert(gameDrawPlay.hasDrawnThisTurn === true, 'Player drew a card before playing');
    const playAfterDrawRes = gameDrawPlay.playCard(0, matchBlue.id);
    assert(playAfterDrawRes.success === true, 'Player can play matching card in hand after drawing');
    assert(gameDrawPlay.hasDrawnThisTurn === false, 'hasDrawnThisTurn reset after playing card');

    // Pass turn after drawing
    game.passTurn(0);
    assert(game.currentPlayer === 1, 'Turn successfully passed to next player after drawing');
    assert(!game.hasDrawnThisTurn, 'hasDrawnThisTurn reset after turn pass');
}

// 7. Wild Draw Four (+4) Challenge System
{
    // Scenario A: Guilty +4 (player held matching color) -> Challenge SUCCEEDS
    const gameA = new UnoGameLogic({ playersCount: 2 });
    gameA.startNewGame();
    gameA.currentPlayer = 0;
    gameA.activeColor = 'red';
    gameA.discardPile = [new UnoCard('c_top', 'red', '7')];

    const wild4 = new UnoCard('c_w4', 'wild', 'wild4');
    const redMatch = new UnoCard('c_red', 'red', '4'); // Holding red card = illegal +4!
    const otherCard = new UnoCard('c_oth', 'blue', '2');
    gameA.playersHands[0] = [wild4, redMatch, otherCard];

    const p0CountBefore = gameA.playersHands[0].length;
    const playRes = gameA.playCard(0, wild4.id, 'yellow');
    assert(playRes.success && playRes.pendingChallenge, 'Wild+4 triggers pending challenge');
    assert(gameA.pendingChallenge.wasIllegal === true, '+4 correctly marked as illegal');

    // Bot challenges
    gameA.resolveWild4Challenge(1, true);
    assert(gameA.playersHands[0].length === (p0CountBefore - 1) + 4, 'Guilty player draws 4 penalty cards');
    assert(gameA.currentPlayer === 1, 'Challenger turn is not skipped on successful challenge');

    // Scenario B: Innocent +4 (player had NO matching color) -> Challenge FAILS
    const gameB = new UnoGameLogic({ playersCount: 2 });
    gameB.startNewGame();
    gameB.currentPlayer = 0;
    gameB.activeColor = 'red';
    gameB.discardPile = [new UnoCard('c_top', 'red', '7')];

    const wild4B = new UnoCard('c_w4b', 'wild', 'wild4');
    const blueCard = new UnoCard('c_blu', 'blue', '4');
    const greenCard = new UnoCard('c_grn', 'green', '9');
    gameB.playersHands[0] = [wild4B, blueCard, greenCard]; // NO red card = legal +4!

    gameB.playCard(0, wild4B.id, 'blue');
    assert(gameB.pendingChallenge.wasIllegal === false, '+4 correctly marked as legal (innocent)');

    const p1CountBefore = gameB.playersHands[1].length;
    // Challenger challenges innocent player -> Challenge fails!
    gameB.resolveWild4Challenge(1, true);
    assert(gameB.playersHands[1].length === p1CountBefore + 6, 'Failed challenger draws 6 cards (4 + 2 penalty)');
    assert(gameB.currentPlayer === 0, 'Failed challenger loses their turn');

    // Scenario C: Accepted without challenge
    const gameC = new UnoGameLogic({ playersCount: 2 });
    gameC.startNewGame();
    gameC.currentPlayer = 0;
    gameC.activeColor = 'green';
    gameC.discardPile = [new UnoCard('c_top', 'green', '2')];

    const wild4C = new UnoCard('c_w4c', 'wild', 'wild4');
    gameC.playersHands[0] = [wild4C, new UnoCard('c_x', 'yellow', '1')];
    gameC.playCard(0, wild4C.id, 'blue');

    const p1Init = gameC.playersHands[1].length;
    gameC.resolveWild4Challenge(1, false);
    assert(gameC.playersHands[1].length === p1Init + 4, 'Victim draws 4 cards when challenge accepted');
    assert(gameC.currentPlayer === 0, 'Victim loses turn on accepted Wild+4');

    // Scenario D: Auto-resolution when card is played so game never deadlocks on pending challenge
    const gameD = new UnoGameLogic({ playersCount: 2 });
    gameD.startNewGame();
    gameD.currentPlayer = 0;
    gameD.activeColor = 'red';
    gameD.discardPile = [new UnoCard('c_top', 'red', '9')];
    const w4Card = new UnoCard('c_w4d', 'wild', 'wild4');
    const redCard = new UnoCard('c_r1', 'red', '1');
    gameD.playersHands[0] = [w4Card, redCard];
    gameD.playCard(0, w4Card.id, 'red');
    assert(gameD.pendingChallenge !== null, 'Challenge is initially pending');

    // Playing next card auto-resolves pending challenge
    const autoPlayRes = gameD.playCard(0, redCard.id);
    assert(autoPlayRes.success === true, 'Next card plays cleanly without pending_challenge error');
    assert(gameD.pendingChallenge === null, 'pendingChallenge is cleared after auto-resolution');
}

// 8. UNO Rule & Penalty Catch
{
    const game = new UnoGameLogic({ playersCount: 2 });
    game.startNewGame();
    game.currentPlayer = 0;
    game.activeColor = 'yellow';
    game.discardPile = [new UnoCard('c_top', 'yellow', '1')];

    const yel2 = new UnoCard('c_y2', 'yellow', '2');
    const yel3 = new UnoCard('c_y3', 'yellow', '3');
    game.playersHands[0] = [yel2, yel3]; // 2 cards left

    // Player plays yel2 without calling UNO -> drops to 1 card
    game.playCard(0, yel2.id);
    assert(game.playersHands[0].length === 1, 'Player now has 1 card');
    assert(game.saidUno[0] === false, 'Player did not call UNO');

    // Opponent catches them
    const initialCards = game.playersHands[0].length;
    const caught = game.catchUno(1, 0);
    assert(caught === true, 'Opponent successfully caught player without UNO');
    assert(game.playersHands[0].length === initialCards + 2, 'Player drew 2 penalty cards');

    // Prevent duplicate penalty catch
    const doubleCatch = game.catchUno(1, 0);
    assert(!doubleCatch, 'Duplicate penalty catch is strictly prevented');
}

// 9. Cumulative Scoring to 500 Points
{
    const game = new UnoGameLogic({ playersCount: 2 });
    game.startNewGame();
    game.currentPlayer = 0;
    game.activeColor = 'red';
    game.discardPile = [new UnoCard('c_top', 'red', '8')];

    // Player 0 has 1 card, plays it and wins
    const red8 = new UnoCard('c_r8', 'red', '8');
    game.playersHands[0] = [red8];
    // Player 1 holds: 1 Wild (50), 1 Skip (20), 1 number 9 (9) = 79 points
    game.playersHands[1] = [
        new UnoCard('c_w', 'wild', 'wild'),
        new UnoCard('c_sk', 'blue', 'skip'),
        new UnoCard('c_9', 'green', '9')
    ];

    const winRes = game.playCard(0, red8.id);
    assert(winRes.winner === 0, 'Player 0 won the round');
    assert(game.scores[0] === 79, `Player 0 awarded 79 points (got ${game.scores[0]})`);
    assert(game.isGameOver, 'Round is over');
    assert(game.matchWinner === null, 'Match not won yet because score < 500');

    // Simulate reaching 500 points
    game.scores[0] = 480;
    game.isGameOver = false;
    game.playersHands[0] = [new UnoCard('c_win', 'red', '8')];
    game.playersHands[1] = [new UnoCard('c_w2', 'wild', 'wild')]; // 50 points
    game.playCard(0, 'c_win');
    assert(game.scores[0] === 530, 'Score accumulated to 530');
    assert(game.matchWinner === 0, 'Player 0 is declared match champion at 500+ points');
}

console.log(`\nALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
