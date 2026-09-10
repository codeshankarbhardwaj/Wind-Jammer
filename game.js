const canvas = document.getElementById("game");

const width = 912;
const height = 672;

canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext("2d");

const beachImages = {
  base: new Image(),
  topRail: new Image(),
  bottomRail: new Image(),
  net: new Image(),
  leftGoal: new Image(),
  rightGoal: new Image(),
  leftGoalGuard: new Image(),
  rightGoalGuard: new Image(),
};
const speakerImages = {
  muted: new Image(),
  speaker: new Image(),
};

const playerSprites = {
  idle: { img: new Image(), frameW: 35, frameH: 54, frames: 10, fps: 10 },
  throw: { img: new Image(), frameW: 72, frameH: 68, frames: 11, fps: 14 },
  catch: { img: new Image(), frameW: 57, frameH: 57, frames: 3, fps: 10 },
};
playerSprites.idle.img.src = "assets/images/player/idle.png";
playerSprites.throw.img.src = "assets/images/player/throw.png";
playerSprites.catch.img.src = "assets/images/player/catch.png";

const playerAnim = [
  { state: "idle", frame: 0, tick: 0, playOnce: false },
  { state: "idle", frame: 0, tick: 0, playOnce: false },
];

function tickAnim(anim) {
  const sheet = playerSprites[anim.state];
  const ticksPerFrame = Math.round(60 / sheet.fps);
  anim.tick++;
  if (anim.tick >= ticksPerFrame) {
    anim.tick = 0;
    anim.frame++;
    if (anim.frame >= sheet.frames) {
      if (anim.playOnce) {
        anim.state = "idle";
        anim.playOnce = false;
      }
      anim.frame = 0;
    }
  }
  return anim.frame;
}

function setAnim(playerIndex, state, playOnce = false) {
  const anim = playerAnim[playerIndex];
  if (anim.state === state) return;
  anim.state = state;
  anim.frame = 0;
  anim.tick = 0;
  anim.playOnce = playOnce;
}

const sounds = {
  bgm: new Audio("assets/sounds/bgm.ogg"),
  block: new Audio("assets/sounds/block.wav"),
  throw: new Audio("assets/sounds/throw.wav"),
  goal: new Audio("assets/sounds/goal.wav"),
};
sounds.bgm.loop = true;

function playSound(name) {
  if (muted) return;
  const s = sounds[name];
  if (!s) return;
  s.currentTime = 0;
  s.play();
}

beachImages.base.src = "assets/images/background/beach/base.png";
beachImages.topRail.src = "assets/images/background/beach/topRail.png";
beachImages.bottomRail.src = "assets/images/background/beach/bottomRail.png";
beachImages.net.src = "assets/images/background/beach/net.png";
beachImages.leftGoal.src = "assets/images/background/beach/leftGoal.png";
beachImages.rightGoal.src = "assets/images/background/beach/rightGoal.png";
beachImages.leftGoalGuard.src =
  "assets/images/background/beach/leftGoalGuard.png";
beachImages.rightGoalGuard.src =
  "assets/images/background/beach/rightGoalGuard.png";

speakerImages.muted.src = "assets/images/ui/muted.svg";
speakerImages.speaker.src = "assets/images/ui/speaker.svg";

let bgmStarted = false;
function startBgm() {
  if (bgmStarted) return;
  bgmStarted = true;
  sounds.bgm.play();
}
window.addEventListener("keydown", startBgm, { once: false });
window.addEventListener("pointerdown", startBgm, { once: false });

let bgFrame = 0;
let bgTick = 0;
const BG_FRAME_TICKS = 10;
const BG_FRAMES = 4;
const BG_FRAME_WIDTH = 304;
const BG_FRAME_HEIGHT = 224;

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

const muteButton = {
  x: 860,
  y: 10,
  width: 40,
  height: 40,
};

const players = [
  {
    x: 110,
    y: height / 2 - 45,
    width: 60,
    height: 90,
    vx: 0,
    vy: 0,
    score: 0,
    sets: 0,
  },
  {
    x: width - 144,
    y: height / 2 - 45,
    width: 60,
    height: 90,
    vx: 0,
    vy: 0,
    score: 0,
    sets: 0,
  },
];

