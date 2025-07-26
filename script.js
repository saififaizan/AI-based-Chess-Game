const boardElement = document.getElementById("chessboard");
const turnInfo = document.getElementById("turnInfo");
const statusDiv = document.getElementById("status");
const moveSound = new Audio('sounds/move.mp3');
const captureSound = new Audio('sounds/capture.mp3');
const checkSound = new Audio('sounds/check.mp3');

let currentTurn = "white";
let boardState = initialSetup();
let selected = null;
let legalMoves = [];

function initialSetup() {
  const emptyRow = new Array(8).fill(null);
  const board = [];

  const pieces = [
    "rook", "knight", "bishop", "queen",
    "king", "bishop", "knight", "rook"
  ];

  // Black back row
  board.push(pieces.map(p => ({ type: p, color: "black" })));
  // Black pawns
  board.push(new Array(8).fill({ type: "pawn", color: "black" }));
  // Empty rows
  for (let i = 0; i < 4; i++) board.push(emptyRow.map(() => null));
  // White pawns
  board.push(new Array(8).fill({ type: "pawn", color: "white" }));
  // White back row
  board.push(pieces.map(p => ({ type: p, color: "white" })));

  return board;
}

function renderBoard() {
  boardElement.innerHTML = "";
  turnInfo.textContent = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)}'s turn`;

  boardState.forEach((row, r) => {
    row.forEach((cell, c) => {
      const div = document.createElement("div");
      div.classList.add("square");
      div.classList.add((r + c) % 2 === 0 ? "white" : "black");
      div.dataset.row = r;
      div.dataset.col = c;

      if (cell) {
        div.textContent = getUnicode(cell);
      }

      if (selected && selected.row === r && selected.col === c) {
        div.classList.add("selected");
      }

      if (legalMoves.some(m => m.row === r && m.col === c)) {
        div.classList.add("highlight");
      }

      div.addEventListener("click", handleClick);
      boardElement.appendChild(div);
    });
  });
}

function getUnicode(piece) {
  const codes = {
    pawn:   { white: "♙", black: "♟" },
    rook:   { white: "♖", black: "♜" },
    knight: { white: "♘", black: "♞" },
    bishop: { white: "♗", black: "♝" },
    queen:  { white: "♕", black: "♛" },
    king:   { white: "♔", black: "♚" },
  };
  return codes[piece.type][piece.color];
}

function handleClick(e) {
  const row = +e.target.dataset.row;
  const col = +e.target.dataset.col;
  const clickedPiece = boardState[row][col];

  if (selected && legalMoves.some(m => m.row === row && m.col === col)) {
    movePiece(selected, { row, col });
    selected = null;
    legalMoves = [];
    renderBoard();
    checkGameStatus();

    setTimeout(() => {
      if (currentTurn === "black" && !statusDiv.textContent.includes("wins")) {
        aiMove();
      }
    }, 300);

    return;
  }

  if (clickedPiece && clickedPiece.color === currentTurn) {
    selected = { row, col };
    legalMoves = getLegalMoves(row, col, boardState, currentTurn, true);
  } else {
    selected = null;
    legalMoves = [];
  }

  renderBoard();
}

function movePiece(from, to) {
  const piece = boardState[from.row][from.col];
  const target = boardState[to.row][to.col];

  // Play sound
  if (target) {
    captureSound.play();
  } else {
    moveSound.play();
  }

  // Move logic
  if (piece.type === "pawn" && (to.row === 0 || to.row === 7)) {
    boardState[to.row][to.col] = { type: "queen", color: piece.color };
  } else {
    boardState[to.row][to.col] = piece;
  }
  boardState[from.row][from.col] = null;

  // Animate destination square
  animateSquare(to.row, to.col);

  currentTurn = currentTurn === "white" ? "black" : "white";
}

function animateSquare(row, col) {
  const selector = `.square[data-row="${row}"][data-col="${col}"]`;
  const square = document.querySelector(selector);
  if (square) {
    square.classList.add("animate");
    setTimeout(() => square.classList.remove("animate"), 300);
  }
}

