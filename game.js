const STATE = {
  x_pos : 0,
  y_pos : 0,
  move_right: false,
  move_left: false,
  shoot: false,
  lasers: [],
  enemyLasers: [],
  enemies : [],
  spaceship_width: 100,
  enemy_width: 50,
  cooldown : 0,
  number_of_enemies: 16,
  enemy_cooldown : 0,
  gameOver: false,
  player_rotation: 0,
  enemy_rotation: 0,
  points: 0,
  level: 1,
  lives: 3,
  player_tilt: 0,
  powerups: [],
  fireRateMultiplier: 1,
  fireRatePowerupDuration: 0,
  shieldActive: false,
  shieldDuration: 0,
  gameStarted: false,
  countdownValue: 3
}

// Add these constants at the top with other constants
const MAX_LASERS = 50; // Maximum number of lasers allowed at once
const MAX_ENEMY_LASERS = 100; // Maximum number of enemy lasers allowed at once
const MAX_POWERUPS = 5; // Maximum number of power-ups allowed at once
const LASER_POOL_SIZE = 20; // Size of the laser object pool

// Add laser pooling
const laserPool = [];
const enemyLaserPool = [];

// Replace the single audio instance with an audio pool
const AUDIO_POOL_SIZE = 4;
const audioPool = [];

// Add power-up pooling at the top with other constants
const POWERUP_POOL_SIZE = 10;
const powerupPool = [];

// Add performance optimization constants
const PERFORMANCE = {
  MAX_PARTICLES: 50,
  UPDATE_INTERVAL: 16, // ~60 FPS
  CLEANUP_INTERVAL: 1000, // Cleanup every second
  ENEMY_MOVE_INTERVAL: 32, // Update enemy positions every 32ms
  POWER_UP_UPDATE_INTERVAL: 48, // Update power-ups every 48ms
  lastEnemyUpdate: 0,
  lastPowerUpUpdate: 0,
  lastCleanup: 0
};

// Add countdown sounds at the top with other audio initialization
const COUNTDOWN_SOUNDS = {
  count: new Audio("sounds/countdown-beep.mp3"),
  go: new Audio("sounds/countdown-go.mp3")
};

COUNTDOWN_SOUNDS.count.volume = 0.4;
COUNTDOWN_SOUNDS.go.volume = 0.5;

// Initialize object pools
function initObjectPools() {
  // Create pool of laser elements
  for (let i = 0; i < LASER_POOL_SIZE; i++) {
    const $laser = document.createElement("img");
    $laser.src = "img/laser.png";
    $laser.className = "laser";
    $laser.style.display = "none";
    $container.appendChild($laser);
    laserPool.push({ $laser, active: false });

    const $enemyLaser = document.createElement("img");
    $enemyLaser.src = "img/enemyLaser.png";
    $enemyLaser.className = "enemyLaser";
    $enemyLaser.style.display = "none";
    $container.appendChild($enemyLaser);
    enemyLaserPool.push({ $enemyLaser, active: false });
  }
}

// Initialize audio pool
function initAudioPool() {
  for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
    const audio = new Audio("retro-laser-1-236669.mp3");
    audio.volume = 0.1; // Reduce volume to prevent audio clipping
    audioPool.push({ audio, active: false });
  }
}

// Initialize power-up pool
function initPowerUpPool() {
  for (let i = 0; i < POWERUP_POOL_SIZE; i++) {
    const $powerup = document.createElement("img");
    $powerup.className = "powerup";
    $powerup.style.cssText = `
      position: absolute;
      width: 40px;
      height: 40px;
      display: none;
      z-index: 5;
    `;
    $container.appendChild($powerup);
    powerupPool.push({ $powerup, active: false });
  }
}

// Modify createLaser function to use pooling
function createLaser($container, x, y) {
  if (STATE.lasers.length >= MAX_LASERS) return;
  
  // Find an inactive laser in the pool
  const pooledLaser = laserPool.find(l => !l.active);
  if (!pooledLaser) return;

  pooledLaser.active = true;
  pooledLaser.$laser.style.display = "block";
  const laser = { x, y, $laser: pooledLaser.$laser, poolIndex: laserPool.indexOf(pooledLaser) };
  STATE.lasers.push(laser);
  setPosition(laser.$laser, x, y);
}

