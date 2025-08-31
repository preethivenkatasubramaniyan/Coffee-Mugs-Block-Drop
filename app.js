/* Coffee Mugs — Block Drop (Tetris-like)
   Grid: 10x20. Blocks are rendered as mug shapes.
*/
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nctx = nextCanvas.getContext('2d');

const bg = document.getElementById('bg');
const sLine = document.getElementById('s_line');
const sRot = document.getElementById('s_rot');
const sDrop = document.getElementById('s_drop');

const muteBtn = document.getElementById('mute');
const startBtn = document.getElementById('start');

let muted = false;
muteBtn.onclick = ()=> { muted = !muted; [bg,sLine,sRot,sDrop].forEach(a=>a.muted=muted); muteBtn.textContent = muted ? '🔇' : '🔊'; };
startBtn.onclick = ()=> start();

const COLS = 10, ROWS = 20;
const CELL = canvas.width / COLS;

const shapes = [
  [[1,1,1,1]],           // I
  [[1,1],[1,1]],         // O
  [[0,1,1],[1,1,0]],     // S
  [[1,1,0],[0,1,1]],     // Z
  [[1,0,0],[1,1,1]],     // J
  [[0,0,1],[1,1,1]],     // L
  [[0,1,0],[1,1,1]]      // T
];

const colors = ['#ffb973','#ffd84d','#f6c28b','#b565d9','#6ad37f','#8ec6ff','#ff8aa1'];

function makeGrid(){ return Array.from({length:ROWS}, ()=> Array(COLS).fill(0)); }

let grid = makeGrid();
let current = null;
let next = null;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0, lines = 0, level = 1;
let gameOver = false;

function randPiece(){
  const idx = Math.floor(Math.random()*shapes.length);
  return {shape: shapes[idx], color: colors[idx], x: Math.floor(COLS/2)-1, y: -2};
}

function rotate(matrix){
  // transpose + reverse rows
  const rows = matrix.length, cols = matrix[0].length;
  const out = Array.from({length: cols}, ()=> Array(rows).fill(0));
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) out[c][rows-1-r] = matrix[r][c];
  return out;
}

function collide(grid, piece){
  const m = piece.shape;
  for (let r=0;r<m.length;r++) for (let c=0;c<m[r].length;c++){
    if (m[r][c]){
      const x = piece.x + c, y = piece.y + r;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y>=0 && grid[y][x]) return true;
    }
  }
  return false;
}

function merge(grid, piece){
  const m = piece.shape;
  for (let r=0;r<m.length;r++) for (let c=0;c<m[r].length;c++){
    if (m[r][c]){
      const x = piece.x + c, y = piece.y + r;
      if (y>=0) grid[y][x] = piece.color;
    }
  }
}

function clearLines(){
  let rowCount = 0;
  outer: for (let r=ROWS-1;r>=0;r--){
    for (let c=0;c<COLS;c++) if (!grid[r][c]) continue outer;
    // clear row r
    grid.splice(r,1);
    grid.unshift(Array(COLS).fill(0));
    r++; // recheck same index after shift
    rowCount++;
  }
  if (rowCount>0){
    lines += rowCount;
    score += rowCount * 100 * rowCount;
    sLine.currentTime=0; try{sLine.play().catch(()=>{})}catch{};
    level = Math.floor(lines/10) + 1;
    dropInterval = Math.max(100, 1000 - (level-1)*80);
  }
}

function spawn(){
  current = next || randPiece();
  next = randPiece();
  current.x = Math.floor(COLS/2) - Math.floor(current.shape[0].length/2);
  current.y = -2;
  if (collide(grid, current)){
    gameOver = true;
  }
}

function hardDrop(){
  while(!collide(grid, {...current, y: current.y+1})) current.y++;
  lockPiece();
  sDrop.currentTime=0; try{sDrop.play().catch(()=>{})}catch{};
}

