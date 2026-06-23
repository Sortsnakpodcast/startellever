const friendsFormations = {
  "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "DM", "DM", "AM", "RW", "ST", "LW"],
  "3-5-2": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "AM", "ST", "ST"],
  "4-3-3": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "RW", "ST", "LW"],
  "3-4-3": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "LW", "ST", "RW"],
  "4-4-2": ["GK", "RB", "CB", "CB", "LB", "LM", "CM", "CM", "RM", "ST", "ST"]
};

const friendsFormationLayouts = {
  "4-3-3": [[50, 88], [82, 72], [61, 73], [39, 73], [18, 72], [72, 54], [50, 58], [28, 54], [82, 27], [50, 20], [18, 27]],
  "4-2-3-1": [[50, 88], [82, 72], [61, 73], [39, 73], [18, 72], [61, 59], [39, 59], [50, 41], [82, 31], [50, 20], [18, 31]],
  "3-5-2": [[50, 88], [73, 72], [50, 75], [27, 72], [14, 54], [38, 58], [62, 58], [86, 54], [50, 39], [40, 21], [60, 21]],
  "3-4-3": [[50, 88], [73, 72], [50, 75], [27, 72], [14, 55], [38, 59], [62, 59], [86, 55], [18, 27], [50, 20], [82, 27]],
  "4-4-2": [[50, 88], [82, 72], [61, 73], [39, 73], [18, 72], [14, 54], [38, 58], [62, 58], [86, 54], [40, 21], [60, 21]]
};

const friendRoleChains = {
  keeper: ["GK"],
  defense: ["RB", "CB", "LB"],
  midfield: ["LM", "RM", "DM", "CM", "AM"],
  attack: ["LW", "RW", "ST"]
};

const friendRoleChainByRole = Object.fromEntries(
  Object.entries(friendRoleChains).flatMap(([chain, roles]) => roles.map((role) => [role, chain]))
);

const friendsPlayers = window.FCM_PLAYERS_DATA?.players || [];
const roomsTable = "startellever_friend_rooms";
const playersTable = "startellever_friend_players";
const picksTable = "startellever_friend_picks";
const friendStorageKeys = {
  playerId: "startellever_friend_player_id",
  roomCode: "startellever_friend_room_code",
  isHost: "startellever_friend_is_host"
};
const maxFriendsPlayers = 8;
const draftRounds = 11;
const defaultFriendFormation = "4-3-3";
const demoRoomCode = "DEMO1";
const demoOpponents = [
  ["Frida", "4-3-3"],
  ["Bo", "3-5-2"],
  ["Hedens Helte", "4-4-2"]
];
const friendMatchRevealDelay = 2300;
const friendRoleNames = {
  GK: "målmand",
  RB: "højre back",
  CB: "midterforsvarer",
  LB: "venstre back",
  DM: "defensiv midt",
  CM: "central midt",
  AM: "offensiv midt",
  RM: "højre midt",
  LM: "venstre midt",
  RW: "højre kant",
  ST: "angriber",
  LW: "venstre kant"
};

let friendsClient = null;
let pollTimer = null;
let friendsState = {
  roomCode: "",
  playerId: localStorage.getItem(friendStorageKeys.playerId) || "",
  isHost: false,
  demo: false,
  room: null,
  players: [],
  picks: [],
  tournament: null,
  pendingPick: null,
  lastSeenPickCount: 0,
  lastSeenRound: null
};

const els = {
  home: document.querySelector("#friendsHome"),
  createPanel: document.querySelector("#createRoomPanel"),
  createRoomButton: document.querySelector("#createRoomButton"),
  joinRoomToggle: document.querySelector("#joinRoomToggle"),
  joinRoomForm: document.querySelector("#joinRoomForm"),
  createRoomForm: document.querySelector("#createRoomForm"),
  joinRoomCode: document.querySelector("#joinRoomCode"),
  joinTeamName: document.querySelector("#joinTeamName"),
  hostTeamName: document.querySelector("#hostTeamName"),
  roomPanel: document.querySelector("#roomPanel"),
  roomCodeText: document.querySelector("#roomCodeText"),
  copyRoomCodeButton: document.querySelector("#copyRoomCodeButton"),
  leaveRoomButton: document.querySelector("#leaveFriendRoomButton"),
  roomStatusText: document.querySelector("#roomStatusText"),
  roomPlayers: document.querySelector("#roomPlayers"),
  addDemoPlayerButton: document.querySelector("#addDemoPlayerButton"),
  waitingNote: document.querySelector("#friendWaitingNote"),
  startDraftButton: document.querySelector("#startFriendsDraftButton"),
  draftPanel: document.querySelector("#draftPanel"),
  formationText: document.querySelector("#friendsFormationText"),
  seasonTitle: document.querySelector("#friendsSeasonTitle"),
  roundText: document.querySelector("#friendsRoundText"),
  leaveDraftButton: document.querySelector("#leaveFriendDraftButton"),
  turnBanner: document.querySelector("#turnBanner"),
  order: document.querySelector("#friendsOrder"),
  board: document.querySelector("#friendsBoard"),
  playerList: document.querySelector("#friendsPlayerList"),
  resultPanel: document.querySelector("#friendsResultPanel")
};

function initFriends() {
  els.createRoomButton.addEventListener("click", () => {
    els.createPanel.hidden = false;
    els.home.hidden = true;
  });
  els.joinRoomToggle.addEventListener("click", () => {
    els.joinRoomForm.hidden = !els.joinRoomForm.hidden;
  });
  els.createRoomForm.addEventListener("submit", createRoom);
  els.joinRoomForm.addEventListener("submit", joinRoom);
  els.copyRoomCodeButton.addEventListener("click", copyRoomCode);
  els.leaveRoomButton.addEventListener("click", leaveFriendGame);
  els.leaveDraftButton.addEventListener("click", leaveFriendGame);
  els.addDemoPlayerButton.addEventListener("click", addDemoPlayer);
  els.startDraftButton.addEventListener("click", startDraft);
  hydrateFriendInviteCode();
  window.setTimeout(() => restoreFriendSession(0), 250);
}

function getClient() {
  if (friendsClient) return friendsClient;
  const config = window.STARTELLEVER_SUPABASE;
  if (!window.supabase || !config?.url || !config?.anonKey) return null;
  friendsClient = window.supabase.createClient(config.url, config.anonKey);
  return friendsClient;
}

async function createRoom(event) {
  event.preventDefault();
  const name = cleanName(els.hostTeamName.value);
  if (!name) return setStatus("Skriv et holdnavn først.");
  try {
    const client = requireClient();
    const roomCode = await createUniqueRoomCode(client);
    const playerId = crypto.randomUUID();
    const room = {
      code: roomCode,
      status: "lobby",
      host_player_id: playerId,
      current_round: 1,
      current_pick_index: 0,
      current_season: null,
      season_draw_counts: {}
    };
    const player = createFriendPlayer(playerId, roomCode, name, defaultFriendFormation, 0);
    await insertOrThrow(client.from(roomsTable).insert(room));
    await insertOrThrow(client.from(playersTable).insert(player));
    enterRoom(roomCode, playerId, true);
  } catch (error) {
    enterDemoRoom(name, defaultFriendFormation);
  }
}

async function joinRoom(event) {
  event.preventDefault();
  const code = cleanRoomCode(els.joinRoomCode.value);
  const name = cleanName(els.joinTeamName.value);
  if (!code || !name) return setStatus("Skriv både rumkode og holdnavn.");
  if (code === demoRoomCode) {
    enterDemoRoom(name, defaultFriendFormation);
    return;
  }
  try {
    const client = requireClient();
    const room = await fetchRoom(client, code);
    if (!room) return setStatus("Rummet findes ikke.");
    if (room.status !== "lobby") return setStatus("Draften er allerede startet.");
    const players = await fetchPlayers(client, code);
    if (players.length >= maxFriendsPlayers) return setStatus("Rummet er fyldt.");
    const playerId = crypto.randomUUID();
    const player = createFriendPlayer(playerId, code, name, defaultFriendFormation, players.length);
    await insertOrThrow(client.from(playersTable).insert(player));
    enterRoom(code, playerId, false);
  } catch (error) {
    setStatus(`Kunne ikke finde rummet. Brug ${demoRoomCode}, hvis du vil teste lokalt uden Supabase.`);
  }
}

function createFriendPlayer(id, roomCode, name, formation, orderIndex) {
  return {
    id,
    room_code: roomCode,
    team_name: name,
    formation,
    order_index: orderIndex,
    lineup: friendsFormations[formation].map((role, index) => ({ id: `${role}-${index}`, role, player: null }))
  };
}

