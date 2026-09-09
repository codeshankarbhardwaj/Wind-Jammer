


const canvas = document.getElementById('court');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

function drawCourt() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#D9C9A3';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#04141F';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, W - 40, H - 40);
}

drawCourt()

const player = { x: 150, y: H/2, radius: 26, color: '#FF7A59' };
const ai     = { x: 750, y: H/2, radius: 26, color: '#29D3FF' };

function drawPaddle(p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();
}

drawPaddle(player);
drawPaddle(ai);

const keys = new Set();
  window.addEventListener( 'keydown', e => keys.add(e.key.toLowerCase()))
  window.addEventListener( 'keyup', e => keys.delete(e.key.toLowerCase()))

  function moveplayer() {

  
 let dx = 0, dy = 0;
  if(keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if(keys.has('s') || keys.has('arrowdown')) dy += 1;
  if(keys.has('d') || keys.has('arrowright')) dx += 1;
  if(keys.has('w') || keys.has('arrowup'))    dy -= 1;

  player.x += dx * 5;
  player.y += dy * 5;

  player.x = Math.max(player.radius, Math.min(W - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(H - player.radius, player.y));
  }



  const disc = { x : W/2, y : H/2, radius : 12, vx : 0, vy : 0, held : null};

  function drawdisc() {
    ctx.beginPath();
    ctx.arc(disc.x, disc.y, disc.radius, 0, Math.PI * 2);
    ctx.fillStyle =  '#4bc159';
    ctx.fill();

  }

  drawdisc();


  function discUpdate(){
if(disc.held){
  disc.x = disc.held.x + disc.held.radius + disc.radius + 4;
  disc.y = disc.held.y;
}

disc.x += disc.vx;
disc.y += disc.vy;



if(disc.y - disc.radius < 20){
  disc.y = disc.radius + 20;
  disc.vy = -disc.vy * 0.95;

}


if(disc.y + disc.radius > H-20){
  disc.y = H - 20 - disc.radius;
  disc.vy = -disc.vy * 0.95;
}

  }


  function checkCatch() {
  if (disc.held) return;
  const dPlayer = Math.hypot(disc.x - player.x, disc.y - player.y);
  const dAi = Math.hypot(disc.x - ai.x, disc.y - ai.y);

  if (dPlayer < player.radius + disc.radius + 4) {
    disc.held = player;
    disc.vx = 0; disc.vy = 0;
  } else if (dAi < ai.radius + disc.radius + 4) {
    disc.held = ai;
    disc.vx = 0; disc.vy = 0;
  }
}



const GOAL_TOP = H/2 - 85, GOAL_BOTTOM = H/2 + 85;
let score = { p1: 0, p2: 0 };

function checkGoals() {
  if (disc.x - disc.radius < 26) {
    if (disc.y > GOAL_TOP && disc.y < GOAL_BOTTOM) {
      score.p2++; resetDisc();
    } else {
      disc.x = 26 + disc.radius;
      disc.vx = -disc.vx * 0.94;   
    }
  }
  if (disc.x + disc.radius > W - 26) {
    if (disc.y > GOAL_TOP && disc.y < GOAL_BOTTOM) {
      score.p1++; resetDisc();
    } else {
      disc.x = W - 26 - disc.radius;
      disc.vx = -disc.vx * 0.94;
    }
  }
}

function resetDisc() {
  disc.x = W/2; disc.y = H/2;
  disc.vx = 5; disc.vy = 2;
  disc.held = null;
}



let charging = false;
let charge = 0;

window.addEventListener('keydown', e => {
  if (e.key === ' ') charging = true;
});

window.addEventListener('keyup', e => {
  if (e.key === ' ' && disc.held === player) {
    let dx = 1, dy = 0;
    if (keys.has('w')) dy = -1;
    if (keys.has('s')) dy = 1;

    const speed = 10 + charge * 0.16;   
    disc.vx = dx * speed;
    disc.vy = dy * speed;
    disc.held = null;
    charging = false;
    charge = 0;
  }
});


function updateCharge() {
  if (charging && disc.held === player) {
    charge = Math.min(30, charge + 1);   
  }
}


function updateScoreboard() {
  document.getElementById('scorebar').textContent = score.p1 + ' : ' + score.p2;
}




function update() {
  

  moveplayer();
  
  updateCharge();
  
  discUpdate();
  checkCatch();
  checkGoals();
}

function render() {
  drawCourt();
  
  drawPaddle(ai);
  drawPaddle(player);
  drawdisc();
  updateScoreboard();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
loop();