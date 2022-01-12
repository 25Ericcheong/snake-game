let canvas = document.getElementById('canvas'); 

let ROWS = 30;
let COLS = 50;
let PIXEL = 10;
let pixels = new Map();
let moveRight = ([t, l]) => [t, l + 1];
let moveLeft = ([t, l]) => [t, l - 1];
let moveUp = ([t, l]) => [t - 1, l];
let moveDown = ([t, l]) => [t + 1, l];

// renders on browser
function initializeCanvas() {
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      let pixel = document.createElement('div');
      pixel.style.position = 'absolute';
      pixel.style.border = '1px solid grey';
      pixel.style.left = j * PIXEL + 'px';
      pixel.style.top = i * PIXEL + 'px';
      pixel.style.width = PIXEL + 'px';
      pixel.style.height = PIXEL + 'px';

      let key = toKey([i, j]);
      canvas.appendChild(pixel);
      pixels.set(key, pixel);
    }
  }
}

initializeCanvas();

function drawCanvas() {
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      let key = toKey([i, j]);
      let pixel = pixels.get(key);
      let background = 'white';
      if (key === currentFoodKey) {
        background = 'purple';
      } else if (currentSnakeKeys.has(key)) {
        background = 'black';
      }
      pixel.style.background = background;
    }
  }
}

let currentSnake;
let currentSnakeKeys;
let currentVacantKeys;
let currentFoodKey;
let currentDirection;
let directionQueue;

// simulate time moving / updates game
function step() {
  let head = currentSnake[currentSnake.length - 1];
  let nextDirection = currentDirection;

  while (directionQueue.length > 0) {
    let candidateDirection = directionQueue.shift();

    if (!areOpposite(candidateDirection, currentDirection)) {
      nextDirection = candidateDirection;
      break;
    }
  }
  currentDirection = nextDirection;
  let nextHead = currentDirection(head);
  if (!checkValidHead(currentSnakeKeys, nextHead)) {
    stopGame(false);
    return;
  }
  pushHead(nextHead);
  if (toKey(nextHead) == currentFoodKey) {
    let nextFoodKey = spawnFood();
    if (nextFoodKey === null) {
      stopGame(true);
      return;
    }
    currentFoodKey = nextFoodKey;
  } else {
    popTail();
  }
  drawCanvas();

  if (window.location.search == '?debug') {
    checkIntegrity();
  }
}

function pushHead(nextHead) {
  currentSnake.push(nextHead);
  let key = toKey(nextHead);
  currentVacantKeys.delete(key);
  currentSnakeKeys.add(key);
}

function popTail() {
  let tail = currentSnake.shift();
  let key = toKey(tail);
  currentVacantKeys.add(key);
  currentSnakeKeys.delete(key);
}

function spawnFood() {
  if (currentVacantKeys.size === 0) {
    return null;
  }
  let choice = Math.floor(Math.random() * currentVacantKeys.size);

  let i = 0;
  for (let key of currentVacantKeys) {
    if (i === choice) {
      return key
    }
    i++;
  }
}

// helper functions
function areOpposite(dir1, dir2) {
  if (dir1 == moveLeft && dir2 == moveRight) {
    return true;
  }
  if (dir1 == moveRight && dir2 == moveLeft) {
    return true;
  }
  if (dir1 == moveUp && dir2 == moveDown) {
    return true;
  }
  if (dir1 == moveDown && dir2 == moveUp) {
    return true;
  }
  return false
}

function areSameSets(a, b) {
  return (
    JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
  );
}

function partitionCells(snake) {
  let snakeKeys = new Set();
  let vacantKeys = new Set();

  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      vacantKeys.add(toKey([i, j]));
    }
  }

  for (let cell of snake) {
    let key = toKey(cell);
    vacantKeys.delete(key);
    snakeKeys.add(key);
  }
  return [snakeKeys, vacantKeys]
}

function checkValidHead(keys, cell) {
  let [top, left] = cell;
  if (top < 0 || left < 0) {
    return false;
  }

  if (top >= ROWS || left >= COLS) {
    return false;
  }

  if (keys.has(toKey(cell))) {
    return false;
  }
  return true
}

