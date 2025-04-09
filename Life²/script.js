const canvas = document.getElementById("numberCanvas");
const ctx = canvas.getContext("2d");
let lastTime = performance.now();  // Initialize lastTime for FPS calculation

// Make canvas full screen and adjust resolution
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const chunkSize = 500; // Number of blocks per chunk
const maxHeight = 2; // Max height of terrain

let chunks = {}; // Store generated chunks by their X position (or any unique identifier)
let rightString = "";
let leftString = "";

function randomTerrain(length, maxHeight) {
  let prevNumber = Math.floor(Math.random() * maxHeight) + 2;
  rightString = prevNumber.toString();
  leftString = prevNumber.toString();

  for (let i = 1; i < length; i++) {
    // 70% chance: either the same height or a random height
    let randomNumber = Math.random() < 0.7 ? prevNumber : Math.floor(Math.random() * maxHeight) + 2;
    prevNumber = randomNumber;
    rightString += randomNumber;
    leftString += randomNumber;
  }
}

randomTerrain(chunkSize, maxHeight);

// Define the character object in world coordinates
const character = {
  worldX: 0,
  y: 0,
  width: 40,
  height: 68, // height of the character
  vy: 0,
  onGround: false
};

// Movement parameters
const horizontalSpeed = 5;
let gravity = 0.5;
const jumpForce = 8;

// Key state tracking
const keys = {
  left: false,
  right: false,
  jump: false
};

// Key event listeners for movement
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    keys.right = true;
  } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    keys.left = true;
  } else if (e.code === "Space" || e.code === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "W") {
    if (character.onGround) {
      character.vy = -jumpForce;
      character.onGround = false;
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    keys.right = false;
  } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    keys.left = false;
  }
});

// Load images for the terrain and character
const dirt = new Image();
dirt.src = 'dirt.png';

const grass = new Image();
grass.src = 'grass.png';

const dirtgrass = new Image();
dirtgrass.src = 'dirtgrass.png';

const characterImage = new Image();
characterImage.src = 'character.png';

let imagesLoaded = 0;
function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === 4) {
    initCharacter();
    draw();
  }
}

dirt.onload = onImageLoad;
grass.onload = onImageLoad;
dirtgrass.onload = onImageLoad;
characterImage.onload = onImageLoad;

// Initialize the character at the starting point
function initCharacter() {
  const blocks = parseInt(rightString[0]);
  const groundY = canvas.height - blocks * 40;
  character.y = groundY - character.height;
}

// Function to retrieve the terrain height at a given world X coordinate
function getGroundY(worldX) {
  const chunkWidth = chunkSize * 40;
  const chunkIndex = Math.floor(worldX / chunkWidth);
  
  // If we're looking outside the loaded chunks, we should generate that chunk.
  if (!chunks[chunkIndex]) {
    generateChunk(chunkIndex);
  }

  const chunk = chunks[chunkIndex];
  const localX = worldX % chunkWidth;  // Local position inside the chunk
  const colIndex = Math.floor(localX / 40); // Column in the chunk
  const blocks = parseInt(chunk[colIndex]);

  return canvas.height - blocks * 40;
}

// Function to generate a new terrain chunk
function generateChunk(x) {
  let chunk = "";
  for (let i = 0; i < chunkSize; i++) {
    chunk += Math.floor(Math.random() * maxHeight) + 2; // Generate terrain
  }
  chunks[x] = chunk;
}

// Load terrain chunks as the player moves
function loadTerrainChunks() {
  const chunkWidth = chunkSize * 40;
  const leftChunkX = Math.floor((character.worldX - canvas.width / 2) / chunkWidth);
  const rightChunkX = Math.floor((character.worldX + canvas.width / 2) / chunkWidth);

  // Ensure chunks are loaded on both sides
  for (let i = leftChunkX - 1; i <= rightChunkX + 1; i++) {
    if (!chunks[i]) {
      generateChunk(i);
    }
  }
}

// Function to draw terrain from a chunk
function drawChunk(chunk, offsetX) {
  let x = offsetX;
  for (let i = 0; i < chunk.length; i++) {
    const num = parseInt(chunk[i]);
    for (let j = 0; j < num; j++) {
      const y = canvas.height - (j + 1) * 40;
      ctx.drawImage(j === num - 1 ? dirtgrass : dirt, x, y, 40, 40);
    }
    x += 40;
  }
}

// Function to handle movement and collision
function handleMovement() {
  if (keys.right) character.worldX += horizontalSpeed;
  if (keys.left) character.worldX -= horizontalSpeed;

  character.vy += gravity;
  character.y += character.vy;

  // Check for ground collision
  const characterCenterX = character.worldX + character.width / 2;
  const groundY = getGroundY(characterCenterX);

  // If the character goes below the ground, reset their position
  if (character.y + character.height > groundY) {
    character.y = groundY - character.height;
    character.vy = 0;
    character.onGround = true;
  } else {
    character.onGround = false;
  }
}

function draw() {
  const now = performance.now();
  const fps = 1000 / (now - lastTime);
  lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- Update movement and collision ---
  handleMovement();

  // --- Load and draw terrain ---
  loadTerrainChunks();
  const chunkWidth = chunkSize * 40;
  const offsetX = canvas.width / 2 - character.worldX;

  // Draw the chunks to the right and left of the character
  for (let i = Math.floor((character.worldX - canvas.width / 2) / chunkWidth); i <= Math.floor((character.worldX + canvas.width / 2) / chunkWidth); i++) {
    if (chunks[i]) {
      const chunkOffsetX = (i * chunkSize * 40) - Math.floor(character.worldX) + canvas.width / 2;
      drawChunk(chunks[i], chunkOffsetX);
    }
  }

  // --- Draw character ---
  const characterScreenX = canvas.width / 2;
  ctx.drawImage(characterImage, characterScreenX, character.y, character.width, character.height);

  // FPS display
  ctx.fillStyle = "black";
  ctx.font = "16px monospace";
  ctx.fillText(`FPS: ${Math.round(fps)}`, 10, 20);

  requestAnimationFrame(draw);
}
