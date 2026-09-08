const canvas = document.getElementById("game");

const width = 960;
const height = 540;

canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext("2d");

const disc = {
  x: 100,
  y: height / 2,
  radius: 30,
  vx: 4 * Math.cos(Math.PI / 4),
  vy: 4 * Math.sin(Math.PI / 4),
};

const courtRectangles = [
  { x: 100, y: 0, width: width - 200, height: 50 },
  { x: 100, y: height - 50, width: width - 200, height: 50 },
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

function drawCourt() {
  ctx.fillStyle = "#F5EBD8";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#D3D3D3";
  ctx.fillRect(0, 0, 50, height);
  ctx.fillRect(width, 0, -50, height);

  ctx.fillStyle = "#E0FFFF";
  ctx.fillRect(100, 0, width - 200, 50);
  ctx.fillRect(100, height, width - 200, -50);

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

function animate() {
  disc.x += disc.vx;
  disc.y += disc.vy;

  courtRectangles.forEach((rect) => discCollision(disc, rect));
  goalRectangles.forEach((rect) => goalCollision(disc, rect));

  drawCourt();
  drawDisc();

  requestAnimationFrame(animate);
}

drawCourt();
animate();
