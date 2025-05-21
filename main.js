const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_RIGHT = 39;
const KEY_LEFT = 37;
const KEY_SPACE = 32;
const KEY_ESC = 27;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const POWERUP_TYPES = {
  HEALTH: 'health',
  FIRE_RATE: 'fire_rate',
  SHIELD: 'shield'
};

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
  soundInitialized: false,
  bossHealth: 0,
  isBossBattle: false,
  bossWarningShown: false,
  move_forward: false,
  move_backward: false,
  isPaused: false,
  isMuted: false,
  settings: {
    difficulty: 'normal',
    musicVolume: 0.2,
    sfxVolume: 1.0,
    visualEffects: true,
    playerSpeed: 4
  },
  superCharge: 0,
  maxSuperCharge: 200,
  isSuperActive: false,
  superDuration: 0,
  cloneShip: null,
  currentRound: 1,
  enemySpeedMultiplier: 1,
  enemyHealthMultiplier: 1,
  bossHealthMultiplier: 1,
  superNotificationShown: false
}

const ingameSound = document.getElementById("ingame-sound");
ingameSound.volume = 0.5;

// Function to start background music
function startBackgroundMusic() {
    if (!STATE.soundInitialized) {
        ingameSound.play().catch(error => {
            console.log("Audio play failed:", error);
        });
        STATE.soundInitialized = true;
    }
}

// Add click event listener to start audio
document.addEventListener('click', startBackgroundMusic, { once: true });
document.addEventListener('keydown', startBackgroundMusic, { once: true });

const menuPress = document.getElementById("menu-press");
const homeButton = document.querySelector(".home-btn");
const hoverSound = document.getElementById("hover-menu");


homeButton.addEventListener("mouseenter", () => {
    hoverSound.currentTime = 0;
    hoverSound.play();
});


homeButton.addEventListener("click", (e) => {
    e.preventDefault(); 
    menuPress.currentTime = 0; 
    menuPress.play(); 

    setTimeout(() => {
        window.location.href = "menu.html";
    }, 300);
});



// Audio for shooting
const laserSound = new Audio("retro-laser-1-236669.mp3");  

// General purpose functions
function setPosition($element, x, y, rotation = 0, tilt = 0) {
  if ($element.classList.contains('player')) {
    $element.style.left = `${x}px`;
    $element.style.top = `${y}px`;
  } else {
    $element.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
  }
}

function setSize($element, width) {
  $element.style.width = `${width}px`;
  $element.style.height = "auto";
}

function bound(y) {
    if (STATE.level === 5) {
        // Allow free movement in level 5 within screen bounds
        const minY = 0;
        const maxY = GAME_HEIGHT - STATE.spaceship_width;
        if (y >= maxY) {
            STATE.y_pos = maxY;
            return maxY;
        } if (y <= minY) {
            STATE.y_pos = minY;
            return minY;
        } else {
            return y;
        }
    } else {
  // Calculate the lowest enemy Y position
  let lowestEnemyY = 0;
  if (STATE.enemies.length > 0) {
    lowestEnemyY = Math.max(...STATE.enemies.map(e => e.y));
  } else {
            lowestEnemyY = GAME_HEIGHT - STATE.spaceship_width;
  }
  const minY = 0;
  const maxY = lowestEnemyY;
        if (y >= maxY) {
    STATE.y_pos = maxY;
    return maxY;
        } if (y <= minY) {
    STATE.y_pos = minY;
    return minY;
  } else {
    return y;
        }
  }
}

function collideRect(rect1, rect2){
  return!(rect2.left > rect1.right || 
    rect2.right < rect1.left || 
    rect2.top > rect1.bottom || 
    rect2.bottom < rect1.top);
}

// Enemy 
function createEnemy($container, x, y) {
    const xOffset = STATE.level === 5 ? 200 : 400; // Reduced offset for level 5
  const $enemy = document.createElement("img");
  $enemy.src = "img/ufo.png";
  $enemy.className = "enemy";
  $container.appendChild($enemy);
  const enemy_cooldown = Math.floor(Math.random()*50)+100;
  const enemy = {x: x + xOffset, y, $enemy, enemy_cooldown};
  STATE.enemies.push(enemy);
  setSize($enemy, STATE.enemy_width);
  setPosition($enemy, enemy.x, y);
}

function updateEnemies($container) {
    if (STATE.level === 5 && !STATE.bossWarningShown) {
        STATE.bossWarningShown = true;
        showBossWarning($container);
        return;
    }

    const enemies = STATE.enemies;
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        if (enemy.$boss) {
            const maxMovement = 100 * STATE.enemySpeedMultiplier;
            const bossSpeedY = Math.sin(Date.now()/3000) * 1.2 * STATE.enemySpeedMultiplier;
            
            const newY = enemy.initialY + bossSpeedY * maxMovement;
            const minY = Math.max(100, enemy.initialY - maxMovement);
            const maxY = Math.min(GAME_HEIGHT - 200, enemy.initialY + maxMovement);
            
            enemy.y = Math.max(minY, Math.min(maxY, newY));
            
            if (enemy.x > GAME_WIDTH - 300) {
                enemy.x -= 2; // Faster entrance
            }
            
            setPosition(enemy.$boss, enemy.x, enemy.y);
            
            // Special attack cooldown
            if (enemy.specialAttackCooldown > 0) {
                enemy.specialAttackCooldown--;
            } else {
                // Special attack: laser barrage
                for (let angle = -30; angle <= 30; angle += 10) {
                    setTimeout(() => {
                        if (!STATE.gameOver) {
                            createEnemyLaser($container, enemy.x + enemy.firePoints[2].x, enemy.y + enemy.firePoints[2].y, angle);
                        }
                    }, (angle + 30) * 50);
                }
                enemy.specialAttackCooldown = 600;
            }
            
            // Regular pattern management
            if (enemy.patternCooldown > 0) {
                enemy.patternCooldown--;
            } else {
                enemy.firePattern = (enemy.firePattern + 1) % 4;
                enemy.patternCooldown = 250; // Faster pattern switching
            }
            
            if (enemy.cooldown <= 0) {
                switch(enemy.firePattern) {
                    case 0: // Triple sequential
                        enemy.firePoints.forEach((point, index) => {
                            for (let burst = 0; burst < 3; burst++) {
                                setTimeout(() => {
                                    if (!STATE.gameOver) {
                                        createEnemyLaser($container, enemy.x + point.x, enemy.y + point.y, 0);
                                    }
                                }, index * 200 + burst * 100);
                            }
                        });
                        enemy.cooldown = 150;
                        break;
                        
                    case 1: // Cross pattern
                        const angles = [-45, -30, 0, 30, 45];
                        enemy.firePoints.forEach(point => {
                            angles.forEach(angle => {
                                if (!STATE.gameOver) {
                                    createEnemyLaser($container, enemy.x + point.x, enemy.y + point.y, angle);
                                }
                            });
                        });
                        enemy.cooldown = 300;
                        break;
                        
                    case 2: // Rapid alternating
                        enemy.firePoints.forEach((point, index) => {
                            setTimeout(() => {
                                if (!STATE.gameOver) {
                                    createEnemyLaser($container, enemy.x + point.x, enemy.y + point.y, Math.sin(Date.now() / 500) * 15);
                                }
                            }, index * 50);
                        });
                        enemy.cooldown = 50;
                        break;
                        
                    case 3: // Heavy burst
                        for (let i = 0; i < 5; i++) {
                            setTimeout(() => {
                                enemy.firePoints.forEach(point => {
                                    if (!STATE.gameOver) {
                                        createEnemyLaser($container, 
                                            enemy.x + point.x, 
                                            enemy.y + point.y, 
                                            Math.sin(Date.now() / 1000 + i) * 20 // Wavy pattern
                                        );
                                    }
                                });
                            }, i * 150);
                        }
                        enemy.cooldown = 400;
                        break;
                }
            }
            enemy.cooldown--;
        } else if (STATE.level !== 5) {
            // Regular enemy behavior remains unchanged
            const speedMultiplier = (STATE.level >= 3 ? 0.5 : 1) * STATE.enemySpeedMultiplier;
            const dx = Math.sin(Date.now()/1000) * 15 * speedMultiplier;
            const dy = Math.cos(Date.now()/1000) * 10 * speedMultiplier;
    var a = enemy.x + dx;
    var b = enemy.y + dy;
            STATE.enemy_rotation = Math.sin(Date.now()/500) * 15 * speedMultiplier;
    setPosition(enemy.$enemy, a, b, STATE.enemy_rotation);
    
    if (enemy.enemy_cooldown <= 0) {
      createEnemyLaser($container, a, b);
                enemy.enemy_cooldown = (Math.floor(Math.random()*50) + 100) / speedMultiplier;
    }
            enemy.enemy_cooldown -= 0.5 * STATE.enemySpeedMultiplier;
        }
  }
}

