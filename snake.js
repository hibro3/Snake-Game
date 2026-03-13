// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
  const size = Math.min(window.innerWidth * 0.9, 500); // 90% of screen or max 500px
  
  canvas.width = size;
  canvas.height = size;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const FOOD_SHEET = { cols: 10, rows: 6, cropPadRatio: 0.04 };
const foodImage = new Image();
let foodImageReady = false;
const FOOD_SRC_CANDIDATES = [
  "food_sprites.png",
  "food_sprites-70a52abf-a611-4817-aa84-417e52c0144c.png",
  "Food design.jpg",
  "Food design.png"
];
let foodSrcIndex = 0;
function tryLoadFoodSheet() {
  foodImage.src = FOOD_SRC_CANDIDATES[foodSrcIndex];
}
foodImage.onload = () => {
  foodImageReady = true;
  drawGame();
};
foodImage.onerror = () => {
  foodSrcIndex += 1;
  if (foodSrcIndex < FOOD_SRC_CANDIDATES.length) {
    tryLoadFoodSheet();
  } else {
    foodImageReady = false;
  }
};
tryLoadFoodSheet();
const eatSound = new Audio("eat.mp3");
const gameOverSound = new Audio("gameover.mp3");
const startSound = new Audio("start.mp3");
eatSound.volume = 0.4;
gameOverSound.volume = 0.6;
startSound.volume = 0.5;
// Enable pixelated rendering
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;
// Smooth game loop variables
let accumulator = 0;
let lastFrameTime = 0;
const fixedTimeStep = 1000 / 60; // 60 logic updates per second
let moveTimer = 0;
// Start snake at board center (so it’s always visible even if gridSize changes)
let snake = [
  { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) }
];
let food = { x: 5, y: 5};
let dx = 0;
let dy = 0;
let score = 0;
let gameRunning = false;
let gameLoop = null;
let gameSpeed = 100; // Default medium
let foodType = "normal"; 
// normal | speedUp | speedDown | deadly
const difficultySelect = document.getElementById("difficulty");
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById("highScore");

let highScore = localStorage.getItem("snakeHighScore");

if (highScore === null) {
  highScore = 0;
} else {
  highScore = parseInt(highScore);
}

highScoreElement.textContent = String(highScore).padStart(3, '0');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverDiv = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// Initialize high score display
highScoreElement.textContent = String(highScore).padStart(3, '0');

// Generate random food position + random sprite index
function generateFood() {

  const newX = Math.floor(Math.random() * tileCount);
  const newY = Math.floor(Math.random() * tileCount);

  food = {
    x: newX,
    y: newY
  };

  const random = Math.random();

  if (random < 0.7) {
    foodType = "normal";
  } else if (random < 0.85) {
    foodType = "speedUp";
  } else if (random < 0.95) {
    foodType = "speedDown";
  } else {
    foodType = "deadly";
  }

  console.log("Food generated at:", food.x, food.y, foodType);
}

// Draw game elements
function drawGame() {
  clearCanvas();
  drawSnake();
  drawFood();
}

function clearCanvas() {
  // Reference-style board: small checkers + larger patchy blocks (deterministic)
  const dark = "#1f6b36";
  const light = "#3fb25f";

  const smallTile = Math.max(10, Math.floor(gridSize / 2)); // finer than movement grid
  const cols = Math.floor(canvas.width / smallTile);
  const rows = Math.floor(canvas.height / smallTile);

  const hash01 = (x, y) => {
    // Simple deterministic hash -> [0,1)
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };

  // Big patch settings (blocky areas like in the screenshot)
  const patchSize = 4; // 4x4 small tiles

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const isEven = (x + y) % 2 === 0;
      let base = isEven ? dark : light;

      // Apply large patch tint (based on patch coordinate)
      const px = Math.floor(x / patchSize);
      const py = Math.floor(y / patchSize);
      const p = hash01(px, py);
      if (p > 0.82) base = isEven ? "#2b8a46" : "#58c574"; // brighter patch
      else if (p < 0.12) base = isEven ? "#16562b" : "#2e8f4a"; // darker patch

      const dx = x * smallTile;
      const dy = y * smallTile;

      // Base fill
      ctx.fillStyle = base;
      ctx.fillRect(dx, dy, smallTile, smallTile);

      // Subtle in-tile shading for a “pressed” look (no visible grid lines)
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      ctx.fillRect(dx, dy + smallTile - 2, smallTile, 2);
      ctx.fillRect(dx + smallTile - 2, dy, 2, smallTile);

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(dx, dy, smallTile, 1);
      ctx.fillRect(dx, dy, 1, smallTile);
    }
  }
}



