// Chess AI Engine with 3 Difficulty Levels (Easy, Medium, Grandmaster)
// Uses Minimax with Alpha-Beta Pruning and Piece-Square Positional Tables

class ChessAI {
    constructor() {
        this.pieceValues = {
            p: 100,
            n: 320,
            b: 330,
            r: 500,
            q: 900,
            k: 20000
        };

        // Positional Tables for White (inverted for Black)
        this.pstPawn = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];

        this.pstKnight = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];

        this.pstBishop = [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ];
    }

    getBestMove(chess, difficulty = 'medium') {
        const moves = chess.moves({ verbose: true });
        if (moves.length === 0) return null;

        if (difficulty === 'easy') {
            // Easy: prefer capture if possible, otherwise random
            const captures = moves.filter(m => m.captured);
            if (captures.length > 0 && Math.random() < 0.6) {
                return captures[Math.floor(Math.random() * captures.length)];
            }
            return moves[Math.floor(Math.random() * moves.length)];
        }

        const depth = difficulty === 'hard' ? 3 : 2;
        let bestMove = null;
        const isMaximizing = chess.turn() === 'w';
        let bestValue = isMaximizing ? -Infinity : Infinity;

        // Shuffle moves to add slight variety in equally good positions
        const shuffledMoves = moves.sort(() => Math.random() - 0.5);

        for (const move of shuffledMoves) {
            chess.move(move);
            const value = this.minimax(chess, depth - 1, -Infinity, Infinity, !isMaximizing);
            chess.undo();

            if (isMaximizing) {
                if (value > bestValue) {
                    bestValue = value;
                    bestMove = move;
                }
            } else {
                if (value < bestValue) {
                    bestValue = value;
                    bestMove = move;
                }
            }
        }

        return bestMove || moves[0];
    }

    minimax(chess, depth, alpha, beta, isMaximizing) {
        if (depth === 0 || chess.game_over()) {
            return this.evaluateBoard(chess);
        }

        const moves = chess.moves({ verbose: true });

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                chess.move(move);
                const evalScore = this.minimax(chess, depth - 1, alpha, beta, false);
                chess.undo();
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break; // Beta cut-off
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                chess.move(move);
                const evalScore = this.minimax(chess, depth - 1, alpha, beta, true);
                chess.undo();
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break; // Alpha cut-off
            }
            return minEval;
        }
    }

    evaluateBoard(chess) {
        if (chess.in_checkmate()) {
            return chess.turn() === 'w' ? -99999 : 99999;
        }
        if (chess.in_draw()) {
            return 0;
        }

        let totalEvaluation = 0;
        const board = chess.board();

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece) {
                    const value = this.getPieceValue(piece, r, c);
                    totalEvaluation += piece.color === 'w' ? value : -value;
                }
            }
        }

        return totalEvaluation;
    }

    getPieceValue(piece, row, col) {
        const baseVal = this.pieceValues[piece.type] || 0;
        let positionalVal = 0;

        const pRow = piece.color === 'w' ? row : 7 - row;

        if (piece.type === 'p') {
            positionalVal = this.pstPawn[pRow][col];
        } else if (piece.type === 'n') {
            positionalVal = this.pstKnight[pRow][col];
        } else if (piece.type === 'b') {
            positionalVal = this.pstBishop[pRow][col];
        }

        return baseVal + positionalVal;
    }
}

window.ChessAI = ChessAI;