// Player
function createPlayer($container) {
    if (STATE.level === 5) {
        // Center the player more for boss battle
        STATE.x_pos = GAME_WIDTH / 2 - 400;
    } else {
        STATE.x_pos = (GAME_WIDTH / 2) - 250;
    }
    
  // Start at the same Y as the top enemy
  let topEnemyY = 0;
  if (STATE.enemies.length > 0) {
    topEnemyY = Math.min(...STATE.enemies.map(e => e.y));
  } else {
    topEnemyY = (GAME_HEIGHT - (Math.ceil(STATE.number_of_enemies / 4) - 1) * 80) / 2;
  }
  STATE.y_pos = topEnemyY;
  const $player = document.createElement("img");
  $player.src = "img/spaceship.png";
  $player.className = "player";
  $container.appendChild($player);
  setPosition($player, STATE.x_pos, STATE.y_pos);
  setSize($player, STATE.spaceship_width);
  $player.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))';
  $player.style.transition = 'transform 0.1s ease-out';
}

function updatePlayer() {
  const $player = document.querySelector(".player");
  const playerSpeed = STATE.settings.playerSpeed;
  
  if (STATE.level === 5) {
        if (STATE.move_left) {
            STATE.y_pos -= playerSpeed;
    STATE.player_tilt = -8;
        }
        if (STATE.move_right) {
            STATE.y_pos += playerSpeed;
    STATE.player_tilt = 8;
        }
        if (STATE.move_forward) {
            STATE.x_pos += playerSpeed + 2;
            STATE.player_tilt = 0;
        }
        if (STATE.move_backward) {
            STATE.x_pos -= playerSpeed;
        }
        
        STATE.x_pos = Math.max(0, Math.min(GAME_WIDTH - 50, STATE.x_pos));
  } else {
        if (STATE.move_left) {
            STATE.y_pos -= playerSpeed;
            STATE.player_tilt = -8;
        } else if (STATE.move_right) {
            STATE.y_pos += playerSpeed;
            STATE.player_tilt = 8;
        }
    }
    
    if (!STATE.move_left && !STATE.move_right) {
    STATE.player_tilt *= 0.7;
    if (Math.abs(STATE.player_tilt) < 0.5) STATE.player_tilt = 0;
  }
  
    if (STATE.shoot && STATE.cooldown == 0) {
    createLaser($container, STATE.x_pos + STATE.spaceship_width, STATE.y_pos + STATE.spaceship_width/2);
    laserSound.currentTime = 0;
    laserSound.play();
    STATE.cooldown = 30 / STATE.fireRateMultiplier;
  }
  
  $player.style.setProperty('--tilt', `${STATE.player_tilt}deg`);
  setPosition($player, STATE.x_pos, bound(STATE.y_pos));
  
    if (STATE.cooldown > 0) {
    STATE.cooldown -= 0.5;
  }
  
  if (STATE.isSuperActive) {
    STATE.superDuration--;
    if (STATE.superDuration <= 0) {
      STATE.isSuperActive = false;
      // Cleanup super mode
      if (STATE.cloneShip && STATE.cloneShip.$clone && STATE.cloneShip.$clone.parentNode) {
        STATE.cloneShip.$clone.remove();
        STATE.cloneShip = null;
      }
      $player.classList.remove('super-active');
    } else if (STATE.cloneShip) {
      // Optimize clone position update
      requestAnimationFrame(() => {
        STATE.cloneShip.y = bound(STATE.y_pos + 80);
        STATE.cloneShip.x = STATE.x_pos;
        setPosition(STATE.cloneShip.$clone, STATE.cloneShip.x, STATE.cloneShip.y);
      });
    }
  }
  
  updateSuperMeter();
}

// Player Laser
function createLaser($container, x, y) {
  const $laser = document.createElement("img");
  $laser.src = "img/laser.png";
  $laser.className = "laser";
  
  if (STATE.isSuperActive) {
    $laser.style.cssText = `
      filter: hue-rotate(300deg) brightness(1.5);
      transform: scale(1.2) translateZ(0);
    `;
  }
  
  $container.appendChild($laser);
  const laser = { x, y, $laser };
  STATE.lasers.push(laser);
  setPosition($laser, x, y);
  
  // Create clone's laser with requestAnimationFrame
  if (STATE.isSuperActive && STATE.cloneShip) {
    requestAnimationFrame(() => {
      const $cloneLaser = document.createElement("img");
      $cloneLaser.src = "img/laser.png";
      $cloneLaser.className = "laser";
      $cloneLaser.style.cssText = `
        filter: hue-rotate(300deg) brightness(1.5);
        transform: scale(1.2) translateZ(0);
      `;
      
      $container.appendChild($cloneLaser);
      const cloneLaser = { 
        x: STATE.cloneShip.x + STATE.spaceship_width, 
        y: STATE.cloneShip.y + STATE.spaceship_width/2, 
        $laser: $cloneLaser 
      };
      STATE.lasers.push(cloneLaser);
      setPosition($cloneLaser, cloneLaser.x, cloneLaser.y);
    });
  }
}

