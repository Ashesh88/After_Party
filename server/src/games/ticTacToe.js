const validateMove = (state, move, userId) => {
  if (state.currentPlayer !== userId) {
    return { valid: false, newState: state, winner: null };
  }

  const { position } = move; // 0-8
  if (state.board[position] !== null) {
    return { valid: false, newState: state, winner: null };
  }

  const newBoard = [...state.board];
  const symbol = userId === state.xPlayer ? 'X' : 'O';
  newBoard[position] = symbol;

  const winner = checkWinner(newBoard);
  const isDraw = !winner && newBoard.every((cell) => cell !== null);
  
  const newState = {
    ...state,
    board: newBoard,
    currentPlayer: userId === state.xPlayer ? state.oPlayer : state.xPlayer,
  };

  let winResult = null;
  if (winner) {
    winResult = symbol === 'X' ? state.xPlayer : state.oPlayer;
  } else if (isDraw) {
    winResult = 'draw';
  }

  return { valid: true, newState, winner: winResult };
};

const checkWinner = (board) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

module.exports = {
  validateMove,
};