// Modify createEnemyLaser function to use pooling
function createEnemyLaser($container, x, y) {
  if (STATE.enemyLasers.length >= MAX_ENEMY_LASERS) return;

  // Find an inactive enemy laser in the pool
  const pooledEnemyLaser = enemyLaserPool.find(l => !l.active);
  if (!pooledEnemyLaser) return;

  pooledEnemyLaser.active = true;
  pooledEnemyLaser.$enemyLaser.style.display = "block";
  const enemyLaser = { x, y, $enemyLaser: pooledEnemyLaser.$enemyLaser, poolIndex: enemyLaserPool.indexOf(pooledEnemyLaser) };
  STATE.enemyLasers.push(enemyLaser);
  setPosition(enemyLaser.$enemyLaser, x, y);
}

// Modify deleteLaser function to use pooling
function deleteLaser(lasers, laser, $laserElement) {
  const index = lasers.indexOf(laser);
  if (index > -1) {
    lasers.splice(index, 1);
    $laserElement.style.display = "none";
    
    // Return the laser to the pool
    if (laser.poolIndex !== undefined) {
      if ($laserElement.classList.contains('laser')) {
        laserPool[laser.poolIndex].active = false;
      } else {
        enemyLaserPool[laser.poolIndex].active = false;
      }
    }
  }
}

// Modify createPowerUp to use pooling
function createPowerUp($container, x, y) {
  if (STATE.powerups.length >= MAX_POWERUPS) return;
  
  // Find an inactive power-up in the pool
  const pooledPowerup = powerupPool.find(p => !p.active);
  if (!pooledPowerup) return;

  // Determine power-up type with adjusted probabilities
  const rand = Math.random();
  let type;
  if (rand < 0.2) {
    type = POWERUP_TYPES.SHIELD;
  } else if (rand < 0.6) {
    type = POWERUP_TYPES.HEALTH;
  } else {
    type = POWERUP_TYPES.FIRE_RATE;
  }

  // Configure power-up appearance
  const $powerup = pooledPowerup.$powerup;
  $powerup.src = type === POWERUP_TYPES.HEALTH ? "img/heart.png" : 
                 type === POWERUP_TYPES.FIRE_RATE ? "img/rapid.png" : 
                 "img/shield.png";
  
  $powerup.style.filter = type === POWERUP_TYPES.HEALTH ? 'drop-shadow(0 0 10px rgba(0, 255, 0, 0.7))' :
                         type === POWERUP_TYPES.FIRE_RATE ? 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))' :
                         'drop-shadow(0 0 10px rgba(0, 191, 255, 0.7))';
  
  $powerup.style.display = "block";
  pooledPowerup.active = true;

  const powerup = { 
    x, 
    y, 
    type, 
    $powerup, 
    poolIndex: powerupPool.indexOf(pooledPowerup),
    createdAt: Date.now() // Add timestamp for cleanup
  };
  
  STATE.powerups.push(powerup);
  setPosition($powerup, x, y);
}

// Optimize enemy movement calculations
function updateEnemies($container) {
  const now = Date.now();
  
  if (now - PERFORMANCE.lastEnemyUpdate < PERFORMANCE.ENEMY_MOVE_INTERVAL) {
    return;
  }
  PERFORMANCE.lastEnemyUpdate = now;

  const timeValue = now / 1000;
  // Adjusted movement values for better spacing
  const dx = Math.sin(timeValue) * 12; // Reduced movement to prevent overlap
  const dy = Math.cos(timeValue) * 6;  // Reduced vertical movement
  const enemies = STATE.enemies;
  
  // Adjust enemy firing rate based on fixed formation size
  const baseFireRate = 0.5;
  const enemyCountModifier = Math.max(0.3, 1 - (30 / 100));
  const fireRateMultiplier = STATE.level >= 3 ? enemyCountModifier : 1;
  
  const updates = [];
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    const a = enemy.x + dx;
    const b = enemy.y + dy;
    
    updates.push({ enemy, x: a, y: b });
    
    if (enemy.enemy_cooldown <= 0) {
      createEnemyLaser($container, a, b);
      enemy.enemy_cooldown = (Math.floor(Math.random() * 50) + 100) / fireRateMultiplier;
    }
    enemy.enemy_cooldown -= baseFireRate * fireRateMultiplier;
  }
  
  requestAnimationFrame(() => {
    updates.forEach(update => {
      setPosition(update.enemy.$enemy, update.x, update.y, STATE.enemy_rotation);
    });
  });
}