let held = -1;
let servingTo = -1;
let serveDelay = 0;
let servingPlayer = -1;
let lastGoalScorer = -1;
let muted = false;

let matchTimer = 99;
let timerTicks = 0;

let gameOver = false;
let winner = -1;

const throwDelays = [0, 0];
const throwCooldowns = [0, 0];

window.addEventListener("keydown", (e) => {
  if (e.key == "w") players[0].vy = -7;
  if (e.key == "s") players[0].vy = 7;
  if (e.key == "a") players[0].vx = -7;
  if (e.key == "d") players[0].vx = 7;
  if (e.code == "Space") {
    e.preventDefault();
    if (e.repeat) return;
    const throwAnimDuration =
      playerSprites.throw.frames * Math.round(60 / playerSprites.throw.fps);
    if (held == 0 && throwDelays[0] > throwAnimDuration) {
      setAnim(0, "throw", true);
      throwDelays[0] = throwAnimDuration;
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key == "w" && players[0].vy < 0) players[0].vy = 0;
  if (e.key == "s" && players[0].vy > 0) players[0].vy = 0;
  if (e.key == "a" && players[0].vx < 0) players[0].vx = 0;
  if (e.key == "d" && players[0].vx > 0) players[0].vx = 0;
});

window.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  if (
    mouseX >= muteButton.x &&
    mouseX <= muteButton.x + muteButton.width &&
    mouseY >= muteButton.y &&
    mouseY <= muteButton.y + muteButton.height
  ) {
    muted = !muted;
    sounds.bgm.muted = muted;
  }

  if (
    gameOver &&
    mouseX >= 356 &&
    mouseX <= 556 &&
    mouseY >= 390 &&
    mouseY <= 442
  ) {
    players[0].score = 0;
    players[1].score = 0;
    disc.x = width / 2;
    disc.y = (RAIL_TOP_Y + RAIL_BOTTOM_Y) / 2;
    disc.vx = -8;
    disc.vy = 0;
    disc.curve = 0;
    disc.history = [];
    held = -1;
    servingTo = -1;
    serveDelay = 0;
    servingPlayer = -1;
    lastGoalScorer = -1;
    matchTimer = 99;
    timerTicks = 0;
    throwDelays[0] = 0;
    throwDelays[1] = 0;
    throwCooldowns[0] = 0;
    throwCooldowns[1] = 0;
    players[0].x = 110;
    players[0].y = height / 2 - 45;
    players[0].vx = 0;
    players[0].vy = 0;
    players[1].x = width - 144;
    players[1].y = height / 2 - 45;
    players[1].vx = 0;
    players[1].vy = 0;
    playerAnim[0] = { state: "idle", frame: 0, tick: 0, playOnce: false };
    playerAnim[1] = { state: "idle", frame: 0, tick: 0, playOnce: false };
    gameOver = false;
    winner = -1;
    animate();
  }
});

const RAIL_TOP_Y = 56 * 3;
const RAIL_BOTTOM_Y = 196 * 3;

const rails = [
  { dir: -1, hitTimer: 0, offsetY: 0 },
  { dir: 1, hitTimer: 0, offsetY: 0 },
];

const goalRectangles = [
  {
    x: 0,
    y: RAIL_TOP_Y,
    width: 30,
    height: RAIL_BOTTOM_Y - RAIL_TOP_Y,
    left: true,
  },
  {
    x: width - 30,
    y: RAIL_TOP_Y,
    width: 30,
    height: RAIL_BOTTOM_Y - RAIL_TOP_Y,
  },
];

function bounceRails(disc) {
  if (disc.y - disc.radius < RAIL_TOP_Y) {
    disc.y = RAIL_TOP_Y + disc.radius;
    disc.vy = Math.abs(disc.vy);
    rails[0].offsetY = -14;
    rails[0].hitTimer = 8;
  }

  if (disc.y + disc.radius > RAIL_BOTTOM_Y) {
    disc.y = RAIL_BOTTOM_Y - disc.radius;
    disc.vy = -Math.abs(disc.vy);
    rails[1].offsetY = 14;
    rails[1].hitTimer = 8;
  }
}

