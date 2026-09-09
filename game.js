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
  vx: -8,
  vy: 0,
  curve: 0,
  curveDecay: 0.8,
};

const players = [
  {
    x: 100,
    y: height / 2,
    width: 30,
    height: 80,
    vx: 0,
    vy: 0,
    score: 0,
  },
  {
    x: width - 130,
    y: height / 2,
    width: 30,
    height: 80,
    vx: 0,
    vy: 0,
    score: 0,
  },
];

let held = -1;
let servingTo = -1;
let waitingToServe = -1;

window.addEventListener("keydown", (e) => {
  if (e.key == "w") players[0].vy = -4;
  if (e.key == "s") players[0].vy = 4;
  if (e.key == "a") players[0].vx = -4;
  if (e.key == "d") players[0].vx = 4;
  if (e.code == "Space") {
    if (waitingToServe != -1) {
      servingTo = waitingToServe;
      waitingToServe = -1;
    } else if (held != -1) {
      disc.vx = held == 0 ? 8 : -8;
      disc.vy = players[held].vy != 0 ? players[held].vy : 0;

      disc.curve = players[held].vy * 0.038;
      held = -1;
    }
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
  { x: 0, y: 50, width: 50, height: height - 100, left: true },
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
    disc.y = 100;
    disc.vx = 0;
    disc.vy = 0;
    disc.curve = 0;

    if (rect.left) {
      players[1].score++;
      waitingToServe = 0;
    } else {
      players[0].score++;
      waitingToServe = 1;
    }
  }
}

function playerCollision(disc, player, playerIndex) {
  const facingDir = playerIndex == 0 ? 1 : -1;

  const isApproachingFront =
    (facingDir == 1 && disc.vx < 0) || (facingDir == -1 && disc.vx > 0);
  if (!isApproachingFront) return;

  const rectY = player.y;
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
  } else if (servingTo != -1) {
    const target = players[servingTo];
    const targetX =
      servingTo == 0
        ? target.x + target.width + disc.radius
        : target.x - disc.radius;
    const targetY = target.y + target.height / 2;

    const dx = targetX - disc.x;
    const dy = targetY - disc.y;
    const dist = Math.hypot(dx, dy);
    const serveSpeed = 6;

    if (dist <= serveSpeed) {
      disc.x = targetX;
      disc.y = targetY;
      held = servingTo;
      servingTo = -1;
    } else {
      disc.vx = (dx / dist) * serveSpeed;
      disc.vy = (dy / dist) * serveSpeed;
      disc.x += disc.vx;
      disc.y += disc.vy;
    }
  } else {
    disc.x += disc.vx;
    disc.y += disc.vy;

    courtRectangles.forEach((rect) => discCollision(disc, rect));
    goalRectangles.forEach((rect) => goalCollision(disc, rect));
    players.forEach((player, index) => playerCollision(disc, player, index));
  }

  if (Math.abs(disc.curve) > 0.01) {
    const speed = Math.hypot(disc.vx, disc.vy);
    const perpX = -disc.vy / speed;
    const perpY = disc.vx / speed;
    disc.vx += perpX * disc.curve;
    disc.vy += perpY * disc.curve;

    const newSpeed = Math.hypot(disc.vx, disc.vy);
    disc.vx = (disc.vx / newSpeed) * speed * 1.05;
    disc.vy = (disc.vy / newSpeed) * speed * 1.05;

    disc.curve *= disc.curveDecay;
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
  if (player.y < 100) player.y = 100;
  if (player.y > height - 100 - player.height)
    player.y = height - 100 - player.height;
}

function drawScoreboard() {
  const scores = [players[0].score, players[1].score];
  const positions = [width / 4, (3 * width) / 4];
  const labels = ["P1", "P2"];

  positions.forEach((cx, i) => {
    const text = `${labels[i]}  ${scores[i]}`;
    ctx.font = "bold 22px monospace";
    const textW = ctx.measureText(text).width;

    const padX = 14,
      padY = 8;
    const rx = cx - textW / 2 - padX;
    const ry = 6;
    const rw = textW + padX * 2;
    const rh = 22 + padY * 2;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 8);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, ry + rh / 2);
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function animate() {
  drawCourt();
  drawDisc();
  drawPlayers();
  drawScoreboard();
  updateDisc();
  updatePlayer(players[0]);

  requestAnimationFrame(animate);
}

drawCourt();
animate();