// Optimize power-up updates
function updatePowerUps($container) {
  const now = Date.now();
  
  // Only update power-ups every POWER_UP_UPDATE_INTERVAL ms
  if (now - PERFORMANCE.lastPowerUpUpdate < PERFORMANCE.POWER_UP_UPDATE_INTERVAL) {
    return;
  }
  PERFORMANCE.lastPowerUpUpdate = now;

  const powerups = STATE.powerups;
  if (powerups.length === 0) return; // Skip if no power-ups

  const player_rectangle = document.querySelector(".player").getBoundingClientRect();
  
  // Batch power-up updates
  const updates = [];
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    
    if (now - powerup.createdAt > 10000) {
      removePowerUp(powerup, i);
      continue;
    }
    
    powerup.x -= 3;
    
    if (powerup.x < -50) {
      removePowerUp(powerup, i);
      continue;
    }
    
    updates.push(powerup);
  }
  
  // Batch DOM updates
  requestAnimationFrame(() => {
    updates.forEach(powerup => {
      setPosition(powerup.$powerup, powerup.x, powerup.y);
      
      // Check collision only if power-up is near player
      if (Math.abs(powerup.x - STATE.x_pos) < 100) {
        const powerup_rectangle = powerup.$powerup.getBoundingClientRect();
        if (collideRect(player_rectangle, powerup_rectangle)) {
          handlePowerUpCollection(powerup, STATE.powerups.indexOf(powerup));
        }
      }
    });
  });
}

// Optimize laser updates
function updateLaser($container) {
  const lasers = STATE.lasers;
  if (lasers.length === 0) return; // Skip if no lasers

  const updates = [];
  const enemies = STATE.enemies;
  
  for (let i = 0; i < lasers.length; i++) {
    const laser = lasers[i];
    laser.x += 15;
    
    if (laser.x > 2000) {
      deleteLaser(lasers, laser, laser.$laser);
      continue;
    }
    
    updates.push(laser);
  }
  
  // Batch DOM updates
  requestAnimationFrame(() => {
    updates.forEach(laser => {
      setPosition(laser.$laser, laser.x, laser.y, 90);
      
      // Only check collisions if laser is near enemies
      const laser_rectangle = laser.$laser.getBoundingClientRect();
      
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (Math.abs(laser.x - enemy.x) < 100) {
          const enemy_rectangle = enemy.$enemy.getBoundingClientRect();
          
          const adjustedEnemyHitbox = {
            left: enemy_rectangle.left + enemy_rectangle.width * 0.2,
            right: enemy_rectangle.right - enemy_rectangle.width * 0.2,
            top: enemy_rectangle.top + enemy_rectangle.height * 0.2,
            bottom: enemy_rectangle.bottom - enemy_rectangle.height * 0.2
          };
          
          if (collideRect(adjustedEnemyHitbox, laser_rectangle)) {
            deleteLaser(lasers, laser, laser.$laser);
            enemies.splice(j, 1);
            $container.removeChild(enemy.$enemy);
            STATE.points += 100;
            updateScoreDisplay();
            
            if (Math.random() < 0.3) {
              createPowerUp($container, enemy.x, enemy.y);
            }
            
            if (enemies.length === 0) {
              STATE.level++;
              updateLevelDisplay();
              if (STATE.level >= 3) {
                STATE.number_of_enemies = 24 + (STATE.level - 3) * 8;
              } else {
                STATE.number_of_enemies = 16 + (STATE.level - 1) * 4;
              }
              setTimeout(() => createEnemies($container), 1000);
            }
            break;
          }
        }
      }
    });
  });
}

// Modify the updatePlayer function to use the audio pool
function updatePlayer() {
  const $player = document.querySelector(".player");
  
  if(STATE.move_left){
    STATE.y_pos -= 4;
    STATE.player_tilt = -8;
  } else if(STATE.move_right){
    STATE.y_pos += 4;
    STATE.player_tilt = 8;
  } else {
    STATE.player_tilt *= 0.7;
    if (Math.abs(STATE.player_tilt) < 0.5) STATE.player_tilt = 0;
  }
  
  if(STATE.shoot && STATE.cooldown == 0){
    createLaser($container, STATE.x_pos + STATE.spaceship_width, STATE.y_pos + STATE.spaceship_width/2);
    playLaserSound(); // Use the new audio pool function
    STATE.cooldown = 30 / STATE.fireRateMultiplier;
  }
  
  $player.style.setProperty('--tilt', `${STATE.player_tilt}deg`);
  setPosition($player, STATE.x_pos, bound(STATE.y_pos));
  
  if(STATE.cooldown > 0){
    STATE.cooldown -= 0.5;
  }
}

