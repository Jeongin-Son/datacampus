const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const COLORS = {
  I: "#4dd0e1",
  O: "#ffd54f",
  T: "#ba68c8",
  S: "#81c784",
  Z: "#e57373",
  J: "#64b5f6",
  L: "#ffb74d",
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

ctx.scale(BLOCK, BLOCK);

const state = {
  grid: [],
  current: null,
  score: 0,
  level: 1,
  lines: 0,
  dropCounter: 0,
  dropInterval: 700,
  lastTime: 0,
  paused: false,
  gameOver: false,
};

function createGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function randomType() {
  const keys = Object.keys(SHAPES);
  return keys[(Math.random() * keys.length) | 0];
}

function createPiece(type = randomType()) {
  return {
    matrix: SHAPES[type].map((row) => [...row]),
    color: COLORS[type],
    x: Math.floor(COLS / 2) - 2,
    y: 0,
  };
}

function collide(grid, piece) {
  return piece.matrix.some((row, y) =>
    row.some((value, x) => {
      if (!value) return false;
      const gx = piece.x + x;
      const gy = piece.y + y;
      return gy >= ROWS || gx < 0 || gx >= COLS || (gy >= 0 && grid[gy][gx]);
    }),
  );
}

function merge(grid, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value && piece.y + y >= 0) {
        grid[piece.y + y][piece.x + x] = piece.color;
      }
    });
  });
}

function clearLines() {
  let lines = 0;
  outer: for (let y = ROWS - 1; y >= 0; y -= 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!state.grid[y][x]) continue outer;
    }
    const row = state.grid.splice(y, 1)[0].fill(0);
    state.grid.unshift(row);
    lines += 1;
    y += 1;
  }

  if (lines > 0) {
    const points = [0, 100, 250, 400, 600];
    state.score += points[lines] * state.level;
    state.lines += lines;
    state.level = Math.min(15, Math.floor(state.lines / 10) + 1);
    state.dropInterval = Math.max(100, 700 - (state.level - 1) * 40);
    updatePanel();
  }
}

function rotate(matrix, dir = 1) {
  const rotated = matrix[0].map((_, i) => matrix.map((row) => row[i]));
  return dir > 0 ? rotated.map((row) => row.reverse()) : rotated.reverse();
}

function tryRotate(dir) {
  const original = state.current.matrix;
  state.current.matrix = rotate(state.current.matrix, dir);

  const offsets = [0, -1, 1, -2, 2];
  for (const offset of offsets) {
    state.current.x += offset;
    if (!collide(state.grid, state.current)) return;
    state.current.x -= offset;
  }

  state.current.matrix = original;
}

function spawn() {
  state.current = createPiece();
  state.current.y = -1;

  if (collide(state.grid, state.current)) {
    state.gameOver = true;
    statusEl.textContent = "게임 오버! 다시 시작 버튼을 눌러주세요.";
  }
}

function playerDrop() {
  if (state.gameOver || state.paused) return;
  state.current.y += 1;
  if (collide(state.grid, state.current)) {
    state.current.y -= 1;
    merge(state.grid, state.current);
    clearLines();
    spawn();
  }
  state.dropCounter = 0;
}

function hardDrop() {
  if (state.gameOver || state.paused) return;
  while (!collide(state.grid, state.current)) {
    state.current.y += 1;
  }
  state.current.y -= 1;
  playerDrop();
}

function move(dir) {
  if (state.gameOver || state.paused) return;
  state.current.x += dir;
  if (collide(state.grid, state.current)) {
    state.current.x -= dir;
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = "#0b1020";
  ctx.strokeRect(x, y, 1, 1);
}

function draw() {
  ctx.fillStyle = "#0b0f1e";
  ctx.fillRect(0, 0, COLS, ROWS);

  state.grid.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(x, y, value);
    });
  });

  state.current.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(state.current.x + x, state.current.y + y, state.current.color);
    });
  });
}

function updatePanel() {
  scoreEl.textContent = String(state.score);
  levelEl.textContent = String(state.level);
}

function togglePause() {
  if (state.gameOver) return;
  state.paused = !state.paused;
  statusEl.textContent = state.paused ? "일시정지" : "";
}

function update(time = 0) {
  const delta = time - state.lastTime;
  state.lastTime = time;

  if (!state.paused && !state.gameOver) {
    state.dropCounter += delta;
    if (state.dropCounter > state.dropInterval) {
      playerDrop();
    }
  }

  draw();
  requestAnimationFrame(update);
}

function resetGame() {
  state.grid = createGrid(ROWS, COLS);
  state.score = 0;
  state.level = 1;
  state.lines = 0;
  state.dropInterval = 700;
  state.dropCounter = 0;
  state.lastTime = 0;
  state.paused = false;
  state.gameOver = false;
  statusEl.textContent = "";
  spawn();
  updatePanel();
}

document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "x", "X", "z", "Z", "p", "P"].includes(event.key)) {
    event.preventDefault();
  }

  switch (event.key) {
    case "ArrowLeft":
      move(-1);
      break;
    case "ArrowRight":
      move(1);
      break;
    case "ArrowDown":
      playerDrop();
      break;
    case "ArrowUp":
    case "x":
    case "X":
      tryRotate(1);
      break;
    case "z":
    case "Z":
      tryRotate(-1);
      break;
    case " ":
      hardDrop();
      break;
    case "p":
    case "P":
      togglePause();
      break;
    default:
  }
});

restartBtn.addEventListener("click", resetGame);

resetGame();
update();