// there should not be food in the snake (same coordinates)
// food should not be out of game boundaries
// snake should never intersect itself (should not have same coordinates)
// snake should be continuous
// snake should not be out of game boundaries
// same cell can never be both vacant and snake
// union of vacant and snake must be equal to entire game field
// snake keys set must match snake array
function checkIntegrity() {
  let failedCheck = null;
  let foodCount = 0;
  let allKeys = new Set();

  // checks for food spawning
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      let key = toKey([i, j]);
      allKeys.add(key);
      if (key === currentFoodKey) {
        foodCount++;
      }
    }
  }

  if (foodCount !== 1) {
    failedCheck = `There can't be 2 foods in game`;
  }

  let [snakeKeys, vacantKeys] = partitionCells(currentSnake);
  if (areSameSets(snakeKeys, currentSnakeKeys)) {
    failedCheck = `Snake keys should match`;
  }

  if (areSameSets(vacantKeys, currentSnakeKeys)) {
    failedCheck = `Vacant keys should match`;
  }

  if (currentSnakeKeys.has(currentFoodKey)) {
    failedCheck = `There should not be food in the snake`;
  }

  if (currentSnake.length !== currentSnakeKeys.size) {
    failedCheck = `The snake should not intersect itself`;
  }

  if (!areSameSets(
    new Set([...currentSnakeKeys, ...currentVacantKeys]),
    allKeys
  )) {
    failedCheck = `Everything should be within game field`;
  }

  let firstCell = currentSnake[0];
  for (let i = 1; i < currentSnake.length; i++) {
    let cell = currentSnake[i];
    let prevCell = currentSnake[i - 1];
    let dy = cell[0] - prevCell[0];
    let dx = cell[1] - prevCell[1];
    let isOk = 
    (dy == 0 && Math.abs(dx) === 1) ||
    (dx == 0 && Math.abs(dy) === 1);

    if (!isOk) {
      failedCheck = `Snake should be continuous`;
    }
  }

  if (failedCheck !== null) {
    canvas.style.borderColor = 'purple';
    clearInterval(gameInterval);
    throw Error(failedCheck);
  }
  let currentSnake;
  let currentSnakeKeys;
  let currentVacantKeys;
  let currentFoodKey;
}

// for interactions which listens to users input or responds depending on what happens to snake in game
window.addEventListener('keydown', (e) => {
  switch (e.key) {
  case 'ArrowLeft':
  case 'A':
  case 'a':
    directionQueue.push(moveLeft);
    break;
  case 'ArrowRight':
  case 'd':
  case 'D':
    directionQueue.push(moveRight);
    break;
  case 'ArrowUp':
  case 'W':
  case 'w':
    directionQueue.push(moveUp);
    break;
  case 'ArrowDown':
  case 'S':
  case 's':
    directionQueue.push(moveDown);
    break;
  case 'r':
  case 'R':
    stopGame(false);
    startGame();
    break;
  }
})

function stopGame(success) {
  canvas.style.borderColor = success ? 'green' : 'red';
  clearInterval(gameInterval);
}

function startGame() {
  directionQueue = [];
  currentDirection = moveRight;
  currentSnake = makeInitialSnake();

  // creates keys for game
  currentSnakeKeys = new Set();
  currentVacantKeys = new Set();

  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      currentVacantKeys.add(toKey([i, j]));
    }
  }

  for (let cell of currentSnake) {
    let key = toKey(cell);
    currentVacantKeys.delete(key);
    currentSnakeKeys.add(key);
  }

  currentFoodKey = spawnFood();
  [snakeKeys, vacantKeys] = partitionCells(currentSnake);
  currentSnakeKeys = snakeKeys;
  currentVacantKeys = vacantKeys;

  canvas.style.borderColor = '';
  gameInterval = setInterval(step, 100);
  drawCanvas();
}

startGame();

function makeInitialSnake() {
  return [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4]
  ];
}

function toKey([top, left]) {
  return `${top} _ ${left}`;
}