function drawSnake(alpha = 1) {
  if (!snake?.length) return;

  const headRadius = gridSize * 0.40;
  const baseBodyRadius = gridSize * 0.34;
  const minTailRadius = gridSize * 0.18;

  const outline = "#2e3d00";
  const bodyHighlight = "#f7ff6a";
  const bodyMid = "#cfff3d";
  const bodyShadow = "#5f9e00";

  function getInterpolatedPosition(index) {
    const current = snake[index];
    const previous = snake[index + 1] || current;

    const interpX = previous.x + (current.x - previous.x) * alpha;
    const interpY = previous.y + (current.y - previous.y) * alpha;

    return {
      x: interpX * gridSize + gridSize / 2,
      y: interpY * gridSize + gridSize / 2
    };
  }

  const centers = snake.map((_, i) => {
    const pos = getInterpolatedPosition(i);
    const t = snake.length <= 1 ? 0 : i / (snake.length - 1);

    const r = i === 0
      ? headRadius
      : Math.max(minTailRadius, baseBodyRadius * (1 - t * 0.4));

    return { cx: pos.x, cy: pos.y, r };
  });

  // =========================
  // Draw Main Body Tube
  // =========================
  if (centers.length > 1) {
    const tail = centers[centers.length - 1];

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Outline
    ctx.strokeStyle = outline;
    ctx.lineWidth = headRadius * 2 + 4;
    ctx.beginPath();
    ctx.moveTo(tail.cx, tail.cy);
    for (let i = centers.length - 2; i >= 0; i--) {
      ctx.lineTo(centers[i].cx, centers[i].cy);
    }
    ctx.stroke();

    // Gradient body stroke
    const grad = ctx.createLinearGradient(
      centers[0].cx,
      centers[0].cy,
      tail.cx,
      tail.cy
    );

    grad.addColorStop(0, bodyHighlight);
    grad.addColorStop(0.4, bodyMid);
    grad.addColorStop(1, bodyShadow);

    ctx.strokeStyle = grad;
    ctx.lineWidth = headRadius * 2;
    ctx.beginPath();
    ctx.moveTo(tail.cx, tail.cy);
    for (let i = centers.length - 2; i >= 0; i--) {
      ctx.lineTo(centers[i].cx, centers[i].cy);
    }
    ctx.stroke();

    ctx.restore();
  }

  // =========================
  // Subtle Scale Pattern
  // =========================
  for (let i = 1; i < centers.length; i++) {
    const { cx, cy, r } = centers[i];

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================
  // Head
  // =========================
  const head = centers[0];
  const hx = head.cx;
  const hy = head.cy;
  const hr = head.r;

  // Head outline
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(hx, hy, hr + 3, 0, Math.PI * 2);
  ctx.fill();

  // Head gradient
  const headGrad = ctx.createRadialGradient(
    hx - hr * 0.5,
    hy - hr * 0.5,
    hr * 0.2,
    hx,
    hy,
    hr
  );

  headGrad.addColorStop(0, "#ffff99");
  headGrad.addColorStop(0.4, bodyMid);
  headGrad.addColorStop(1, bodyShadow);

  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();

  // Gloss highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.arc(hx - hr * 0.3, hy - hr * 0.3, hr * 0.25, 0, Math.PI * 2);
  ctx.fill();

  drawEyes(hx, hy, dx, dy, hr);
}

function drawEyes(x, y, dx, dy, headRadius) {
  // Eye positions based on direction
  let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
  let pupilOffsetX = 0, pupilOffsetY = 0;

  const eyeRadius = Math.max(2, headRadius * 0.22);
  const pupilRadius = Math.max(1, eyeRadius * 0.5);
  const eyeSpread = headRadius * 0.45; // spacing between the two eyes
  const eyeForward = headRadius * 0.35; // how far eyes sit towards direction of travel
  const pupilNudge = eyeRadius * 0.35; // how far pupils look towards direction
  
  // Determine eye positions and pupil offsets based on movement direction
  if (dx === 1) {
    // Moving right - eyes on the right side, pupils look right
    leftEyeX = x + eyeForward;
    leftEyeY = y - eyeSpread * 0.5;
    rightEyeX = x + eyeForward;
    rightEyeY = y + eyeSpread * 0.5;
    pupilOffsetX = pupilNudge; // Pupils look right
    pupilOffsetY = 0;
  } else if (dx === -1) {
    // Moving left - eyes on the left side, pupils look left
    leftEyeX = x - eyeForward;
    leftEyeY = y - eyeSpread * 0.5;
    rightEyeX = x - eyeForward;
    rightEyeY = y + eyeSpread * 0.5;
    pupilOffsetX = -pupilNudge; // Pupils look left
    pupilOffsetY = 0;
  } else if (dy === -1) {
    // Moving up - eyes on top, pupils look up
    leftEyeX = x - eyeSpread * 0.5;
    leftEyeY = y - eyeForward;
    rightEyeX = x + eyeSpread * 0.5;
    rightEyeY = y - eyeForward;
    pupilOffsetX = 0;
    pupilOffsetY = -pupilNudge; // Pupils look up
  } else if (dy === 1) {
    // Moving down - eyes on bottom, pupils look down
    leftEyeX = x - eyeSpread * 0.5;
    leftEyeY = y + eyeForward;
    rightEyeX = x + eyeSpread * 0.5;
    rightEyeY = y + eyeForward;
    pupilOffsetX = 0;
    pupilOffsetY = pupilNudge; // Pupils look down
  } else {
    // Not moving - default forward position
    leftEyeX = x - eyeSpread * 0.5;
    leftEyeY = y - eyeForward;
    rightEyeX = x + eyeSpread * 0.5;
    rightEyeY = y - eyeForward;
    pupilOffsetX = 0;
    pupilOffsetY = 0;
  }

  // Draw white eye backgrounds
  ctx.fillStyle = "white";
  
  ctx.beginPath();
  ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw black pupils with offset based on direction
  ctx.fillStyle = "black";
  
  ctx.beginPath();
  ctx.arc(leftEyeX + pupilOffsetX, leftEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(rightEyeX + pupilOffsetX, rightEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFood() {

  const columns = FOOD_SHEET?.cols ?? 10;
  const rows = FOOD_SHEET?.rows ?? 6;

  if (!foodImageReady || foodImage.naturalWidth === 0) {
    // Fallback (in case the sprite isn't found/loaded yet)
    const centerX = food.x * gridSize + gridSize / 2;
    const centerY = food.y * gridSize + gridSize / 2;
    const radius = gridSize / 2 - 1;
    const gradient = ctx.createRadialGradient(centerX - 3, centerY - 3, 2, centerX, centerY, radius);
    gradient.addColorStop(0, "#FF8A80");
    gradient.addColorStop(1, "#B71C1C");
    if (foodType === "normal") {
  ctx.fillStyle = gradient;
    } else if (foodType === "speedUp") {
       ctx.fillStyle = "blue";
    } else if (foodType === "speedDown") {
       ctx.fillStyle = "green";
    } else if (foodType === "deadly") {
      ctx.fillStyle = "red";
}
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const foodWidth = foodImage.naturalWidth / columns;
  const foodHeight = foodImage.naturalHeight / rows;

let spriteIndex = 0;

if (foodType === "normal") spriteIndex = 0;
if (foodType === "speedUp") spriteIndex = 1;
if (foodType === "speedDown") spriteIndex = 2;
if (foodType === "deadly") spriteIndex = 3;

const column = spriteIndex % columns;
const row = Math.floor(spriteIndex / columns);

  // Crop a bit to remove whitespace/shadow around each icon
  const cropRatio = FOOD_SHEET?.cropPadRatio ?? 0.12;
  const padX = foodWidth * cropRatio;
  const padY = foodHeight * cropRatio;
  const sx = column * foodWidth + padX;
  const sy = row * foodHeight + padY;
  const sWidth = foodWidth - padX * 2;
  const sHeight = foodHeight - padY * 2;

  // Draw fruit slightly smaller and centered so full shape is visible
  const destSize = gridSize * 0.9;
  const dxCanvas = food.x * gridSize + (gridSize - destSize) / 2;
  const dyCanvas = food.y * gridSize + (gridSize - destSize) / 2;

  ctx.drawImage(
    foodImage,
    sx, sy, sWidth, sHeight,
    dxCanvas,
    dyCanvas,
    destSize,
    destSize
  );
}

// Move snake - Wall and self collision detection, food collection, and score update
function moveSnake() {
  // Don't move if no direction is set (wait for user input)
  if (dx === 0 && dy === 0) {
    return;
  }
  
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  
  // Check wall collision
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    gameOver();
    return;
  }
  
  // Check self collision (skip the head itself in the check)
  for (let i = 0; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      gameOver();
      return;
    }
  }
  
  snake.unshift(head);
  

// Check food collision
if (head.x === food.x && head.y === food.y) {

    eatSound.currentTime = 0;
    eatSound.play();

    if (foodType === "normal") {

        score += 10;

    } else if (foodType === "speedUp") {

        gameSpeed = Math.max(50, gameSpeed - 15);
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, gameSpeed);

    } else if (foodType === "speedDown") {

        gameSpeed += 15;
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, gameSpeed);

    } else if (foodType === "deadly") {

        gameOver();
        return;
    }

    scoreElement.textContent = String(score).padStart(3, '0');
    generateFood();

} else {
    snake.pop();
}
}

// Game loop
function gameStep() {
  moveSnake();
  drawGame();
}

// Start game
function startGame() {
  if (gameRunning) return;
  
  // Reset game state
  snake = [{ x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) }];
  dx = 0;
  dy = 0;
  score = 0;
  gameSpeed = 150;
  scoreElement.textContent = String(score).padStart(3, '0');
  gameRunning = true;
  startSound.currentTime = 0;
  startSound.play();
  gameOverDiv.classList.add('hidden');
  
  generateFood();
  drawGame();
  
  // Enable/disable buttons
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  
  // Start game loop
  gameSpeed = parseInt(difficultySelect.value, 10);
  gameLoop = setInterval(gameStep, gameSpeed);
  difficultySelect.disabled = true;
}