// Play sound from pool
function playLaserSound() {
  const availableAudio = audioPool.find(a => !a.active);
  if (!availableAudio) return;

  availableAudio.active = true;
  availableAudio.audio.currentTime = 0;
  availableAudio.audio.play()
    .then(() => {
      setTimeout(() => {
        availableAudio.active = false;
      }, 1000); // Reset after 1 second
    })
    .catch(err => {
      console.warn('Audio playback failed:', err);
      availableAudio.active = false;
    });
}

// Add frame rate limiting to update function
let lastTime = 0;
const FPS = 60;
const frameTime = 1000 / FPS;

// Optimize main update loop
function update(currentTime) {
  if (!STATE.gameStarted) return;
  
  if (!lastTime) lastTime = currentTime;
  const deltaTime = currentTime - lastTime;
  
  if (deltaTime >= PERFORMANCE.UPDATE_INTERVAL) {
    lastTime = currentTime;
    
    // Perform periodic cleanup
    const now = Date.now();
    if (now - PERFORMANCE.lastCleanup >= PERFORMANCE.CLEANUP_INTERVAL) {
      PERFORMANCE.lastCleanup = now;
      cleanupGame();
    }
    
    updatePlayer();
    updateLaser($container);
    updateEnemies($container);
    updateEnemyLaser($container);
    updatePowerUps($container);
    
    if (STATE.powerups.length < MAX_POWERUPS && 
        Math.random() < 0.0002 && 
        now - PERFORMANCE.lastPowerUpUpdate > 2000) {
      const spawnX = GAME_WIDTH - 100;
      const spawnY = Math.random() * (GAME_HEIGHT - 100) + 50;
      createPowerUp($container, spawnX, spawnY);
    }
  }
  
  window.requestAnimationFrame(update);
}

// Modify initGame to initialize object pools, audio pool, and power-up pool
function initGame() {
  // ... existing initialization code ...
  
  initObjectPools(); // Initialize object pools
  initAudioPool(); // Initialize audio pool
  initPowerUpPool(); // Initialize power-up pool
  
  updateScoreDisplay();
  updateLevelDisplay();
  updateLeaderboard();
  
  // Start countdown instead of immediately starting the game
  startCountdown();
}

// ... existing code ... 

function createEnemies($container) {
  // Special layout for level 3 and above
  if (STATE.level >= 3) {
    const verticalEnemies = 10; // 10 enemies down
    const horizontalRows = 3;    // 3 rows across
    
    // Increased spacing values for better separation
    const enemySpacingY = 65;    // Increased vertical spacing (was 50)
    const enemySpacingX = 120;   // Increased horizontal spacing (was 80)
    
    // Calculate total dimensions
    const totalHeight = (verticalEnemies - 1) * enemySpacingY;
    const totalWidth = (horizontalRows - 1) * enemySpacingX;
    
    // Adjusted positioning to better distribute enemies
    const startX = GAME_WIDTH - totalWidth - 300; // Increased right padding
    const startY = Math.max(40, (GAME_HEIGHT - totalHeight) / 2); // Ensure minimum top margin
    
    // Update number of enemies
    STATE.number_of_enemies = verticalEnemies * horizontalRows;
    
    // Create the formation with more space
    for (let col = 0; col < verticalEnemies; col++) { // Vertical enemies (down)
      for (let row = 0; row < horizontalRows; row++) { // Horizontal rows (across)
        const xPos = startX + row * enemySpacingX;
        const yPos = startY + col * enemySpacingY;
        
        // Add slight offset to middle row for better distribution
        const rowOffset = row === 1 ? enemySpacingX * 0.1 : 0;
        
        createEnemy($container, xPos + rowOffset, yPos);
      }
    }
  } else {
    // Original 2-column layout for levels 1 and 2
    const cols = 2;
    const enemiesPerCol = Math.ceil(STATE.number_of_enemies / cols);
    const enemySpacingY = 80;
    const totalHeight = (enemiesPerCol - 1) * enemySpacingY;
    const startX = (GAME_WIDTH - (cols - 1) * 80) / 2 + 200;
    const startY = (GAME_HEIGHT - totalHeight) / 2 + 100;
    let count = 0;
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < enemiesPerCol; row++) {
        if (count >= STATE.number_of_enemies) break;
        createEnemy($container, startX + col * 80, startY + row * enemySpacingY);
        count++;
      }
    }
  }
}

