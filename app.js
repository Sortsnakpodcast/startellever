const formations = {
  "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "DM", "DM", "AM", "RW", "ST", "LW"],
  "3-5-2": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "AM", "ST", "ST"],
  "4-3-3": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "RW", "ST", "LW"],
  "3-4-3": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "LW", "ST", "RW"],
  "4-4-2": ["GK", "RB", "CB", "CB", "LB", "LM", "CM", "CM", "RM", "ST", "ST"]
};

const formationLayouts = {
  "4-3-3": [[46, 84], [78, 68], [57, 70], [35, 70], [14, 68], [68, 51], [46, 55], [24, 51], [78, 24], [46, 18], [14, 24]],
  "4-2-3-1": [[46, 84], [78, 68], [57, 70], [35, 70], [14, 68], [57, 56], [35, 56], [46, 36], [78, 28], [46, 17], [14, 28]],
  "3-5-2": [[46, 84], [70, 68], [46, 71], [22, 68], [12, 51], [34, 55], [58, 55], [80, 51], [46, 35], [36, 18], [56, 18]],
  "3-4-3": [[46, 84], [70, 68], [46, 71], [22, 68], [12, 52], [34, 56], [58, 56], [80, 52], [14, 24], [46, 18], [78, 24]],
  "4-4-2": [[46, 84], [78, 68], [57, 70], [35, 70], [14, 68], [12, 51], [34, 55], [58, 55], [80, 51], [36, 18], [56, 18]]
};

const shareFormationLayouts = {
  "4-3-3": [[50, 88], [82, 72], [61, 73], [39, 73], [18, 72], [72, 54], [50, 58], [28, 54], [82, 27], [50, 20], [18, 27]],
  "4-2-3-1": [[50, 88], [82, 72], [61, 73], [39, 73], [18, 72], [61, 59], [39, 59], [50, 41], [82, 31], [50, 20], [18, 31]],
  "3-5-2": [[50, 88], [73, 72], [50, 75], [27, 72], [14, 54], [38, 58], [62, 58], [86, 54], [50, 39], [40, 21], [60, 21]],
  "3-4-3": [[50, 88], [73, 72], [50, 75], [27, 72], [14, 55], [38, 59], [62, 59], [86, 55], [18, 27], [50, 20], [82, 27]],
  "4-4-2": [[50, 88], [82, 72], [61, 73], [39, 73], [18, 72], [14, 54], [38, 58], [62, 58], [86, 54], [40, 21], [60, 21]]
};

const roleChains = {
  keeper: ["GK"],
  defense: ["RB", "CB", "LB"],
  midfield: ["LM", "RM", "DM", "CM", "AM"],
  attack: ["LW", "RW", "ST"]
};

const roleChainByRole = Object.fromEntries(
  Object.entries(roleChains).flatMap(([chain, roles]) => roles.map((role) => [role, chain]))
);

const importedPlayers = window.FCM_PLAYERS_DATA?.players || [];
const seasons = Object.values(importedPlayers.reduce((groups, player) => {
  groups[player.season] ||= { label: player.season, sourceSeason: player.sourceSeason, players: [] };
  groups[player.season].players.push(player);
  return groups;
}, {})).sort((a, b) => a.label.localeCompare(b.label));
const seasonLabels = seasons.map((season) => season.label);
const seasonRangeLabel = seasonLabels.length ? `${seasonLabels[0]}-${seasonLabels[seasonLabels.length - 1]}` : "Ingen data";
const highscoreStorageKey = "sort-snak-fcm-cup-highscores-v1";
const supabaseTable = "startellever_teams";
const cupRevealDelay = 1150;
const cupResultDelay = 1350;
const goldCupWins = 10;
const cupRounds = ["1. runde", "2. runde", "3. runde", "4. runde", "5. runde", "6. runde", "Kvartfinale", "Semifinale", "Finale", "Superfinale"];

const coaches = [
  { id: "ove", period: "1999-2002", name: "Ove Pedersen", tag: "Guldgraveren", effect: "lowPlayers" },
  { id: "troels", period: "2002-2003", name: "Troels Bech", tag: "Strategen", effect: "gapCloser" },
  { id: "erik", period: "2004-2008", name: "Erik Rasmussen", tag: "All out attack", effect: "attackBoost" },
  { id: "thomasberg-442", period: "2008-2009", name: "Thomas Thomasberg", tag: "Fantastiske 442", effect: "formation442" },
  { id: "kuhn", period: "2009-2011", name: "Allan Kuhn", tag: "Balancemesteren", effect: "balance" },
  { id: "glen", period: "2011-2015", name: "Glen Riddersholm", tag: "Glens drenge", effect: "eraBoost" },
  { id: "thorup", period: "2015-2018", name: "Jess Thorup", tag: "Magiske 3-5-2", effect: "formation352" },
  { id: "kenneth", period: "2018-2019", name: "Kenneth Andersen", tag: "Firmaets mand", effect: "damageControl" },
  { id: "priske", period: "2019-2021", name: "Brian Priske", tag: "\"We expect more\"", effect: "earlyRounds" },
  { id: "bo", period: "2021-2022", name: "Bo Henriksen", tag: "KAOS-bold", effect: "chaos" },
  { id: "capellas", period: "2022-2023", name: "Albert Capellas", tag: "\"Fasten your seatbelts\"", effect: "riskReward" },
  { id: "thomasberg-ingame", period: "2023-2025", name: "Thomas Thomasberg", tag: "Ingame management", effect: "comeback" },
  { id: "tullberg", period: "2025-", name: "Mike Tullberg", tag: "Motivatoren", effect: "teamBoost" }
];

let state = {
  started: false,
  formationName: "4-2-3-1",
  slots: [],
  picked: [],
  currentSeason: null,
  lastSeasonLabel: null,
  seasonDrawCounts: {},
  selectedPlayerId: null,
  roundSlotId: null,
  lastPlacedSlotId: null,
  coachOptions: [],
  selectedCoachId: null,
  shareClaimCode: "",
  shareTeamName: "",
  shareCoachName: "",
  complete: false
};
let activeCup = null;
let supabaseClient = null;
let remoteHighscores = [];
let remoteHighscoresLoaded = false;
let formationOrder = [];

const els = {
  startOverlay: document.querySelector("#startOverlay"),
  startFormationSelect: document.querySelector("#startFormationSelect"),
  startGameButton: document.querySelector("#startGameButton"),
  formationSelect: document.querySelector("#formationSelect"),
  newGameButton: document.querySelector("#newGameButton"),
  rollButton: document.querySelector("#rollButton"),
  gameLayout: document.querySelector(".game-layout"),
  pitchWrap: document.querySelector(".pitch-wrap"),
  pitch: document.querySelector("#pitch"),
  miniPitchCard: document.querySelector("#miniPitchCard"),
  miniPitch: document.querySelector("#miniPitch"),
  seasonCard: document.querySelector("#seasonCard"),
  drawTitle: document.querySelector("#drawTitle"),
  drawSubtitle: document.querySelector("#drawSubtitle"),
  seasonRange: document.querySelector("#seasonRange"),
  draftOptions: document.querySelector("#draftOptions"),
  resultPanel: document.querySelector("#resultPanel"),
  pickCount: document.querySelector("#pickCount"),
  avgScore: document.querySelector("#avgScore"),
  bestScore: document.querySelector("#bestScore"),
  seasonScore: document.querySelector("#seasonScore")
};

function init() {
  shuffleFormationOrder();
  populateFormationSelects(formationOrder[0]);

  els.formationSelect.addEventListener("change", () => {
    if (!state.started) resetGame(els.formationSelect.value, false);
  });
  els.startFormationSelect.addEventListener("change", () => resetGame(els.startFormationSelect.value, false));
  els.startGameButton.addEventListener("click", startGame);
  els.newGameButton.addEventListener("click", startNewGame);
  els.rollButton.addEventListener("click", rollSeason);
  els.seasonCard.addEventListener("click", handleSeasonCardClick);
  resetGame(formationOrder[0], false);
}

function handleSeasonCardClick() {
  if (state.complete) {
    scrollToTournament();
    return;
  }
  rollSeason();
}

function scrollToTournament() {
  openTournamentModal();
}

function shuffleFormationOrder() {
  formationOrder = [...Object.keys(formations)];
  for (let index = formationOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [formationOrder[index], formationOrder[swapIndex]] = [formationOrder[swapIndex], formationOrder[index]];
  }
}

