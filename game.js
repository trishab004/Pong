// ---- GAME CONSTANTS ----
const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
let W = canvas.width, H = canvas.height;
function resize() {
  if (window.innerWidth < 700) {
    canvas.width = window.innerWidth * 0.98;
    canvas.height = canvas.width * 0.57;
  } else {
    canvas.width = 700;
    canvas.height = 400;
  }
  W = canvas.width; H = canvas.height;
}
window.addEventListener('resize', resize); resize();

// ---- SOUND EFFECTS ----
const sounds = {
  paddle: new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfa4f90.mp3'),
  wall: new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_125a763f0c.mp3'),
  score: new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_122b1be64b.mp3'),
  power: new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_122a5b1b9d.mp3')
};
Object.values(sounds).forEach(a => a.volume = 0.13);

// ---- GAME OBJECTS ----
let player = { x: 10, y: H/2-35, w: 10, h: 70, vy: 0, score: 0, color: "#3af" };
let ai = { x: W-20, y: H/2-35, w: 10, h: 70, vy: 0, score: 0, color: "#f35", aiLevel: 0.07 };
let ball = { x: W/2, y: H/2, r: 10, vx: 5, vy: 2.7, color: "#fff", speed: 5 };
let powerUp = null; // {x, y, w, h, type, active}
let powerTypes = ['grow', 'shrink', 'multi', 'fast', 'slow'];
let balls = [ball];
let keys = {};
let gameOver = false;
let showMobile = window.innerWidth < 700;

// ---- HIGH SCORES ----
function getScores() {
  return JSON.parse(localStorage.getItem('pong-scores') || "[]");
}
function setScore(score) {
  let scores = getScores();
  scores.push(score);
  scores = scores.sort((a, b) => b - a).slice(0, 5);
  localStorage.setItem('pong-scores', JSON.stringify(scores));
  updateScores();
}
function updateScores() {
  const scores = getScores();
  const ol = document.getElementById('scores');
  ol.innerHTML = '';
  scores.forEach(s => {
    ol.innerHTML += `<li>${s}</li>`;
  });
}
updateScores();

// ---- DRAW FUNCTIONS ----
function drawRect(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}
function drawCircle(x, y, r, c) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI, false);
  ctx.fillStyle = c;
  ctx.fill();
}
function drawText(text, x, y, size = 32, color = "#fff") {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}
function drawPowerUp(p) {
  if (!p) return;
  ctx.save();
  if (p.type === 'grow') ctx.fillStyle = '#0fa';
  else if (p.type === 'shrink') ctx.fillStyle = '#fa0';
  else if (p.type === 'multi') ctx.fillStyle = '#af0';
  else if (p.type === 'fast') ctx.fillStyle = '#09f';
  else ctx.fillStyle = '#f09';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#222';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(p.type[0].toUpperCase(), p.x + p.w/2, p.y + p.h/1.5);
  ctx.restore();
}

// ---- GAME LOGIC ----
function resetBall(b) {
  b.x = W/2; b.y = H/2;
  let angle = Math.random() * Math.PI/2 - Math.PI/4;
  let sign = Math.random() < 0.5 ? 1 : -1;
  b.vx = sign * ball.speed * Math.cos(angle);
  b.vy = ball.speed * Math.sin(angle);
}
function spawnPowerUp() {
  if (powerUp) return;
  if (Math.random() < 0.005) {
    let type = powerTypes[Math.floor(Math.random()*powerTypes.length)];
    powerUp = {
      x: W/2-15 + (Math.random()*W/3 - W/6),
      y: 40 + Math.random()*(H-100),
      w: 25,
      h: 25,
      type,
      active: false
    };
  }
}
function activatePowerUp(type, byPlayer) {
  sounds.power.play();
  switch(type) {
    case 'grow':
      if (byPlayer) player.h = 120; else ai.h = 120;
      setTimeout(() => { player.h = 70; ai.h = 70; }, 4000);
      break;
    case 'shrink':
      if (byPlayer) ai.h = 35; else player.h = 35;
      setTimeout(() => { player.h = 70; ai.h = 70; }, 4000);
      break;
    case 'multi':
      balls.push({ ...ball, x: W/2, y: H/2, vx: -ball.vx, vy: -ball.vy, color: "#ff0" });
      setTimeout(() => { balls.splice(1, balls.length-1); }, 4500);
      break;
    case 'fast':
      balls.forEach(b => { b.vx *= 1.5; b.vy *= 1.5; });
      setTimeout(() => { balls.forEach(b => { b.vx /= 1.5; b.vy /= 1.5; }); }, 3500);
      break;
    case 'slow':
      balls.forEach(b => { b.vx *= 0.5; b.vy *= 0.5; });
      setTimeout(() => { balls.forEach(b => { b.vx *= 2; b.vy *= 2; }); }, 3500);
      break;
  }
}
function aiMove() {
  // Adaptive: increases difficulty as player scores more!
  let target = balls[0].y - ai.h/2;
  let level = ai.aiLevel + 0.02 * Math.min(5, player.score/3);
  ai.y += (target - ai.y) * level;
  ai.y = Math.max(0, Math.min(H - ai.h, ai.y));
}