function enterRoom(roomCode, playerId, isHost) {
  friendsState.roomCode = roomCode;
  friendsState.playerId = playerId;
  friendsState.isHost = isHost;
  friendsState.demo = false;
  persistFriendSession(roomCode, playerId, isHost);
  els.home.hidden = true;
  els.createPanel.hidden = true;
  els.roomPanel.hidden = false;
  els.roomCodeText.textContent = roomCode;
  refreshRoom();
  pollTimer = window.setInterval(refreshRoom, 1800);
}

async function refreshRoom() {
  if (friendsState.demo) {
    renderRoom();
    return;
  }
  const client = getClient();
  if (!client || !friendsState.roomCode) return;
  const [room, players, picks] = await Promise.all([
    fetchRoom(client, friendsState.roomCode),
    fetchPlayers(client, friendsState.roomCode),
    fetchPicks(client, friendsState.roomCode)
  ]);
  if (!room) return;
  const normalizedPlayers = normalizeFriendPlayersForRoom(room, players);
  friendsState.room = room;
  friendsState.players = normalizedPlayers;
  friendsState.picks = picks;
  friendsState.isHost = room.host_player_id === friendsState.playerId;
  repairFriendPlayerFormations(client, room, players).catch(() => {});
  renderRoom();
}

function renderRoom() {
  const { room, players } = friendsState;
  if (room.status === "drafting") announceNewRemotePicks();
  els.roomPanel.hidden = room.status !== "lobby";
  els.roomPlayers.innerHTML = players.map((player) => `
    <div class="friend-row">
      <strong>${escapeHtml(player.team_name)}</strong>
      <span>${room.status === "lobby" ? "formation lodtrækkes" : sharedFriendFormation()}</span>
      <small>${lineupCount(player.lineup)}/11</small>
    </div>
  `).join("");
  els.roomStatusText.textContent = room.status === "lobby"
    ? "Del koden. Når mindst to hold er med, lodtrækkes en fælles formation."
    : room.status === "drafting" ? "Draften er i gang." : "Klar til turnering.";
  els.waitingNote.hidden = !(room.status === "lobby" && players.length < maxFriendsPlayers);
  els.addDemoPlayerButton.hidden = true;
  els.startDraftButton.hidden = !(friendsState.isHost && room.status === "lobby" && players.length >= 2);
  els.draftPanel.hidden = room.status !== "drafting";
  els.resultPanel.hidden = room.status !== "complete";
  if (room.status === "drafting") renderDraft();
  if (room.status === "complete") renderTournament();
}

async function startDraft() {
  const formation = randomFriendFormation();
  const playerOrder = shuffledPlayerOrder(friendsState.players);
  const draftOrders = createFriendDraftOrders(friendsState.players, playerOrder);
  const openingRole = roleForFriendRound(formation, 1);
  if (friendsState.demo) {
    friendsState.players = applyFriendDraftOrder(
      friendsState.players.map((player) => resetFriendPlayerFormation(player, formation)),
      playerOrder
    );
    friendsState.room = {
      ...friendsState.room,
      status: "drafting",
      current_round: 1,
      current_pick_index: 0,
      current_season: openingRole,
      season_draw_counts: { formation, draftOrders }
    };
    friendsState.lastSeenRound = 1;
    showFriendDraw("Formation trukket", formation, "Valgrækkefølgen er også trukket.");
    window.setTimeout(() => showFriendDraw("Første position", roleLabel(openingRole)), 850);
    await runDemoBotsUntilUserTurn();
    renderRoom();
    return;
  }
  const client = requireClient();
  const resetPlayers = applyFriendDraftOrder(
    friendsState.players.map((player) => resetFriendPlayerFormation(player, formation)),
    playerOrder
  );
  await updateOrThrow(client.from(roomsTable).update({
    status: "drafting",
    current_round: 1,
    current_pick_index: 0,
    current_season: openingRole,
    season_draw_counts: { formation, draftOrders }
  }).eq("code", friendsState.roomCode).eq("status", "lobby"));
  await Promise.all(resetPlayers.map((player) =>
    updateOrThrow(client.from(playersTable).update({
      formation: player.formation,
      lineup: player.lineup,
      order_index: player.order_index
    }).eq("id", player.id))
  ));
  friendsState.lastSeenRound = 1;
  await refreshRoom();
  showFriendDraw("Formation trukket", formation, "Valgrækkefølgen er også trukket.");
  window.setTimeout(() => showFriendDraw("Første position", roleLabel(openingRole)), 850);
}

function renderDraft() {
  const room = friendsState.room;
  const role = room.current_season || currentFriendRole();
  const roundIndex = Number(room.current_round || 1) - 1;
  const order = draftOrderForRound(friendsState.players, roundIndex);
  const current = order[room.current_pick_index] || order[0];
  const me = friendsState.players.find((player) => player.id === friendsState.playerId);
  const isMyTurn = current?.id === friendsState.playerId;

  els.formationText.textContent = `Formation ${sharedFriendFormation()}`;
  els.seasonTitle.textContent = roleLabel(role);
  if (room.current_season && friendsState.lastSeenRound !== room.current_round) {
    friendsState.lastSeenRound = room.current_round;
    showFriendDraw(`Runde ${room.current_round}`, roleLabel(role));
  }
  els.roundText.textContent = `Runde ${room.current_round}/${draftRounds}`;
  els.turnBanner.className = `turn-banner ${isMyTurn ? "is-active" : ""}`;
  els.turnBanner.textContent = isMyTurn
    ? `Din tur: vælg ${roleDraftText(role)}.`
    : `${current?.team_name || "Næste hold"} vælger ${roleDraftText(role)}.`;
  renderDraftOverview(me, order, room.current_pick_index);
  renderBoards(me, order, room.current_pick_index);
  renderPositionPlayers(role, me, isMyTurn);
}

function renderDraftOverview(me, order, pickIndex) {
  const sorted = [
    me,
    ...friendsState.players.filter((player) => player.id !== me?.id)
  ].filter(Boolean);
  els.order.innerHTML = sorted.map((player) => {
    const active = order[pickIndex]?.id === player.id;
    const count = lineupCount(player.lineup);
    const avg = draftAverage(player.lineup);
    return `
      <div class="friend-overview-row ${player.id === me?.id ? "is-me" : ""} ${active ? "active" : ""}">
        <strong>${escapeHtml(player.team_name)}</strong>
        <span>${count}/11</span>
        <span>snit ${avg || "--"}</span>
        <button type="button" data-friend-lineup="${player.id}">Se</button>
      </div>
    `;
  }).join("");
  els.order.querySelectorAll("[data-friend-lineup]").forEach((button) => {
    button.addEventListener("click", () => {
      const player = friendsState.players.find((item) => item.id === button.dataset.friendLineup);
      openFriendTeamModal(friendPlayerToTeam(player));
    });
  });
}

function renderBoards(me, order, pickIndex) {
  const active = order[pickIndex];
  const currentRound = Number(friendsState.room?.current_round || 1);
  const roundPicks = friendsState.picks.filter((pick) => Number(pick.round_no) === currentRound);
  els.board.innerHTML = `
    <article class="friend-live-card">
      <div>
        <strong>${escapeHtml(me?.team_name || "Dit hold")}</strong>
        <span>${me?.formation || ""} · ${lineupCount(me?.lineup)}/11 · snit ${draftAverage(me?.lineup) || "--"}</span>
      </div>
      <div class="friend-live-pitch">${renderLineupDots(me)}</div>
    </article>
    <article class="friend-draft-status">
      <strong>Næste valg</strong>
      <span>${escapeHtml(active?.team_name || "")} · valg ${(Number(friendsState.room?.current_pick_index || 0) + 1)}/${order.length}</span>
    </article>
    <article class="friend-round-log">
      <strong>Runde ${currentRound}: ${escapeHtml(roleLabel(friendsState.room?.current_season || ""))}</strong>
      <div>
        ${roundPicks.length ? roundPicks.map((pick) => {
          const player = friendsState.players.find((item) => item.id === pick.friend_player_id);
          const season = pickPlayerSeason(pick);
          return `<small>${escapeHtml(player?.team_name || "Et hold")} valgte ${escapeHtml(pick.player_name)}${season ? ` ${escapeHtml(season)}` : ""}</small>`;
        }).join("") : `<small>Rundens valg vises her.</small>`}
      </div>
    </article>
  `;
}

