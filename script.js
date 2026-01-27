const DEFAULT_TILE_SIZE = 96;
const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

const screens = {
  start: document.getElementById("screen-start"),
  game: document.getElementById("screen-game"),
  end: document.getElementById("screen-end"),
};

const boardEl = document.getElementById("board");
const trayEl = document.getElementById("tray");
const previewEl = document.getElementById("preview-image");
const levelLabelEl = document.getElementById("level-label");
const gameTitleEl = document.getElementById("game-title");
const moveCountEl = document.getElementById("move-count");
const modalEl = document.getElementById("level-modal");
const modalTitleEl = document.getElementById("modal-title");
const modalBodyEl = document.getElementById("modal-body");
const modalTextEl = document.getElementById("modal-text");
const modalMediaEl = document.getElementById("modal-media");
const modalVideoEl = document.getElementById("modal-video");
const modalEmbedEl = document.getElementById("modal-embed");

const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const nextBtn = document.getElementById("next-btn");
const replayBtn = document.getElementById("replay-btn");

const levelImages = ["./imgs/1.jpeg", "./imgs/2.jpeg", "./imgs/3.jpeg"];

const levels = [
  {
    id: 1,
    title: "Fase 1",
    image: levelImages[0],
    modalTitle: "Fase 1 concluida!",
    modalText:
      "Coloque aqui o texto de apoio da fase 1. Voce pode explicar a imagem, contar uma historia ou dar uma dica.",
    goal: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  /*
  {
    id: 2,
    title: "Fase 2",
    image: levelImages[1],
    modalTitle: "Fase 2 concluida!",
    modalText:
      "Espaco para texto e/ou video da fase 2. Use modalVideo (mp4) ou modalEmbed (iframe).",
    goal: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  */
];

let currentLevelIndex = 0;
let boardState = [];
let trayState = [];
let moves = 0;
let levelComplete = false;
let selectedTile = null;

const showScreen = (name) => {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
};

const getBoardMetrics = () => {
  const styles = getComputedStyle(boardEl);
  const tileSize =
    parseFloat(styles.getPropertyValue("--tile-size")) || DEFAULT_TILE_SIZE;
  const boardSize = tileSize * GRID_SIZE;
  return {
    boardSize,
    tileSize,
  };
};

const createTilesForLevel = (level) => {
  if (Array.isArray(level.goal) && level.goal.length === TOTAL_TILES) {
    return level.goal.slice();
  }
  return Array.from({ length: TOTAL_TILES }, (_, index) => index + 1);
};

const shuffleTiles = (tiles) => {
  const shuffled = tiles.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const updateMoveCount = () => {
  moveCountEl.textContent = moves;
};

const clearSelection = () => {
  if (selectedTile?.element) {
    selectedTile.element.classList.remove("selected");
  }
  selectedTile = null;
};

const createPiece = (tile) => {
  const level = levels[currentLevelIndex];
  const { boardSize, tileSize } = getBoardMetrics();

  const piece = document.createElement("button");
  piece.type = "button";
  piece.className = "tile";
  piece.draggable = true;
  piece.dataset.tile = tile;
  piece.setAttribute("aria-label", `Peca ${tile}`);

  const targetIndex = tile - 1;
  const targetRow = Math.floor(targetIndex / GRID_SIZE);
  const targetCol = targetIndex % GRID_SIZE;

  piece.style.backgroundImage = `url("${level.image}")`;
  piece.style.backgroundSize = `${boardSize}px ${boardSize}px`;
  piece.style.backgroundPosition = `${-targetCol * tileSize}px ${-targetRow * tileSize}px`;

  return piece;
};

const renderBoard = () => {
  boardEl.innerHTML = "";

  boardState.forEach((tile, index) => {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.index = index;
    slot.setAttribute("role", "gridcell");
    slot.setAttribute("aria-label", `Posicao ${index + 1}`);

    if (tile !== 0) {
      slot.classList.add("filled");
      slot.appendChild(createPiece(tile));
    }

    boardEl.appendChild(slot);
  });
};

const renderTray = () => {
  trayEl.innerHTML = "";
  trayEl.classList.toggle("empty", trayState.length === 0);

  trayState.forEach((tile) => {
    trayEl.appendChild(createPiece(tile));
  });
};

const isSolved = () => {
  const goal = createTilesForLevel(levels[currentLevelIndex]);
  return boardState.every((value, idx) => value === goal[idx]);
};

const checkSolved = () => {
  if (isSolved()) {
    levelComplete = true;
    boardEl.classList.add("locked");
    trayEl.classList.add("locked");
    openModal();
  }
};

const loadLevel = (index) => {
  const level = levels[index];
  currentLevelIndex = index;
  boardState = Array(TOTAL_TILES).fill(0);
  trayState = shuffleTiles(createTilesForLevel(level));
  moves = 0;
  levelComplete = false;
  clearSelection();

  levelLabelEl.textContent = `Fase ${level.id} de ${levels.length}`;
  gameTitleEl.textContent = level.title;
  updateMoveCount();
  boardEl.classList.remove("locked");
  trayEl.classList.remove("locked");

  if (previewEl) {
    previewEl.style.backgroundImage = `url("${level.image}")`;
  }
  closeModal();

  renderBoard();
  renderTray();
};

const getDragData = (event) => {
  const raw =
    event.dataTransfer.getData("application/json") ||
    event.dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const placeTile = (dragData, destinationIndex) => {
  if (levelComplete) return;

  const { tile, from, index } = dragData;
  const destinationTile = boardState[destinationIndex];
  const sourceIndex = from === "board" ? Number(index) : null;

  if (from === "board" && sourceIndex === destinationIndex) return;

  if (from === "tray") {
    const trayIndex = trayState.indexOf(tile);
    if (trayIndex === -1) return;
    trayState.splice(trayIndex, 1);
  } else if (from === "board") {
    if (Number.isNaN(sourceIndex)) return;
    boardState[sourceIndex] = 0;
  }

  if (destinationTile !== 0) {
    if (from === "board" && sourceIndex !== null) {
      boardState[sourceIndex] = destinationTile;
    } else {
      trayState.push(destinationTile);
    }
  }

  boardState[destinationIndex] = tile;
  moves += 1;
  updateMoveCount();
  renderBoard();
  renderTray();
  clearSelection();
  checkSolved();
};

const moveToTray = (dragData) => {
  if (levelComplete) return;

  const { tile, from, index } = dragData;
  if (from === "tray") return;

  const sourceIndex = Number(index);
  if (Number.isNaN(sourceIndex)) return;

  boardState[sourceIndex] = 0;
  trayState.push(tile);
  moves += 1;
  updateMoveCount();
  renderBoard();
  renderTray();
  clearSelection();
};

const openModal = () => {
  const level = levels[currentLevelIndex];
  modalTitleEl.textContent = level.modalTitle ?? `${level.title} concluida!`;
  modalTextEl.textContent =
    level.modalText ??
    "Parabens! Voce concluiu a fase. Ajuste este texto no JSON das fases.";

  const hasEmbed = Boolean(level.modalEmbed);
  const hasVideo = Boolean(level.modalVideo);

  modalEmbedEl.innerHTML = "";
  modalVideoEl.pause();
  modalVideoEl.removeAttribute("src");

  const hasMedia = hasEmbed || hasVideo;
  modalBodyEl.classList.toggle("single", !hasMedia);

  if (hasEmbed) {
    modalEmbedEl.innerHTML = level.modalEmbed;
    modalEmbedEl.classList.remove("hidden");
    modalVideoEl.classList.add("hidden");
    modalMediaEl.classList.remove("hidden");
  } else if (hasVideo) {
    modalVideoEl.src = level.modalVideo;
    modalVideoEl.classList.remove("hidden");
    modalEmbedEl.classList.add("hidden");
    modalMediaEl.classList.remove("hidden");
  } else {
    modalEmbedEl.classList.add("hidden");
    modalVideoEl.classList.add("hidden");
    modalMediaEl.classList.add("hidden");
  }

  nextBtn.textContent =
    currentLevelIndex >= levels.length - 1 ? "Finalizar" : "Proxima fase";
  modalEl.classList.remove("hidden");
};

const closeModal = () => {
  modalEl.classList.add("hidden");
  modalVideoEl.pause();
  modalVideoEl.removeAttribute("src");
  modalEmbedEl.innerHTML = "";
};

const handleDragStart = (event) => {
  if (levelComplete) return;
  const piece = event.target.closest(".tile");
  if (!piece) return;

  const tile = Number(piece.dataset.tile);
  const slot = piece.closest(".slot");
  const data = {
    tile,
    from: slot ? "board" : "tray",
    index: slot ? Number(slot.dataset.index) : null,
  };

  event.dataTransfer.setData("text/plain", JSON.stringify(data));
  event.dataTransfer.effectAllowed = "move";
  piece.classList.add("dragging");
};

const handleDragEnd = (event) => {
  const piece = event.target.closest(".tile");
  if (piece) piece.classList.remove("dragging");
};

boardEl.addEventListener("dragover", (event) => {
  if (levelComplete) return;
  const slot = event.target.closest(".slot");
  if (!slot) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

boardEl.addEventListener("dragenter", (event) => {
  const slot = event.target.closest(".slot");
  if (!slot) return;
  slot.classList.add("over");
});

boardEl.addEventListener("dragleave", (event) => {
  const slot = event.target.closest(".slot");
  if (!slot) return;
  slot.classList.remove("over");
});

boardEl.addEventListener("drop", (event) => {
  const slot = event.target.closest(".slot");
  if (!slot) return;
  event.preventDefault();
  slot.classList.remove("over");
  const data = getDragData(event);
  if (!data) return;
  placeTile(data, Number(slot.dataset.index));
});

trayEl.addEventListener("dragover", (event) => {
  if (levelComplete) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

trayEl.addEventListener("drop", (event) => {
  event.preventDefault();
  const data = getDragData(event);
  if (!data) return;
  moveToTray(data);
});

boardEl.addEventListener("dragstart", handleDragStart);
trayEl.addEventListener("dragstart", handleDragStart);
boardEl.addEventListener("dragend", handleDragEnd);
trayEl.addEventListener("dragend", handleDragEnd);

boardEl.addEventListener("click", (event) => {
  if (levelComplete) return;
  const piece = event.target.closest(".tile");
  if (piece) {
    clearSelection();
    piece.classList.add("selected");
    const slot = piece.closest(".slot");
    selectedTile = {
      tile: Number(piece.dataset.tile),
      from: slot ? "board" : "tray",
      index: slot ? Number(slot.dataset.index) : null,
      element: piece,
    };
    return;
  }

  const slot = event.target.closest(".slot");
  if (slot && selectedTile) {
    placeTile(selectedTile, Number(slot.dataset.index));
  }
});

trayEl.addEventListener("click", (event) => {
  if (levelComplete) return;
  const piece = event.target.closest(".tile");
  if (piece) {
    clearSelection();
    piece.classList.add("selected");
    selectedTile = {
      tile: Number(piece.dataset.tile),
      from: "tray",
      index: null,
      element: piece,
    };
  } else {
    clearSelection();
  }
});

startBtn.addEventListener("click", () => {
  showScreen("game");
  loadLevel(0);
});

restartBtn.addEventListener("click", () => {
  loadLevel(currentLevelIndex);
});

nextBtn.addEventListener("click", () => {
  closeModal();
  const nextIndex = currentLevelIndex + 1;
  if (nextIndex >= levels.length) {
    showScreen("end");
    return;
  }
  loadLevel(nextIndex);
});

replayBtn.addEventListener("click", () => {
  showScreen("start");
});

window.addEventListener("resize", () => {
  if (screens.game.classList.contains("active")) {
    renderBoard();
    renderTray();
  }
});

showScreen("start");