// ---- INPUT HANDLING ----
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup', e => { keys[e.key] = false; });
// Mobile controls
if (showMobile) {
  document.getElementById('mobile-controls').style.display = 'flex';
  document.getElementById('up').ontouchstart = () => keys['ArrowUp'] = true;
  document.getElementById('up').ontouchend = () => keys['ArrowUp'] = false;
  document.getElementById('down').ontouchstart = () => keys['ArrowDown'] = true;
  document.getElementById('down').ontouchend = () => keys['ArrowDown'] = false;
}

// ---- MOUSE AND TOUCH SUPPORT ----
let dragging = false;
let offsetY = 0;
// Mouse move
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  player.y = mouseY - player.h/2;
  // Clamp
  player.y = Math.max(0, Math.min(H-player.h, player.y));
});
// Touch move
canvas.addEventListener('touchstart', e => {
  dragging = true;
  const rect = canvas.getBoundingClientRect();
  const touchY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
  offsetY = touchY - player.y;
  e.preventDefault();
});
canvas.addEventListener('touchmove', e => {
  if (dragging) {
    const rect = canvas.getBoundingClientRect();
    const touchY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    player.y = touchY - offsetY;
    player.y = Math.max(0, Math.min(H-player.h, player.y));
  }
  e.preventDefault();
});
canvas.addEventListener('touchend', e => { dragging = false; });

// ---- MAIN GAME LOOP ----
function gameLoop() {
  ctx.clearRect(0, 0, W, H);

  // Draw middle line
  for(let i=8; i<H; i+=32) drawRect(W/2-2, i, 4, 18, "#444");

  // Draw paddles
  drawRect(player.x, player.y, player.w, player.h, player.color);
  drawRect(ai.x, ai.y, ai.w, ai.h, ai.color);

  // Draw balls
  balls.forEach(b => drawCircle(b.x, b.y, b.r, b.color));

  // Draw scores
  drawText(player.score, W/2-60, 48, 36, "#3af");
  drawText(ai.score, W/2+60, 48, 36, "#f35");

  // Draw power-up
  drawPowerUp(powerUp);

  // Move player (keyboard)
  if (keys['ArrowUp']) player.y -= 7;
  if (keys['ArrowDown']) player.y += 7;
  player.y = Math.max(0, Math.min(H-player.h, player.y));

  // Move AI
  aiMove();

  // Move balls
  balls.forEach((b, idx) => {
    b.x += b.vx;
    b.y += b.vy;

    // Wall collision
    if (b.y-b.r < 0 || b.y+b.r > H) { b.vy *= -1; sounds.wall.play(); }

    // Paddle collision
    let paddle = null, isPlayer = false;
    if (b.x-b.r < player.x+player.w && b.y > player.y && b.y < player.y+player.h && b.x > player.x) {
      b.vx = Math.abs(b.vx);
      b.vx *= 1.05; // slight speed up
      // Add "spin" based on where it hits paddle
      let impact = ((b.y - (player.y + player.h/2)) / (player.h/2));
      b.vy += impact * 2.2;
      paddle = player; isPlayer = true; sounds.paddle.play();
    }
    else if (b.x+b.r > ai.x && b.y > ai.y && b.y < ai.y+ai.h && b.x < ai.x+ai.w) {
      b.vx = -Math.abs(b.vx);
      b.vx *= 1.05;
      let impact = ((b.y - (ai.y + ai.h/2)) / (ai.h/2));
      b.vy += impact * 2.2;
      paddle = ai; sounds.paddle.play();
    }

    // Power-up collision
    if (powerUp && b.x+b.r > powerUp.x && b.x-b.r < powerUp.x+powerUp.w &&
        b.y+b.r > powerUp.y && b.y-b.r < powerUp.y+powerUp.h) {
      activatePowerUp(powerUp.type, isPlayer);
      powerUp = null;
    }

    // Scoring
    if (b.x < 0) {
      ai.score++; sounds.score.play();
      if (balls.length > 1) balls.splice(idx, 1);
      resetBall(b);
    }
    else if (b.x > W) {
      player.score++; sounds.score.play();
      if (balls.length > 1) balls.splice(idx, 1);
      resetBall(b);
    }
  });

  // Spawn power-ups
  if (!powerUp && Math.random() < 0.01) spawnPowerUp();

  // End game check
  if (player.score >= 11 || ai.score >= 11) {
    gameOver = true;
    drawText(player.score >= 11 ? "You Win! 🎉" : "AI Wins!", W/2, H/2, 44, "#fff");
    setScore(player.score);
    updateScores(); // Ensure leaderboard updates immediately!
    drawText("Press R to play again", W/2, H/2+48, 26, "#fff");
  } else if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

gameLoop();

// Restart logic
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() == 'r' && gameOver) {
    player.score = ai.score = 0; balls = [ball]; resetBall(ball); gameOver = false; gameLoop();
  }
});