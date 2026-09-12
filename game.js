const canvas = document.getElementById("game");

const width = 960;
const height = 540;

canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext("2d");

const disc = {
  x: 400,
  y: height / 2,
  radius: 26,
  vx: -8,
  vy: 0,
  curve: 0,
  curveDecay: 0.8,
  angle: 0,
  history: [],
};

const players = [
  {
    x: 110,
    y: height / 2 - 45,
    width: 34,
    height: 86,
    vx: 0,
    vy: 0,
    score: 0,
    sets: 0,
    color: "#00e5ff",
    trim: "#ffffff",
  },
  {
    x: width - 144,
    y: height / 2 - 45,
    width: 34,
    height: 86,
    vx: 0,
    vy: 0,
    score: 0,
    sets: 0,
    color: "#ff3d00",
    trim: "#ffeb3b",
  },
];

let held = -1;
let servingTo = -1;
let serveDelay = 0;
let servingPlayer = -1;
let lastGoalScorer = -1;

let matchTimer = 99;
let timerTicks = 0;

const throwDelays = [0, 0];
const throwCooldowns = [0, 0];

const ai = {
  reactionJitter: 0,
};

window.addEventListener("keydown", (e) => {
  if (e.key == "w") players[0].vy = -7;
  if (e.key == "s") players[0].vy = 7;
  if (e.key == "a") players[0].vx = -7;
  if (e.key == "d") players[0].vx = 7;
  if (e.code == "Space" && held == 0) {
    throwDelays[0] = 0;
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
    x: 70,
    y: 0,
    width: width - 140,
    height: 52,
    offsetY: 0,
    hitTimer: 0,
    dir: -1,
  },
  {
    x: 70,
    y: height - 52,
    width: width - 140,
    height: 52,
    offsetY: 0,
    hitTimer: 0,
    dir: 1,
  },
];

const goalRectangles = [
  { x: 0, y: 52, width: 70, height: height - 104, left: true },
  { x: width - 70, y: 52, width: 70, height: height - 104 },
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
    rect.hitTimer = 8;
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
    disc.history = [];

    const goalCenterY = 52 + (height - 104) / 2;
    const distFromCenter = Math.abs(disc.y - goalCenterY);
    const pointsAwarded = distFromCenter < 90 ? 3 : 5;

    if (rect.left) {
      players[1].score += pointsAwarded;
      if (players[1].score >= 12) {
        players[1].sets++;
        players[0].score = 0;
        players[1].score = 0;
      }
      servingPlayer = 0;
      lastGoalScorer = 1;
    } else {
      players[0].score += pointsAwarded;
      if (players[0].score >= 12) {
        players[0].sets++;
        players[0].score = 0;
        players[1].score = 0;
      }
      servingPlayer = 1;
      lastGoalScorer = 0;
    }
    serveDelay = 90;
  }
}

function playerCollision(disc, player, playerIndex) {
  if (throwCooldowns[playerIndex] > 0) return;

  const facingDir = playerIndex == 0 ? 1 : -1;
  const catchPadding = 42;

  const isVerticallyAligned =
    disc.y >= player.y - catchPadding &&
    disc.y <= player.y + player.height + catchPadding;
  if (!isVerticallyAligned) return;

  let hitFront = false;
  if (facingDir == 1) {
    const frontX = player.x + player.width + catchPadding;
    hitFront = disc.x - disc.radius <= frontX && disc.x >= player.x;
  } else {
    const frontX = player.x - catchPadding;
    hitFront =
      disc.x + disc.radius >= frontX && disc.x <= player.x + player.width;
  }

  if (hitFront) {
    held = playerIndex;
    disc.vx = 0;
    disc.vy = 0;
    disc.curve = 0;
    disc.history = [];
    disc.x =
      facingDir == 1
        ? player.x + player.width + disc.radius
        : player.x - disc.radius;
    disc.y = player.y + player.height / 2;
    if (playerIndex == 0) {
      throwDelays[0] = 180;
    } else {
      throwDelays[1] = 30 + Math.floor(Math.random() * 30);
    }
  }
}