// Pause game
function pauseGame() {
if (pauseBtn.textContent === 'Pause') {
  clearInterval(gameLoop);
  pauseBtn.textContent = 'Resume';
} else {
  gameLoop = setInterval(gameStep, gameSpeed);
  pauseBtn.textContent = 'Pause';
}
}

// Game over
function gameOver() {
  difficultySelect.disabled = false;
  gameRunning = false;
  clearInterval(gameLoop);
  gameOverSound.currentTime = 0;
  gameOverSound.play();

  finalScoreElement.textContent = String(score).padStart(3, '0');
  gameOverDiv.classList.remove('hidden');
  document.querySelector(".game-container").classList.add("shake");

setTimeout(() => {
  document.querySelector(".game-container").classList.remove("shake");
}, 300);
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = 'Pause';

  if (score > highScore) {
  highScore = score;
  localStorage.setItem("snakeHighScore", highScore);
  highScoreElement.textContent = String(highScore).padStart(3, '0');
}
}

// Restart game
function restartGame() {
  gameOverDiv.classList.add('hidden');
  startGame();
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
  // Allow starting the game with Enter key
  if (!gameRunning) {
    if (e.key === 'Enter') {
      startGame();
    }
    return;
  }
  
  const LEFT_KEY = 37;
  const RIGHT_KEY = 39;
  const UP_KEY = 38;
  const DOWN_KEY = 40;
  
  const keyPressed = e.keyCode;
  const goingUp = dy === -1;
  const goingDown = dy === 1;
  const goingRight = dx === 1;
  const goingLeft = dx === -1;
  
  if (keyPressed === LEFT_KEY && !goingRight) {
    dx = -1;
    dy = 0;
  }
  if (keyPressed === UP_KEY && !goingDown) {
    dx = 0;
    dy = -1;
  }
  if (keyPressed === RIGHT_KEY && !goingLeft) {
    dx = 1;
    dy = 0;
  }
  if (keyPressed === DOWN_KEY && !goingUp) {
    dx = 0;
    dy = 1;
  }
  
  // WASD controls
  if ((e.key === 'a' || e.key === 'A') && !goingRight) {
    dx = -1;
    dy = 0;
  }
  if ((e.key === 'w' || e.key === 'W') && !goingDown) {
    dx = 0;
    dy = -1;
  }
  if ((e.key === 'd' || e.key === 'D') && !goingLeft) {
    dx = 1;
    dy = 0;
  }
  if ((e.key === 's' || e.key === 'S') && !goingUp) {
    dx = 0;
    dy = 1;
  }
  
  // Space bar to pause/resume
  if (e.key === ' ' || e.keyCode === 32) {
    e.preventDefault();
    pauseGame();
  }
});

// ===============================
// Mobile Swipe Controls
// ===============================

let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
  if (!gameRunning) return;

  const touch = e.changedTouches[0];
  const touchEndX = touch.clientX;
  const touchEndY = touch.clientY;

  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;

  const goingUp = dy === -1;
  const goingDown = dy === 1;
  const goingRight = dx === 1;
  const goingLeft = dx === -1;

  // Detect stronger direction
  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0 && !goingLeft) {
      dx = 1;
      dy = 0;
    } else if (diffX < 0 && !goingRight) {
      dx = -1;
      dy = 0;
    }
  } else {
    if (diffY > 0 && !goingUp) {
      dx = 0;
      dy = 1;
    } else if (diffY < 0 && !goingDown) {
      dx = 0;
      dy = -1;
    }
  }
});

// Button event listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
restartBtn.addEventListener('click', restartGame);

// Initial draw
generateFood();
drawGame();

canvas.setAttribute("tabindex", "0");

canvas.addEventListener("keydown", function(e) {
  e.preventDefault();
});