function populateFormationSelects(selectedFormation = formationOrder[0]) {
  [els.formationSelect, els.startFormationSelect].forEach((select) => {
    select.innerHTML = "";
    formationOrder.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.append(option);
    });
    select.value = selectedFormation;
  });
}

function startNewGame() {
  shuffleFormationOrder();
  populateFormationSelects(formationOrder[0]);
  resetGame(formationOrder[0], false);
}

function startGame() {
  resetGame(els.startFormationSelect.value, true);
  rollSeason();
}

function resetGame(formationName, started = state.started) {
  clearCupTimers();
  closeHighscoreTeamModal();
  activeCup = null;
  document.body.classList.remove("tournament-modal-open");
  state = {
    started,
    formationName,
    slots: formations[formationName].map((role, index) => ({ id: `${role}-${index}`, role, player: null })),
    picked: [],
    currentSeason: null,
    lastSeasonLabel: null,
    seasonDrawCounts: {},
    selectedPlayerId: null,
    roundSlotId: null,
    lastPlacedSlotId: null,
    shareClaimCode: "",
    shareTeamName: "",
    shareCoachName: "",
    complete: false
  };
  els.formationSelect.value = formationName;
  els.startFormationSelect.value = formationName;
  els.formationSelect.disabled = started;
  els.rollButton.disabled = !started;
  els.rollButton.innerHTML = `<span aria-hidden="true">⚄</span> Træk sæson`;
  els.startOverlay.hidden = started;
  els.resultPanel.hidden = true;
  els.resultPanel.innerHTML = "";
  els.drawTitle.textContent = started ? "Træk første sæson" : "Klar til start";
  els.drawSubtitle.textContent = seasonRangeLabel;
  render();
}

function slotCoordinate(index) {
  return formationSlotCoordinate(state.formationName, index);
}

function shareSlotCoordinate(index) {
  return shareFormationLayouts[state.formationName]?.[index] || slotCoordinate(index);
}

function formationSlotCoordinate(formationName, index) {
  return formationLayouts[formationName]?.[index] || [50, 50];
}

function renderPitch() {
  const selectedPlayer = getSelectedPlayer();
  const selectedSlotIds = new Set(compatibleSlots(selectedPlayer).map((slot) => slot.id));
  els.pitch.innerHTML = "";

  state.slots.forEach((slot, index) => {
    const [x, y] = slotCoordinate(index);
    const isTarget = Boolean(selectedPlayer && selectedSlotIds.has(slot.id) && (!isPicked(selectedPlayer) || isCurrentRoundPlayer(selectedPlayer)));
    const isRoundPick = state.roundSlotId === slot.id;
    const isLiftedRoundPick = Boolean(isRoundPick && selectedPlayer?.id === slot.player?.id);
    const node = document.createElement("button");
    node.className = `slot ${slot.player ? "" : "open"} ${isTarget ? "target" : ""} ${isRoundPick ? "editable" : ""} ${isLiftedRoundPick ? "moving" : ""}`;
    node.type = "button";
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.disabled = !isTarget;
    node.innerHTML = slot.player
      ? `<span class="rating">${slot.player.score}</span><strong>${slot.player.name}</strong><small>${isRoundPick ? isLiftedRoundPick ? "vælg ny plads" : "flyt" : `${slot.role} · ${slot.player.season}`}</small>`
      : `<strong>${slot.role}</strong><small>${isTarget ? "vælg her" : "ledig"}</small>`;
    if (isTarget) {
      node.addEventListener("click", () => pickPlayer(selectedPlayer.id, slot.id));
    } else if (isRoundPick) {
      node.disabled = false;
      node.addEventListener("click", liftRoundPick);
    }
    els.pitch.append(node);
  });
}

function renderMiniPitch() {
  els.miniPitchCard.hidden = !state.started || state.complete;
  if (els.miniPitchCard.hidden) {
    els.miniPitch.innerHTML = "";
    return;
  }

  els.miniPitch.innerHTML = "";
  state.slots.forEach((slot, index) => {
    const [x, y] = slotCoordinate(index);
    const node = document.createElement("div");
    node.className = `mini-slot ${slot.player ? "filled" : ""} ${state.lastPlacedSlotId === slot.id ? "recent" : ""}`;
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.innerHTML = slot.player
      ? `<strong>${slot.player.score}</strong><span>${playerInitials(slot.player.name)}</span>`
      : `<span>${slot.role}</span>`;
    els.miniPitch.append(node);
  });
}

function rollSeason() {
  if (!state.started || state.complete) return;
  if (state.currentSeason) {
    if (!state.roundSlotId) return;
    lockRoundPick();
    if (state.slots.every((slot) => slot.player)) {
      finishGame();
      render();
      return;
    }
  }
  if (!seasons.length) {
    els.drawTitle.textContent = "Ingen data";
    els.drawSubtitle.textContent = "Tjek players-data.js";
    return;
  }
  const viableSeasons = seasons.filter((season) => season.players.some((player) => {
    return !isPicked(player) && compatibleSlots(player, season).length;
  }));
  const cappedViableSeasons = viableSeasons.filter((season) => (state.seasonDrawCounts[season.label] || 0) < 2);
  const seasonPool = cappedViableSeasons.length
    ? cappedViableSeasons
    : viableSeasons.length
      ? viableSeasons
      : seasons.filter((season) => (state.seasonDrawCounts[season.label] || 0) < 2);
  if (!seasonPool.length) {
    els.drawTitle.textContent = "Ingen sæsoner tilbage";
    els.drawSubtitle.textContent = "Start et nyt spil";
    return;
  }
  const nonRepeatPool = seasonPool.filter((season) => season.label !== state.lastSeasonLabel);
  state.currentSeason = randomItem(nonRepeatPool.length ? nonRepeatPool : seasonPool);
  state.lastSeasonLabel = state.currentSeason.label;
  state.seasonDrawCounts[state.currentSeason.label] = (state.seasonDrawCounts[state.currentSeason.label] || 0) + 1;
  state.selectedPlayerId = null;
  state.lastPlacedSlotId = null;
  els.drawTitle.textContent = state.currentSeason.label;
  els.drawSubtitle.textContent = "Vælg en spiller fra listen";
  els.rollButton.disabled = true;
  render();
}

function getSelectedPlayer() {
  return state.currentSeason?.players.find((player) => player.id === state.selectedPlayerId) || null;
}

function selectPlayer(playerId) {
  const player = state.currentSeason?.players.find((item) => item.id === playerId);
  const slots = compatibleSlots(player);
  if (!player || (isPicked(player) && !isCurrentRoundPlayer(player)) || !slots.length) return;
  if (state.roundSlotId && !isCurrentRoundPlayer(player)) {
    clearRoundPickSlot();
  }
  const autoSlot = automaticSlotChoice(slots);
  if (autoSlot) {
    pickPlayer(player.id, autoSlot.id);
    return;
  }
  state.selectedPlayerId = player.id;
  render();
}

function automaticSlotChoice(slots) {
  if (slots.length === 1) return slots[0];
  const roles = new Set(slots.map((slot) => slot.role));
  return roles.size === 1 ? slots[0] : null;
}

function slotRoleChoices(slots) {
  const choices = [];
  const seenRoles = new Set();
  slots.forEach((slot) => {
    if (seenRoles.has(slot.role)) return;
    seenRoles.add(slot.role);
    choices.push(slot);
  });
  return choices;
}

function liftRoundPick() {
  if (!state.roundSlotId) return;
  const slot = state.slots.find((item) => item.id === state.roundSlotId);
  if (!slot?.player) return;
  state.selectedPlayerId = slot.player.id;
  render();
}

function compatibleSlots(player, season = state.currentSeason) {
  if (!player) return [];
  const useEmergencySlots = shouldUseEmergencySlots(season);
  return state.slots.map((slot) => {
    const canUseSlot = !slot.player || slot.id === state.roundSlotId;
    if (!canUseSlot) return null;
    if (player.positions.includes(slot.role)) return { ...slot, emergency: false };
    if (useEmergencySlots && canUseEmergencySlot(player, slot)) return { ...slot, emergency: true };
    return null;
  }).filter(Boolean);
}

function shouldUseEmergencySlots(season) {
  if (!season) return false;
  const openSlots = state.slots.filter((slot) => !slot.player || slot.id === state.roundSlotId);
  return !season.players.some((candidate) => {
    if (isPicked(candidate) && !isCurrentRoundPlayer(candidate)) return false;
    return openSlots.some((slot) => candidate.positions.includes(slot.role));
  });
}

function canUseEmergencySlot(player, slot) {
  const slotChain = roleChainByRole[slot.role];
  if (!slotChain || slotChain === "keeper") return false;
  return player.positions.some((position) => roleChainByRole[position] === slotChain);
}