function renderLineupDots(player) {
  if (!player) return "";
  const layout = friendsFormationLayouts[player.formation || sharedFriendFormation()] || [];
  return (player.lineup || []).map((slot, index) => {
    const [x, y] = layout[index] || [50, 50];
    const hasPlayer = Boolean(slot.player);
    return `<span class="${hasPlayer ? "filled" : ""}" style="left:${x}%;top:${y}%">${slot.role}</span>`;
  }).join("");
}

function renderPositionPlayers(role, me, isMyTurn) {
  if (!role || !me) {
    els.playerList.innerHTML = "";
    return;
  }
  const takenVersionKeys = new Set(friendsState.picks.map(pickVersionKey));
  const myPlayerNameKeys = new Set((me.lineup || [])
    .filter((slot) => slot.player)
    .map((slot) => playerNameKey(slot.player)));
  const currentSlot = currentFriendSlot(me);
  const formation = sharedFriendFormation();
  const useEmergencySlots = isMyTurn && currentSlot && !hasNormalFriendChoice(me, role, formation);

  const options = friendsPlayers
    .map((player) => {
      const versionAllowed = isFriendNameVersionAllowed(player);
      const canUseSlot = currentSlot && (
        canPlayFriendRole(player, role, formation) || (useEmergencySlots && canPlayEmergencyRole(player, role))
      );
      const availableSlots = canUseSlot ? [currentSlot] : [];
      const alreadyTaken = takenVersionKeys.has(playerVersionKey(player));
      const alreadyOnOwnTeam = myPlayerNameKeys.has(playerNameKey(player));
      const gameNameLimitReached = isFriendGameNameLimitReached(player);
      const canPick = isMyTurn && versionAllowed && !alreadyTaken && !alreadyOnOwnTeam && !gameNameLimitReached && availableSlots.length > 0;
      return { player, availableSlots, versionAllowed, alreadyTaken, alreadyOnOwnTeam, gameNameLimitReached, canPick };
    })
    .filter((item) => item.versionAllowed && item.availableSlots.length)
    .sort((a, b) => Number(b.player.score || 0) - Number(a.player.score || 0))
    .sort((a, b) => Number(b.player.score || 0) - Number(a.player.score || 0));

  els.playerList.innerHTML = options.map((item) => {
    const isPending = friendsState.pendingPick?.playerId === item.player.id;
    const availableRoles = item.alreadyTaken || item.alreadyOnOwnTeam || item.gameNameLimitReached ? [] : uniqueSlotsForButtons(item.availableSlots).map((slot) => slot.role);
    const status = item.alreadyTaken ? "Taget" : item.alreadyOnOwnTeam ? "Allerede på dit hold" : item.gameNameLimitReached ? "Maks. i spillet" : "";
    const slotButtons = item.canPick
      ? `<div class="friend-slot-buttons">
          <button type="button" data-player="${item.player.id}" data-slot="${currentSlot.id}">Vælg</button>
        </div>`
      : "";
    return `
      <article class="friend-player ${item.canPick ? "" : "disabled"} ${isPending ? "selected" : ""}">
        <div>
          <h3>${escapeHtml(item.player.name)}</h3>
          <div class="friend-player-meta">
            <span class="season-chip">${escapeHtml(item.player.season)}</span>
            ${isPending ? `<span class="player-status">Valg klar</span>` : ""}
            ${status ? `<span class="player-status">${escapeHtml(status)}</span>` : ""}
            ${availableRoles.map((role) => `<span class="available-role">${role}</span>`).join("")}
          </div>
        </div>
        <strong class="rating-badge ${Number(item.player.score || 0) >= 91 ? "elite" : ""}">${item.player.score || "--"}</strong>
        ${slotButtons}
      </article>
    `;
  }).join("");

  if (friendsState.pendingPick && isMyTurn) {
    const pendingPlayer = friendsPlayers.find((player) => player.id === friendsState.pendingPick.playerId);
    const pendingSlot = me.lineup.find((slot) => slot.id === friendsState.pendingPick.slotId);
    els.playerList.insertAdjacentHTML("afterbegin", `
      <div class="friend-pending-pick">
        <div>
          <span>Dit valg</span>
          <strong>${escapeHtml(pendingPlayer?.name || "")}${pendingPlayer?.season ? ` ${escapeHtml(pendingPlayer.season)}` : ""} · ${pendingSlot?.role || ""}</strong>
        </div>
        <button class="secondary-button" id="cancelFriendPickButton" type="button">Vælg om</button>
        <button class="primary-button" id="confirmFriendPickButton" type="button">Bekræft valg</button>
      </div>
    `);
  }

  els.playerList.querySelectorAll("button[data-player]").forEach((button) => {
    button.addEventListener("click", () => stageFriendPick(button.dataset.player, button.dataset.slot));
  });
  els.playerList.querySelector("#cancelFriendPickButton")?.addEventListener("click", () => {
    friendsState.pendingPick = null;
    renderDraft();
  });
  els.playerList.querySelector("#confirmFriendPickButton")?.addEventListener("click", confirmPendingPick);
}

function uniqueSlotsForButtons(slots) {
  return Object.values(slots.reduce((unique, slot) => {
    unique[slot.role] ||= { ...slot, label: slot.role };
    return unique;
  }, {}));
}

function stageFriendPick(playerId, slotId) {
  if (!validateFriendPick(playerId, slotId)) return;
  friendsState.pendingPick = { playerId, slotId };
  renderDraft();
}

async function confirmPendingPick() {
  const pending = friendsState.pendingPick;
  if (!pending) return;
  await pickFriendPlayer(pending.playerId, pending.slotId);
}

function validateFriendPick(playerId, slotId) {
  const room = friendsState.room;
  const me = friendsState.players.find((player) => player.id === friendsState.playerId);
  const role = room.current_season || currentFriendRole();
  const player = friendsPlayers.find((item) => item.id === playerId);
  const slot = me?.lineup.find((item) => item.id === slotId);
  if (!player || !slot || slot.player) return null;
  const formation = sharedFriendFormation();
  const useEmergencySlot = !hasNormalFriendChoice(me, role, formation) && canPlayEmergencyRole(player, role);
  if (slot.id !== currentFriendSlot(me)?.id || slot.role !== role || (!canPlayFriendRole(player, role, formation) && !useEmergencySlot)) return null;
  const key = playerVersionKey(player);
  const nameKey = playerNameKey(player);
  if (!isFriendNameVersionAllowed(player)) return null;
  if (friendsState.picks.some((pick) => pickVersionKey(pick) === key)) return null;
  if (isFriendGameNameLimitReached(player)) return null;
  if ((me.lineup || []).some((item) => item.player && playerNameKey(item.player) === nameKey)) return null;

  const nextLineup = me.lineup.map((item) => item.id === slot.id
    ? { ...item, player: serializeFriendPlayer(player), score: Number(player.score || 70) }
    : item);
  return { room, me, player, slot, key, nextLineup };
}

async function pickFriendPlayer(playerId, slotId) {
  const validated = validateFriendPick(playerId, slotId);
  if (!validated) return;
  const { room, me, player, slot, key, nextLineup } = validated;
  friendsState.pendingPick = null;

  if (friendsState.demo) {
    me.lineup = nextLineup;
    friendsState.picks.push(createPickRecord(me, player, slot, room));
    advanceDemoTurn();
    await runDemoBotsUntilUserTurn();
    renderRoom();
    return;
  }

  const client = requireClient();
  await insertOrThrow(client.from(picksTable).insert({
    room_code: friendsState.roomCode,
    friend_player_id: me.id,
    round_no: room.current_round,
    pick_index: room.current_pick_index,
    season: room.current_season,
    player_id: player.id,
    player_key: key,
    player_name: player.name,
    slot_id: slot.id,
    role: slot.role,
    score: Number(player.score || 70)
  }));
  await updateOrThrow(client.from(playersTable).update({ lineup: nextLineup }).eq("id", me.id));
  await advanceTurn(client, room);
  await refreshRoom();
}

function enterDemoRoom(name, formation) {
  const playerId = crypto.randomUUID();
  const demoPlayers = [createFriendPlayer(playerId, demoRoomCode, name, formation, 0)];
  friendsState = {
    roomCode: demoRoomCode,
    playerId,
    isHost: true,
    demo: true,
    room: {
      code: demoRoomCode,
      status: "lobby",
      host_player_id: playerId,
      current_round: 1,
      current_pick_index: 0,
      current_season: null,
      season_draw_counts: {}
    },
    players: demoPlayers,
    picks: [],
    tournament: null,
    pendingPick: null,
    lastSeenPickCount: 0,
    lastSeenRound: null
  };
  persistFriendSession(demoRoomCode, playerId, true);
  if (pollTimer) window.clearInterval(pollTimer);
  els.home.hidden = true;
  els.createPanel.hidden = true;
  els.roomPanel.hidden = false;
  els.roomCodeText.textContent = demoRoomCode;
  renderRoom();
  window.setTimeout(() => {
    if (friendsState.demo && friendsState.room?.status === "lobby" && friendsState.players.length < 2) {
      addDemoPlayer();
    }
  }, 700);
}