function goalCollision(disc, rect) {
  const closestX = Math.max(rect.x, Math.min(disc.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(disc.y, rect.y + rect.height));

  const dx = disc.x - closestX;
  const dy = disc.y - closestY;

  if (dx * dx + dy * dy < disc.radius * disc.radius) {
    const hitY = disc.y;
    const goalH = RAIL_BOTTOM_Y - RAIL_TOP_Y;
    const seg3H = Math.floor(goalH * 0.28);
    const topBand = RAIL_TOP_Y + seg3H;
    const bottomBand = RAIL_BOTTOM_Y - seg3H;

    const pointsAwarded = hitY < topBand || hitY > bottomBand ? 3 : 5;

    playSound("goal");

    disc.x = width / 2;
    disc.y = (RAIL_TOP_Y + RAIL_BOTTOM_Y) / 2;
    disc.vx = 0;
    disc.vy = 0;
    disc.curve = 0;
    disc.history = [];

    if (rect.left) {
      players[1].score += pointsAwarded;
      if (players[1].score >= 15) {
        gameOver = true;
        winner = 1;
        return;
      }
      servingPlayer = 0;
      lastGoalScorer = 1;
    } else {
      players[0].score += pointsAwarded;
      if (players[0].score >= 15) {
        gameOver = true;
        winner = 0;
        return;
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
    setAnim(playerIndex, "catch", true);
    playSound("block");
    if (playerIndex == 0) {
      throwDelays[0] = 180;
    } else {
      throwDelays[1] = 30 + Math.floor(Math.random() * 30);
    }
  }
}

function drawCourt() {
  bgTick++;
  if (bgTick >= BG_FRAME_TICKS) {
    bgTick = 0;
    bgFrame = (bgFrame + 1) % BG_FRAMES;
  }

  if (beachImages.base.complete && beachImages.base.naturalWidth != 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      beachImages.base,
      bgFrame * BG_FRAME_WIDTH,
      0,
      BG_FRAME_WIDTH,
      BG_FRAME_HEIGHT,
      0,
      0,
      width,
      height,
    );

    const overlays = [
      beachImages.net,
      beachImages.leftGoalGuard,
      beachImages.rightGoalGuard,
      beachImages.leftGoal,
      beachImages.rightGoal,
    ];

    overlays.forEach((img) => {
      if (img.complete && img.naturalWidth != 0) {
        ctx.drawImage(
          img,
          0,
          0,
          BG_FRAME_WIDTH,
          BG_FRAME_HEIGHT,
          0,
          0,
          width,
          height,
        );
      }
    });

    rails.forEach((rail) => {
      rail.offsetY *= 0.75;
      if (Math.abs(rail.offsetY) < 0.5) rail.offsetY = 0;
      if (rail.hitTimer > 0) rail.hitTimer--;
    });

    ctx.save();
    ctx.translate(0, rails[0].offsetY);
    ctx.drawImage(
      beachImages.topRail,
      0,
      0,
      BG_FRAME_WIDTH,
      BG_FRAME_HEIGHT,
      0,
      0,
      width,
      height,
    );
    ctx.restore();

    ctx.save();
    ctx.translate(-29 * 3, rails[1].offsetY);
    ctx.drawImage(
      beachImages.bottomRail,
      0,
      0,
      BG_FRAME_WIDTH,
      BG_FRAME_HEIGHT,
      0,
      0,
      width,
      height,
    );
    ctx.restore();
  } else {
    ctx.fillStyle = "#0c3b63";
    ctx.fillRect(0, 0, width, height);
  }
}
const SCALE = 3;

function drawScoreboard() {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const scoreColor = "#e8d89a";
  const timeFgColor = matchTimer <= 10 ? "#ff4444" : "#e8d89a";

  function draw7Seg(digit, x, y, w, h, color) {
    const X = x * SCALE;
    const Y = y * SCALE;
    const W = w * SCALE;
    const H = h * SCALE;
    const sw = Math.max(2, Math.round(H * 0.09));
    const g = Math.max(1, Math.round(sw * 0.4));
    const dim = "rgba(0,0,0,0.25)";

    const MAP = [
      [1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 0, 0, 0, 0],
      [1, 1, 0, 1, 1, 0, 1],
      [1, 1, 1, 1, 0, 0, 1],
      [0, 1, 1, 0, 0, 1, 1],
      [1, 0, 1, 1, 0, 1, 1],
      [1, 0, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 1],
    ];
    const d = parseInt(digit, 10);
    if (isNaN(d)) return;
    const s = MAP[d];
    const midY = Y + H / 2;

    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;

    function hSeg(sy, on) {
      ctx.fillStyle = on ? color : dim;
      ctx.fillRect(X + sw + g, sy - Math.round(sw / 2), W - 2 * (sw + g), sw);
    }
    function vSeg(sx, sy, on) {
      ctx.fillStyle = on ? color : dim;
      ctx.fillRect(
        sx - Math.round(sw / 2),
        sy + sw + g,
        sw,
        H / 2 - sw - 2 * g,
      );
    }

    hSeg(Y, s[0]);
    vSeg(X + W, Y, s[1]);
    vSeg(X + W, midY, s[2]);
    hSeg(Y + H, s[3]);
    vSeg(X, midY, s[4]);
    vSeg(X, Y, s[5]);
    hSeg(midY, s[6]);

    ctx.restore();
  }

  const p1Score = players[0].score;
  draw7Seg(Math.floor(p1Score / 10) % 10, 113, 16, 13, 11, scoreColor);
  draw7Seg(p1Score % 10, 129, 16, 13, 11, scoreColor);

  const p2Score = players[1].score;
  draw7Seg(Math.floor(p2Score / 10) % 10, 161, 16, 13, 11, scoreColor);
  draw7Seg(p2Score % 10, 177, 16, 13, 11, scoreColor);

  const t = Math.max(0, Math.ceil(matchTimer));
  draw7Seg(Math.floor(t / 10) % 10, 145, 21, 5, 6, timeFgColor);
  draw7Seg(t % 10, 152, 21, 5, 6, timeFgColor);

  ctx.restore();
}

function drawPlayers() {
  const idleSheet = playerSprites.idle;
  const baseScale = players[0].height / idleSheet.frameH;

  players.forEach((player, idx) => {
    const anim = playerAnim[idx];
    const sheet = playerSprites[anim.state];
    const frame = tickAnim(anim);

    const fw = sheet.frameW;
    const fh = sheet.frameH;
    const dw = fw * baseScale;
    const dh = fh * baseScale;
    const footX = player.x + player.width / 2;
    const footY = player.y + player.height;
    const drawX = footX - dw / 2;
    const drawY = footY - dh;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (idx === 1) {
      ctx.translate(drawX + dw, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet.img, frame * fw, 0, fw, fh, 0, 0, dw, dh);
    } else {
      ctx.drawImage(sheet.img, frame * fw, 0, fw, fh, drawX, drawY, dw, dh);
    }

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

function drawMutedBtn() {
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.roundRect(
    muteButton.x,
    muteButton.y,
    muteButton.width,
    muteButton.height,
    6,
  );
  ctx.fill();
  if (muted) {
    ctx.drawImage(
      speakerImages.muted,
      muteButton.x + 4,
      muteButton.y + 2,
      muteButton.width - 4,
      muteButton.height - 4,
    );
  } else {
    ctx.drawImage(
      speakerImages.speaker,
      muteButton.x + 2,
      muteButton.y + 2,
      muteButton.width - 4,
      muteButton.height - 4,
    );
  }
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

    bounceRails(disc);
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

  if (player.y < RAIL_TOP_Y) player.y = RAIL_TOP_Y;
  if (player.y > RAIL_BOTTOM_Y - player.height - 50)
    player.y = RAIL_BOTTOM_Y - player.height - 50;
}

function updateHumanThrow() {
  if (held != 0) return;
  const p = players[0];
  const throwAnimDuration =
    playerSprites.throw.frames * Math.round(60 / playerSprites.throw.fps);

  if (throwDelays[0] > 0) {
    throwDelays[0]--;
    if (throwDelays[0] === throwAnimDuration) {
      setAnim(0, "throw", true);
    }
  } else {
    disc.vx = 9.5;
    disc.vy = p.vy != 0 ? p.vy : 0;
    disc.curve = p.vy * 0.1;
    held = -1;
    throwCooldowns[0] = 30;
    throwDelays[0] = 0;
    setAnim(0, "idle");
    playSound("throw");
  }
}

function updateAI() {
  const ai_player = players[1];
  const speed = 4;
  const centerY = height / 2 - ai_player.height / 2;

  if (serveDelay > 0 || servingTo !== -1) {
    const aiHomeX = width - 144;
    const dxHome = aiHomeX - ai_player.x;
    ai_player.vx =
      Math.abs(dxHome) > 1
        ? Math.sign(dxHome) * Math.min(speed * 0.6, Math.abs(dxHome))
        : 0;
    const dyCenter = centerY - ai_player.y;
    ai_player.vy =
      Math.abs(dyCenter) > 1
        ? Math.sign(dyCenter) * Math.min(speed, Math.abs(dyCenter))
        : 0;
    return;
  }

  if (held == 1) {
    if (throwDelays[1] > 0) {
      throwDelays[1]--;
      if (
        throwDelays[1] <=
          playerSprites.throw.frames *
            Math.round(60 / playerSprites.throw.fps) &&
        playerAnim[1].state !== "throw"
      ) {
        setAnim(1, "throw", true);
      }
    } else {
      const targetY = players[0].y + players[0].height / 2;
      const discY = ai_player.y + ai_player.height / 2;
      const dy = targetY - discY;
      const dist = Math.abs(dy) || 1;

      const throwVy = (dy / dist) * (2 + Math.random() * 3);
      disc.vx = -7.5;
      disc.vy = throwVy;
      disc.curve = throwVy * 0.038 * (Math.random() > 0.5 ? 1 : -1);
      held = -1;
      throwCooldowns[1] = 30;
      throwDelays[1] = 0;
      setAnim(1, "idle");
      playSound("throw");
    }
    ai_player.vx = 0;
    ai_player.vy = 0;
    return;
  }

  const targetY = disc.vx > 0 ? disc.y - ai_player.height / 2 : centerY;

  const dyTarget = targetY - ai_player.y;
  ai_player.vy =
    Math.abs(dyTarget) > 1
      ? Math.sign(dyTarget) * Math.min(speed, Math.abs(dyTarget))
      : 0;

  const aiHomeX = width - 144;
  const dxHome = aiHomeX - ai_player.x;
  ai_player.vx =
    Math.abs(dxHome) > 1
      ? Math.sign(dxHome) * Math.min(speed * 0.6, Math.abs(dxHome))
      : 0;
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

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 36px monospace";
  ctx.fillStyle = "#000";
  ctx.fillText(
    winner === 0 ? "PLAYER 1 WINS!" : "CPU WINS!",
    width / 2 + 3,
    height / 2 - 47,
  );
  ctx.fillStyle = winner === 0 ? "#00e5ff" : "#ff4444";
  ctx.fillText(
    winner === 0 ? "PLAYER 1 WINS!" : "CPU WINS!",
    width / 2,
    height / 2 - 50,
  );
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(356, 390, 200, 52, 10);
  ctx.fill();
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#111";
  ctx.fillText("PLAY AGAIN", width / 2, 416);
}

function animate() {
  if (gameOver) {
    drawCourt();
    drawDisc();
    drawPlayers();
    drawScoreboard();
    drawMutedBtn();
    drawGameOver();
    return;
  }

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
  drawMutedBtn();

  requestAnimationFrame(animate);
}

drawCourt();
animate();