function updateLaser($container) {
  const lasers = STATE.lasers;
  for(let i = 0; i < lasers.length; i++) {
    const laser = lasers[i];
    laser.x += laser.isSuperLaser ? 20 : 15;
    if (laser.x > 2000) {
      deleteLaser(lasers, laser, laser.$laser);
      continue;
    }
    setPosition(laser.$laser, laser.x, laser.y, 90);
    const laser_rectangle = laser.$laser.getBoundingClientRect();
    const enemies = STATE.enemies;
    
    for(let j = 0; j < enemies.length; j++) {
      const enemy = enemies[j];
      const enemy_rectangle = enemy.$boss ? 
        enemy.$boss.getBoundingClientRect() : 
        enemy.$enemy.getBoundingClientRect();
      
      if(collideRect(enemy_rectangle, laser_rectangle)) {
        deleteLaser(lasers, laser, laser.$laser);
        
        if (enemy.$boss) {
          // Boss takes more damage from super lasers
          enemy.health -= laser.isSuperLaser ? 20 : 10;
          showPowerUpText($container, laser.x, laser.y, laser.isSuperLaser ? "-20" : "-10");
          
          // Increased charge for hitting boss
          if (!STATE.isSuperActive) {
            STATE.superCharge = Math.min(STATE.maxSuperCharge, STATE.superCharge + 15);
            updateSuperMeter();
          }
          
          // Chance for boss to drop power-up when hit
          if (Math.random() < 0.1) { // 10% chance
            createPowerUp($container, enemy.x, enemy.y);
          }
          
          if (enemy.health <= 0) {
            enemies.splice(j, 1);
            $container.removeChild(enemy.$boss);
            STATE.points += 5000;
            updateScoreDisplay();
            showVictoryScreen();
            STATE.gameOver = true;
          }
        } else {
          // Regular enemy dies and charges super meter
          enemies.splice(j, 1);
          $container.removeChild(enemy.$enemy);
          STATE.points += 100;
          
          // Reduced charge per regular enemy kill
          if (!STATE.isSuperActive) {
            STATE.superCharge = Math.min(STATE.maxSuperCharge, STATE.superCharge + 10); // Reduced from 20 to 10
            updateSuperMeter();
          }
          
          updateScoreDisplay();
          
          // Regular enemies have chance to drop power-ups
          if (Math.random() < 0.3) { // 30% chance
          createPowerUp($container, enemy.x, enemy.y);
          }
        }
        
        if (enemies.length === 0 && STATE.level < 5) {
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

    // Check collision with enemy lasers
    for (let k = 0; k < STATE.enemyLasers.length; k++) {
      const enemyLaser = STATE.enemyLasers[k];
      const enemyLaserRect = enemyLaser.$enemyLaser.getBoundingClientRect();

      if (collideRect(laser_rectangle, enemyLaserRect)) {
        deleteLaser(STATE.lasers, laser, laser.$laser);
        deleteLaser(STATE.enemyLasers, enemyLaser, enemyLaser.$enemyLaser);
        break;
      }
    }
  }
}

// Enemy Laser
function createEnemyLaser($container, x, y, angle = 0) {
  const $enemyLaser = document.createElement("img");
  $enemyLaser.src = "img/enemyLaser.png";
  $enemyLaser.className = "enemyLaser";
    
    if (STATE.level === 5) {
        $enemyLaser.style.cssText = `
            filter: brightness(1.5) drop-shadow(0 0 10px red);
            transform: scale(1.3);
            opacity: 0.9;
            transition: transform 0.2s ease;
        `;
    }
    
  $container.appendChild($enemyLaser);
    const enemyLaser = {
        x, 
        y, 
        $enemyLaser, 
        angle,
        speed: STATE.level === 5 ? 6 : 6 // Same speed as regular levels but with more complex patterns
    };
  STATE.enemyLasers.push(enemyLaser);
  setPosition($enemyLaser, x, y);
}

function updateEnemyLaser($container) {
  const enemyLasers = STATE.enemyLasers;
  
  // Use requestAnimationFrame for smoother updates
  requestAnimationFrame(() => {
    for(let i = enemyLasers.length - 1; i >= 0; i--) {
      const enemyLaser = enemyLasers[i];
      const angle = enemyLaser.angle || 0;
      const rad = angle * Math.PI / 180;
      
      enemyLaser.x -= Math.cos(rad) * enemyLaser.speed;
      enemyLaser.y += Math.sin(rad) * enemyLaser.speed;
      
      if (enemyLaser.x < -100) {
        deleteLaser(enemyLasers, enemyLaser, enemyLaser.$enemyLaser);
        continue;
      }
      
      const enemyLaser_rectangle = enemyLaser.$enemyLaser.getBoundingClientRect();
      const spaceship_rectangle = document.querySelector(".player").getBoundingClientRect();
      
      if(collideRect(spaceship_rectangle, enemyLaser_rectangle)) {
        deleteLaser(enemyLasers, enemyLaser, enemyLaser.$enemyLaser);
        if (!STATE.isSuperActive && !STATE.shieldActive) {
          STATE.lives -= 1;
          updateLivesDisplay();
          if (STATE.lives <= 0) {
            STATE.gameOver = true;
            displayGameOver();
          }
        } else if (STATE.shieldActive) {
          showPowerUpText($container, enemyLaser.x, enemyLaser.y, "BLOCKED!");
        }
      }
      
      // Check clone collision only if necessary
      if (STATE.isSuperActive && STATE.cloneShip && STATE.cloneShip.$clone) {
        const clone_rectangle = STATE.cloneShip.$clone.getBoundingClientRect();
        if(collideRect(clone_rectangle, enemyLaser_rectangle)) {
          deleteLaser(enemyLasers, enemyLaser, enemyLaser.$enemyLaser);
        }
      }
      
      setPosition(enemyLaser.$enemyLaser, enemyLaser.x, enemyLaser.y, -90 + angle);
    }
  });
}

// Delete Laser
function deleteLaser(lasers, laser, $laser){
  const index = lasers.indexOf(laser);
  lasers.splice(index,1);
  $container.removeChild($laser);
}

// Key Presses
function KeyPress(event) {
    if (event.keyCode === KEY_ESC) {
        togglePause();
        return;
    }
    
    if (STATE.isPaused) return; // Don't process other keys while paused
    
    if (STATE.level === 5) {
        // Add left and right movement for level 5
  if (event.keyCode === KEY_UP) {
    STATE.move_left = true;
  } else if (event.keyCode === KEY_DOWN) {
    STATE.move_right = true;
        } else if (event.keyCode === KEY_LEFT) {
            STATE.move_backward = true;
        } else if (event.keyCode === KEY_RIGHT) {
            STATE.move_forward = true;
  } else if (event.keyCode === KEY_SPACE) {
    STATE.shoot = true;
        }
    } else {
        if (event.keyCode === KEY_UP) {
            STATE.move_left = true;
        } else if (event.keyCode === KEY_DOWN) {
            STATE.move_right = true;
        } else if (event.keyCode === KEY_SPACE) {
            STATE.shoot = true;
        }
  }
  
  if (event.keyCode === 70) { // 'F' key for super ability
    activateSuperAbility($container);
  }
}

function KeyRelease(event) {
    if (STATE.level === 5) {
  if (event.keyCode === KEY_UP) {
    STATE.move_left = false;
  } else if (event.keyCode === KEY_DOWN) {
    STATE.move_right = false;
        } else if (event.keyCode === KEY_LEFT) {
            STATE.move_backward = false;
        } else if (event.keyCode === KEY_RIGHT) {
            STATE.move_forward = false;
  } else if (event.keyCode === KEY_SPACE) {
    STATE.shoot = false;
        }
    } else {
        if (event.keyCode === KEY_UP) {
            STATE.move_left = false;
        } else if (event.keyCode === KEY_DOWN) {
            STATE.move_right = false;
        } else if (event.keyCode === KEY_SPACE) {
            STATE.shoot = false;
        }
  }
}

// Main Update Function
function update(){
  if (!STATE.isPaused) {
  updatePlayer();
  updateLaser($container);
  updateEnemies($container);
  updateEnemyLaser($container);
  updatePowerUps($container);
  
  // Randomly spawn power-ups
    if (Math.random() < 0.001) {
    createPowerUp($container, Math.random() < 0.7 ? 'rapid' : 'heart');
    }
  }
  
  window.requestAnimationFrame(update);
}

function createEnemies($container) {
  if (STATE.level === 5) {
    if (!STATE.bossWarningShown) {
      STATE.bossWarningShown = true;
      showBossWarning($container);
    }
    return;
  }

  // Special layout for level 3 and above
  if (STATE.level >= 3) {
    const columns = 3; // Fixed 3 columns
    const rows = Math.ceil(STATE.number_of_enemies / columns); // More rows based on enemy count
    const enemySpacingY = 60; // Vertical spacing
    const enemySpacingX = 120; // Increased horizontal spacing for 3 columns
    const totalHeight = (rows - 1) * enemySpacingY;
    const totalWidth = (columns - 1) * enemySpacingX;
    const startX = (GAME_WIDTH - totalWidth) / 2 + 300; // Keep distance from player
    const startY = (GAME_HEIGHT - totalHeight) / 2 + 100; // Adjusted to be lower on screen
    
    let enemyCount = 0;
    for (let col = 0; col < columns && enemyCount < STATE.number_of_enemies; col++) {
    for (let row = 0; row < rows && enemyCount < STATE.number_of_enemies; row++) {
        createEnemy($container, 
          startX + col * enemySpacingX,
          startY + row * enemySpacingY
        );
        enemyCount++;
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

// Initialize the Game
const $container = document.querySelector(".main");

function initGame() {
  // Reset game state
  STATE.x_pos = 0;
  STATE.y_pos = 0;
  STATE.move_right = false;
  STATE.move_left = false;
  STATE.shoot = false;
  STATE.lasers = [];
  STATE.enemyLasers = [];
  STATE.enemies = [];
  STATE.cooldown = 0;
  STATE.number_of_enemies = 16;
  STATE.enemy_cooldown = 0;
  STATE.gameOver = false;
  STATE.player_rotation = 0;
  STATE.enemy_rotation = 0;
  STATE.points = 0;
  STATE.level = 1;
  STATE.lives = 3;
  STATE.player_tilt = 0;
  STATE.move_forward = false;
  STATE.move_backward = false;

  const scoreDisplay = document.createElement('div');
  scoreDisplay.id = 'score-display';
  scoreDisplay.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    color: #FFD700;
    font-size: 16px;
    font-family: 'Arial', sans-serif;
    font-weight: bold;
    z-index: 10;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
    background: rgba(0, 0, 0, 0.5);
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid #FFD700;
    backdrop-filter: blur(5px);
  `;
  
  $container.appendChild(scoreDisplay);

  // Create level display
  const levelDisplay = document.createElement('div');
  levelDisplay.id = 'level-display';
  levelDisplay.style.cssText = `
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    color: #00FFFF;
    font-size: 16px;
    font-family: 'Arial', sans-serif;
    font-weight: bold;
    z-index: 10;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
    background: rgba(0, 0, 0, 0.5);
    padding: 5px 15px;
    border-radius: 8px;
    border: 1px solid #00FFFF;
    backdrop-filter: blur(5px);
    text-align: center;
    min-width: 100px;
  `;
  
  $container.appendChild(levelDisplay);

  // Create lives display with only hearts
  const livesDisplay = document.createElement('div');
  livesDisplay.id = 'lives-display';
  livesDisplay.style.cssText = `
    position: absolute;
    top: 45px;
    left: 10px;
    color: #FF6B6B;
    font-size: 16px;
    font-family: 'Arial', sans-serif;
    font-weight: bold;
    z-index: 10;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
    background: rgba(0, 0, 0, 0.5);
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid #FF6B6B;
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    gap: 5px;
  `;
  $container.appendChild(livesDisplay);
  updateLivesDisplay();

  // Create game over screen
  const gameOverScreen = document.createElement('div');
  gameOverScreen.id = 'game-over';
  gameOverScreen.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    padding: 40px;
    border-radius: 15px;
    color: white;
    text-align: center;
    display: none;
    z-index: 100;
    min-width: 300px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    border: 2px solid #ffd700;
  `;
  gameOverScreen.innerHTML = `
    <h2 style="font-size: 36px; margin-bottom: 20px; color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">Game Over</h2>
    <p style="font-size: 24px; margin-bottom: 30px; color: white;">Score: <span id="final-score">0</span></p>
    <button id="restart-button" style="
      padding: 15px 30px;
      font-size: 20px;
      background: linear-gradient(45deg, #ffd700, #ffa500);
      border: none;
      border-radius: 25px;
      color: black;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    ">Play Again</button>
  `;
  $container.appendChild(gameOverScreen);

  // Create victory screen with next round option
  const victoryScreen = document.createElement('div');
  victoryScreen.id = 'victory-screen';
  victoryScreen.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    padding: 40px;
    border-radius: 15px;
    color: white;
    text-align: center;
    display: none;
    z-index: 100;
    min-width: 300px;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    border: 2px solid #ffd700;
  `;
  victoryScreen.innerHTML = `
    <h2 style="font-size: 36px; margin-bottom: 20px; color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">Victory!</h2>
    <p style="font-size: 24px; margin-bottom: 10px; color: white;">Round <span id="victory-round">1</span> Complete!</p>
    <p style="font-size: 24px; margin-bottom: 30px; color: white;">Score: <span id="victory-score">0</span></p>
    <div style="display: flex; gap: 20px; justify-content: center;">
      <button id="next-round-button" style="
        padding: 15px 30px;
        font-size: 20px;
        background: linear-gradient(45deg, #ff00ff, #ff69b4);
        border: none;
        border-radius: 25px;
        color: white;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      ">Next Round</button>
      <button id="victory-restart-button" style="
        padding: 15px 30px;
        font-size: 20px;
        background: linear-gradient(45deg, #ffd700, #ffa500);
        border: none;
        border-radius: 25px;
        color: black;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      ">Restart Game</button>
    </div>
  `;
  $container.appendChild(victoryScreen);

  // Create mute button
  const muteButton = document.createElement('button');
  muteButton.id = 'mute-button';
  muteButton.innerHTML = '🔊';
  muteButton.style.cssText = `
    position: absolute;
    top: -70px;
    right: 80px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: 2px solid #FFD700;
    border-radius: 8px;
    padding: 8px 15px;
    font-size: 20px;
    cursor: pointer;
    z-index: 1000;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
  `;

  $container.appendChild(muteButton);

  // Create pause button
  const pauseButton = document.createElement('button');
  pauseButton.id = 'pause-button';
  pauseButton.innerHTML = '⏸️';
  pauseButton.style.cssText = `
    position: absolute;
    top: -70px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: 2px solid #FFD700;
    border-radius: 8px;
    padding: 8px 15px;
    font-size: 20px;
    cursor: pointer;
    z-index: 1000;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
  `;
  
  // Create pause menu
  const pauseMenu = document.createElement('div');
  pauseMenu.id = 'pause-menu';
  pauseMenu.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    padding: 20px;
    border-radius: 15px;
    border: 2px solid #FFD700;
    text-align: center;
    display: none;
    z-index: 1001;
    backdrop-filter: blur(5px);
  `;
  pauseMenu.innerHTML = `
    <h2 style="color: #FFD700; margin-bottom: 20px;">Game Paused</h2>
    <button id="resume-button" style="
        background: linear-gradient(45deg, #FFD700, #FFA500);
        border: none;
        border-radius: 25px;
        color: black;
        padding: 10px 20px;
        margin: 5px;
        cursor: pointer;
        font-weight: bold;
    ">Resume</button>
    <button id="restart-button-pause" style="
        background: linear-gradient(45deg, #FFD700, #FFA500);
        border: none;
        border-radius: 25px;
        color: black;
        padding: 10px 20px;
        margin: 5px;
        cursor: pointer;
        font-weight: bold;
    ">Restart</button>
  `;

  $container.appendChild(pauseButton);
  $container.appendChild(pauseMenu);

  // Add event listeners for pause functionality
  pauseButton.addEventListener('click', togglePause);
  document.getElementById('resume-button').addEventListener('click', togglePause);
  document.getElementById('restart-button-pause').addEventListener('click', () => {
      location.reload();
  });

  // Add hover effects
  pauseButton.addEventListener('mouseover', () => {
    pauseButton.style.transform = 'scale(1.1)';
    pauseButton.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
  });
  pauseButton.addEventListener('mouseout', () => {
    pauseButton.style.transform = 'scale(1)';
    pauseButton.style.boxShadow = 'none';
  });

  // Add event listeners for mute functionality
  muteButton.addEventListener('click', toggleMute);

  // Add hover effects for mute button
  muteButton.addEventListener('mouseover', () => {
    muteButton.style.transform = 'scale(1.1)';
    muteButton.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
  });
  muteButton.addEventListener('mouseout', () => {
    muteButton.style.transform = 'scale(1)';
    muteButton.style.boxShadow = 'none';
  });

  // Create settings button
  const settingsButton = document.createElement('button');
  settingsButton.id = 'settings-button';
  settingsButton.innerHTML = '⚙️';
  settingsButton.style.cssText = `
    position: absolute;
    top: -70px;
    right: 150px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: 2px solid #FFD700;
    border-radius: 8px;
    padding: 8px 15px;
    font-size: 20px;
    cursor: pointer;
    z-index: 1000;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
  `;

  // Create settings menu
  const settingsMenu = document.createElement('div');
  settingsMenu.id = 'settings-menu';
  settingsMenu.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.95);
    padding: 30px;
    border-radius: 15px;
    border: 2px solid #FFD700;
    color: white;
    display: none;
    z-index: 1002;
    min-width: 300px;
    backdrop-filter: blur(10px);
  `;
  
  settingsMenu.innerHTML = `
    <h2 style="color: #FFD700; margin-bottom: 20px; text-align: center;">Settings</h2>
    
    <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 10px; color: #FFD700;">Difficulty</label>
        <select id="difficulty-select" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.7); color: white; border: 1px solid #FFD700; border-radius: 4px;">
            <option value="easy">Easy</option>
            <option value="normal" selected>Normal</option>
            <option value="hard">Hard</option>
        </select>
    </div>

    <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 10px; color: #FFD700;">Music Volume</label>
        <input type="range" id="music-volume" min="0" max="1" step="0.1" value="${STATE.settings.musicVolume}" style="width: 100%;">
    </div>

    <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 10px; color: #FFD700;">SFX Volume</label>
        <input type="range" id="sfx-volume" min="0" max="1" step="0.1" value="${STATE.settings.sfxVolume}" style="width: 100%;">
    </div>

    <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 10px; color: #FFD700;">Player Speed</label>
        <input type="range" id="player-speed" min="2" max="8" step="0.5" value="${STATE.settings.playerSpeed}" style="width: 100%;">
    </div>

    <div style="margin-bottom: 20px;">
        <label style="color: #FFD700;">
            <input type="checkbox" id="visual-effects" ${STATE.settings.visualEffects ? 'checked' : ''}>
            Visual Effects
        </label>
    </div>

    <button id="save-settings" style="
        width: 100%;
        padding: 10px;
        background: linear-gradient(45deg, #FFD700, #FFA500);
        border: none;
        border-radius: 25px;
        color: black;
        font-weight: bold;
        cursor: pointer;
        margin-top: 20px;
    ">Save Settings</button>
  `;

  $container.appendChild(settingsButton);
  $container.appendChild(settingsMenu);

  // Add event listeners for settings
  settingsButton.addEventListener('click', toggleSettings);
  document.getElementById('save-settings').addEventListener('click', () => {
    updateSettings();
    toggleSettings();
  });

  // Add hover effects for settings button
  settingsButton.addEventListener('mouseover', () => {
    settingsButton.style.transform = 'scale(1.1)';
    settingsButton.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
  });
  settingsButton.addEventListener('mouseout', () => {
    settingsButton.style.transform = 'scale(1)';
    settingsButton.style.boxShadow = 'none';
  });

  // Add real-time updates for volume sliders
  document.getElementById('music-volume').addEventListener('input', updateSettings);
  document.getElementById('sfx-volume').addEventListener('input', updateSettings);

  // Show controls guide at start
  showControlsGuide($container);

  updateScoreDisplay();
  updateLevelDisplay();
  updateLeaderboard();

  // Add event listeners for both restart buttons
  const setupRestartButton = (buttonId) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => {
        location.reload();
      });
      
      button.addEventListener('mouseover', () => {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
      });
      
      button.addEventListener('mouseout', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = 'none';
      });
    }
  };

  // Setup both restart buttons
  setupRestartButton('restart-button');
  setupRestartButton('victory-restart-button');

  // Create super meter
  const superMeterContainer = document.createElement('div');
  superMeterContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    width: 200px;
    height: 20px;
    background: rgba(0, 0, 0, 0.7);
    border: 2px solid #FF00FF;
    border-radius: 10px;
    overflow: hidden;
    z-index: 1000;
  `;

  const superMeter = document.createElement('div');
  superMeter.className = 'super-meter';
  superMeter.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #FF00FF, #FF69B4);
    transition: width 0.3s ease;
  `;

  const superLabel = document.createElement('div');
  superLabel.style.cssText = `
    position: absolute;
    width: 100%;
    text-align: center;
    color: white;
    font-size: 12px;
    line-height: 20px;
    text-shadow: 0 0 3px black;
    font-family: 'Arial', sans-serif;
    font-weight: bold;
  `;
  superLabel.textContent = 'SUPER: 0%';

  superMeterContainer.appendChild(superMeter);
  superMeterContainer.appendChild(superLabel);
  $container.appendChild(superMeterContainer);

  updateLeaderboard(); // Add this line to update leaderboard at game start
}

// Start the game
initGame();
createPlayer($container);
createEnemies($container);

// Key Press Event Listener
window.addEventListener("keydown", KeyPress);
window.addEventListener("keyup", KeyRelease);
update();

let LEVEL = 1;

function updateScoreDisplay() {
  const scoreElement = document.getElementById('score-display');
  if (scoreElement) {
    scoreElement.innerHTML = `
      <span style="color: #FFD700;">SCORE</span>
      <span style="font-size: 18px; margin-left: 5px;">${STATE.points}</span>
    `;
  }
}

function updateLevelDisplay() {
  const levelElement = document.getElementById('level-display');
  if (levelElement) {
    levelElement.innerHTML = `
      <span style="color: #00FFFF; display: block;">ROUND ${STATE.currentRound}</span>
      <span style="font-size: 18px;">LEVEL ${STATE.level}</span>
    `;
  }
}

function updateLivesDisplay() {
  const livesElement = document.getElementById('lives-display');
  if (livesElement) {
    // Only show hearts for lives, no power-up images
    const hearts = '❤️'.repeat(STATE.lives) + '🖤'.repeat(3 - STATE.lives);
    livesElement.innerHTML = `
      <span style="color: #FF6B6B;">LIVES</span>
      <span style="font-size: 16px; margin-left: 5px;">${hearts}</span>
    `;
  }
}

function updateLeaderboard() {
  const leaderboardList = document.getElementById('leaderboard-list');
  if (!leaderboardList) return;

  const scores = JSON.parse(localStorage.getItem('gameScores') || '[]');
  
  // Clear current leaderboard
  leaderboardList.innerHTML = '';
  
  if (scores.length === 0) {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';
      li.textContent = 'No scores yet';
      leaderboardList.appendChild(li);
      return;
  }

  // Add scores to leaderboard
  scores.slice(0, 5).forEach((score, index) => {
      const li = document.createElement('li');
      li.className = `leaderboard-item rank-${index + 1}`;
      li.innerHTML = `
          <span class="player-name">${index + 1}. ${score.player}</span>
          <span class="player-score">${score.score.toLocaleString()}</span>
      `;
      leaderboardList.appendChild(li);
  });
}

function checkGameOver() {
  if (STATE.lives <= 0) {
    STATE.gameOver = true;
    updateLeaderboard();
    displayGameOver();
  }
}

function showVictoryScreen() {
    const victoryScreen = document.getElementById('victory-screen');
    const victoryScore = document.getElementById('victory-score');
    const victoryRound = document.getElementById('victory-round');
    if (victoryScreen && victoryScore && victoryRound) {
        STATE.points += 10000 * STATE.currentRound; // Bonus points scale with round
        victoryScore.textContent = STATE.points;
        victoryRound.textContent = STATE.currentRound;
        victoryScreen.style.display = 'block';
        
        // Save score and update leaderboard
        saveScore(STATE.points);
        updateLeaderboard();
        
        // Setup button handlers
        const nextRoundButton = document.getElementById('next-round-button');
        const restartButton = document.getElementById('victory-restart-button');
        
        nextRoundButton.onclick = startNextRound;
        restartButton.onclick = () => location.reload();
        
        // Add hover effects
        [nextRoundButton, restartButton].forEach(button => {
            button.addEventListener('mouseover', () => {
                button.style.transform = 'scale(1.1)';
                button.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
            });
            button.addEventListener('mouseout', () => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = 'none';
            });
        });
    }
}

function createPowerUp($container, x, y) {
  // Add shield to possible power-ups (20% shield, 40% health, 40% fire rate)
  const rand = Math.random();
  let type;
  if (rand < 0.2) {
    type = POWERUP_TYPES.SHIELD;
  } else if (rand < 0.6) {
    type = POWERUP_TYPES.HEALTH;
  } else {
    type = POWERUP_TYPES.FIRE_RATE;
  }

  const $powerup = document.createElement("img");
  $powerup.src = type === POWERUP_TYPES.HEALTH ? "img/heart.png" : 
                 type === POWERUP_TYPES.FIRE_RATE ? "img/rapid.png" : 
                 "img/shield.png";
  $powerup.className = "powerup";
  $powerup.style.cssText = `
    position: absolute;
    width: 40px;
    height: 40px;
    filter: ${type === POWERUP_TYPES.HEALTH ? 'drop-shadow(0 0 10px rgba(0, 255, 0, 0.7))' :
            type === POWERUP_TYPES.FIRE_RATE ? 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))' :
            'drop-shadow(0 0 10px rgba(0, 191, 255, 0.7))'};
    z-index: 5;
  `;

  const powerup = { x, y, type, $powerup };
  STATE.powerups.push(powerup);
  $container.appendChild($powerup);
  setPosition($powerup, x, y);
}

function updatePowerUps($container) {
  const powerups = STATE.powerups;
  const player_rectangle = document.querySelector(".player").getBoundingClientRect();
  
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    powerup.x -= 3;
    
    if (powerup.x < -50) {
      if (powerup.$powerup && powerup.$powerup.parentNode) {
        $container.removeChild(powerup.$powerup);
      }
      powerups.splice(i, 1);
      continue;
    }
    
    setPosition(powerup.$powerup, powerup.x, powerup.y);
    
    const powerup_rectangle = powerup.$powerup.getBoundingClientRect();
    if (collideRect(player_rectangle, powerup_rectangle)) {
      if (powerup.type === POWERUP_TYPES.HEALTH && STATE.lives < 3) {
        STATE.lives++;
        updateLivesDisplay();
        showPowerUpText($container, powerup.x, powerup.y, "+1 HEALTH!");
      } else if (powerup.type === POWERUP_TYPES.FIRE_RATE) {
        STATE.fireRateMultiplier = 2;
        STATE.fireRatePowerupDuration = 300;
        showPowerUpText($container, powerup.x, powerup.y, "RAPID FIRE!");
      } else if (powerup.type === POWERUP_TYPES.SHIELD) {
        STATE.shieldActive = true;
        STATE.shieldDuration = 300; // 5 seconds of shield
        showPowerUpText($container, powerup.x, powerup.y, "SHIELD UP!");
        updateShieldEffect();
      }
      
      if (powerup.$powerup && powerup.$powerup.parentNode) {
        $container.removeChild(powerup.$powerup);
      }
      powerups.splice(i, 1);
    }
  }
  
  // Update power-up durations
  if (STATE.fireRatePowerupDuration > 0) {
    STATE.fireRatePowerupDuration--;
    if (STATE.fireRatePowerupDuration === 0) {
      STATE.fireRateMultiplier = 1;
    }
  }
  
  if (STATE.shieldDuration > 0) {
    STATE.shieldDuration--;
    if (STATE.shieldDuration === 0) {
      STATE.shieldActive = false;
      updateShieldEffect();
    }
  }
}

function updateShieldEffect() {
  const $player = document.querySelector(".player");
  if (STATE.shieldActive) {
    $player.style.filter = 'drop-shadow(0 0 10px rgba(0, 191, 255, 0.7)) brightness(1.2)';
    $player.style.animation = 'shield-pulse 1s infinite';
  } else {
    $player.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))';
    $player.style.animation = '';
  }
}

function showPowerUpText($container, x, y, text) {
  const $text = document.createElement("div");
  $text.textContent = text;
  $text.style.position = "absolute";
  $text.style.color = "white";
  $text.style.fontSize = "20px";
  $text.style.fontWeight = "bold";
  $text.style.textShadow = "0 0 10px rgba(255, 255, 255, 0.7)";
  $text.style.zIndex = "100";
  
  $container.appendChild($text);
  setPosition($text, x, y);
  
  requestAnimationFrame(() => {
    $text.style.transition = "transform 1s, opacity 1s";
    $text.style.opacity = "0";
    $text.style.transform = "translateY(-50px)";
  });
  
  setTimeout(() => {
    if ($text.parentNode) {
      $container.removeChild($text);
    }
  }, 1000);
}

// Add shield animation to CSS
const shieldStyle = document.createElement('style');
shieldStyle.textContent = `
  @keyframes shield-pulse {
    0% { filter: drop-shadow(0 0 10px rgba(0, 191, 255, 0.7)) brightness(1.2); }
    50% { filter: drop-shadow(0 0 20px rgba(0, 191, 255, 0.9)) brightness(1.4); }
    100% { filter: drop-shadow(0 0 10px rgba(0, 191, 255, 0.7)) brightness(1.2); }
  }
`;
document.head.appendChild(shieldStyle);

function showBossWarning($container) {
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 20px 40px;
        font-size: 24px;
        font-weight: bold;
        border-radius: 10px;
        text-align: center;
        animation: warningPulse 1s infinite;
        z-index: 1000;
    `;
    warning.textContent = "⚠️ WARNING: BOSS BATTLE INCOMING ⚠️";
    $container.appendChild(warning);

    // Add warning animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes warningPulse {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); }
        }
    `;
    document.head.appendChild(style);

    // Start countdown after warning
    setTimeout(() => {
        $container.removeChild(warning);
        startBossCountdown($container);
    }, 3000);
}

function startBossCountdown($container) {
    const countdown = document.createElement('div');
    countdown.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 72px;
        font-weight: bold;
        text-shadow: 0 0 20px red;
        z-index: 1000;
    `;
    $container.appendChild(countdown);

    let count = 5;
    const countInterval = setInterval(() => {
        if (count > 0) {
            countdown.textContent = count;
            count--;
        } else {
            clearInterval(countInterval);
            $container.removeChild(countdown);
            createBossBattle($container);
        }
    }, 1000);
}

function createBoss($container, x, y) {
    const $boss = document.createElement("img");
    $boss.src = "img/boss.png";
    $boss.className = "boss";
    $boss.style.cssText = `
        width: 250px;
        height: auto;
        position: absolute;
        filter: drop-shadow(0 0 10px red);
        animation: bossGlow 2s infinite;
        z-index: 5;
       
    `;
    
    // Add boss glow animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bossGlow {
            0% { filter: drop-shadow(0 0 10px red); }
            50% { filter: drop-shadow(0 0 20px red); }
            100% { filter: drop-shadow(0 0 10px red); }
        }
    `;
    document.head.appendChild(style);
    
    $container.appendChild($boss);
    
    const boss = {
        x,
        y,
        $boss,
        health: 200 * STATE.bossHealthMultiplier,
        cooldown: 0,
        initialY: y,
        firePattern: 0,
        patternCooldown: 0,
        specialAttackCooldown: Math.max(300, 600 / STATE.enemySpeedMultiplier),
        firePoints: [
            {x: 0, y: -40},  // Top cannon
            {x: 0, y: 40},   // Bottom cannon
            {x: -20, y: 0}   // Center cannon
        ]
    };
    
    setPosition($boss, x, y);
    return boss;
}

function createBossBattle($container) {
    STATE.enemies = [];
    STATE.isBossBattle = true;
    STATE.level = 5;  // Ensure level is set to 5
    
    // Position boss further right for dramatic entrance
    const boss = createBoss($container, GAME_WIDTH + 300, GAME_HEIGHT / 2);
    
    // Initialize boss properties
    boss.health = 200 * STATE.bossHealthMultiplier;
    boss.cooldown = 0;
    boss.firePattern = 0;
    boss.patternCooldown = 0;
    boss.specialAttackCooldown = Math.max(300, 600 / STATE.enemySpeedMultiplier);
    
    STATE.enemies.push(boss);
}

// Add mute toggle function
function toggleMute() {
    STATE.isMuted = !STATE.isMuted;
    const muteButton = document.getElementById('mute-button');
    
    if (STATE.isMuted) {
        muteButton.innerHTML = '🔇';
        if (ingameSound) {
            ingameSound.volume = 0;
        }
        laserSound.volume = 0;
    } else {
        muteButton.innerHTML = '🔊';
        if (ingameSound) {
            ingameSound.volume = 0.2;
        }
        laserSound.volume = 1;
    }
}

// Modify the togglePause function to handle sound properly with mute state
function togglePause() {
    STATE.isPaused = !STATE.isPaused;
    const pauseMenu = document.getElementById('pause-menu');
    const pauseButton = document.getElementById('pause-button');
    
    if (STATE.isPaused) {
        pauseMenu.style.display = 'block';
        pauseButton.innerHTML = '▶️';
        // Pause background music only if not muted
        if (ingameSound && !STATE.isMuted) ingameSound.pause();
    } else {
        pauseMenu.style.display = 'none';
        pauseButton.innerHTML = '⏸️';
        // Resume background music only if not muted
        if (ingameSound && STATE.soundInitialized && !STATE.isMuted) {
            ingameSound.play();
            ingameSound.volume = 0.2;
        }
    }
}

// Add settings functions
function toggleSettings() {
    const settingsMenu = document.getElementById('settings-menu');
    settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'block' : 'none';
    
    // Pause game when settings are open
    if (settingsMenu.style.display === 'block' && !STATE.isPaused) {
        togglePause();
    }
}

function updateSettings() {
    // Update music volume
    const musicVolume = document.getElementById('music-volume').value;
    STATE.settings.musicVolume = parseFloat(musicVolume);
    if (!STATE.isMuted && ingameSound) {
        ingameSound.volume = STATE.settings.musicVolume;
    }

    // Update SFX volume
    const sfxVolume = document.getElementById('sfx-volume').value;
    STATE.settings.sfxVolume = parseFloat(sfxVolume);
    laserSound.volume = STATE.isMuted ? 0 : STATE.settings.sfxVolume;

    // Update difficulty
    const difficulty = document.getElementById('difficulty-select').value;
    STATE.settings.difficulty = difficulty;
    updateDifficulty(difficulty);

    // Update visual effects
    const visualEffects = document.getElementById('visual-effects').checked;
    STATE.settings.visualEffects = visualEffects;
    updateVisualEffects(visualEffects);

    // Update player speed
    const playerSpeed = document.getElementById('player-speed').value;
    STATE.settings.playerSpeed = parseFloat(playerSpeed);
}

function updateDifficulty(difficulty) {
    switch(difficulty) {
        case 'easy':
            STATE.enemy_cooldown = 150;
            break;
        case 'normal':
            STATE.enemy_cooldown = 100;
            break;
        case 'hard':
            STATE.enemy_cooldown = 50;
            break;
    }
}

function updateVisualEffects(enabled) {
    const player = document.querySelector('.player');
    if (player) {
        player.style.filter = enabled ? 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))' : 'none';
    }
}

// Add function to show game over screen
function displayGameOver() {
    const gameOverScreen = document.getElementById('game-over');
    const finalScore = document.getElementById('final-score');
    if (gameOverScreen && finalScore) {
        finalScore.textContent = STATE.points;
        gameOverScreen.style.display = 'block';
        
        // Save score before showing game over screen
        saveScore(STATE.points);
        updateLeaderboard();
    }
}

function showControlsGuide($container) {
  const controlsGuide = document.createElement('div');
  controlsGuide.id = 'controls-guide';
  controlsGuide.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    padding: 30px;
    border-radius: 15px;
    color: white;
    text-align: center;
    z-index: 1002;
    min-width: 300px;
    border: 2px solid #FFD700;
    backdrop-filter: blur(5px);
    font-family: 'Arial', sans-serif;
  `;

  controlsGuide.innerHTML = `
    <h2 style="color: #FFD700; margin-bottom: 20px;">Game Controls</h2>
    <div style="text-align: left; margin-bottom: 20px;">
      <p style="margin: 10px 0;"><span style="color: #FFD700;">↑</span> - Move Up</p>
      <p style="margin: 10px 0;"><span style="color: #FFD700;">↓</span> - Move Down</p>
      <p style="margin: 10px 0;"><span style="color: #FFD700;">SPACE</span> - Shoot</p>
      <p style="margin: 10px 0;"><span style="color: #FFD700;">F</span> - Activate Super Ability</p>
      <p style="margin: 10px 0;"><span style="color: #FFD700;">ESC</span> - Pause Game</p>
    </div>
    <div style="margin-top: 20px;">
      <p style="color: #FFD700; margin-bottom: 10px;">Power-ups:</p>
      <p style="margin: 5px 0;">❤️ - Extra Life</p>
      <p style="margin: 5px 0;">⚡ - Rapid Fire</p>
      <p style="margin: 5px 0;">🛡️ - Shield</p>
    </div>
    <div style="margin-top: 20px; padding: 10px; background: rgba(255, 0, 255, 0.1); border-radius: 8px;">
      <p style="color: #FF00FF; margin-bottom: 5px;">Super Ability</p>
      <p style="font-size: 0.9em;">Destroy enemies to charge your super meter:</p>
      <ul style="font-size: 0.9em; margin-top: 5px; padding-left: 20px;">
        <li>Regular enemies: +10% charge</li>
        <li>Boss hits: +15% charge</li>
        <li>Creates a clone spaceship</li>
        <li>Temporary immunity</li>
        <li>Double firepower</li>
      </ul>
    </div>
    <button id="start-game" style="
      background: linear-gradient(45deg, #FFD700, #FFA500);
      border: none;
      border-radius: 25px;
      color: black;
      padding: 10px 30px;
      margin-top: 20px;
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
    ">Start Game</button>
  `;

  
  $container.appendChild(controlsGuide);

  // Add hover effect to the start button
  const startButton = document.getElementById('start-game');
  startButton.addEventListener('mouseover', () => {
    startButton.style.transform = 'scale(1.1)';
    startButton.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
  });
  startButton.addEventListener('mouseout', () => {
    startButton.style.transform = 'scale(1)';
    startButton.style.boxShadow = 'none';
  });

  // Remove the guide when Start Game is clicked
  startButton.addEventListener('click', () => {
    controlsGuide.remove();
    STATE.isPaused = false;
  });

  // Pause the game while showing controls
  STATE.isPaused = true;
}

function updateSuperMeter() {
    const percentage = (STATE.superCharge / STATE.maxSuperCharge) * 100;
    const $superMeter = document.querySelector(".super-meter");
    const superLabel = $superMeter?.parentElement?.querySelector('div:last-child');
    
    if ($superMeter) {
        $superMeter.style.width = `${percentage}%`;
        if (superLabel) {
            superLabel.textContent = `SUPER: ${Math.floor(percentage)}%`;
        }
        
        // Show notification when super is ready
        if (percentage >= 100 && !STATE.superNotificationShown) {
            showSuperReadyNotification($container);
            STATE.superNotificationShown = true;
        }
    }
}

function activateSuperAbility($container) {
    if (STATE.superCharge >= STATE.maxSuperCharge && !STATE.isSuperActive) {
        STATE.isSuperActive = true;
        STATE.superCharge = 0;
        STATE.superDuration = 300;
        STATE.superNotificationShown = false;
        
        // Create clone ship
        const $player = document.querySelector(".player");
        if ($player) {
            const $clone = $player.cloneNode(true);
            $clone.style.cssText = `
                position: absolute;
                width: ${STATE.spaceship_width}px;
                height: auto;
                filter: drop-shadow(0 0 10px #FF00FF);
                opacity: 0.8;
                z-index: 4;
                transform: translateZ(0);
            `;
            
            STATE.cloneShip = {
                x: STATE.x_pos - 50,
                y: STATE.y_pos,
                $clone: $clone
            };
            
            $container.appendChild($clone);
            
            // Add immunity effect to main ship
            $player.classList.add('super-active');
            
            // Add super activation effect
            const flash = document.createElement('div');
            flash.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 0, 255, 0.3);
                z-index: 999;
                pointer-events: none;
                opacity: 1;
                transition: opacity 0.5s;
            `;
            document.body.appendChild(flash);
            
            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 500);
            }, 50);
            
            showPowerUpText($container, STATE.x_pos, STATE.y_pos, "SUPER MODE ACTIVATED!");
        }
        
        updateSuperMeter();
    }
}

// Add super ability style if not exists
if (!document.getElementById('super-ability-style')) {
    const style = document.createElement('style');
    style.id = 'super-ability-style';
    style.textContent = `
        .player.super-active {
            filter: drop-shadow(0 0 15px gold) brightness(1.3) !important;
            animation: immunityFlash 0.5s infinite;
            transform: translateZ(0);
        }
        @keyframes immunityFlash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    `;
    document.head.appendChild(style);
}

// Add function to start next round
function startNextRound() {
  // Hide victory screen
  const victoryScreen = document.getElementById('victory-screen');
  if (victoryScreen) {
    victoryScreen.style.display = 'none';
  }
  
  // Increment round and update multipliers
  STATE.currentRound++;
  STATE.enemySpeedMultiplier = 1 + (STATE.currentRound - 1) * 0.2; // 20% faster each round
  STATE.enemyHealthMultiplier = 1 + (STATE.currentRound - 1) * 0.3; // 30% more health each round
  STATE.bossHealthMultiplier = 1 + (STATE.currentRound - 1) * 0.5; // 50% more boss health each round
  
  // Reset level and enemies but keep score and round
  STATE.level = 1;
  STATE.enemies = [];
  STATE.lasers = [];
  STATE.enemyLasers = [];
  STATE.gameOver = false;
  STATE.isBossBattle = false;
  STATE.bossWarningShown = false;
  STATE.number_of_enemies = 16;
  
  // Update displays
  updateLevelDisplay();
  showRoundStartMessage();
  
  // Start new round
  createEnemies($container);
}

// Add function to show round start message
function showRoundStartMessage() {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 0, 255, 0.8);
    color: white;
    padding: 20px 40px;
    font-size: 24px;
    font-weight: bold;
    border-radius: 10px;
    text-align: center;
    animation: messageScale 2s ease-out;
    z-index: 1000;
  `;
  message.textContent = `Round ${STATE.currentRound} - Enemies Powered Up!`;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes messageScale {
      0% { transform: translate(-50%, -50%) scale(0); }
      50% { transform: translate(-50%, -50%) scale(1.2); }
      100% { transform: translate(-50%, -50%) scale(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(message);
  
  setTimeout(() => message.remove(), 2000);
}

function showSuperReadyNotification($container) {
    const $notification = document.createElement("div");
    $notification.textContent = "SUPER ABILITY READY! Press F to activate!";
    $notification.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 215, 0, 0.8);
        color: white;
        padding: 15px 30px;
        font-size: 20px;
        font-weight: bold;
        border-radius: 8px;
        text-align: center;
        animation: superReadyPulse 1.5s infinite;
        z-index: 1000;
    `;
    $container.appendChild($notification);

    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes superReadyPulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Remove notification after 3 seconds
    setTimeout(() => {
        if ($notification.parentNode) {
            $container.removeChild($notification);
        }
    }, 3000);
}

// Add these functions for leaderboard management
function saveScore(score) {
    // Don't save if score is 0
    if (score <= 0) return;
    
    let scores = JSON.parse(localStorage.getItem('gameScores') || '[]');
    const playerName = prompt('Enter your name for the leaderboard:', 'Player');
    
    if (playerName) {
        scores.push({
            player: playerName,
            score: score,
            date: new Date().toISOString()
        });
        
        // Sort scores in descending order
        scores.sort((a, b) => b.score - a.score);
        
        // Keep only top 10 scores
        scores = scores.slice(0, 10);
        
        localStorage.setItem('gameScores', JSON.stringify(scores));
        
        // Force an immediate leaderboard update
        updateLeaderboard();
    }
}