function addDemoPlayer() {
  if (!friendsState.demo || friendsState.room?.status !== "lobby") return;
  if (friendsState.players.length >= maxFriendsPlayers) return;
  const [teamName, formation] = demoOpponents[friendsState.players.length - 1] || [`Testhold ${friendsState.players.length + 1}`, "4-3-3"];
  friendsState.players.push(createFriendPlayer(crypto.randomUUID(), demoRoomCode, teamName, formation, friendsState.players.length));
  showFriendToast(`${teamName} er med i rummet.`);
  renderRoom();
}

async function runDemoBotsUntilUserTurn() {
  while (friendsState.room?.status === "drafting" && currentDemoPlayer()?.id !== friendsState.playerId) {
    demoBotPick(currentDemoPlayer());
    advanceDemoTurn();
    await new Promise((resolve) => window.setTimeout(resolve, 520));
  }
}

function currentDemoPlayer() {
  const roundIndex = Number(friendsState.room.current_round || 1) - 1;
  const order = draftOrderForRound(friendsState.players, roundIndex);
  return order[friendsState.room.current_pick_index] || order[0];
}

function demoBotPick(friendPlayer) {
  if (!friendPlayer) return;
  const role = friendsState.room.current_season || currentFriendRole();
  const slot = currentFriendSlot(friendPlayer);
  if (!role || !slot) return;
  const takenVersionKeys = new Set(friendsState.picks.map(pickVersionKey));
  const ownNameKeys = new Set((friendPlayer.lineup || [])
    .filter((lineupSlot) => lineupSlot.player)
    .map((lineupSlot) => playerNameKey(lineupSlot.player)));
  const formation = sharedFriendFormation();
  const useEmergencySlots = !hasNormalFriendChoice(friendPlayer, role, formation);
  const option = friendsPlayers
    .map((player) => ({
      player,
      slots: canPlayFriendRole(player, role, formation) || (useEmergencySlots && canPlayEmergencyRole(player, role)) ? [slot] : [],
      key: playerVersionKey(player),
      nameKey: playerNameKey(player)
    }))
    .filter((item) => item.slots.length)
    .sort((a, b) => Number(b.player.score || 0) - Number(a.player.score || 0))
    .filter((item) => isFriendNameVersionAllowed(item.player) && !takenVersionKeys.has(item.key) && !ownNameKeys.has(item.nameKey) && !isFriendGameNameLimitReached(item.player))
    .sort((a, b) => Number(b.player.score || 0) - Number(a.player.score || 0))[0];
  if (!option) return;
  friendPlayer.lineup = friendPlayer.lineup.map((item) => item.id === slot.id
    ? { ...item, player: serializeFriendPlayer(option.player), score: Number(option.player.score || 70) }
    : item);
  friendsState.picks.push(createPickRecord(friendPlayer, option.player, slot, friendsState.room));
  const roundPick = Number(friendsState.room.current_pick_index || 0) + 1;
  const roundSize = snakeOrder(friendsState.players, Number(friendsState.room.current_round || 1) - 1).length;
  showFriendToast(`Runde ${friendsState.room.current_round}, valg ${roundPick}/${roundSize}: ${friendPlayer.team_name} valgte ${option.player.name} ${option.player.season}.`);
}

function advanceDemoTurn() {
  const room = friendsState.room;
  const roundIndex = Number(room.current_round || 1) - 1;
  const order = draftOrderForRound(friendsState.players, roundIndex);
  const nextPick = Number(room.current_pick_index || 0) + 1;
  if (nextPick < order.length) {
    friendsState.room = { ...room, current_pick_index: nextPick };
    return;
  }
  const nextRound = Number(room.current_round || 1) + 1;
  if (nextRound > draftRounds) {
    friendsState.room = { ...room, status: "complete" };
    return;
  }
  const formation = sharedFriendFormation();
  const nextRole = roleForFriendRound(formation, nextRound);
  friendsState.room = {
    ...room,
    current_round: nextRound,
    current_pick_index: 0,
    current_season: nextRole,
    season_draw_counts: { ...(room.season_draw_counts || {}), formation }
  };
  friendsState.lastSeenRound = nextRound;
  showFriendDraw(`Runde ${nextRound}`, roleLabel(nextRole));
}

function createPickRecord(friendPlayer, player, slot, room) {
  return {
    room_code: friendsState.roomCode,
    friend_player_id: friendPlayer.id,
    round_no: room.current_round,
    pick_index: room.current_pick_index,
    season: room.current_season,
    player_id: player.id,
    player_key: playerVersionKey(player),
    player_name: player.name,
    slot_id: slot.id,
    role: slot.role,
    score: Number(player.score || 70)
  };
}

async function advanceTurn(client, room) {
  const players = friendsState.players;
  const roundIndex = Number(room.current_round || 1) - 1;
  const order = draftOrderForRound(players, roundIndex);
  const nextPick = Number(room.current_pick_index || 0) + 1;
  if (nextPick < order.length) {
    await updateOrThrow(client.from(roomsTable).update({ current_pick_index: nextPick }).eq("code", friendsState.roomCode));
    return;
  }
  const nextRound = Number(room.current_round || 1) + 1;
  if (nextRound > draftRounds) {
    await updateOrThrow(client.from(roomsTable).update({ status: "complete" }).eq("code", friendsState.roomCode));
    return;
  }
  const formation = sharedFriendFormation();
  const nextRole = roleForFriendRound(formation, nextRound);
  await updateOrThrow(client.from(roomsTable).update({
    current_round: nextRound,
    current_pick_index: 0,
    current_season: nextRole,
    season_draw_counts: { ...(room.season_draw_counts || {}), formation }
  }).eq("code", friendsState.roomCode));
}

function renderTournament() {
  const teams = friendsState.players.map(friendPlayerToTeam);
  friendsState.tournament ||= createTournamentState(teams);
  const tournament = friendsState.tournament;
  if (!tournament.started) {
    renderTournamentReady(teams);
    return;
  }
  const standings = standingsFromMatches(teams, tournament.matches.slice(0, tournament.revealed));
  const nextMatch = tournament.matches[tournament.revealed];
  const latestMatch = tournament.matches[tournament.revealed - 1];
  const isComplete = tournament.revealed >= tournament.matches.length;
  els.resultPanel.innerHTML = `
    <p class="eyebrow">Mini-turnering</p>
    <h2>${isComplete ? `🏆 ${escapeHtml(standings[0]?.name || "Vinderen")} vinder` : "Turneringen spilles"}</h2>
    ${latestMatch ? `
      <div class="friend-match-card">
        <span>${escapeHtml(latestMatch.home)}</span>
        <strong>${latestMatch.homeGoals}-${latestMatch.awayGoals}</strong>
        <span>${escapeHtml(latestMatch.away)}</span>
      </div>
    ` : ""}
    ${nextMatch ? `<p class="friend-next-match">Næste kamp: ${escapeHtml(nextMatch.home)} - ${escapeHtml(nextMatch.away)}</p>` : ""}
    <p class="friend-ranking-note">Ved pointlighed: målscore, flest mål, indbyrdes, højst score, bedste spiller.</p>
    <div class="friends-standings">
      ${standings.map((team, index) => `
        <div>
          <strong>${index === 0 && isComplete ? "🏆 " : ""}${index + 1}. ${escapeHtml(team.name)}</strong>
          <span>${team.points} point · ${team.goalDiff >= 0 ? "+" : ""}${team.goalDiff} · ${team.goalsFor}-${team.goalsAgainst}</span>
          <button class="secondary-button standings-lineup-button" type="button" data-lineup-team="${team.id}">Se hold</button>
        </div>
      `).join("")}
    </div>
    ${isComplete ? `
      <div class="friend-share-actions">
        <button class="primary-button" id="shareFriendStandingsButton" type="button">Del slutstilling</button>
        <button class="secondary-button" id="playFriendsAgainButton" type="button">Spil igen</button>
      </div>
    ` : ""}
    <div class="friends-results friend-match-list">
      ${tournament.matches.slice(0, tournament.revealed).map((match) => `
        <span>${escapeHtml(match.home)} ${match.homeGoals}-${match.awayGoals} ${escapeHtml(match.away)}</span>
      `).join("")}
    </div>
  `;
  attachFriendLineupButtons(teams);
  els.resultPanel.querySelector("#shareFriendStandingsButton")?.addEventListener("click", () => shareFriendStandings(standings, tournament.matches));
  els.resultPanel.querySelector("#playFriendsAgainButton")?.addEventListener("click", () => {
    clearFriendSession();
    window.location.href = "/friends.html";
  });
  runTournamentAutoReveal();
}