// Helper function to remove power-ups
function removePowerUp(powerup, index) {
  powerup.$powerup.style.display = "none";
  if (powerup.poolIndex !== undefined) {
    powerupPool[powerup.poolIndex].active = false;
  }
  STATE.powerups.splice(index, 1);
}

// Helper function to handle power-up collection
function handlePowerUpCollection(powerup, index) {
  switch (powerup.type) {
    case POWERUP_TYPES.HEALTH:
      if (STATE.lives < 3) {
        STATE.lives++;
        updateLivesDisplay();
        showPowerUpText($container, powerup.x, powerup.y, "+1 HEALTH!");
      }
      break;
    case POWERUP_TYPES.FIRE_RATE:
      STATE.fireRateMultiplier = 2;
      STATE.fireRatePowerupDuration = 300;
      showPowerUpText($container, powerup.x, powerup.y, "RAPID FIRE!");
      break;
    case POWERUP_TYPES.SHIELD:
      STATE.shieldActive = true;
      STATE.shieldDuration = 300;
      showPowerUpText($container, powerup.x, powerup.y, "SHIELD UP!");
      updateShieldEffect();
      break;
  }
  
  removePowerUp(powerup, index);
}

// Add cleanup function
function cleanupGame() {
  // Clean up expired power-ups
  const now = Date.now();
  STATE.powerups.forEach((powerup, index) => {
    if (now - powerup.createdAt > 10000) {
      removePowerUp(powerup, index);
    }
  });
  
  // Clean up off-screen lasers
  STATE.lasers = STATE.lasers.filter(laser => laser.x <= 2000);
  STATE.enemyLasers = STATE.enemyLasers.filter(laser => laser.x >= -50);
  
  // Reset any stuck audio or power-up states
  if (STATE.fireRatePowerupDuration > 0 && now - STATE.lastPowerUpTime > 10000) {
    STATE.fireRatePowerupDuration = 0;
    STATE.fireRateMultiplier = 1;
  }
  
  if (STATE.shieldDuration > 0 && now - STATE.lastShieldTime > 10000) {
    STATE.shieldDuration = 0;
    STATE.shieldActive = false;
    updateShieldEffect();
  }
}

// Add countdown function
function startCountdown() {
  const countdownDisplay = document.createElement('div');
  countdownDisplay.id = 'countdown-display';
  countdownDisplay.style.cssText = `
    position: fixed;
    top: 40vh;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 150px;
    color: #FFD700;
    font-family: 'Arial', sans-serif;
    font-weight: bold;
    text-shadow: 0 0 30px rgba(255, 215, 0, 0.7),
                 0 0 60px rgba(255, 215, 0, 0.4);
    z-index: 1000;
    text-align: center;
    transition: all 0.3s ease-out;
    background: rgba(0, 0, 0, 0.5);
    padding: 40px 60px;
    border-radius: 20px;
    backdrop-filter: blur(5px);
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  $container.appendChild(countdownDisplay);

  function updateCountdown() {
    if (STATE.countdownValue > 0) {
      countdownDisplay.textContent = STATE.countdownValue;
      countdownDisplay.style.transform = 'translate(-50%, -50%) scale(1.2)';
      // Play countdown beep
      COUNTDOWN_SOUNDS.count.currentTime = 0;
      COUNTDOWN_SOUNDS.count.play().catch(err => console.warn('Audio playback failed:', err));
      
      setTimeout(() => {
        countdownDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
        STATE.countdownValue--;
        setTimeout(updateCountdown, 1000);
      }, 200);
    } else {
      countdownDisplay.textContent = 'GO!';
      countdownDisplay.style.transform = 'translate(-50%, -50%) scale(1.5)';
      countdownDisplay.style.color = '#00FF00';
      // Play GO! sound
      COUNTDOWN_SOUNDS.go.currentTime = 0;
      COUNTDOWN_SOUNDS.go.play().catch(err => console.warn('Audio playback failed:', err));
      
      setTimeout(() => {
        countdownDisplay.style.opacity = '0';
        setTimeout(() => {
          $container.removeChild(countdownDisplay);
          STATE.gameStarted = true;
          window.requestAnimationFrame(update);
        }, 500);
      }, 500);
    }
  }

  updateCountdown();
} 