function lockPiece(){
  merge(grid, current);
  clearLines();
  spawn();
}

function move(dir){ current.x += dir; if (collide(grid, current)) current.x -= dir; }

function softDrop(){ current.y++; if (collide(grid, current)){ current.y--; lockPiece(); } }

function rotatePiece(){
  const old = current.shape;
  current.shape = rotate(current.shape);
  if (collide(grid, current)) current.shape = old;
  else { sRot.currentTime=0; try{sRot.play().catch(()=>{})}catch{}; }
}

window.addEventListener('keydown', e=>{
  if (gameOver) return;
  if (e.key === 'ArrowLeft'){ move(-1); }
  else if (e.key === 'ArrowRight'){ move(1); }
  else if (e.key === 'ArrowDown'){ softDrop(); }
  else if (e.key === 'ArrowUp'){ rotatePiece(); }
  else if (e.key === ' '){ hardDrop(); }
});

function drawCell(x,y,color){
  const px = x*CELL, py = y*CELL;
  // draw mug shape with rounded rect and handle
  ctx.fillStyle = color;
  roundRect(ctx, px+2, py+6, CELL-4, CELL-12, 6, true, false);
  // handle
  ctx.beginPath();
  ctx.ellipse(px+CELL-6, py+CELL/2+2, CELL*0.18, CELL*0.28, 0, Math.PI*0.25, Math.PI*1.75);
  ctx.fillStyle = color;
  ctx.fill();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(px+4, py+8, CELL/2, CELL/4);
}

function roundRect(ctx,x,y,w,h,r,fill,stroke){
  if (typeof stroke === 'undefined'){ stroke = true; }
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawGrid(){
  ctx.clearRect(0,0,canvas.width, canvas.height);
  // draw existing grid
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (grid[r][c]) drawCell(c,r, grid[r][c]);
  // draw current piece
  if (current){
    const m = current.shape;
    for (let r=0;r<m.length;r++) for (let c=0;c<m[r].length;c++) if (m[r][c]){
      const x = current.x + c, y = current.y + r;
      if (y>=0) drawCell(x,y,current.color);
    }
  }
  // grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let i=0;i<=COLS;i++){ ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL, canvas.height); ctx.stroke(); }
  for (let i=0;i<=ROWS;i++){ ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(canvas.width, i*CELL); ctx.stroke(); }
}

function drawNext(){
  nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  if (!next) return;
  const s = next.shape;
  const scale = 20;
  const offX = 10, offY = 10;
  for (let r=0;r<s.length;r++) for (let c=0;c<s[r].length;c++) if (s[r][c]){
    const x = offX + c*scale, y = offY + r*scale;
    // small mug
    nctx.fillStyle = next.color;
    nctx.fillRect(x+2,y+4, scale-4, scale-8);
    nctx.beginPath();
    nctx.ellipse(x+scale-4, y+scale/2, scale*0.22, scale*0.3, 0, Math.PI*0.25, Math.PI*1.75);
    nctx.fill();
  }
}

function update(time=0){
  if (!lastTime) lastTime = time;
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (!gameOver && dropCounter > dropInterval){ current.y++; if (collide(grid, current)){ current.y--; lockPiece(); } dropCounter = 0; }
  drawGrid();
  drawNext();
  requestAnimationFrame(update);
}

function start(){
  // reset everything
  grid = makeEmpty();
  next = randPiece();
  spawn();
  score = 0; lines = 0; level = 1; dropInterval = 1000; gameOver = false;
  document.getElementById('score').textContent = score;
  document.getElementById('lines').textContent = lines;
  document.getElementById('level').textContent = level;
  lastTime = 0;
  try{ bg.play().catch(()=>{}); }catch{}
}

function makeEmpty(){ return Array.from({length:ROWS}, ()=> Array(COLS).fill(0)); }

// init
grid = makeEmpty();
next = randPiece();
spawn();
update();