function renderTournamentReady(teams) {
  els.resultPanel.innerHTML = `
    <p class="eyebrow">Klar til turnering</p>
    <h2>Holdene er klar</h2>
    <div class="friend-ready-list">
      ${teams.map((team) => `
        <article class="friend-ready-row">
          <strong>${escapeHtml(team.name)}</strong>
          <span>${team.formation}</span>
          <span class="${Number(team.score || 0) >= 91 ? "elite" : ""}">${team.score}/100</span>
          <button class="secondary-button" type="button" data-lineup-team="${team.id}">Se hold</button>
        </article>
      `).join("")}
    </div>
    <button class="primary-button" id="startFriendTournamentButton" type="button">Start turnering</button>
  `;
  attachFriendLineupButtons(teams);
  els.resultPanel.querySelector("#startFriendTournamentButton")?.addEventListener("click", () => {
    friendsState.tournament.started = true;
    friendsState.tournament.revealed = 0;
    renderTournament();
  });
}

function attachFriendLineupButtons(teams) {
  els.resultPanel.querySelectorAll("[data-lineup-team]").forEach((button) => {
    button.addEventListener("click", () => {
      const team = teams.find((item) => item.id === button.dataset.lineupTeam);
      openFriendTeamModal(team);
    });
  });
}

async function shareFriendStandings(standings, matches = []) {
  const blob = await friendStandingsImageBlob(standings, matches);
  showFriendStandingsPreview(blob, standings);
}

function friendStandingsText(standings) {
  const lines = standings.map((team, index) => {
    const trophy = index === 0 ? "🏆 " : "";
    const goalDiff = team.goalDiff >= 0 ? `+${team.goalDiff}` : `${team.goalDiff}`;
    return `${trophy}${index + 1}. ${team.name} - ${team.points} point · ${goalDiff} · ${team.goalsFor}-${team.goalsAgainst}`;
  });
  return `Start11 med venner\n${lines.join("\n")}\n\n#Sortsnak #Start11`;
}

async function friendStandingsImageBlob(standings, matches = []) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  await renderFriendStandingsCanvas(canvas, standings, matches);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", .95));
}

async function renderFriendStandingsCanvas(canvas, standings, matches = []) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#2b1115");
  gradient.addColorStop(.45, "#151719");
  gradient.addColorStop(1, "#0e130f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(820, 170, 60, 820, 170, 520);
  glow.addColorStop(0, "rgba(215, 166, 61, .16)");
  glow.addColorStop(1, "rgba(215, 166, 61, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  await drawFriendLogo(ctx, 72, 64, 92);

  ctx.fillStyle = "#f4f4f1";
  ctx.font = "900 62px Inter, system-ui, sans-serif";
  ctx.fillText("Start11", 186, 116);
  ctx.fillStyle = "#a9adb2";
  ctx.font = "750 27px Inter, system-ui, sans-serif";
  ctx.fillText("Sort Snak · med venner", 188, 155);

  ctx.textAlign = "right";
  ctx.fillStyle = "#d7a63d";
  ctx.font = "900 46px Inter, system-ui, sans-serif";
  ctx.fillText("Slutstilling", 1008, 108);
  ctx.fillStyle = "#a9adb2";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.fillText(`${standings.length} hold`, 1008, 146);
  ctx.textAlign = "left";

  const winner = standings[0];
  ctx.fillStyle = "rgba(215, 166, 61, .14)";
  friendRoundRect(ctx, 70, 214, 940, 132, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(215, 166, 61, .78)";
  ctx.lineWidth = 3;
  friendRoundRect(ctx, 70, 214, 940, 132, 24);
  ctx.stroke();
  ctx.fillStyle = "#d7a63d";
  ctx.font = "900 34px Inter, system-ui, sans-serif";
  ctx.fillText("Vinder", 110, 266);
  ctx.fillStyle = "#f4f4f1";
  ctx.font = "950 48px Inter, system-ui, sans-serif";
  ctx.fillText(fitFriendCanvasText(ctx, `🏆 ${winner?.name || "Vinderen"}`, 650), 110, 322);
  ctx.textAlign = "right";
  ctx.fillStyle = "#d7a63d";
  ctx.font = "950 42px Inter, system-ui, sans-serif";
  ctx.fillText(`${winner?.score || "--"}/100`, 970, 322);
  ctx.textAlign = "left";

  const rowY = 400;
  standings.forEach((team, index) => {
    const y = rowY + index * 104;
    ctx.fillStyle = index === 0 ? "rgba(17, 19, 21, .94)" : "rgba(8, 10, 11, .70)";
    friendRoundRect(ctx, 70, y, 940, 78, 16);
    ctx.fill();
    if (index === 0) {
      ctx.strokeStyle = "rgba(215, 166, 61, .42)";
      ctx.lineWidth = 2;
      friendRoundRect(ctx, 70, y, 940, 78, 16);
      ctx.stroke();
    }

    ctx.fillStyle = index === 0 ? "#d7a63d" : "#a9adb2";
    ctx.font = "900 30px Inter, system-ui, sans-serif";
    ctx.fillText(index === 0 ? "🏆" : `${index + 1}.`, 108, y + 50);

    ctx.fillStyle = "#f4f4f1";
    ctx.font = "900 32px Inter, system-ui, sans-serif";
    ctx.fillText(fitFriendCanvasText(ctx, team.name, 350), 176, y + 50);

    const goalDiff = team.goalDiff >= 0 ? `+${team.goalDiff}` : `${team.goalDiff}`;
    ctx.textAlign = "right";
    ctx.fillStyle = Number(team.score || 0) >= 91 ? "#d7a63d" : "#a9adb2";
    ctx.font = "950 28px Inter, system-ui, sans-serif";
    ctx.fillText(`${team.score || "--"}/100`, 640, y + 50);
    ctx.fillStyle = "#a9adb2";
    ctx.font = "850 28px Inter, system-ui, sans-serif";
    ctx.fillText(`${team.points} point · ${goalDiff}`, 820, y + 50);
    ctx.fillStyle = "#d7a63d";
    ctx.font = "950 30px Inter, system-ui, sans-serif";
    ctx.fillText(`${team.goalsFor}-${team.goalsAgainst}`, 970, y + 50);
    ctx.textAlign = "left";
  });

  const matchLines = matches.slice(0, 6).map((match) => `${match.home} ${match.homeGoals}-${match.awayGoals} ${match.away}`);
  const footerY = 852;
  ctx.fillStyle = "rgba(17, 19, 21, .72)";
  friendRoundRect(ctx, 70, footerY, 940, 118, 18);
  ctx.fill();
  ctx.fillStyle = "#a9adb2";
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  ctx.fillText("Kampe", 106, footerY + 38);
  ctx.fillStyle = "#f4f4f1";
  ctx.font = "800 23px Inter, system-ui, sans-serif";
  const matchText = matchLines.length ? matchLines.join(" · ") : "Turneringen er færdig";
  ctx.fillText(fitFriendCanvasText(ctx, matchText, 860), 106, footerY + 78);

  ctx.fillStyle = "#a9adb2";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.fillText("#Sortsnak #Start11", 70, 1030);
}

function showFriendStandingsPreview(blob, standings) {
  document.querySelector("#friendStandingsPreviewModal")?.remove();
  const imageUrl = URL.createObjectURL(blob);
  const overlay = document.createElement("div");
  overlay.id = "friendStandingsPreviewModal";
  overlay.className = "share-preview-modal";
  overlay.innerHTML = `
    <div class="share-preview-card" role="dialog" aria-modal="true" aria-labelledby="friendStandingsPreviewTitle">
      <button class="modal-close" type="button" aria-label="Luk">×</button>
      <div class="share-preview-header">
        <p class="eyebrow">Del slutstilling</p>
        <h3 id="friendStandingsPreviewTitle">Start11 med venner</h3>
        <p>Tryk del for at sende billedet videre. På iPhone kan du også holde fingeren på billedet og gemme det i Fotos.</p>
      </div>
      <img src="${imageUrl}" alt="Delbart billede af slutstillingen">
      <div class="share-preview-actions">
        <button class="primary-button" type="button" data-action="share">
          <span aria-hidden="true">↗</span>
          Del billede
        </button>
        <button class="pick-button" type="button" data-action="download">
          <span aria-hidden="true">⇩</span>
          Hent billede
        </button>
      </div>
    </div>
  `;
  const close = () => {
    URL.revokeObjectURL(imageUrl);
    overlay.remove();
  };
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector('[data-action="share"]').addEventListener("click", async () => {
    await nativeShareFriendBlob(blob, "sort-snak-start11-slutstilling.png", friendStandingsText(standings));
  });
  overlay.querySelector('[data-action="download"]').addEventListener("click", () => {
    downloadFriendBlob(blob, "sort-snak-start11-slutstilling.png");
  });
  document.body.append(overlay);
}

async function nativeShareFriendBlob(blob, filename, text) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Start11 med venner", text });
  } else {
    downloadFriendBlob(blob, filename);
  }
}

function downloadFriendBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function runTournamentAutoReveal() {
  const tournament = friendsState.tournament;
  if (!tournament || tournament.autoRunning || tournament.revealed >= tournament.matches.length) return;
  tournament.autoRunning = true;
  window.setTimeout(() => {
    tournament.revealed += 1;
    tournament.autoRunning = false;
    renderTournament();
  }, friendMatchRevealDelay);
}

function playMiniLeague(teams) {
  const table = teams.map((team) => ({ ...team, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, matches: [] }));
  for (let i = 0; i < table.length; i += 1) {
    for (let j = i + 1; j < table.length; j += 1) {
      const result = simulateFriendMatch(table[i], table[j]);
      applyResult(table[i], table[j], result);
    }
  }
  table.forEach((team) => { team.goalDiff = team.goalsFor - team.goalsAgainst; });
  return table.sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    b.score - a.score
  );
}

function createTournamentState(teams) {
  const matches = [];
  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      matches.push({
        home: teams[i].name,
        away: teams[j].name,
        ...simulateFriendMatch(teams[i], teams[j])
      });
    }
  }
  return { matches, revealed: 0, started: false, autoRunning: false };
}

function standingsFromMatches(teams, matches) {
  const table = teams.map((team) => ({ ...team, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, matches: [] }));
  const byName = Object.fromEntries(table.map((team) => [team.name, team]));
  matches.forEach((match) => {
    const home = byName[match.home];
    const away = byName[match.away];
    if (!home || !away) return;
    applyResult(home, away, match);
  });
  table.forEach((team) => { team.goalDiff = team.goalsFor - team.goalsAgainst; });
  return table.sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    headToHeadDiff(b, a, matches) ||
    b.score - a.score ||
    b.best - a.best
  );
}

function headToHeadDiff(teamA, teamB, matches) {
  const match = matches.find((item) =>
    (item.home === teamA.name && item.away === teamB.name) ||
    (item.home === teamB.name && item.away === teamA.name)
  );
  if (!match) return 0;
  if (match.home === teamA.name) return (match.homeGoals - match.awayGoals) - (match.awayGoals - match.homeGoals);
  return (match.awayGoals - match.homeGoals) - (match.homeGoals - match.awayGoals);
}

function openFriendTeamModal(team) {
  if (!team?.lineup?.length) return;
  closeFriendTeamModal();
  const overlay = document.createElement("div");
  overlay.className = "lineup-modal";
  overlay.id = "friendLineupModal";
  overlay.innerHTML = `
    <section class="lineup-modal-card" aria-labelledby="friendLineupModalTitle">
      <button class="modal-close lineup-modal-close" type="button" aria-label="Luk holdvisning">×</button>
      <div class="lineup-modal-header">
        <div>
          <p class="eyebrow">Start11 med venner</p>
          <h3 id="friendLineupModalTitle"></h3>
        </div>
        <div>
          <span>${team.score}/100</span>
          <small>${team.formation}</small>
        </div>
      </div>
      <div class="lineup-preview-pitch" aria-label="Vennehold"></div>
    </section>
  `;
  overlay.querySelector("#friendLineupModalTitle").textContent = team.name || "Start11";
  overlay.querySelector(".lineup-preview-pitch").append(renderFriendModalPitch(team));
  overlay.querySelector(".lineup-modal-close").addEventListener("click", closeFriendTeamModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeFriendTeamModal();
  });
  document.body.append(overlay);
  document.addEventListener("keydown", closeFriendTeamModalOnEscape);
}

function closeFriendTeamModalOnEscape(event) {
  if (event.key === "Escape") closeFriendTeamModal();
}

function closeFriendTeamModal() {
  document.querySelector("#friendLineupModal")?.remove();
  document.removeEventListener("keydown", closeFriendTeamModalOnEscape);
}

function renderFriendModalPitch(team) {
  const fragment = document.createDocumentFragment();
  team.lineup.forEach((slot, index) => {
    const [x, y] = friendsFormationLayouts[team.formation]?.[index] || [50, 50];
    const player = slot.player || {};
    const score = Number(slot.score || player.score || 0);
    const node = document.createElement("div");
    node.className = "slot highscore-slot";
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.innerHTML = `
      <span class="rating ${score >= 91 ? "elite" : ""}">${score || "--"}</span>
      <strong>${escapeHtml(player.name || "Ledig")}</strong>
      <small>${slot.role}${player.season ? ` · ${escapeHtml(player.season)}` : ""}</small>
    `;
    fragment.append(node);
  });
  return fragment;
}

function simulateFriendMatch(home, away) {
  const homePower = teamPower(home);
  const awayPower = teamPower(away);
  const openMatch = Math.random() < 0.22;
  const homeXg = friendExpectedGoals(homePower.attack, awayPower.defense, homePower.midfield, awayPower.midfield, 0.08, openMatch);
  const awayXg = friendExpectedGoals(awayPower.attack, homePower.defense, awayPower.midfield, homePower.midfield, 0, openMatch);
  let homeGoals = sampleFriendGoals(homeXg);
  let awayGoals = sampleFriendGoals(awayXg);
  ({ homeGoals, awayGoals } = addFriendBreakawayGoal(homePower, awayPower, homeGoals, awayGoals, openMatch));
  return {
    homeGoals,
    awayGoals
  };
}

function friendExpectedGoals(attack, defense, midfield, opponentMidfield, homeBonus = 0, openMatch = false) {
  const base = 1.12 + homeBonus;
  const attackEdge = (attack - defense) * 0.045;
  const midfieldEdge = (midfield - opponentMidfield) * 0.014;
  const openBonus = openMatch ? 0.30 : 0;
  return clampNumber(base + attackEdge + midfieldEdge + openBonus + randomBetween(-0.20, 0.20), 0.25, 3.35);
}

function addFriendBreakawayGoal(home, away, homeGoals, awayGoals, openMatch) {
  if (!openMatch || homeGoals === awayGoals) return { homeGoals, awayGoals };
  const homeEdge = (home.attack + home.midfield) - (away.defense + away.midfield);
  const awayEdge = (away.attack + away.midfield) - (home.defense + home.midfield);
  if (homeGoals > awayGoals && homeEdge > 5 && Math.random() < 0.24) {
    return { homeGoals: Math.min(5, homeGoals + 1), awayGoals };
  }
  if (awayGoals > homeGoals && awayEdge > 5 && Math.random() < 0.24) {
    return { homeGoals, awayGoals: Math.min(5, awayGoals + 1) };
  }
  return { homeGoals, awayGoals };
}

function sampleFriendGoals(expected) {
  let goals = 0;
  let chance = expected;
  while (goals < 5 && Math.random() < chance / (goals + 1.25)) {
    goals += 1;
    chance *= 0.68;
  }
  return goals;
}

function applyResult(home, away, result) {
  home.goalsFor += result.homeGoals;
  home.goalsAgainst += result.awayGoals;
  away.goalsFor += result.awayGoals;
  away.goalsAgainst += result.homeGoals;
  if (result.homeGoals > result.awayGoals) home.points += 3;
  else if (result.awayGoals > result.homeGoals) away.points += 3;
  else {
    home.points += 1;
    away.points += 1;
  }
  const match = { home: home.name, away: away.name, ...result };
  home.matches.push(match);
}

function friendPlayerToTeam(player) {
  const lineup = player.lineup || [];
  const scores = lineup.map((slot) => Number(slot.score || slot.player?.score || 70));
  return {
    id: player.id,
    name: player.team_name,
    formation: player.formation,
    score: Math.round(scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length)),
    best: Math.max(...scores),
    lineup
  };
}

function teamPower(team) {
  const groups = { attack: [], midfield: [], defense: [] };
  team.lineup.forEach((slot) => {
    const score = Number(slot.score || slot.player?.score || 70);
    if (["ST", "LW", "RW"].includes(slot.role)) groups.attack.push(score);
    else if (["CM", "DM", "AM", "LM", "RM"].includes(slot.role)) groups.midfield.push(score);
    else groups.defense.push(score);
  });
  return {
    attack: average(groups.attack),
    midfield: average(groups.midfield),
    defense: average(groups.defense)
  };
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 75;
}