function drawCourt() {
  ctx.fillStyle = "#0c3b63";
  ctx.fillRect(0, 0, width, height);

  const courtX = 70;
  const courtY = 52;
  const courtW = width - 140;
  const courtH = height - 104;


  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.strokeRect(courtX, courtY, courtW, courtH);

  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(courtX, courtY, courtW / 2, courtH);

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 6;
  ctx.arc(width / 2, height / 2, 75, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.font = "bold 15px monospace";
  ctx.fillStyle = "rgba(180, 130, 40, 0.4)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WINDJAMMERS", 0, 0);
  ctx.restore();

  ctx.beginPath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.moveTo(width / 2, courtY);
  ctx.lineTo(width / 2, courtY + courtH);
  ctx.stroke();
  ctx.setLineDash([]);

  drawGoalZones();

 
}

function drawGoalZones() {
  const goalH = height - 104;
  const seg5H = Math.floor(goalH * 0.28);
  const seg3H = goalH - seg5H * 2;

  [
    { x: 0, isLeft: true },
    { x: width - 70, isLeft: false },
  ].forEach((g) => {
    const yTop = 52;
    const yMid = 52 + seg5H;
    const yBot = 52 + seg5H + seg3H;

    ctx.fillStyle = "#d32f2f";
    ctx.fillRect(g.x, yTop, 70, seg5H);

    ctx.fillStyle = "#fbc02d";
    ctx.fillRect(g.x, yMid, 70, seg3H);

    ctx.fillStyle = "#d32f2f";
    ctx.fillRect(g.x, yBot, 70, seg5H);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    for (let gx = g.x; gx <= g.x + 70; gx += 10) {
      ctx.beginPath();
      ctx.moveTo(gx, 52);
      ctx.lineTo(gx, 52 + goalH);
      ctx.stroke();
    }
    for (let gy = 52; gy <= 52 + goalH; gy += 10) {
      ctx.beginPath();
      ctx.moveTo(g.x, gy);
      ctx.lineTo(g.x + 70, gy);
      ctx.stroke();
    }

    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#000000";
    ctx.fillText("5", g.x + 36, yTop + seg5H / 2 + 2);
    ctx.fillText("3", g.x + 36, yMid + seg3H / 2 + 2);
    ctx.fillText("5", g.x + 36, yBot + seg5H / 2 + 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillText("5", g.x + 35, yTop + seg5H / 2);
    ctx.fillText("3", g.x + 35, yMid + seg3H / 2);
    ctx.fillText("5", g.x + 35, yBot + seg5H / 2);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    const lineX = g.isLeft ? 70 : width - 70;
    ctx.beginPath();
    ctx.moveTo(lineX, 52);
    ctx.lineTo(lineX, 52 + goalH);
    ctx.stroke();
  });
}

function drawScoreboard() {
  const sbW = 460;
  const sbH = 50;
  const sbX = width / 2 - sbW / 2;
  const sbY = 6;

  ctx.save();

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.roundRect(sbX + 4, sbY + 4, sbW, sbH, 8);
  ctx.fill();

  const bgGrad = ctx.createLinearGradient(sbX, sbY, sbX, sbY + sbH);
  bgGrad.addColorStop(0, "#222c44");
  bgGrad.addColorStop(0.5, "#151b2b");
  bgGrad.addColorStop(1, "#0d111b");
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(sbX, sbY, sbW, sbH, 8);
  ctx.fill();

  ctx.strokeStyle = "#fbc02d";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const timerBoxW = 90;
  const timerBoxH = 40;
  const timerBoxX = width / 2 - timerBoxW / 2;
  const timerBoxY = sbY + 5;

  ctx.fillStyle = "#070a12";
  ctx.beginPath();
  ctx.roundRect(timerBoxX, timerBoxY, timerBoxW, timerBoxH, 6);
  ctx.fill();
  ctx.strokeStyle = "#455a64";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 9px monospace";
  ctx.fillStyle = "#fbc02d";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("TIME", width / 2, timerBoxY + 4);

  ctx.font = "bold 22px monospace";
  ctx.fillStyle = matchTimer <= 10 ? "#ff1744" : "#ffeb3b";
  ctx.textBaseline = "bottom";
  const timerStr = matchTimer < 10 ? "0" + matchTimer : "" + matchTimer;
  ctx.fillText(timerStr, width / 2, timerBoxY + timerBoxH - 2);

  const p1TagX = sbX + 14;
  const p1TagY = sbY + 12;
  ctx.fillStyle = "#00e5ff";
  ctx.beginPath();
  ctx.roundRect(p1TagX, p1TagY, 44, 24, 4);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#091428";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1P", p1TagX + 22, p1TagY + 13);

  const p1ScoreX = sbX + 115;
  const p1ScoreStr =
    players[0].score < 10 ? "0" + players[0].score : "" + players[0].score;
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = "#000000";
  ctx.fillText(p1ScoreStr, p1ScoreX + 2, sbY + 28);
  ctx.fillStyle = "#00e5ff";
  ctx.fillText(p1ScoreStr, p1ScoreX, sbY + 26);

  drawSetLamps(sbX + 148, sbY + 25, players[0].sets, "#00e5ff");

  const p2TagX = sbX + sbW - 68;
  const p2TagY = sbY + 12;
  ctx.fillStyle = "#ff1744";
  ctx.beginPath();
  ctx.roundRect(p2TagX, p2TagY, 54, 24, 4);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CPU", p2TagX + 27, p2TagY + 13);

  const p2ScoreX = sbX + sbW - 118;
  const p2ScoreStr =
    players[1].score < 10 ? "0" + players[1].score : "" + players[1].score;
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = "#000000";
  ctx.fillText(p2ScoreStr, p2ScoreX + 2, sbY + 28);
  ctx.fillStyle = "#ff5252";
  ctx.fillText(p2ScoreStr, p2ScoreX, sbY + 26);

  drawSetLamps(sbX + sbW - 162, sbY + 25, players[1].sets, "#ff5252");

  ctx.restore();
}

function drawSetLamps(x, y, count, activeColor) {
  for (let i = 0; i < 2; i++) {
    const lx = x + i * 14;
    ctx.beginPath();
    ctx.arc(lx, y, 4.5, 0, Math.PI * 2);
    if (i < count) {
      ctx.fillStyle = activeColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = "#1e2638";
      ctx.fill();
      ctx.strokeStyle = "#3e4c66";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawPlayers() {
  players.forEach((player, idx) => {
    ctx.save();

    ctx.beginPath();
    ctx.ellipse(
      player.x + player.width / 2,
      player.y + player.height + 4,
      player.width * 0.75,
      7,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(
      player.x,
      player.y,
      player.x + player.width,
      player.y + player.height,
    );
    bodyGrad.addColorStop(0, player.color);
    bodyGrad.addColorStop(1, idx == 0 ? "#0091ea" : "#b71c1c");

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.width, player.height, 6);
    ctx.fill();

    ctx.fillStyle = player.trim;
    ctx.fillRect(player.x + 4, player.y + 12, player.width - 8, 5);
    ctx.fillRect(player.x + 4, player.y + 24, player.width - 8, 5);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      idx == 0 ? "1P" : "2P",
      player.x + player.width / 2,
      player.y + player.height / 2 + 10,
    );

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);

    ctx.restore();
  });
}

function drawDisc() {
  ctx.save();

  if (disc.history.length > 0) {
    disc.history.forEach((h, index) => {
      const alpha = (index + 1) / (disc.history.length * 2.5);
      ctx.beginPath();
      ctx.arc(h.x, h.y, disc.radius * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 235, 59, ${alpha})`;
      ctx.fill();
    });
  }

  ctx.beginPath();
  ctx.ellipse(disc.x, disc.y + 14, disc.radius * 0.9, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fill();

  ctx.translate(disc.x, disc.y);
  ctx.rotate(disc.angle);

  ctx.beginPath();
  ctx.arc(0, 0, disc.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#d50000";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();

  const numSlices = 6;
  for (let i = 0; i < numSlices; i++) {
    if (i % 2 == 0) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(
        0,
        0,
        disc.radius - 3,
        (i * Math.PI * 2) / numSlices,
        ((i + 1) * Math.PI * 2) / numSlices,
      );
      ctx.fillStyle = "#ffea00";
      ctx.fill();
    }
  }

  ctx.beginPath();
  ctx.arc(0, 0, disc.radius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#212121";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, disc.radius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#00e5ff";
  ctx.fill();

  ctx.restore();
}

function drawGoalBanner() {
  if (serveDelay <= 30) return;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, height / 2 - 45, width, 90);

  const bannerGrad = ctx.createLinearGradient(
    0,
    height / 2 - 40,
    0,
    height / 2 + 40,
  );
  bannerGrad.addColorStop(0, "#ff1744");
  bannerGrad.addColorStop(0.5, "#ffea00");
  bannerGrad.addColorStop(1, "#ff1744");
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, height / 2 - 38, width, 76);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, height / 2 - 38);
  ctx.lineTo(width, height / 2 - 38);
  ctx.moveTo(0, height / 2 + 38);
  ctx.lineTo(width, height / 2 + 38);
  ctx.stroke();

  ctx.font = "bold 30px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const scorerText = lastGoalScorer == 0 ? "1P GOAL!!" : "CPU GOAL!!";
  ctx.fillStyle = "#000000";
  ctx.fillText(scorerText, width / 2 + 4, height / 2 + 4);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(scorerText, width / 2, height / 2);

  ctx.restore();
}

function updateDisc() {
  if (serveDelay > 0) {
    serveDelay--;
    if (serveDelay == 0) {
      servingTo = servingPlayer;
      servingPlayer = -1;
    }
    return;
  }

  const speed = Math.hypot(disc.vx, disc.vy);
  disc.angle += (disc.vx > 0 ? 1 : -1) * Math.max(0.12, speed * 0.03);

  if (speed > 6) {
    disc.history.push({ x: disc.x, y: disc.y });
    if (disc.history.length > 5) disc.history.shift();
  } else {
    disc.history = [];
  }

  if (held != -1) {
    const p = players[held];
    disc.x = held == 0 ? p.x + p.width + disc.radius : p.x - disc.radius;
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
    const serveSpeed = 14;

    if (dist <= serveSpeed) {
      disc.x = targetX;
      disc.y = targetY;
      held = servingTo;
      servingTo = -1;
      if (held == 0) {
        throwDelays[0] = 180;
      } else {
        throwDelays[1] = 30 + Math.floor(Math.random() * 30);
      }
    } else {
      disc.vx = (dx / dist) * serveSpeed;
      disc.vy = (dy / dist) * serveSpeed;
      disc.x += disc.vx;
      disc.y += disc.vy;
    }
  } else {
    if (throwCooldowns[0] > 0) throwCooldowns[0]--;
    if (throwCooldowns[1] > 0) throwCooldowns[1]--;
    disc.x += disc.vx;
    disc.y += disc.vy;

    courtRectangles.forEach((rect) => discCollision(disc, rect));
    goalRectangles.forEach((rect) => goalCollision(disc, rect));
    players.forEach((player, index) => playerCollision(disc, player, index));
  }

  if (Math.abs(disc.curve) > 0.01) {
    const sp = Math.hypot(disc.vx, disc.vy);
    if (sp > 0) {
      const perpX = -disc.vy / sp;
      const perpY = disc.vx / sp;
      disc.vx += perpX * disc.curve;
      disc.vy += perpY * disc.curve;

      const newSpeed = Math.hypot(disc.vx, disc.vy);
      disc.vx = (disc.vx / newSpeed) * sp * 1.05;
      disc.vy = (disc.vy / newSpeed) * sp * 1.05;
    }
    disc.curve *= disc.curveDecay;
  }
}

function updatePlayer(player, isRight = false) {
  player.x += player.vx;
  player.y += player.vy;

  if (!isRight) {
    if (player.x < 75) player.x = 75;
    if (player.x > width / 2 - player.width - 75)
      player.x = width / 2 - player.width - 75;
  } else {
    if (player.x < width / 2 + 75) player.x = width / 2 + 75;
    if (player.x > width - 75 - player.width)
      player.x = width - 75 - player.width;
  }

  if (player.y < 70) player.y = 70;
  if (player.y > height - 70 - player.height)
    player.y = height - 70 - player.height;
}

function updateHumanThrow() {
  if (held != 0) return;
  const p = players[0];

  if (throwDelays[0] > 0) {
    throwDelays[0]--;
  } else {
    disc.vx = 9.5;
    disc.vy = p.vy != 0 ? p.vy : 0;
    disc.curve = p.vy * 0.038;
    held = -1;
    throwCooldowns[0] = 30;
    throwDelays[0] = 0;
  }
}

function updateAI() {
  const ai_player = players[1];
  const speed = 6;
  const centerY = height / 2 - ai_player.height / 2;

  if (held == 1) {
    if (throwDelays[1] > 0) {
      throwDelays[1]--;
    } else {
      const targetY = players[0].y + players[0].height / 2;
      const discY = ai_player.y + ai_player.height / 2;
      const dy = targetY - discY;
      const dist = Math.abs(dy) || 1;

      const throwVy = (dy / dist) * (2 + Math.random() * 3);
      disc.vx = -9.5;
      disc.vy = throwVy;
      disc.curve = throwVy * 0.038 * (Math.random() > 0.5 ? 1 : -1);
      held = -1;
      throwCooldowns[1] = 30;
      throwDelays[1] = 0;
    }
    ai_player.vx = 0;
    ai_player.vy = 0;
    return;
  }

  let targetY;
  if (disc.vx > 0 || held == -1) {
    const aiCenterX = ai_player.x + ai_player.width / 2;
    const dx = aiCenterX - disc.x;
    const travelTime = disc.vx != 0 ? dx / disc.vx : 0;
    const predictedY = disc.y + disc.vy * travelTime + ai.reactionJitter;

    const minY = 70 + ai_player.height / 2;
    const maxY = height - 70 - ai_player.height / 2;
    targetY = Math.max(minY, Math.min(maxY, predictedY)) - ai_player.height / 2;
  } else {
    targetY = centerY;
  }

  const dyTarget = targetY - ai_player.y;
  if (Math.abs(dyTarget) > 2) {
    ai_player.vy = Math.sign(dyTarget) * speed;
  } else {
    ai_player.vy = 0;
  }

  const aiHomeX = width - 144;
  const dxHome = aiHomeX - ai_player.x;
  if (Math.abs(dxHome) > 4) {
    ai_player.vx = Math.sign(dxHome) * (speed * 0.6);
  } else {
    ai_player.vx = 0;
  }

  if (Math.random() < 1 / 60) {
    ai.reactionJitter = (Math.random() - 0.5) * 40;
  }
}

function updateTimer() {
  if (serveDelay > 0) return;
  timerTicks++;
  if (timerTicks >= 60) {
    timerTicks = 0;
    if (matchTimer > 0) {
      matchTimer--;
    } else {
      matchTimer = 99;
    }
  }
}

function animate() {
  updateTimer();
  drawCourt();
  drawDisc();
  drawPlayers();
  drawScoreboard();
  drawGoalBanner();
  updateDisc();
  updatePlayer(players[0], false);
  updateHumanThrow();
  updateAI();
  updatePlayer(players[1], true);

  requestAnimationFrame(animate);
}

drawCourt();
animate();