function getLegalMoves(r, c, state, turn, validateCheck = false) {
  const moves = [];
  const piece = state[r][c];
  if (!piece || piece.color !== turn) return moves;

  const directions = {
    rook:   [[1,0],[0,1],[-1,0],[0,-1]],
    bishop: [[1,1],[1,-1],[-1,1],[-1,-1]],
    queen:  [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],
    knight: [[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2],[1,-2],[2,-1]]
  };

  const inBounds = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;

  if (piece.type === "pawn") {
    const dir = piece.color === "white" ? -1 : 1;
    const startRow = piece.color === "white" ? 6 : 1;

    if (inBounds(r + dir, c) && !state[r + dir][c]) {
      moves.push({ row: r + dir, col: c });
      if (r === startRow && !state[r + 2 * dir][c]) {
        moves.push({ row: r + 2 * dir, col: c });
      }
    }

    [c - 1, c + 1].forEach(offset => {
      if (inBounds(r + dir, offset)) {
        const target = state[r + dir][offset];
        if (target && target.color !== piece.color) {
          moves.push({ row: r + dir, col: offset });
        }
      }
    });

  } else if (piece.type === "knight") {
    directions.knight.forEach(([dx, dy]) => {
      const [nr, nc] = [r + dx, c + dy];
      if (inBounds(nr, nc)) {
        const target = state[nr][nc];
        if (!target || target.color !== piece.color) {
          moves.push({ row: nr, col: nc });
        }
      }
    });

  } else if (["rook", "bishop", "queen"].includes(piece.type)) {
    const dirs = directions[piece.type];
    dirs.forEach(([dx, dy]) => {
      let nr = r + dx;
      let nc = c + dy;
      while (inBounds(nr, nc)) {
        const target = state[nr][nc];
        if (!target) {
          moves.push({ row: nr, col: nc });
        } else {
          if (target.color !== piece.color) {
            moves.push({ row: nr, col: nc });
          }
          break;
        }
        nr += dx;
        nc += dy;
      }
    });

  } else if (piece.type === "king") {
    directions.queen.forEach(([dx, dy]) => {
      const [nr, nc] = [r + dx, c + dy];
      if (inBounds(nr, nc)) {
        const target = state[nr][nc];
        if (!target || target.color !== piece.color) {
          moves.push({ row: nr, col: nc });
        }
      }
    });
  }

  if (validateCheck) {
    return moves.filter(m => !wouldBeInCheck({ row: r, col: c }, m, piece.color));
  }

  return moves;
}

function wouldBeInCheck(from, to, color) {
  const testBoard = simulateMove(boardState, from, to);
  return isInCheck(testBoard, color);
}

function simulateMove(state, from, to) {
  const copy = state.map(row => row.map(cell => cell ? { ...cell } : null));
  copy[to.row][to.col] = copy[from.row][from.col];
  copy[from.row][from.col] = null;
  return copy;
}

function isInCheck(state, color) {
  let kingPos;
  state.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell && cell.type === "king" && cell.color === color) {
        kingPos = { row: r, col: c };
      }
    })
  );

  return state.some((row, r) =>
    row.some((cell, c) => {
      if (cell && cell.color !== color) {
        const moves = getLegalMoves(r, c, state, cell.color, false);
        return moves.some(m => m.row === kingPos.row && m.col === kingPos.col);
      }
      return false;
    })
  );
}

function checkGameStatus() {
  const hasMoves = boardState.some((row, r) =>
    row.some((cell, c) => {
      if (cell && cell.color === currentTurn) {
        const moves = getLegalMoves(r, c, boardState, currentTurn, true);
        return moves.length > 0;
      }
      return false;
    })
  );

  if (!hasMoves) {
    if (isInCheck(boardState, currentTurn)) {
      statusDiv.textContent = `${currentTurn === "white" ? "Black" : "White"} wins by checkmate!`;
    } else {
      statusDiv.textContent = "Stalemate!";
    }
  }
}

function evaluateBoard(state) {
  const values = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
    king: 100
  };

  let score = 0;
  state.forEach(row => {
    row.forEach(cell => {
      if (cell) {
        const val = values[cell.type] || 0;
        score += (cell.color === "black" ? val : -val);
      }
    });
  });

  return score;
}

function aiMove() {
  const difficulty = document.getElementById("difficulty").value;
  const moves = [];

  boardState.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell && cell.color === "black") {
        const legal = getLegalMoves(r, c, boardState, "black", true);
        legal.forEach(move => {
          moves.push({
            from: { row: r, col: c },
            to: move
          });
        });
      }
    });
  });

  if (moves.length === 0) return;

  let selectedMove;

  if (difficulty === "easy") {
    selectedMove = moves[Math.floor(Math.random() * moves.length)];
  } else if (difficulty === "medium") {
    const captures = moves.filter(m => boardState[m.to.row][m.to.col]);
    selectedMove = captures.length > 0
      ? captures[Math.floor(Math.random() * captures.length)]
      : moves[Math.floor(Math.random() * moves.length)];
  } else if (difficulty === "hard") {
    let bestScore = -Infinity;
    for (let move of moves) {
      const sim = simulateMove(boardState, move.from, move.to);
      const score = evaluateBoard(sim);
      if (score > bestScore) {
        bestScore = score;
        selectedMove = move;
      }
    }
  }

  if (selectedMove) {
    movePiece(selectedMove.from, selectedMove.to);
    renderBoard();
    checkGameStatus();
  }
}

// Reset button
document.getElementById("resetBtn").addEventListener("click", () => {
  boardState = initialSetup();
  currentTurn = "white";
  selected = null;
  legalMoves = [];
  statusDiv.textContent = "";
  renderBoard();
});

// Initialize game
renderBoard();