function draftOrderForRound(players, roundIndex) {
  const storedOrder = friendsState.room?.season_draw_counts?.draftOrders?.[roundIndex];
  if (Array.isArray(storedOrder) && storedOrder.length) {
    const byId = new Map(players.map((player) => [player.id, player]));
    const ordered = storedOrder.map((id) => byId.get(id)).filter(Boolean);
    const missing = players.filter((player) => !storedOrder.includes(player.id));
    if (ordered.length) return [...ordered, ...missing];
  }
  return snakeOrder(players, roundIndex);
}

function snakeOrder(players, roundIndex) {
  const sorted = [...players].sort((a, b) => a.order_index - b.order_index);
  return roundIndex % 2 === 0 ? sorted : sorted.reverse();
}

function createFriendDraftOrders(players, openingOrder = shuffledPlayerOrder(players)) {
  const ids = openingOrder.filter((id) => players.some((player) => player.id === id));
  const playerCount = ids.length;
  if (playerCount < 2) return Array.from({ length: draftRounds }, () => ids);
  const firstPickCounts = Object.fromEntries(ids.map((id) => [id, 0]));
  const firstPickTarget = createFirstPickTargets(ids);
  const firstPicks = [];
  for (let roundIndex = 0; roundIndex < draftRounds; roundIndex += 1) {
    const previousFirst = firstPicks[roundIndex - 1];
    const candidates = ids
      .filter((id) => id !== previousFirst && firstPickCounts[id] < firstPickTarget[id])
      .sort((a, b) =>
        (firstPickTarget[b] - firstPickCounts[b]) - (firstPickTarget[a] - firstPickCounts[a]) ||
        Math.random() - 0.5
      );
    const first = candidates[0] || ids.find((id) => id !== previousFirst) || ids[0];
    firstPicks.push(first);
    firstPickCounts[first] += 1;
  }
  const lowFirstPickers = ids
    .filter((id) => firstPickTarget[id] === Math.min(...Object.values(firstPickTarget)));
  return firstPicks.map((first, roundIndex) => {
    const previousFirst = firstPicks[roundIndex - 1];
    const rest = ids.filter((id) => id !== first && id !== previousFirst);
    const preferred = lowFirstPickers
      .filter((id) => id !== first && rest.includes(id))
      .sort((a, b) => firstPickCounts[a] - firstPickCounts[b]);
    const middle = rest.filter((id) => !preferred.includes(id));
    shuffleInPlace(middle);
    const orderedRest = [...preferred, ...middle];
    if (previousFirst && previousFirst !== first) orderedRest.push(previousFirst);
    return [first, ...orderedRest.filter((id, index, array) => array.indexOf(id) === index)];
  });
}

function createFirstPickTargets(ids) {
  const base = Math.floor(draftRounds / ids.length);
  const extra = draftRounds % ids.length;
  const shuffled = [...ids];
  shuffleInPlace(shuffled);
  return Object.fromEntries(ids.map((id) => [
    id,
    base + (shuffled.slice(0, extra).includes(id) ? 1 : 0)
  ]));
}

function randomFriendFormation() {
  return randomItem(Object.keys(friendsFormations));
}

function shuffledPlayerOrder(players) {
  const ids = players.map((player) => player.id);
  shuffleInPlace(ids);
  return ids;
}

function shuffleInPlace(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyFriendDraftOrder(players, playerOrder) {
  const orderMap = new Map(playerOrder.map((id, index) => [id, index]));
  return players.map((player) => ({
    ...player,
    order_index: orderMap.get(player.id) ?? player.order_index
  }));
}

function resetFriendPlayerFormation(player, formation) {
  return {
    ...player,
    formation,
    lineup: friendsFormations[formation].map((role, index) => ({ id: `${role}-${index}`, role, player: null }))
  };
}

function normalizeFriendPlayersForRoom(room, players) {
  if (room?.status === "lobby") return players;
  const formation = room?.season_draw_counts?.formation || players[0]?.formation || defaultFriendFormation;
  const roles = friendsFormations[formation] || friendsFormations[defaultFriendFormation];
  return players.map((player) => normalizeFriendPlayerFormation(player, formation, roles));
}

function normalizeFriendPlayerFormation(player, formation, roles = friendsFormations[formation] || []) {
  const existingLineup = player.lineup || [];
  const nextLineup = roles.map((role, index) => {
    const existing = existingLineup[index] || {};
    return {
      ...existing,
      id: `${role}-${index}`,
      role,
      player: existing.player || null
    };
  });
  return { ...player, formation, lineup: nextLineup };
}

async function repairFriendPlayerFormations(client, room, players) {
  if (!client || !room || room.status === "lobby") return;
  const formation = room.season_draw_counts?.formation;
  if (!formation || !friendsFormations[formation]) return;
  const roles = friendsFormations[formation];
  const repairs = players.filter((player) =>
    player.formation !== formation ||
    (player.lineup || []).length !== roles.length ||
    roles.some((role, index) => player.lineup?.[index]?.role !== role)
  );
  if (!repairs.length) return;
  await Promise.all(repairs.map((player) => {
    const normalized = normalizeFriendPlayerFormation(player, formation, roles);
    return updateOrThrow(client.from(playersTable).update({
      formation: normalized.formation,
      lineup: normalized.lineup
    }).eq("id", player.id));
  }));
}

function sharedFriendFormation() {
  return friendsState.room?.season_draw_counts?.formation || friendsState.players[0]?.formation || defaultFriendFormation;
}

function roleForFriendRound(formation, roundNumber) {
  return friendsFormations[formation]?.[Number(roundNumber || 1) - 1] || "GK";
}

function currentFriendRole() {
  return roleForFriendRound(sharedFriendFormation(), friendsState.room?.current_round || 1);
}

function currentFriendSlot(friendPlayer) {
  const index = Number(friendsState.room?.current_round || 1) - 1;
  return friendPlayer?.lineup?.[index] || null;
}

function roleLabel(role) {
  if (!role) return "--";
  const text = friendRoleNames[role] || role;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} (${role})`;
}

function roleDraftText(role) {
  if (!role) return "næste position";
  return `${friendRoleNames[role] || role} (${role})`;
}

function getAvailableSlots(friendPlayer, player, allowEmergencySlots = false) {
  return (friendPlayer.lineup || []).filter((slot) => {
    if (slot.player) return false;
    return canPlayFriendRole(player, slot.role, friendPlayer.formation) || (allowEmergencySlots && canPlayEmergencyRole(player, slot.role));
  });
}

function hasNormalFriendChoice(friendPlayer, role, formation = sharedFriendFormation()) {
  const slot = currentFriendSlot(friendPlayer);
  if (!slot) return false;
  const takenVersionKeys = new Set(friendsState.picks.map(pickVersionKey));
  const ownNameKeys = new Set((friendPlayer.lineup || [])
    .filter((lineupSlot) => lineupSlot.player)
    .map((lineupSlot) => playerNameKey(lineupSlot.player)));
  return friendsPlayers.some((player) =>
    canPlayFriendRole(player, role, formation) &&
    isFriendNameVersionAllowed(player) &&
    !takenVersionKeys.has(playerVersionKey(player)) &&
    !ownNameKeys.has(playerNameKey(player)) &&
    !isFriendGameNameLimitReached(player)
  );
}

function canPlayRole(player, role) {
  return friendPlayerPositions(player).includes(role);
}

function canPlayFriendRole(player, role, formation = sharedFriendFormation()) {
  const positions = friendPlayerPositions(player);
  if (positions.includes(role)) return true;
  if (["DM", "CM", "AM"].includes(role)) {
    return positions.some((position) => ["DM", "CM", "AM"].includes(position));
  }
  if (role === "LM") {
    return formation === "3-5-2" && positions.includes("LB");
  }
  if (role === "RM") {
    return formation === "3-5-2" && positions.includes("RB");
  }
  return false;
}

function canPlayEmergencyRole(player, role) {
  if (role === "GK") return false;
  const emergencyRoles = {
    LM: ["LB", "LW"],
    RM: ["RB", "RW"],
    ST: ["LW", "RW"],
    CM: ["LM", "RM", "ML", "MR"],
    DM: ["CM", "LM", "RM", "ML", "MR"],
    AM: ["CM", "LW", "RW"],
    LB: ["CB"],
    RB: ["CB"],
    CB: ["LB", "RB"],
    LW: ["ST", "LM", "ML"],
    RW: ["ST", "RM", "MR"]
  };
  const allowed = emergencyRoles[role] || [];
  return friendPlayerPositions(player).some((position) => allowed.includes(position));
}

function friendPlayerPositions(player) {
  const aliases = { ML: "LM", MR: "RM", HB: "RB", VB: "LB" };
  return (player.positions || []).map((position) => aliases[position] || position);
}

function lineupCount(lineup) {
  return (lineup || []).filter((slot) => slot.player).length;
}

function draftAverage(lineup) {
  const scores = (lineup || [])
    .filter((slot) => slot.player)
    .map((slot) => Number(slot.score || slot.player?.score || 0))
    .filter(Boolean);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
}

function playerKey(player) {
  return String(player.name || player.player_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function playerNameKey(player) {
  return playerKey(player);
}

function friendNameVersionCap() {
  const playerCount = Math.max(2, friendsState.players.length || 2);
  if (playerCount <= 3) return 1;
  if (playerCount <= 6) return 2;
  return 3;
}

function isFriendGameNameLimitReached(player) {
  const nameKey = playerNameKey(player);
  const count = friendsState.picks.filter((pick) => playerNameKey(pick) === nameKey).length;
  return count >= friendNameVersionCap();
}

function isFriendNameVersionAllowed(player) {
  const nameKey = playerNameKey(player);
  const cap = friendNameVersionCap();
  const allowedKeys = friendsPlayers
    .filter((item) => playerNameKey(item) === nameKey)
    .sort((a, b) => stableFriendVersionRank(a) - stableFriendVersionRank(b))
    .slice(0, cap)
    .map(playerVersionKey);
  return allowedKeys.includes(playerVersionKey(player));
}

function stableFriendVersionRank(player) {
  const seed = `${friendsState.roomCode || "demo"}|${playerNameKey(player)}|${playerVersionKey(player)}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function playerVersionKey(player) {
  return `${playerNameKey(player)}__${String(player.season || "").toLowerCase().replace(/[^0-9a-z]/g, "")}`;
}

function pickVersionKey(pick) {
  const player = friendsPlayers.find((item) => item.id === pick.player_id);
  return player ? playerVersionKey(player) : String(pick.player_key || "");
}

function pickPlayerSeason(pick) {
  return friendsPlayers.find((item) => item.id === pick.player_id)?.season || "";
}

function serializeFriendPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    season: player.season,
    positions: player.positions,
    score: Number(player.score || 70)
  };
}