function isPicked(player) {
  return state.picked.includes(playerKey(player));
}

function playerKey(player) {
  return player.name.trim().toLowerCase();
}

function pickPlayer(playerId, slotId) {
  const player = state.currentSeason?.players.find((item) => item.id === playerId);
  const slot = state.slots.find((item) => item.id === slotId);
  const validSlot = compatibleSlots(player).some((candidate) => candidate.id === slot.id);
  if (!player || !slot || (slot.player && slot.id !== state.roundSlotId) || (isPicked(player) && !isCurrentRoundPlayer(player)) || !validSlot) return;

  clearRoundPickSlot();
  slot.player = player;
  if (!state.picked.includes(playerKey(player))) {
    state.picked.push(playerKey(player));
  }
  state.roundSlotId = slot.id;
  state.lastPlacedSlotId = slot.id;
  state.selectedPlayerId = null;
  els.drawSubtitle.textContent = `${state.slots.filter((item) => item.player).length}/11 valgt`;
  els.rollButton.disabled = false;

  render();
}

function isCurrentRoundPlayer(player) {
  const slot = state.slots.find((item) => item.id === state.roundSlotId);
  return Boolean(slot?.player?.id === player.id);
}

function removeRoundPick() {
  if (!state.roundSlotId) return;
  clearRoundPickSlot();
  if (state.currentSeason) {
    state.selectedPlayerId = null;
    state.lastPlacedSlotId = null;
    els.drawSubtitle.textContent = "Vælg en spiller fra listen";
  }
}

function clearRoundPickSlot() {
  if (!state.roundSlotId) return;
  const slot = state.slots.find((item) => item.id === state.roundSlotId);
  if (slot?.player) {
    state.picked = state.picked.filter((key) => key !== playerKey(slot.player));
    slot.player = null;
  }
  state.roundSlotId = null;
}

function lockRoundPick() {
  state.currentSeason = null;
  state.selectedPlayerId = null;
  state.roundSlotId = null;
  state.lastPlacedSlotId = null;
  els.drawTitle.textContent = "Træk næste sæson";
  els.drawSubtitle.textContent = `${state.slots.filter((item) => item.player).length}/11 valgt`;
}

function playerInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function renderDraft() {
  els.draftOptions.innerHTML = "";
  els.draftOptions.classList.toggle("compact", !state.currentSeason && !state.complete);

  if (state.complete) {
    return;
  }

  if (!state.currentSeason) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.started
      ? "Klik på sæsonkortet for at trække næste sæson."
      : "Vælg formation og start spillet.";
    els.draftOptions.append(empty);
    return;
  }

  const sortedPlayers = [...state.currentSeason.players].sort((a, b) => b.score - a.score);
  sortedPlayers.forEach((player) => {
    const slots = compatibleSlots(player);
    const alreadyPicked = isPicked(player);
    const isRoundPlayer = state.roundSlotId && state.slots.find((slot) => slot.id === state.roundSlotId)?.player?.id === player.id;
    const isSelected = state.selectedPlayerId === player.id;
    const card = document.createElement("article");
    const canUsePlayer = slots.length && (!alreadyPicked || isRoundPlayer);
    card.className = `player-card ${canUsePlayer ? "" : "blocked"} ${isSelected || isRoundPlayer ? "selected" : ""}`;
    const autoSlot = automaticSlotChoice(slots);
    const availableRoles = !alreadyPicked ? slotRoleChoices(slots).map((slot) => slot.role) : [];
    const status = alreadyPicked
      ? isRoundPlayer ? "Valgt i denne runde" : "Allerede valgt"
      : isSelected
        ? "Klik en oplyst plads"
        : slots.length
        ? ""
        : "Ingen ledig position";
    const number = player.number ? `#${player.number}` : "";
    card.innerHTML = `
      <div class="player-list-row">
        <span class="player-number">${number}</span>
        <div class="player-main">
          <h3>${player.name}</h3>
          <div class="player-meta-line">
            ${status ? `<span class="player-status">${status}</span>` : ""}
            ${availableRoles.map((role) => `<span class="available-role">${role}</span>`).join("")}
          </div>
        </div>
        <strong class="player-positions">${player.positions.join("/")}</strong>
        <strong class="rating-badge ${player.score >= 91 ? "elite" : ""}">${player.score}</strong>
      </div>
    `;

    const row = document.createElement("div");
    row.className = `pick-row ${isSelected && canUsePlayer && !isRoundPlayer ? "placement" : ""}`;
    const button = document.createElement("button");
    button.className = "pick-button";
    button.type = "button";
    button.textContent = isRoundPlayer ? "Fjern valg" : alreadyPicked ? "Valgt" : isSelected ? "Vises på banen" : autoSlot ? "Vælg" : slots.length ? "Vis pladser" : "Ingen ledig plads";
    button.disabled = !canUsePlayer;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isRoundPlayer) {
        removeRoundPick();
        render();
      } else {
        selectPlayer(player.id);
      }
    });
    if (canUsePlayer && !isRoundPlayer) {
      card.addEventListener("click", () => selectPlayer(player.id));
    }

    if (isSelected && canUsePlayer && !isRoundPlayer) {
      const placementLabel = document.createElement("span");
      placementLabel.className = "placement-label";
      placementLabel.textContent = "Vælg position";
      row.append(placementLabel);
      const slotChoices = document.createElement("div");
      slotChoices.className = "slot-choices";
      slotRoleChoices(slots).forEach((slot) => {
        const slotButton = document.createElement("button");
        slotButton.className = "slot-choice-button";
        slotButton.type = "button";
        slotButton.textContent = slot.role;
        slotButton.addEventListener("click", (event) => {
          event.stopPropagation();
          pickPlayer(player.id, slot.id);
        });
        slotChoices.append(slotButton);
      });
      row.append(slotChoices);
    } else {
      row.append(button);
    }
    card.append(row);
    els.draftOptions.append(card);
  });
}

function finishGame() {
  state.complete = true;
  state.coachOptions = drawCoachOptions();
  state.selectedCoachId = null;
  state.shareClaimCode = state.shareClaimCode || generateClaimCode();
  state.shareTeamName = "";
  state.shareCoachName = "";
  const scores = calculateScores();
  els.rollButton.disabled = true;
  els.rollButton.innerHTML = `<span aria-hidden="true">✓</span> Færdig`;
  els.drawTitle.textContent = `Startellever færdig - din score er ${scores.total}`;
  els.drawSubtitle.textContent = "Del dit hold på SoMe";
  updateSeasonCardState();
  els.resultPanel.hidden = false;
  els.resultPanel.innerHTML = `
    <canvas id="shareCanvas" class="share-canvas" width="1080" height="1350" aria-label="Delbart billede af opstilling"></canvas>
    <div class="share-actions">
      <button id="downloadImageButton" class="primary-button" type="button">
        <span aria-hidden="true">⇩</span>
        Hent SoMe-billede
      </button>
      <button id="shareImageButton" class="pick-button" type="button">
        <span aria-hidden="true">↗</span>
        Del billede
      </button>
    </div>
    <section class="tournament-card" aria-labelledby="tournamentTitle">
      <button id="closeTournamentModal" class="modal-close" type="button" aria-label="Luk turnering">×</button>
      <div>
        <p class="eyebrow">Turnering</p>
        <h3 id="tournamentTitle">Din score er ${scores.total}/100</h3>
        <p>Vælg en træner og spil turnering mod andre. Valget af træner kan få betydning for turneringen.</p>
      </div>
      <div class="coach-draft" aria-label="Vælg træner til turneringen">
        ${renderCoachCards()}
      </div>
      <form id="tournamentForm" class="tournament-form">
        <input id="tournamentName" name="name" type="text" maxlength="18" autocomplete="name" placeholder="Navn eller holdnavn" required>
        <button class="primary-button" type="submit" disabled>
          <span aria-hidden="true">CUP</span>
          Start turnering
        </button>
      </form>
      <div id="cupResult" class="cup-result"></div>
      <div class="tournament-board">
        <h4>Turneringens highscore</h4>
        <ol id="tournamentHighscoreList" class="tournament-highscore-list"></ol>
      </div>
    </section>
  `;

  document.querySelector("#downloadImageButton").addEventListener("click", downloadShareImage);
  document.querySelector("#shareImageButton").addEventListener("click", shareLineupImage);
  document.querySelectorAll(".coach-card").forEach((button) => button.addEventListener("click", selectCoach));
  document.querySelector("#tournamentForm").addEventListener("submit", (event) => startCupTournament(event, scores));
  document.querySelector("#closeTournamentModal").addEventListener("click", closeTournamentModal);
  renderTournamentHighscores();
  renderShareCanvas(scores);
}

