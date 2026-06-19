const SUPABASE_TABLE = "startellever_teams";
const ALLOWED_FORMATIONS = new Set(["4-3-3", "4-2-3-1", "3-5-2", "3-4-3", "4-4-2"]);
const ALLOWED_ROLES = new Set(["GK", "RB", "CB", "LB", "DM", "CM", "AM", "LM", "RM", "LW", "RW", "ST"]);
const GOLD_CUP_WINS = 10;
const MAX_CUP_WINS = 200;

module.exports = async function submitScore(req, res) {
  setSecurityHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const row = buildDatabaseRow(payload || {});
    const inserted = await insertSupabaseRow(row);
    return res.status(200).json({ id: inserted.id });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({ error: error.publicMessage || "Score could not be saved" });
  }
};

function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function buildDatabaseRow(payload) {
  const playerName = sanitizeName(payload.name);
  const formation = sanitizeFormation(payload.formation);
  const lineup = sanitizeLineup(payload.lineup);
  const cupStats = sanitizeCupStats(payload.cupStats);
  const scores = calculateScores(lineup);
  const profile = teamProfile({ lineup });

  return {
    player_name: playerName,
    team_score: scores.average,
    average_score: scores.average,
    best_player_score: scores.best,
    formation,
    lineup,
    attack: Number(profile.attack.toFixed(2)),
    midfield: Number(profile.midfield.toFixed(2)),
    defense: Number(profile.defense.toFixed(2)),
    cup_wins: cupStats.wins,
    cup_rounds: cupStats.rounds,
    goals_for: cupStats.goalsFor,
    goals_against: cupStats.goalsAgainst,
    goal_diff: cupStats.goalsFor - cupStats.goalsAgainst,
    won_cup: cupStats.wins >= GOLD_CUP_WINS,
    approved: true
  };
}

function sanitizeName(name) {
  const value = String(name || "").trim().replace(/\s+/g, " ").slice(0, 18);
  if (!value) throw publicError("Missing team name");
  return value;
}

function sanitizeFormation(formation) {
  const value = String(formation || "").trim();
  if (!ALLOWED_FORMATIONS.has(value)) throw publicError("Invalid formation");
  return value;
}

function sanitizeLineup(lineup) {
  if (!Array.isArray(lineup) || lineup.length !== 11) {
    throw publicError("Invalid lineup");
  }

  return lineup.map((slot) => {
    const role = String(slot?.role || "").trim().toUpperCase();
    const player = slot?.player || {};
    const score = toInteger(slot?.score ?? player.score);
    const playerName = String(player.name || "").trim().replace(/\s+/g, " ").slice(0, 60);

    if (!ALLOWED_ROLES.has(role)) throw publicError("Invalid position");
    if (!playerName) throw publicError("Invalid player");
    if (score < 1 || score > 100) throw publicError("Invalid player score");

    return {
      role,
      score,
      player: {
        id: String(player.id || "").slice(0, 80),
        name: playerName,
        score,
        season: String(player.season || "").slice(0, 12),
        sourceSeason: String(player.sourceSeason || "").slice(0, 20),
        positions: sanitizePositions(player.positions),
        number: String(player.number || "").slice(0, 8)
      }
    };
  });
}

function sanitizePositions(positions) {
  const values = Array.isArray(positions) ? positions : [];
  const unique = [...new Set(values.map((position) => String(position || "").trim().toUpperCase()))]
    .filter((position) => ALLOWED_ROLES.has(position));
  return unique.length ? unique.slice(0, 5) : [];
}

function sanitizeCupStats(cupStats = {}) {
  const wins = toInteger(cupStats.wins);
  const rounds = toInteger(cupStats.rounds);
  const goalsFor = toInteger(cupStats.goalsFor);
  const goalsAgainst = toInteger(cupStats.goalsAgainst);

  if (wins < 0 || wins > MAX_CUP_WINS) throw publicError("Invalid cup result");
  if (rounds !== wins + 1) throw publicError("Invalid cup rounds");
  if (goalsFor < 0 || goalsAgainst < 0) throw publicError("Invalid goal score");
  if (goalsFor > rounds * 5 || goalsAgainst > rounds * 5) throw publicError("Invalid goal score");

  return { wins, rounds, goalsFor, goalsAgainst };
}

function calculateScores(lineup) {
  const scores = lineup.map((slot) => slot.score);
  return {
    average: Math.round(average(scores)),
    best: Math.max(...scores)
  };
}

function teamProfile(team) {
  return {
    attack: teamStrength(team, ["ST", "LW", "RW", "AM", "LM", "RM"]),
    midfield: teamStrength(team, ["DM", "CM", "AM", "LM", "RM"]),
    defense: teamStrength(team, ["GK", "CB", "LB", "RB", "DM"])
  };
}

function teamStrength(team, roles) {
  const players = team.lineup.filter((slot) => roles.includes(slot.role));
  return average(players.map((slot) => slot.score));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : -1;
}

async function insertSupabaseRow(row) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw publicError("Server is not configured", 500);
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${SUPABASE_TABLE}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify(row)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw publicError("Supabase rejected score", 500, data);
  }

  return Array.isArray(data) ? data[0] : data;
}

function publicError(message, statusCode = 400, cause = null) {
  const error = new Error(message);
  error.publicMessage = message;
  error.statusCode = statusCode;
  error.cause = cause;
  return error;
}
