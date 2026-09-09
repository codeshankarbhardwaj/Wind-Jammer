const canvas = document.getElementById("game");

const width = 960;
const height = 540;

canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext("2d");

const disc = {
  x: 400,
  y: height / 2,
  radius: 30,
  vx: -4,
  vy: 0,
};

const players = [
  {
    x: 100,
    y: height / 2,
    width: 30,
    height: 50,
    vx: 0,
    vy: 0,
    score: 0,
  },
  {
    x: width - 130,
    y: height / 2,
    width: 30,
    height: 50,
    vx: 0,
    vy: 0,
    score: 0,
  },
];

let held = -1;

window.addEventListener("keydown", (e) => {
  if (e.key == "w") players[0].vy = -4;
  if (e.key == "s") players[0].vy = 4;
  if (e.key == "a") players[0].vx = -4;
  if (e.key == "d") players[0].vx = 4;
  if (e.code == "Space" && held != -1) {
    disc.vx = held == 0 ? 4 : -4;
    disc.vy = players[held].vy != 0 ? players[held].vy : 0;
    held = -1;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key == "w" && players[0].vy < 0) players[0].vy = 0;
  if (e.key == "s" && players[0].vy > 0) players[0].vy = 0;
  if (e.key == "a" && players[0].vx < 0) players[0].vx = 0;
  if (e.key == "d" && players[0].vx > 0) players[0].vx = 0;
});

const courtRectangles = [
  {
    x: 100,
    y: 0,
    width: width - 200,
    height: 50,
    offsetY: 0,
    hitTimer: 0,
    dir: -1,
  },
  {
    x: 100,
    y: height - 50,
    width: width - 200,
    height: 50,
    offsetY: 0,
    hitTimer: 0,
    dir: 1,
  },
];

const goalRectangles = [
  { x: 0, y: 50, width: 50, height: height - 100 },
  { x: width - 50, y: 50, width: 50, height: height - 100 },
];

function discCollision(disc, rect) {
  const closestX = Math.max(rect.x, Math.min(disc.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(disc.y, rect.y + rect.height));

  const dx = disc.x - closestX;
  const dy = disc.y - closestY;

  if (dx * dx + dy * dy < disc.radius * disc.radius) {
    if (Math.abs(dx) > Math.abs(dy)) {
      disc.vx = -disc.vx;
      disc.x = closestX + Math.sign(dx) * disc.radius;
    } else {
      disc.vy = -disc.vy;
      disc.y = closestY + Math.sign(dy) * disc.radius;
    }

    rect.offsetY = rect.dir * 8;
    rect.hitTimer = 6;
  }
}

function goalCollision(disc, rect) {
  const closestX = Math.max(rect.x, Math.min(disc.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(disc.y, rect.y + rect.height));

  const dx = disc.x - closestX;
  const dy = disc.y - closestY;

  if (dx * dx + dy * dy < disc.radius * disc.radius) {
    disc.x = width / 2;
    disc.y = height / 2;
    disc.vx = -disc.vx;
  }
}

function playerCollision(disc, player, playerIndex) {
  const facingDir = playerIndex == 0 ? 1 : -1;

  const isApproachingFront =
    (facingDir == 1 && disc.vx < 0) || (facingDir == -1 && disc.vx > 0);
  if (!isApproachingFront) return;

  const rectY = player.y + 36;
  const isVerticallyAligned =
    disc.y >= rectY && disc.y <= rectY + player.height;
  if (!isVerticallyAligned) return;

  let hitFront = false;
  if (facingDir == 1) {
    const frontX = player.x + player.width;
    hitFront = disc.x - disc.radius <= frontX && disc.x >= player.x;
  } else {
    const frontX = player.x;
    hitFront =
      disc.x + disc.radius >= frontX && disc.x <= player.x + player.width;
  }

  if (hitFront) {
    held = playerIndex;
    disc.vx = 0;
    disc.vy = 0;
  }
}

function drawCourt() {
  ctx.fillStyle = "#F5EBD8";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#D3D3D3";
  ctx.fillRect(0, 0, 50, height);
  ctx.fillRect(width, 0, -50, height);

  courtRectangles.forEach((rect) => {
    rect.offsetY *= 0.8;
    if (Math.abs(rect.offsetY) < 0.1) rect.offsetY = 0;

    if (rect.hitTimer > 0) {
      rect.hitTimer--;
      ctx.fillStyle = "#FFF";
    } else {
      ctx.fillStyle = "#E0FFFF";
    }

    ctx.fillRect(rect.x, rect.y + rect.offsetY, rect.width, rect.height);
  });

  ctx.beginPath();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.strokeRect(0, 0, width, height);
}

function drawDisc() {
  ctx.beginPath();
  ctx.arc(disc.x, disc.y, disc.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#FF0000";
  ctx.fill();
}

function updateDisc() {
  if (held != -1) {
    const p = players[held];
    disc.x = held === 0 ? p.x + p.width + disc.radius : p.x - disc.radius;
    disc.y = p.y + p.height / 2;
  } else {
    disc.x += disc.vx;
    disc.y += disc.vy;

    courtRectangles.forEach((rect) => discCollision(disc, rect));
    goalRectangles.forEach((rect) => goalCollision(disc, rect));
    players.forEach((player, index) => playerCollision(disc, player, index));
  }
}

function drawPlayers() {
  players.forEach((player) => {
    ctx.beginPath();
    ctx.fillStyle = "#00FF00";
    ctx.fillRect(player.x, player.y, player.width, player.height);
  });
}

function updatePlayer(player) {
  player.x += player.vx;
  player.y += player.vy;

  if (player.x < 100) player.x = 100;
  if (player.x > width / 2 - player.width - 75)
    player.x = width / 2 - player.width - 75;
  if (player.y < 50) player.y = 50;
  if (player.y > height - 125 - player.height)
    player.y = height - 125 - player.height;
}

function animate() {
  drawCourt();
  drawDisc();
  drawPlayers();
  updateDisc();
  updatePlayer(players[0]);

  requestAnimationFrame(animate);
}

drawCourt();
animate();