function drawCoachOptions() {
  return [...coaches]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

function renderCoachCards() {
  return state.coachOptions.map((coach) => `
    <button class="coach-card" type="button" data-coach-id="${coach.id}" aria-pressed="false">
      <span>${coach.period}</span>
      <strong>${coach.name}</strong>
      <small>${coach.tag}</small>
    </button>
  `).join("");
}

function selectCoach(event) {
  const coachId = event.currentTarget.dataset.coachId;
  state.selectedCoachId = coachId;
  document.querySelectorAll(".coach-card").forEach((card) => {
    const selected = card.dataset.coachId === coachId;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
  const submit = document.querySelector("#tournamentForm button");
  if (submit) submit.disabled = false;
}

function selectedCoach() {
  return coaches.find((coach) => coach.id === state.selectedCoachId) || null;
}

function openTournamentModal() {
  const card = document.querySelector(".tournament-card");
  if (!card) return;
  card.classList.add("in-modal");
  document.body.classList.add("tournament-modal-open");
  const nameInput = document.querySelector("#tournamentName");
  if (nameInput && !nameInput.closest("form")?.hidden) {
    nameInput.focus({ preventScroll: true });
  }
}

function closeTournamentModal() {
  closeHighscoreTeamModal();
  document.querySelector(".tournament-card")?.classList.remove("in-modal");
  document.body.classList.remove("tournament-modal-open");
}

function calculateScores() {
  const pickedPlayers = state.slots.map((slot) => slot.player);
  const averageScore = Math.round(average(pickedPlayers.map((player) => player.score)));
  const best = Math.max(...pickedPlayers.map((player) => player.score));
  const seasons = new Set(pickedPlayers.map((player) => player.season)).size;
  const total = averageScore;

  return { average: averageScore, best, seasons, total };
}

function getHighscores() {
  try {
    const scores = JSON.parse(localStorage.getItem(highscoreStorageKey) || "[]");
    return Array.isArray(scores) ? scores : [];
  } catch {
    return [];
  }
}

function getAllHighscores() {
  const entries = isSupabaseReady() ? remoteHighscores : getHighscores();
  return [...entries]
    .filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index)
    .sort(compareTournamentEntries);
}

function setHighscores(scores) {
  localStorage.setItem(highscoreStorageKey, JSON.stringify(scores.slice(0, 20)));
}

async function saveHighscore(name, scores, cupStats) {
  const team = createTeamFromSlots(name, state.formationName, state.slots);
  let entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    claimCode: state.shareClaimCode,
    score: scores.total,
    average: scores.average,
    best: scores.best,
    formation: state.formationName,
    lineup: serializeLineup(team.lineup),
    cupWins: cupStats.wins,
    cupRounds: cupStats.rounds,
    goalsFor: cupStats.goalsFor,
    goalsAgainst: cupStats.goalsAgainst,
    goalDiff: cupStats.goalDiff,
    wonCup: cupStats.wonCup,
    createdAt: new Date().toISOString()
  };
  const highscores = [entry, ...getHighscores()]
    .sort(compareTournamentEntries);
  setHighscores(highscores);
  const remoteRecord = await saveRemoteTeam(name, scores, cupStats).catch(() => null);
  if (remoteRecord?.id) {
    state.shareTeamName = name;
    state.shareCoachName = selectedCoach() ? `Træner: ${selectedCoach().name}` : "";
    entry = { ...entry, id: remoteRecord.id };
    remoteHighscores = [entry, ...remoteHighscores]
      .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
      .sort(compareTournamentEntries)
      .slice(0, 20);
    remoteHighscoresLoaded = true;
    await renderShareCanvas(scores);
  } else {
    remoteHighscoresLoaded = false;
  }
  return entry;
}

function generateClaimCode() {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(6);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function compareTournamentEntries(a, b) {
  return (b.cupWins || 0) - (a.cupWins || 0)
    || (b.goalDiff || 0) - (a.goalDiff || 0)
    || (b.goalsFor || 0) - (a.goalsFor || 0)
    || (b.score || 0) - (a.score || 0)
    || (b.best || 0) - (a.best || 0)
    || String(a.createdAt).localeCompare(String(b.createdAt));
}

async function startCupTournament(event, scores) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector("#tournamentName");
  const name = input.value.trim().slice(0, 18);
  const coach = selectedCoach();
  if (!name || !coach) return;

  const result = document.querySelector("#cupResult");
  const submit = form.querySelector("button");
  if (submit) {
    submit.disabled = true;
    submit.innerHTML = `<span aria-hidden="true">CUP</span> Henter modstandere`;
  }
  const userTeam = createTeamFromSlots(name, state.formationName, state.slots);
  const opponentSetup = await getCupOpponents();
  if (!opponentSetup.remoteTeams.length) {
    result.innerHTML = `<div class="cup-summary loss"><strong>Ingen brugerhold fundet</strong><span>Prøv igen om lidt.</span></div>`;
    if (submit) {
      submit.disabled = false;
      submit.innerHTML = `<span aria-hidden="true">CUP</span> Start turnering`;
    }
    return;
  }
  activeCup = {
    name,
    scores,
    coach,
    coachState: {},
    userTeam,
    opponents: opponentSetup.opponents,
    remoteOpponentPool: opponentSetup.remoteTeams,
    usedOpponentIds: new Set(),
    matches: [],
    nextRoundIndex: 0,
    timers: [],
    finished: false
  };
  form.hidden = true;
  collapseCoachDraft(coach);
  result.innerHTML = "";
  openTournamentModal();
  renderCupNextMatch();
}

function collapseCoachDraft(coach) {
  const coachDraft = document.querySelector(".coach-draft");
  if (!coachDraft || !coach) return;
  coachDraft.classList.add("collapsed");
  coachDraft.innerHTML = `
    <div class="selected-coach-summary">
      <span>Valgt træner</span>
      <strong>${coach.name}</strong>
      <small>${coach.period} · ${coach.tag}</small>
    </div>
  `;
}

function renderCupNextMatch() {
  const result = document.querySelector("#cupResult");
  if (!activeCup || !result) return;
  clearCupTimers();
  const roundIndex = activeCup.nextRoundIndex;
  const round = cupRoundName(roundIndex);
  const opponent = opponentForCupRound(roundIndex);
  if (!opponent) {
    finishCupTournament(false);
    return;
  }
  activeCup.currentOpponent = opponent;
  const matchContext = roundIndex >= goldCupWins
    ? "Ekstra kamp · ingen trænereffekt"
    : `${activeCup.coach.name} · ${activeCup.coach.tag}`;

  result.innerHTML = `
    <div class="cup-fixture">
      <span>${round}</span>
      <strong>${activeCup.name} vs. ${opponent.name}</strong>
      <small>${matchContext}</small>
      <div class="cup-loading">Kampen starter...</div>
    </div>
    ${renderCupMatchList(activeCup.matches)}
  `;
  queueCupStep(playCurrentCupMatch, cupRevealDelay);
}

function playCurrentCupMatch() {
  if (!activeCup || activeCup.finished) return;
  const roundIndex = activeCup.nextRoundIndex;
  const round = cupRoundName(roundIndex);
  const opponent = activeCup.currentOpponent || opponentForCupRound(roundIndex);
  if (!opponent) {
    finishCupTournament(false);
    return;
  }
  const match = simulateMatch(activeCup.userTeam, opponent, round, roundIndex, activeCup.coach, activeCup.coachState);
  activeCup.matches.push(match);
  activeCup.nextRoundIndex += 1;

  const wonGoldCup = match.userAdvanced && activeCup.nextRoundIndex === goldCupWins;
  const eliminated = !match.userAdvanced;
  if (eliminated) {
    renderCupMatchResult(match, () => finishCupTournament(eliminated));
  } else if (wonGoldCup) {
    renderCupMatchResult(match, renderCupNextMatch, {
      title: "Guldpokal vundet",
      label: "Du spiller videre for rekorden"
    });
  } else {
    renderCupMatchResult(match, renderCupNextMatch);
  }
}

function renderCupMatchResult(match, nextStep, options = {}) {
  const result = document.querySelector("#cupResult");
  result.innerHTML = `
    <div class="cup-summary ${match.userAdvanced ? "winner" : "loss"}">
      <strong>${options.title ? `${options.title}: ` : ""}${match.round}: ${match.userGoals}-${match.opponentGoals}${match.penalties ? ` (${match.penalties})` : ""}</strong>
      <span>${options.label || (match.userAdvanced ? "Sejr" : "Nederlag")}</span>
    </div>
    ${renderCupMatchList(activeCup.matches)}
  `;
  queueCupStep(nextStep, cupResultDelay);
}

async function finishCupTournament(eliminated) {
  const result = document.querySelector("#cupResult");
  const form = document.querySelector("#tournamentForm");
  const cupStats = calculateCupStats(activeCup.matches);
  const savedEntry = await saveHighscore(activeCup.name, activeCup.scores, cupStats);
  activeCup.finished = true;
  if (form) form.remove();
  result.innerHTML = `
    <div class="cup-summary ${eliminated ? "loss" : "winner"}">
      <strong>${eliminated ? `${activeCup.name} røg ud af cupturneringen` : `${activeCup.name} vandt cupturneringen`}</strong>
      <span>${formatCupWins(cupStats.wins)} · ${formatGoalDiff(cupStats.goalDiff)}</span>
    </div>
    ${renderCupMatchList(activeCup.matches)}
    <div class="cup-share-cta">
      <strong>${eliminated ? "Tak for kampen" : "Cupvinder"}</strong>
      <p>Del din Startellever på SoMe og se, om andre kan slå din score.</p>
      <div>
        <button id="cupShareImageButton" class="primary-button" type="button">
          <span aria-hidden="true">↗</span>
          Del billede
        </button>
        <button id="cupDownloadImageButton" class="pick-button" type="button">
          <span aria-hidden="true">⇩</span>
          Hent billede
        </button>
        <a class="pick-button site-link" href="https://sortsnakpodcast.dk/" target="_blank" rel="noopener">
          <span aria-hidden="true">↗</span>
          Besøg Sort Snak
        </a>
      </div>
    </div>
  `;
  renderTournamentHighscores(savedEntry.id);
  document.querySelector("#cupShareImageButton")?.addEventListener("click", shareLineupImage);
  document.querySelector("#cupDownloadImageButton")?.addEventListener("click", downloadShareImage);
}

function queueCupStep(callback, delay) {
  if (!activeCup) return;
  const timer = window.setTimeout(callback, delay);
  activeCup.timers.push(timer);
}

function clearCupTimers() {
  if (!activeCup?.timers) return;
  activeCup.timers.forEach((timer) => window.clearTimeout(timer));
  activeCup.timers = [];
}

function renderCupMatchList(matches) {
  if (!matches.length) return "";
  return `
    <ol class="cup-list">
      ${matches.map((match) => `
        <li class="${match.userAdvanced ? "win" : "loss"}">
          <span>${match.round}</span>
          <strong>${match.userGoals}-${match.opponentGoals}${match.penalties ? ` (${match.penalties})` : ""}</strong>
          <small>${match.opponent.name}</small>
        </li>
      `).join("")}
    </ol>
  `;
}

function calculateCupStats(matches) {
  const goalsFor = matches.reduce((sum, match) => sum + match.userGoals, 0);
  const goalsAgainst = matches.reduce((sum, match) => sum + match.opponentGoals, 0);
  const wins = matches.filter((match) => match.userAdvanced).length;
  return {
    rounds: matches.length,
    wins,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    wonCup: wins >= goldCupWins
  };
}

function renderTournamentHighscores(activeId = null) {
  const list = document.querySelector("#tournamentHighscoreList");
  if (!list) return;
  if (isSupabaseReady() && !remoteHighscoresLoaded) {
    list.innerHTML = `<li class="empty">Henter highscore...</li>`;
    refreshRemoteHighscores()
      .then(() => renderTournamentHighscores(activeId))
      .catch(() => {
        remoteHighscoresLoaded = true;
        renderTournamentHighscores(activeId);
      });
    return;
  }
  const highscores = getAllHighscores().slice(0, 5);
  list.innerHTML = "";

  if (!highscores.length) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "Spil en turnering for at sætte første score.";
    list.append(item);
    return;
  }

  highscores.forEach((entry, index) => {
    const item = document.createElement("li");
    if (entry.id === activeId) item.className = "current";
    if (entry.lineup?.length === 11) {
      item.classList.add("viewable");
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Se holdet for ${entry.name}`);
    }
    item.innerHTML = `
      <span>${index + 1}</span>
      <strong></strong>
      <small>${cupTrophyMarkup(entry.cupWins || 0)}${formatCupWins(entry.cupWins || 0)} · ${formatGoalDiff(entry.goalDiff || 0)}</small>
      <b>${entry.goalsFor || 0}-${entry.goalsAgainst || 0}</b>
    `;
    item.querySelector("strong").textContent = entry.name;
    if (entry.lineup?.length === 11) {
      const label = document.createElement("em");
      label.textContent = "Se hold";
      item.append(label);
      item.addEventListener("click", () => openHighscoreTeamModal(entry));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openHighscoreTeamModal(entry);
        }
      });
    }
    list.append(item);
  });

}

function openHighscoreTeamModal(entry) {
  if (!entry?.lineup?.length) return;
  closeHighscoreTeamModal();
  const overlay = document.createElement("div");
  overlay.className = "lineup-modal";
  overlay.id = "lineupModal";
  overlay.innerHTML = `
    <section class="lineup-modal-card" aria-labelledby="lineupModalTitle">
      <button class="modal-close lineup-modal-close" type="button" aria-label="Luk holdvisning">×</button>
      <div class="lineup-modal-header">
        <div>
          <p class="eyebrow">Highscore-hold</p>
          <h3 id="lineupModalTitle"></h3>
        </div>
        <div>
          <span>${entry.score || entry.average || "--"}/100</span>
          <small>${entry.formation || ""}</small>
        </div>
      </div>
      <div class="lineup-preview-pitch" aria-label="Gemt startellever"></div>
    </section>
  `;
  overlay.querySelector("#lineupModalTitle").textContent = entry.name || "Startellever";
  overlay.querySelector(".lineup-preview-pitch").append(renderHighscorePitch(entry));
  overlay.querySelector(".lineup-modal-close").addEventListener("click", closeHighscoreTeamModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeHighscoreTeamModal();
  });
  document.body.append(overlay);
  document.addEventListener("keydown", closeHighscoreTeamModalOnEscape);
}

function closeHighscoreTeamModalOnEscape(event) {
  if (event.key === "Escape") closeHighscoreTeamModal();
}

function closeHighscoreTeamModal() {
  document.querySelector("#lineupModal")?.remove();
  document.removeEventListener("keydown", closeHighscoreTeamModalOnEscape);
}

function renderHighscorePitch(entry) {
  const fragment = document.createDocumentFragment();
  entry.lineup.forEach((rawSlot, index) => {
    const slot = normalizeLineupSlot(rawSlot);
    const [x, y] = formationSlotCoordinate(entry.formation, index);
    const node = document.createElement("div");
    node.className = "slot highscore-slot";
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.innerHTML = `
      <span class="rating"></span>
      <strong></strong>
      <small></small>
    `;
    node.querySelector(".rating").textContent = slot.score;
    node.querySelector("strong").textContent = slot.name;
    node.querySelector("small").textContent = `${slot.role}${slot.season ? ` · ${slot.season}` : ""}`;
    fragment.append(node);
  });
  return fragment;
}

function normalizeLineupSlot(slot) {
  return {
    role: slot.role || slot.player?.positions?.[0] || "",
    name: slot.player?.name || slot.name || slot.role || "Spiller",
    score: Number(slot.score || slot.player?.score || 0),
    season: slot.player?.season || slot.season || ""
  };
}

function cupRoundName(roundIndex) {
  return cupRounds[roundIndex] || `Ekstra kamp +${roundIndex - cupRounds.length + 1}`;
}

function formatCupWins(wins) {
  return wins === 1 ? "1 sejr" : `${wins} sejre`;
}

function formatGoalDiff(goalDiff) {
  if (goalDiff > 0) return `+${goalDiff}`;
  return String(goalDiff);
}

function cupTrophyMarkup(wins) {
  if (wins >= 10) return `<span class="cup-trophy gold" aria-label="Guldpokal">🏆</span> `;
  if (wins >= 9) return `<span class="cup-trophy silver" aria-label="Sølvpokal">🏆</span> `;
  if (wins >= 8) return `<span class="cup-trophy bronze" aria-label="Bronzepokal">🏆</span> `;
  return "";
}

function createTeamFromSlots(name, formation, slots) {
  return {
    name,
    formation,
    lineup: slots.map((slot) => ({
      role: slot.role,
      player: slot.player,
      score: slot.player.score
    }))
  };
}

function serializeLineup(lineup) {
  return lineup.map((slot) => ({
    role: slot.role,
    score: slot.score,
    player: {
      id: slot.player.id,
      name: slot.player.name,
      score: slot.player.score,
      season: slot.player.season,
      sourceSeason: slot.player.sourceSeason,
      positions: slot.player.positions,
      number: slot.player.number || ""
    }
  }));
}

function isSupabaseReady() {
  const config = window.STARTELLEVER_SUPABASE || {};
  return Boolean(config.url && config.anonKey && window.supabase);
}

function getSupabaseClient() {
  if (!isSupabaseReady()) return null;
  if (!supabaseClient) {
    const config = window.STARTELLEVER_SUPABASE;
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  }
  return supabaseClient;
}

async function refreshRemoteHighscores() {
  const client = getSupabaseClient();
  if (!client) return [];
  let { data, error } = await client
    .from(supabaseTable)
    .select("id, player_name, team_score, average_score, best_player_score, formation, lineup, cup_wins, cup_rounds, goals_for, goals_against, goal_diff, won_cup, created_at")
    .eq("approved", true)
    .order("cup_wins", { ascending: false })
    .order("goal_diff", { ascending: false })
    .order("goals_for", { ascending: false })
    .order("team_score", { ascending: false })
    .order("best_player_score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);
  if (error && String(error.message || "").includes("best_player_score")) {
    ({ data, error } = await client
      .from(supabaseTable)
      .select("id, player_name, team_score, average_score, formation, lineup, cup_wins, cup_rounds, goals_for, goals_against, goal_diff, won_cup, created_at")
      .eq("approved", true)
      .order("cup_wins", { ascending: false })
      .order("goal_diff", { ascending: false })
      .order("goals_for", { ascending: false })
      .order("team_score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(20));
  }
  if (error) throw error;
  remoteHighscores = (data || []).map(databaseRowToHighscore);
  remoteHighscoresLoaded = true;
  return remoteHighscores;
}

async function getCupOpponents() {
  const remoteTeams = await fetchRemoteOpponentTeams().catch(() => []);
  const gradedRemoteTeams = pickProgressiveOpponents(remoteTeams, cupRounds.length);
  return {
    opponents: gradedRemoteTeams,
    remoteTeams
  };
}

function opponentForCupRound(roundIndex) {
  if (!activeCup) return null;
  const plannedOpponent = activeCup.opponents?.[roundIndex];
  if (plannedOpponent) {
    rememberCupOpponent(plannedOpponent);
    return plannedOpponent;
  }

  const remoteOpponent = pickExtraCupOpponent(roundIndex);
  if (remoteOpponent) return remoteOpponent;

  return null;
}

function pickExtraCupOpponent(roundIndex) {
  const pool = activeCup?.remoteOpponentPool || [];
  if (!pool.length) return null;
  const extraRound = Math.max(0, roundIndex - cupRounds.length);

  if (extraRound >= 3) {
    const sortedPool = [...pool].sort((a, b) => opponentPower(a) - opponentPower(b));
    const topTierSize = Math.max(1, Math.ceil(sortedPool.length * 0.10));
    const topTier = sortedPool.slice(Math.max(0, sortedPool.length - topTierSize));
    const unusedTopTier = topTier.filter((team) => !activeCup.usedOpponentIds.has(team.id || team.name));
    const opponent = randomItem(unusedTopTier.length ? unusedTopTier : topTier);
    rememberCupOpponent(opponent);
    return opponent;
  }

  const available = pool.filter((team) => !activeCup.usedOpponentIds.has(team.id || team.name));
  if (!available.length) {
    activeCup.usedOpponentIds.clear();
    activeCup.matches.forEach((match) => rememberCupOpponent(match.opponent));
  }

  const reusable = pool.filter((team) => !activeCup.usedOpponentIds.has(team.id || team.name));
  const sorted = [...(reusable.length ? reusable : pool)].sort((a, b) => opponentPower(a) - opponentPower(b));
  const lowerBound = sorted.length >= 8 ? Math.floor(sorted.length * 0.50) : Math.floor(sorted.length * 0.35);
  const start = Math.min(sorted.length - 1, lowerBound + extraRound);
  const contenders = sorted.slice(start);
  const opponent = randomItem(contenders.length ? contenders : sorted);
  rememberCupOpponent(opponent);
  return opponent;
}

function rememberCupOpponent(opponent) {
  const key = opponent?.id || opponent?.name;
  if (key && activeCup?.usedOpponentIds) activeCup.usedOpponentIds.add(key);
}

async function fetchRemoteOpponentTeams() {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from(supabaseTable)
    .select("id, player_name, team_score, average_score, formation, lineup, attack, midfield, defense")
    .eq("approved", true)
    .order("team_score", { ascending: true })
    .limit(80);
  if (error) throw error;
  return (data || []).map(databaseRowToTeam).filter(Boolean);
}

function pickProgressiveOpponents(teams, count) {
  if (!teams.length) return [];
  const sorted = [...teams].sort((a, b) => opponentPower(a) - opponentPower(b));
  const picked = [];
  const used = new Set();

  for (let roundIndex = 0; roundIndex < count; roundIndex += 1) {
    if (used.size >= sorted.length) used.clear();
    const targetIndex = sorted.length === 1
      ? 0
      : Math.round((roundIndex / Math.max(1, count - 1)) * (sorted.length - 1));
    const windowSize = Math.max(2, Math.ceil(sorted.length / count));
    const start = Math.max(0, targetIndex - Math.floor(windowSize / 2));
    const end = Math.min(sorted.length, start + windowSize);
    const bucket = sorted
      .slice(start, end)
      .filter((team) => !used.has(team.id || team.name));
    const fallback = sorted.filter((team) => !used.has(team.id || team.name));
    const opponent = randomItem(bucket.length ? bucket : fallback);
    if (!opponent) break;
    used.add(opponent.id || opponent.name);
    picked.push(opponent);
  }

  return picked.sort((a, b) => opponentPower(a) - opponentPower(b));
}

function opponentPower(team) {
  const profile = teamProfile(team);
  return (profile.attack * 0.34) + (profile.midfield * 0.25) + (profile.defense * 0.31) + ((team.score || 0) * 0.10);
}

async function saveRemoteTeam(name, scores, cupStats) {
  const team = createTeamFromSlots(name, state.formationName, state.slots);
  const payload = {
    name,
    claimCode: state.shareClaimCode,
    formation: state.formationName,
    lineup: serializeLineup(team.lineup),
    cupStats: {
      wins: cupStats.wins,
      rounds: cupStats.rounds,
      goalsFor: cupStats.goalsFor,
      goalsAgainst: cupStats.goalsAgainst
    }
  };

  const response = await fetch("/api/submit-score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Score could not be saved");
  }

  return response.json();
}

function databaseRowToHighscore(row) {
  return {
    id: row.id,
    name: row.player_name,
    score: row.team_score,
    average: row.average_score,
    best: row.best_player_score,
    formation: row.formation,
    lineup: Array.isArray(row.lineup) ? row.lineup : [],
    cupWins: row.cup_wins,
    cupRounds: row.cup_rounds,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDiff: row.goal_diff,
    wonCup: row.won_cup,
    createdAt: row.created_at
  };
}

function databaseRowToTeam(row) {
  if (!Array.isArray(row.lineup) || row.lineup.length !== 11) return null;
  return {
    id: row.id,
    name: row.player_name ? `${row.player_name}s XI` : "Brugerhold",
    score: row.team_score || row.average_score,
    formation: row.formation,
    lineup: row.lineup.map((slot) => ({
      role: slot.role,
      score: Number(slot.score || slot.player?.score || 70),
      player: {
        name: slot.player?.name || slot.role,
        score: Number(slot.score || slot.player?.score || 70),
        season: slot.player?.season || "",
        positions: slot.player?.positions || [slot.role]
      }
    }))
  };
}

function teamStrength(team, roles, coach = null) {
  const players = team.lineup.filter((slot) => roles.includes(slot.role));
  return average(players.map((slot) => adjustedSlotScore(slot, coach)));
}

function adjustedSlotScore(slot, coach = null) {
  let score = Number(slot.score || slot.player?.score || 70);
  if (!coach) return score;
  if (coach.effect === "lowPlayers" && score < 83) {
    score += 3;
  }
  if (coach.effect === "eraBoost" && isSeasonInRange(slot.player?.sourceSeason || slot.player?.season, 2011, 2015)) {
    score += 5;
  }
  return clampNumber(score, 1, 99);
}

function isSeasonInRange(season, firstYear, lastYear) {
  const match = String(season || "").match(/\d{4}|\d{2}/);
  if (!match) return false;
  const raw = Number(match[0]);
  const year = raw < 100 ? 2000 + raw : raw;
  return year >= firstYear && year <= lastYear;
}

function teamProfile(team, coach = null, roundIndex = 0) {
  const profile = {
    attack: teamStrength(team, ["ST", "LW", "RW", "AM", "LM", "RM"], coach),
    midfield: teamStrength(team, ["DM", "CM", "AM", "LM", "RM"], coach),
    defense: teamStrength(team, ["GK", "CB", "LB", "RB", "DM"], coach)
  };
  return applyCoachProfileEffect(profile, team, coach, roundIndex);
}

function applyCoachProfileEffect(profile, team, coach = null, roundIndex = 0) {
  if (!coach) return profile;
  const adjusted = { ...profile };
  const boostAll = (factor) => {
    adjusted.attack *= factor;
    adjusted.midfield *= factor;
    adjusted.defense *= factor;
  };

  if (coach.effect === "attackBoost") {
    adjusted.attack *= 1.12;
    adjusted.defense *= 0.92;
  } else if (coach.effect === "formation442" && team.formation === "4-4-2") {
    boostAll(1.07);
  } else if (coach.effect === "balance") {
    adjusted.attack *= 1.03;
    adjusted.defense *= 1.03;
  } else if (coach.effect === "formation352" && team.formation === "3-5-2") {
    boostAll(1.07);
  } else if (coach.effect === "earlyRounds" && roundIndex < 4) {
    boostAll(1.04);
  } else if (coach.effect === "riskReward") {
    boostAll(0.95);
  } else if (coach.effect === "teamBoost") {
    boostAll(1.03);
  }

  return adjusted;
}

function applyMatchupCoachEffect(user, other, coach = null) {
  if (!coach || coach.effect !== "gapCloser") return { user, other };
  const userTotal = user.attack + user.midfield + user.defense;
  const otherTotal = other.attack + other.midfield + other.defense;
  if (otherTotal <= userTotal) return { user, other };
  return {
    user,
    other: {
      attack: other.attack - Math.max(0, other.attack - user.attack) * 0.20,
      midfield: other.midfield - Math.max(0, other.midfield - user.midfield) * 0.20,
      defense: other.defense - Math.max(0, other.defense - user.defense) * 0.20
    }
  };
}

function simulateMatch(userTeam, opponent, round, roundIndex, coach = null, coachState = {}) {
  const activeCoach = roundIndex >= goldCupWins ? null : coach;
  const engineRoundIndex = Math.min(roundIndex, goldCupWins - 1);
  let user = teamProfile(userTeam, activeCoach, roundIndex);
  let other = applyLateTournamentOpponentBoost(teamProfile(opponent), roundIndex);
  other = applyOpponentHandicap(other, engineRoundIndex);
  ({ user, other } = applyMatchupCoachEffect(user, other, activeCoach));
  const openMatchChance = activeCoach?.effect === "chaos" ? 0.34 : 0.18;
  const openMatch = Math.random() < openMatchChance;
  const userXg = expectedGoals(user.attack, other.defense, user.midfield, other.midfield, engineRoundIndex, openMatch);
  const opponentXg = expectedGoals(other.attack, user.defense, other.midfield, user.midfield, engineRoundIndex, openMatch);
  let userGoals = sampleGoals(userXg);
  let opponentGoals = sampleGoals(opponentXg);
  ({ userGoals, opponentGoals } = addBreakawayGoal(user, other, userGoals, opponentGoals, openMatch));
  ({ userGoals, opponentGoals } = applyCoachResultEffect(userGoals, opponentGoals, activeCoach, coachState));
  let penalties = "";
  let userAdvanced = userGoals > opponentGoals;

  if (userGoals === opponentGoals) {
    const lateWinner = addLateWinner(user, other, userGoals, opponentGoals);
    userGoals = lateWinner.userGoals;
    opponentGoals = lateWinner.opponentGoals;
    userAdvanced = userGoals > opponentGoals;
    if (!lateWinner.decided) {
      const penaltyEdge = (user.attack + user.defense + user.midfield) - (other.attack + other.defense + other.midfield);
      userAdvanced = penaltyEdge + randomBetween(-18, 18) >= 0;
      const userPens = userAdvanced ? randomItem([4, 5]) : randomItem([2, 3, 4]);
      const opponentPens = userAdvanced ? Math.max(2, userPens - randomItem([1, 2])) : Math.min(5, userPens + randomItem([1, 2]));
      penalties = `${userPens}-${opponentPens} str.`;
    }
  }

  return { round, opponent, userGoals, opponentGoals, penalties, userAdvanced };
}

function applyLateTournamentOpponentBoost(profile, roundIndex) {
  if (roundIndex < 13) return profile;
  return {
    attack: profile.attack + 2,
    midfield: profile.midfield + 2,
    defense: profile.defense + 2
  };
}

function addLateWinner(user, other, userGoals, opponentGoals) {
  const userStrength = user.attack + user.midfield + user.defense;
  const opponentStrength = other.attack + other.midfield + other.defense;
  const edge = userStrength - opponentStrength;
  const chance = clampNumber(0.16 + Math.abs(edge) * 0.012, 0.16, 0.38);
  if (Math.random() >= chance) {
    return { userGoals, opponentGoals, decided: false };
  }
  if (edge + randomBetween(-9, 9) >= 0) {
    return { userGoals: Math.min(5, userGoals + 1), opponentGoals, decided: true };
  }
  return { userGoals, opponentGoals: Math.min(5, opponentGoals + 1), decided: true };
}

function applyCoachResultEffect(userGoals, opponentGoals, coach = null, coachState = {}) {
  if (!coach || userGoals >= opponentGoals) return { userGoals, opponentGoals };
  if (coach.effect === "damageControl" && opponentGoals - userGoals >= 2 && Math.random() < 0.45) {
    return { userGoals, opponentGoals: opponentGoals - 1 };
  }
  if (coach.effect === "riskReward" && Math.random() < 0.12) {
    return { userGoals: opponentGoals, opponentGoals };
  }
  if (coach.effect === "comeback" && !coachState.comebackUsed && Math.random() < 0.12) {
    coachState.comebackUsed = true;
    return { userGoals: opponentGoals, opponentGoals };
  }
  return { userGoals, opponentGoals };
}

function applyOpponentHandicap(profile, roundIndex) {
  const handicap = [9, 6, 4, 2][roundIndex] || 0;
  if (!handicap) return profile;
  return {
    attack: profile.attack - handicap,
    midfield: profile.midfield - Math.round(handicap * 0.7),
    defense: profile.defense - handicap
  };
}

function expectedGoals(attack, defense, midfield, opponentMidfield, roundIndex, openMatch = false) {
  const base = 1.15 + roundIndex * 0.04;
  const attackEdge = (attack - defense) * 0.045;
  const midfieldEdge = (midfield - opponentMidfield) * 0.014;
  const openBonus = openMatch ? 0.28 : 0;
  return clampNumber(base + attackEdge + midfieldEdge + openBonus + randomBetween(-0.18, 0.18), 0.25, 3.25);
}

function addBreakawayGoal(user, other, userGoals, opponentGoals, openMatch) {
  if (!openMatch || userGoals === opponentGoals) return { userGoals, opponentGoals };
  const userEdge = (user.attack + user.midfield) - (other.defense + other.midfield);
  const opponentEdge = (other.attack + other.midfield) - (user.defense + user.midfield);
  if (userGoals > opponentGoals && userEdge > 5 && Math.random() < 0.24) {
    return { userGoals: Math.min(5, userGoals + 1), opponentGoals };
  }
  if (opponentGoals > userGoals && opponentEdge > 5 && Math.random() < 0.24) {
    return { userGoals, opponentGoals: Math.min(5, opponentGoals + 1) };
  }
  return { userGoals, opponentGoals };
}

function sampleGoals(expected) {
  let goals = 0;
  let chance = expected;
  while (goals < 5 && Math.random() < chance / (goals + 1.25)) {
    goals += 1;
    chance *= 0.68;
  }
  return goals;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function renderShareCanvas(scores) {
  const canvas = document.querySelector("#shareCanvas");
  if (!canvas) return null;
  const perfectTeam = scores.average >= 95;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pitch = { x: 70, y: 275, w: 940, h: 900 };
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, perfectTeam ? "#2b210d" : "#241012");
  gradient.addColorStop(.45, "#151719");
  gradient.addColorStop(1, perfectTeam ? "#17130a" : "#0e130f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (perfectTeam) {
    const glow = ctx.createRadialGradient(width / 2, 520, 90, width / 2, 520, 650);
    glow.addColorStop(0, "rgba(215, 166, 61, .18)");
    glow.addColorStop(1, "rgba(215, 166, 61, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = perfectTeam ? "#f7d46d" : "#f4f4f1";
  ctx.font = "900 64px Inter, system-ui, sans-serif";
  ctx.fillText("Startellever", 180, 116);
  ctx.fillStyle = "#a9adb2";
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText("Sort Snak · FC Midtjylland", 182, 154);

  await drawLogo(ctx, 70, 62, 86);

  ctx.textAlign = "right";
  ctx.fillStyle = "#d7a63d";
  ctx.font = "950 76px Inter, system-ui, sans-serif";
  ctx.fillText(`${scores.total}/100`, 1010, 116);
  ctx.fillStyle = "#a9adb2";
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText(state.formationName, 1010, 154);
  ctx.textAlign = "left";

  if (perfectTeam) {
    ctx.fillStyle = "rgba(215, 166, 61, .16)";
    roundRect(ctx, pitch.x - 16, pitch.y - 16, pitch.w + 32, pitch.h + 32, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(215, 166, 61, .86)";
    ctx.lineWidth = 5;
    roundRect(ctx, pitch.x - 13, pitch.y - 13, pitch.w + 26, pitch.h + 26, 26);
    ctx.stroke();
  }

  drawSharePitch(ctx, pitch, perfectTeam);
  state.slots.forEach((slot, index) => drawSharePlayer(ctx, slot, index, pitch));

  ctx.fillStyle = perfectTeam ? "rgba(38, 29, 12, .92)" : "rgba(17, 19, 21, .88)";
  roundRect(ctx, 70, 1212, 940, 72, 18);
  ctx.fill();
  if (perfectTeam) {
    ctx.strokeStyle = "rgba(215, 166, 61, .62)";
    ctx.lineWidth = 2;
    roundRect(ctx, 70, 1212, 940, 72, 18);
    ctx.stroke();
  }
  ctx.fillStyle = "#f4f4f1";
  ctx.font = "800 26px Inter, system-ui, sans-serif";
  ctx.fillText(`${perfectTeam ? "Perfekt hold · " : ""}Gennemsnit ${scores.average} · Bedste ${scores.best} · ${scores.seasons} sæsoner`, 104, 1258);
  ctx.fillStyle = "#a9adb2";
  ctx.font = "700 19px Inter, system-ui, sans-serif";
  const claimParts = [
    state.shareTeamName || null,
    state.shareClaimCode ? `ID ${state.shareClaimCode}` : null,
    state.shareCoachName || null
  ].filter(Boolean);
  const claimText = claimParts.length
    ? claimParts.join(" · ")
    : "#Midtjylland #Sortsnak #startellever";
  ctx.fillText(fitCanvasText(ctx, claimText, 870), 104, 1310);
  return canvas;
}

function fitCanvasText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 4 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

function drawSharePitch(ctx, pitch, perfectTeam = false) {
  ctx.save();
  roundRect(ctx, pitch.x, pitch.y, pitch.w, pitch.h, 18);
  ctx.clip();
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 ? "#3d814d" : "#235b39";
    ctx.fillRect(pitch.x + (pitch.w / 8) * i, pitch.y, pitch.w / 8, pitch.h);
  }
  ctx.strokeStyle = perfectTeam ? "rgba(255, 230, 150, .88)" : "rgba(255,255,255,.70)";
  ctx.lineWidth = perfectTeam ? 5 : 4;
  ctx.strokeRect(pitch.x + 3, pitch.y + 3, pitch.w - 6, pitch.h - 6);
  ctx.beginPath();
  ctx.moveTo(pitch.x, pitch.y + pitch.h / 2);
  ctx.lineTo(pitch.x + pitch.w, pitch.y + pitch.h / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pitch.x + pitch.w / 2, pitch.y + pitch.h / 2, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSharePlayer(ctx, slot, index, pitch) {
  const [xPercent, yPercent] = shareSlotCoordinate(index);
  const x = pitch.x + pitch.w * (xPercent / 100);
  const y = pitch.y + pitch.h * (yPercent / 100);
  const boxW = 148;
  const boxH = 90;
  ctx.save();
  ctx.translate(x - boxW / 2, y - boxH / 2);
  ctx.fillStyle = "rgba(18, 20, 18, .86)";
  ctx.strokeStyle = "rgba(255,255,255,.24)";
  ctx.lineWidth = 2;
  roundRect(ctx, 0, 0, boxW, boxH, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = slot.player.score >= 91 ? "#d7a63d" : "#f4f4f1";
  ctx.font = "950 22px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(slot.player.score), boxW / 2, 24);
  ctx.fillStyle = "#f4f4f1";
  ctx.font = "900 15px Inter, system-ui, sans-serif";
  wrapCanvasText(ctx, slot.player.name, boxW / 2, 47, 126, 17, 2);
  ctx.fillStyle = "#a9adb2";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.fillText(`${slot.role} · ${slot.player.season}`, boxW / 2, 82);
  ctx.restore();
}

async function drawLogo(ctx, x, y, size) {
  const img = new Image();
  img.src = "assets/sort-snak-logo.png?v=20260615-podcast-logo";
  try {
    await img.decode();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  } catch {
    ctx.fillStyle = "#d71920";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  lines.push(line);
  lines.slice(0, maxLines).forEach((item, index) => {
    ctx.fillText(item, x, y + index * lineHeight);
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

async function shareImageBlob() {
  const canvas = await renderShareCanvas(calculateScores());
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", .95));
}

async function downloadShareImage() {
  const blob = await shareImageBlob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sort-snak-startellever.png";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function shareLineupImage() {
  const blob = await shareImageBlob();
  const file = new File([blob], "sort-snak-startellever.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Sort Snak Startellever", text: "Min Sort Snak Startellever #startellever" });
  } else {
    await downloadShareImage();
  }
}

function renderScore() {
  const picked = state.slots.filter((slot) => slot.player).map((slot) => slot.player);
  els.pickCount.textContent = `${picked.length}/11`;

  if (!picked.length) {
    els.avgScore.textContent = "--";
    els.bestScore.textContent = "--";
    els.seasonScore.textContent = "--";
    return;
  }

  els.avgScore.textContent = Math.round(average(picked.map((player) => player.score)));
  els.bestScore.textContent = Math.max(...picked.map((player) => player.score));
  els.seasonScore.textContent = new Set(picked.map((player) => player.season)).size;
}

function render() {
  els.gameLayout.classList.toggle("complete", state.complete);
  els.pitchWrap.hidden = state.complete;
  updateSeasonCardState();
  renderPitch();
  renderMiniPitch();
  renderDraft();
  renderScore();
}

function updateSeasonCardState() {
  const canRoll = state.started && !state.complete && (!state.currentSeason || Boolean(state.roundSlotId));
  els.seasonCard.disabled = !canRoll && !state.complete;
  els.seasonCard.classList.toggle("active", Boolean(state.currentSeason));
  els.seasonCard.classList.toggle("rollable", canRoll);
  els.seasonCard.classList.toggle("tournament-ready", state.complete);
  els.rollButton.disabled = !canRoll;
  if (state.complete) {
    els.rollButton.innerHTML = `<span aria-hidden="true">✓</span> Færdig`;
    els.seasonRange.textContent = "Spil mod andre hold";
  } else if (state.currentSeason && state.roundSlotId && state.slots.every((slot) => slot.player)) {
    els.rollButton.innerHTML = `<span aria-hidden="true">✓</span> Afslut draft`;
    els.seasonRange.textContent = "Afslut draft";
  } else if (state.currentSeason && state.roundSlotId) {
    els.rollButton.innerHTML = `<span aria-hidden="true">⚄</span> Træk næste sæson`;
    els.seasonRange.textContent = "Træk næste sæson";
  } else if (state.currentSeason) {
    els.rollButton.innerHTML = `<span aria-hidden="true">⚄</span> Vælg én spiller`;
    els.seasonRange.textContent = "Vælg spiller først";
  } else {
    els.rollButton.innerHTML = `<span aria-hidden="true">⚄</span> Træk sæson`;
    els.seasonRange.textContent = canRoll ? "Træk sæson" : seasonRangeLabel;
  }
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value) {
  return Math.max(1, Math.min(99, value));
}

init();