async function fetchRoom(client, code) {
  const { data, error } = await client.from(roomsTable).select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchPlayers(client, code) {
  const { data, error } = await client.from(playersTable).select("*").eq("room_code", code).order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchPicks(client, code) {
  const { data, error } = await client.from(picksTable).select("*").eq("room_code", code).order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function createUniqueRoomCode(client) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
    const existing = await fetchRoom(client, code);
    if (!existing) return code;
  }
  throw new Error("Kunne ikke oprette en unik rumkode.");
}

async function insertOrThrow(query) {
  const { error } = await query;
  if (error) throw error;
}

async function updateOrThrow(query) {
  const { error } = await query;
  if (error) throw error;
}

function requireClient() {
  const client = getClient();
  if (!client) throw new Error("Supabase mangler. Tjek supabase-config.js.");
  return client;
}

async function copyRoomCode() {
  const link = friendInviteLink(friendsState.roomCode);
  const code = friendsState.roomCode;
  const text = `Spil Start11 med venner:\n${link}\n\nTurneringskode: ${code}`;
  const copied = await copyTextToClipboard(text);
  showFriendToast(copied ? "Invitationen er kopieret." : "Kunne ikke kopiere invitationen.");
}

function friendInviteLink(code) {
  return `${window.location.origin}/friends.html?kode=${encodeURIComponent(code)}`;
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Fall back below for browsers that expose Clipboard API but reject it.
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function persistFriendSession(roomCode, playerId, isHost) {
  localStorage.setItem(friendStorageKeys.playerId, playerId);
  localStorage.setItem(friendStorageKeys.roomCode, roomCode);
  localStorage.setItem(friendStorageKeys.isHost, isHost ? "1" : "0");
}

function clearFriendSession() {
  localStorage.removeItem(friendStorageKeys.playerId);
  localStorage.removeItem(friendStorageKeys.roomCode);
  localStorage.removeItem(friendStorageKeys.isHost);
}

function leaveFriendGame() {
  const shouldLeave = window.confirm("Vil du forlade spillet i denne browser?");
  if (!shouldLeave) return;
  clearFriendSession();
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  friendsState = {
    roomCode: "",
    playerId: "",
    isHost: false,
    demo: false,
    room: null,
    players: [],
    picks: [],
    tournament: null,
    pendingPick: null,
    lastSeenPickCount: 0,
    lastSeenRound: null
  };
  window.location.href = "/friends.html";
}

function hydrateFriendInviteCode() {
  const params = new URLSearchParams(window.location.search);
  const code = cleanRoomCode(params.get("kode") || params.get("code") || "");
  if (!code) return;
  els.joinRoomCode.value = code;
  els.joinRoomForm.hidden = false;
}

async function restoreFriendSession(attempt = 0) {
  if (friendsState.roomCode || friendsState.demo) return;
  const roomCode = cleanRoomCode(localStorage.getItem(friendStorageKeys.roomCode) || "");
  const playerId = localStorage.getItem(friendStorageKeys.playerId) || "";
  if (!roomCode || !playerId || roomCode === demoRoomCode) return;

  const params = new URLSearchParams(window.location.search);
  const requestedCode = cleanRoomCode(params.get("kode") || params.get("code") || "");
  if (requestedCode && requestedCode !== roomCode) return;

  const client = getClient();
  if (!client) {
    if (attempt < 6) window.setTimeout(() => restoreFriendSession(attempt + 1), 350);
    return;
  }

  try {
    const [room, players] = await Promise.all([
      fetchRoom(client, roomCode),
      fetchPlayers(client, roomCode)
    ]);
    const savedPlayer = players.find((player) => player.id === playerId);
    if (!room || !savedPlayer) {
      clearFriendSession();
      return;
    }
    enterRoom(roomCode, playerId, room.host_player_id === playerId);
    showFriendToast("Du er tilbage i din turnering.");
  } catch (error) {
    if (attempt < 2) {
      window.setTimeout(() => restoreFriendSession(attempt + 1), 500);
      return;
    }
    clearFriendSession();
  }
}

function setStatus(message) {
  els.roomStatusText.textContent = message;
  alert(message);
}

function announceNewRemotePicks() {
  if (friendsState.lastSeenPickCount === 0) {
    friendsState.lastSeenPickCount = friendsState.picks.length;
    return;
  }
  const newPicks = friendsState.picks.slice(friendsState.lastSeenPickCount);
  friendsState.lastSeenPickCount = friendsState.picks.length;
  newPicks.forEach((pick) => {
    const player = friendsState.players.find((item) => item.id === pick.friend_player_id);
    if (pick.friend_player_id !== friendsState.playerId) {
      const roundSize = friendsState.players.length || maxFriendsPlayers;
      showFriendToast(`Runde ${pick.round_no}, valg ${Number(pick.pick_index || 0) + 1}/${roundSize}: ${player?.team_name || "Et hold"} valgte ${pick.player_name}.`);
    }
  });
}

function showFriendDraw(title, value, note = "") {
  const modal = document.createElement("div");
  modal.className = "friend-draw-modal";
  modal.innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(title)}</p>
      <strong>${escapeHtml(value)}</strong>
      ${note ? `<small>${escapeHtml(note)}</small>` : ""}
    </div>
  `;
  document.body.append(modal);
  const close = () => modal.remove();
  modal.addEventListener("click", close);
  window.setTimeout(close, 1300);
}

function showFriendToast(message) {
  let wrap = document.querySelector(".friend-toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "friend-toast-wrap";
    document.body.append(wrap);
  }
  wrap.replaceChildren();
  const toast = document.createElement("div");
  toast.className = "friend-toast";
  toast.textContent = message;
  wrap.append(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function cleanName(value) {
  return String(value || "").trim().slice(0, 18);
}

function cleanRoomCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[character]));
}

function fitFriendCanvasText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = String(text || "");
  while (trimmed.length > 4 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

async function drawFriendLogo(ctx, x, y, size) {
  const logo = await loadFriendImage("/assets/sort-snak-logo.png?v=20260615-podcast-logo");
  if (logo) {
    ctx.drawImage(logo, x, y, size, size);
    return;
  }
  ctx.fillStyle = "#c70f2e";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function loadFriendImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function friendRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

initFriends();
