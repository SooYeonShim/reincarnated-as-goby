(function () {
  'use strict';

  const BOARD_SIZE = 8;
  const CELL_GAP = 6;
  const MIN_CELL = 40;
  const MAX_CELL = 108;
  let CELL_SIZE = 72;
  let STEP = CELL_SIZE + CELL_GAP;

  const TILE_DEFS = [
    { key: 'diamond', img: 'images/tile_diamond_goby.png' },
    { key: 'randall', img: 'images/tile_randall_goby.png' },
    { key: 'fire', img: 'images/tile_fire_goby.png' },
    { key: 'watchman', img: 'images/tile_yellow_watchman_goby.png' },
    { key: 'rock', img: 'images/tile_yellow_rock_goby.png' },
    { key: 'helfrich', img: 'images/tile_helfrich_goby.png' },
  ];
  const TYPE_KEYS = TILE_DEFS.map((t) => t.key);
  const TYPE_IMG = Object.fromEntries(TILE_DEFS.map((t) => [t.key, t.img]));

  const PROLOGUE_CHAPTER = STORY_CHAPTERS[0];
  const GAME_CHAPTERS = STORY_CHAPTERS.slice(1);

  const hudEl = document.getElementById('hud');
  const boardEl = document.getElementById('board');
  const scoreValueEl = document.getElementById('score-value');
  const levelValueEl = document.getElementById('level-value');
  const storyBarFill = document.getElementById('story-bar-fill');
  const storyRemainEl = document.getElementById('story-remain');
  const comboPopup = document.getElementById('combo-popup');
  const restartBtn = document.getElementById('restart-btn');

  const vnOverlay = document.getElementById('vn-overlay');
  const vnBg = document.getElementById('vn-bg');
  const vnPortrait = document.getElementById('vn-portrait');
  const vnBox = document.getElementById('vn-box');
  const vnSpeaker = document.getElementById('vn-speaker');
  const vnText = document.getElementById('vn-text');
  const vnSkip = document.getElementById('vn-skip');

  function computeCellSize() {
    const reserveH = 210; // header + title + padding + margins
    const reserveW = 40;
    const availH = Math.max(BOARD_SIZE * MIN_CELL, window.innerHeight - reserveH);
    const availW = Math.max(BOARD_SIZE * MIN_CELL, window.innerWidth - reserveW);
    const byH = Math.floor((availH + CELL_GAP) / BOARD_SIZE) - CELL_GAP;
    const byW = Math.floor((availW + CELL_GAP) / BOARD_SIZE) - CELL_GAP;
    return Math.max(MIN_CELL, Math.min(MAX_CELL, byH, byW));
  }

  function layoutBoard() {
    CELL_SIZE = computeCellSize();
    STEP = CELL_SIZE + CELL_GAP;
    const px = BOARD_SIZE * STEP - CELL_GAP + 'px';
    boardEl.style.width = px;
    boardEl.style.height = px;
    hudEl.style.width = px;
  }

  function relayoutExistingTiles() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = board[r] && board[r][c];
        if (!tile || !tile.dom) continue;
        tile.dom.style.width = CELL_SIZE + 'px';
        tile.dom.style.height = CELL_SIZE + 'px';
        moveTileDom(tile, r, c);
      }
    }
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layoutBoard();
      relayoutExistingTiles();
    }, 120);
  });

  let board = []; // board[row][col] = { id, type, special, dom } | null
  let nextId = 1;
  let score = 0;
  let storyChaptersShown = 0;
  let boardLocked = false;
  let selected = null; // {row, col}

  function randType() {
    return TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
  }

  function posFor(row, col) {
    return { left: col * STEP, top: row * STEP };
  }

  function createTileDom(tile, row, col, fromTop) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.style.width = CELL_SIZE + 'px';
    el.style.height = CELL_SIZE + 'px';
    const p = posFor(row, col);
    el.style.left = p.left + 'px';
    el.style.top = (fromTop != null ? fromTop : p.top) + 'px';
    el.addEventListener('click', () => onTileClick(tile));
    boardEl.appendChild(el);
    tile.dom = el;
    applyTileSkin(tile);
    if (fromTop != null) {
      requestAnimationFrame(() => {
        el.style.top = p.top + 'px';
      });
    }
    return el;
  }

  function applyTileSkin(tile) {
    tile.dom.classList.remove('special-line-h', 'special-line-v', 'special-burst');
    tile.dom.style.backgroundImage = `url('${TYPE_IMG[tile.type]}')`;
    if (tile.special) {
      tile.dom.classList.add('special-' + tile.special);
    }
  }

  function moveTileDom(tile, row, col) {
    const p = posFor(row, col);
    tile.dom.style.left = p.left + 'px';
    tile.dom.style.top = p.top + 'px';
  }

  // ---------- board generation ----------
  function makeEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  }

  function wouldMatchAt(b, row, col, type) {
    if (
      col >= 2 &&
      b[row][col - 1] && b[row][col - 1].type === type &&
      b[row][col - 2] && b[row][col - 2].type === type
    ) return true;
    if (
      row >= 2 &&
      b[row - 1][col] && b[row - 1][col].type === type &&
      b[row - 2][col] && b[row - 2][col].type === type
    ) return true;
    return false;
  }

  function buildInitialBoard() {
    let attempt = 0;
    let candidate;
    do {
      candidate = makeEmptyBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          let type;
          let guard = 0;
          do {
            type = randType();
            guard++;
          } while (wouldMatchAt(candidate, r, c, type) && guard < 30);
          candidate[r][c] = { id: nextId++, type, special: null, dom: null };
        }
      }
      attempt++;
    } while (!hasAnyMove(candidate) && attempt < 40);
    return candidate;
  }

  function renderInitialBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = board[r][c];
        createTileDom(tile, r, c);
      }
    }
  }

  function initGame() {
    layoutBoard();
    board = buildInitialBoard();
    nextId = countTiles(board) + 1;
    renderInitialBoard();
    score = 0;
    storyChaptersShown = 0;
    updateScoreHud();
  }

  function countTiles(b) {
    let n = 0;
    for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (b[r][c]) n++;
    return n;
  }

  // ---------- match detection ----------
  function findMatchGroups(b) {
    const groups = [];
    // horizontal
    for (let r = 0; r < BOARD_SIZE; r++) {
      let run = [0];
      for (let c = 1; c <= BOARD_SIZE; c++) {
        const prev = c - 1;
        const same = c < BOARD_SIZE && b[r][c] && b[r][prev] && b[r][c].type === b[r][prev].type;
        if (same) {
          run.push(c);
        } else {
          if (run.length >= 3) {
            groups.push({ dir: 'h', row: r, cells: run.map((cc) => ({ row: r, col: cc })) });
          }
          run = [c];
        }
      }
    }
    // vertical
    for (let c = 0; c < BOARD_SIZE; c++) {
      let run = [0];
      for (let r = 1; r <= BOARD_SIZE; r++) {
        const prev = r - 1;
        const same = r < BOARD_SIZE && b[r][c] && b[prev][c] && b[r][c].type === b[prev][c].type;
        if (same) {
          run.push(r);
        } else {
          if (run.length >= 3) {
            groups.push({ dir: 'v', col: c, cells: run.map((rr) => ({ row: rr, col: c })) });
          }
          run = [r];
        }
      }
    }
    return groups;
  }

  function hasAnyMove(b) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (c < BOARD_SIZE - 1) {
          swapCells(b, r, c, r, c + 1);
          const ok = findMatchGroups(b).length > 0;
          swapCells(b, r, c, r, c + 1);
          if (ok) return true;
        }
        if (r < BOARD_SIZE - 1) {
          swapCells(b, r, c, r + 1, c);
          const ok = findMatchGroups(b).length > 0;
          swapCells(b, r, c, r + 1, c);
          if (ok) return true;
        }
      }
    }
    return false;
  }

  function swapCells(b, r1, c1, r2, c2) {
    const tmp = b[r1][c1];
    b[r1][c1] = b[r2][c2];
    b[r2][c2] = tmp;
  }

  // ---------- interaction ----------
  function isAdjacent(a, b2) {
    return (Math.abs(a.row - b2.row) === 1 && a.col === b2.col) ||
           (Math.abs(a.col - b2.col) === 1 && a.row === b2.row);
  }

  function findTilePos(tile) {
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (board[r][c] === tile) return { row: r, col: c };
    return null;
  }

  function onTileClick(tile) {
    if (boardLocked) return;
    const pos = findTilePos(tile);
    if (!pos) return;

    if (!selected) {
      selected = pos;
      tile.dom.classList.add('selected');
      return;
    }

    if (selected.row === pos.row && selected.col === pos.col) {
      tile.dom.classList.remove('selected');
      selected = null;
      return;
    }

    const selTile = board[selected.row][selected.col];
    if (isAdjacent(selected, pos)) {
      selTile.dom.classList.remove('selected');
      const from = selected;
      const to = pos;
      selected = null;
      attemptSwap(from, to);
    } else {
      selTile.dom.classList.remove('selected');
      selected = pos;
      tile.dom.classList.add('selected');
    }
  }

  function attemptSwap(a, b2) {
    boardLocked = true;
    swapCells(board, a.row, a.col, b2.row, b2.col);
    moveTileDom(board[a.row][a.col], a.row, a.col);
    moveTileDom(board[b2.row][b2.col], b2.row, b2.col);

    setTimeout(() => {
      const groups = findMatchGroups(board);
      if (groups.length === 0) {
        // revert
        swapCells(board, a.row, a.col, b2.row, b2.col);
        moveTileDom(board[a.row][a.col], a.row, a.col);
        moveTileDom(board[b2.row][b2.col], b2.row, b2.col);
        const t1 = board[a.row][a.col];
        const t2 = board[b2.row][b2.col];
        t1.dom.classList.add('shake');
        t2.dom.classList.add('shake');
        setTimeout(() => {
          t1.dom.classList.remove('shake');
          t2.dom.classList.remove('shake');
          boardLocked = false;
        }, 260);
      } else {
        resolveCascade(1, b2);
      }
    }, 230);
  }

  // ---------- resolve / cascade ----------
  function resolveCascade(cascadeLevel, lastSwapPos) {
    const groups = findMatchGroups(board);
    if (groups.length === 0) {
      boardLocked = false;
      checkStoryThreshold();
      return;
    }

    // union of matched cells
    const clearSet = new Map(); // key "r,c" -> {row,col}
    groups.forEach((g) => g.cells.forEach((cell) => clearSet.set(cell.row + ',' + cell.col, cell)));

    // decide special-tile creation: one cell per qualifying group (length>=4) is preserved & upgraded
    const specialCreations = [];
    groups.forEach((g) => {
      if (g.cells.length >= 4) {
        const kind = g.cells.length >= 5 ? 'burst' : (g.dir === 'h' ? 'line-h' : 'line-v');
        const anchor = pickAnchor(g.cells, lastSwapPos);
        specialCreations.push({ anchor, kind, type: board[anchor.row][anchor.col].type });
        clearSet.delete(anchor.row + ',' + anchor.col);
      }
    });

    // expand clear set for any special tiles caught in the match
    let expanded = true;
    let guard = 0;
    while (expanded && guard < 10) {
      expanded = false;
      guard++;
      Array.from(clearSet.values()).forEach((cell) => {
        const tile = board[cell.row][cell.col];
        if (tile && tile.special) {
          if (tile.special === 'line-h' || tile.special === 'burst') {
            for (let c = 0; c < BOARD_SIZE; c++) {
              const key = cell.row + ',' + c;
              if (!clearSet.has(key)) { clearSet.set(key, { row: cell.row, col: c }); expanded = true; }
            }
          }
          if (tile.special === 'line-v' || tile.special === 'burst') {
            for (let r = 0; r < BOARD_SIZE; r++) {
              const key = r + ',' + cell.col;
              if (!clearSet.has(key)) { clearSet.set(key, { row: r, col: cell.col }); expanded = true; }
            }
          }
        }
      });
    }

    // score
    let bonus = 0;
    groups.forEach((g) => {
      if (g.cells.length === 4) bonus += 20;
      else if (g.cells.length >= 5) bonus += 50;
    });
    const gained = clearSet.size * 10 * cascadeLevel + bonus * cascadeLevel;
    score += gained;
    updateScoreHud();

    if (cascadeLevel > 1) showCombo(cascadeLevel);

    // animate clear
    clearSet.forEach((cell) => {
      const tile = board[cell.row][cell.col];
      if (tile && tile.dom) tile.dom.classList.add('matched');
    });

    setTimeout(() => {
      // remove cleared tiles from DOM/board
      clearSet.forEach((cell) => {
        const tile = board[cell.row][cell.col];
        if (tile && tile.dom) tile.dom.remove();
        board[cell.row][cell.col] = null;
      });

      // apply special upgrades on preserved anchors
      specialCreations.forEach(({ anchor, kind, type }) => {
        const tile = board[anchor.row][anchor.col];
        if (!tile) return;
        tile.type = type;
        tile.special = kind;
        applyTileSkin(tile);
      });

      applyGravityAndRefill();

      setTimeout(() => {
        resolveCascade(cascadeLevel + 1, null);
      }, 260);
    }, 220);
  }

  function pickAnchor(cells, lastSwapPos) {
    if (lastSwapPos) {
      const hit = cells.find((c) => c.row === lastSwapPos.row && c.col === lastSwapPos.col);
      if (hit) return hit;
    }
    return cells[Math.floor(cells.length / 2)];
  }

  function applyGravityAndRefill() {
    for (let c = 0; c < BOARD_SIZE; c++) {
      let writeRow = BOARD_SIZE - 1;
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        if (board[r][c]) {
          if (r !== writeRow) {
            board[writeRow][c] = board[r][c];
            board[r][c] = null;
            moveTileDom(board[writeRow][c], writeRow, c);
          }
          writeRow--;
        }
      }
      let fillsAbove = 0;
      for (let r = writeRow; r >= 0; r--) {
        const tile = { id: nextId++, type: randType(), special: null, dom: null };
        board[r][c] = tile;
        fillsAbove++;
        const fromTop = -(fillsAbove) * STEP;
        createTileDom(tile, r, c, fromTop);
      }
    }
  }

  function showCombo(level) {
    comboPopup.textContent = `COMBO x${level}!`;
    comboPopup.classList.remove('pop');
    void comboPopup.offsetWidth;
    comboPopup.classList.add('pop');
  }

  // ---------- HUD / story threshold ----------
  function updateScoreHud() {
    scoreValueEl.textContent = score.toLocaleString();
    levelValueEl.textContent = Math.floor(score / 1000) + 1;
    const nextThreshold = (storyChaptersShown + 1) * 1000;
    const prevThreshold = storyChaptersShown * 1000;
    const into = Math.max(0, score - prevThreshold);
    const pct = Math.min(100, (into / 1000) * 100);
    storyBarFill.style.width = pct + '%';
    storyRemainEl.textContent = Math.max(0, nextThreshold - score).toLocaleString() + '점 남음';
  }

  let storyQueueRunning = false;
  function checkStoryThreshold() {
    const pending = [];
    while (score >= (storyChaptersShown + 1) * 1000) {
      pending.push(storyChaptersShown);
      storyChaptersShown++;
    }
    updateScoreHud();
    if (pending.length === 0 || storyQueueRunning) return;
    storyQueueRunning = true;
    runStoryQueue(pending).then(() => {
      storyQueueRunning = false;
    });
  }

  async function runStoryQueue(indices) {
    for (const idx of indices) {
      if (idx < GAME_CHAPTERS.length) {
        await playChapter(GAME_CHAPTERS[idx]);
      } else {
        showToast(`${(idx + 1) * 1000}점 달성!`);
        await delay(900);
      }
    }
  }

  function delay(ms) { return new Promise((res) => setTimeout(res, ms)); }

  function playChapter(chapter) {
    return new Promise((resolve) => {
      boardLocked = true;
      vnOverlay.classList.remove('hidden');
      vnBg.src = 'images/vn_bg.png';
      vnPortrait.src = chapter.portrait === 'goby'
        ? 'images/vn_portrait_goby.png'
        : 'images/vn_portrait_human.png';

      let lineIdx = 0;
      let typing = false;
      let typeTimer = null;

      function renderLine() {
        const line = chapter.lines[lineIdx];
        vnBox.classList.toggle('system', line.type === 'system');
        const speakerText =
          line.type === 'system' ? 'SYSTEM' :
          line.type === 'speech' ? '박정민' : '';
        vnSpeaker.textContent = speakerText;
        vnSpeaker.classList.toggle('empty', speakerText === '');
        vnSpeaker.classList.toggle('system-speaker', line.type === 'system');
        vnText.textContent = '';
        typing = true;
        let i = 0;
        clearInterval(typeTimer);
        typeTimer = setInterval(() => {
          i++;
          vnText.textContent = line.text.slice(0, i);
          if (i >= line.text.length) {
            clearInterval(typeTimer);
            typing = false;
          }
        }, 16);
      }

      function finish() {
        clearInterval(typeTimer);
        vnOverlay.removeEventListener('click', advance);
        vnSkip.removeEventListener('click', skip);
        document.removeEventListener('keydown', onKeydown);
        vnOverlay.classList.add('hidden');
        boardLocked = false;
        resolve();
      }

      function advance() {
        const line = chapter.lines[lineIdx];
        if (typing) {
          clearInterval(typeTimer);
          vnText.textContent = line.text;
          typing = false;
          return;
        }
        lineIdx++;
        if (lineIdx >= chapter.lines.length) {
          finish();
          return;
        }
        renderLine();
      }

      function skip(e) {
        if (e) e.stopPropagation();
        finish();
      }

      function onKeydown(e) {
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
          e.preventDefault();
          advance();
        }
      }

      vnOverlay.addEventListener('click', advance);
      vnSkip.addEventListener('click', skip);
      document.addEventListener('keydown', onKeydown);
      renderLine();
    });
  }

  let toastTimer = null;
  function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1400);
  }

  restartBtn.addEventListener('click', () => {
    if (storyQueueRunning) return;
    initGame();
  });

  async function boot() {
    initGame();
    boardLocked = true;
    await playChapter(PROLOGUE_CHAPTER);
    boardLocked = false;
  }
  boot();
})();
