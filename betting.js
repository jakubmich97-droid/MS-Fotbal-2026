const SUPABASE_URL =
  "https://rmqaiaybfxdfxbqznhab.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWFpYXliZnhkZnhicXpuaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDk4NzEsImV4cCI6MjA5NDUyNTg3MX0.tF9SRcNiwbNmBv7fr0GV-psZ76AKOgiSFCOAn1degok";

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const START_BUDGET = 5000;

let allMatches = [];
let allRankings = [];
let allBets = [];

async function initBettingPage() {
  await loadMatches();
  await loadRankings();
  await loadBets();

  setupEvents();

  renderLeaderboard();
  renderGlobalStats();
  renderCurrentPlayer();
}

initBettingPage();

function setupEvents() {
  const bettorSelect =
    document.getElementById("bettor-name");

  bettorSelect.addEventListener("change", () => {
    renderCurrentPlayer();
  });
}

async function loadMatches() {
  const { data, error } = await supabaseClient
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  if (error) {
    console.error(error);
    allMatches = [];
    return;
  }

  allMatches = data || [];
}

async function loadRankings() {
  const { data, error } = await supabaseClient
    .from("team_rankings")
    .select("*");

  if (error) {
    console.error(error);
    allRankings = [];
    return;
  }

  allRankings = data || [];
}

async function loadBets() {
  const { data, error } = await supabaseClient
    .from("bets")
    .select("*");

  if (error) {
    console.error(error);
    allBets = [];
    return;
  }

  allBets = data || [];
}

function renderCurrentPlayer() {
  const playerName =
    document.getElementById("bettor-name").value;

  if (!playerName) {
    document.getElementById("current-budget").textContent = "-";

    document.getElementById("betting-matches").innerHTML = `
      <div class="card rules">
        Vyber sázkaře a načtou se dostupné zápasy.
      </div>
    `;

    renderMyBets(null);
    return;
  }

  const budget = getPlayerBudget(playerName);

  document.getElementById("current-budget").textContent =
    `${formatMoney(budget)} Kč`;

  renderBettingMatches(playerName);
  renderMyBets(playerName);
}

function getPlayerBudget(playerName) {
  const playerBets = allBets.filter(bet => {
    return bet.player_name === playerName;
  });

  let budget = START_BUDGET;

  playerBets.forEach(bet => {
    budget -= Number(bet.stake);

    if (isBetWon(bet)) {
      budget += Number(bet.stake) * Number(bet.odds);
    }
  });

  return Math.round(budget);
}

function isMatchPlayed(match) {
  return match.result_home !== null && match.result_away !== null;
}

function isBonusMatch(match) {
  return match.group_name === "Bonus";
}

function isBetWon(bet) {
  const match = allMatches.find(item => {
    return String(item.id) === String(bet.match_id);
  });

  if (!match || !isMatchPlayed(match)) {
    return false;
  }

  const realResult = getMatchResult(match);

  return bet.selected_result === realResult;
}

function getBetStatus(bet) {
  const match = allMatches.find(item => {
    return String(item.id) === String(bet.match_id);
  });

  if (!match || !isMatchPlayed(match)) {
    return "otevřená";
  }

  return isBetWon(bet) ? "výhra" : "prohra";
}

function getMatchResult(match) {
  const home = Number(match.result_home);
  const away = Number(match.result_away);

  if (home > away) return "home";
  if (away > home) return "away";

  return "draw";
}

function getRanking(teamName) {
  const ranking = allRankings.find(item => {
    return item.team_name === teamName;
  });

  return ranking ? Number(ranking.fifa_rank) : null;
}

function getOdds(homeRank, awayRank) {
  const diff = awayRank - homeRank;

  if (Math.abs(diff) <= 10) {
    return { home: 2.30, draw: 3.00, away: 2.30 };
  }

  if (diff > 10 && diff <= 30) {
    return { home: 1.80, draw: 3.30, away: 3.80 };
  }

  if (diff > 30 && diff <= 60) {
    return { home: 1.45, draw: 4.00, away: 6.00 };
  }

  if (diff > 60) {
    return { home: 1.25, draw: 5.00, away: 9.00 };
  }

  if (diff < -10 && diff >= -30) {
    return { home: 3.80, draw: 3.30, away: 1.80 };
  }

  if (diff < -30 && diff >= -60) {
    return { home: 6.00, draw: 4.00, away: 1.45 };
  }

  return { home: 9.00, draw: 5.00, away: 1.25 };
}

function renderBettingMatches(playerName) {
  const container = document.getElementById("betting-matches");

  const availableMatches = allMatches.filter(match => {
    if (isBonusMatch(match)) return false;
    if (isMatchPlayed(match)) return false;
    return true;
  });

  if (availableMatches.length === 0) {
    container.innerHTML = `
      <div class="card rules">
        Žádné dostupné zápasy k sázení.
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  availableMatches.forEach(match => {
    const homeRank = getRanking(match.home_team);
    const awayRank = getRanking(match.away_team);

    if (!homeRank || !awayRank) {
      console.warn("Chybí ranking:", match.home_team, homeRank, match.away_team, awayRank);
      return;
    }

    const odds = getOdds(homeRank, awayRank);

    const alreadyBet = allBets.some(bet => {
      return (
        bet.player_name === playerName &&
        String(bet.match_id) === String(match.id)
      );
    });

    const card = document.createElement("div");
    card.className = "match-card";

    card.innerHTML = `
      <div class="match-header">
        <div>
          <div class="match-date">
            ${formatDate(match.match_date)} · ${match.group_name}
          </div>

          <div class="match-scoreline">
            <div class="team-side">
              <img src="./images/flags/${match.home_flag}.webp" class="flag" alt="${match.home_team}">
              <span class="team-name">${match.home_team}</span>
            </div>

            <div class="score-pill">
              kurz
            </div>

            <div class="team-side">
              <img src="./images/flags/${match.away_flag}.webp" class="flag" alt="${match.away_team}">
              <span class="team-name">${match.away_team}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="betting-options">
        <button type="button" class="bet-option" data-match-id="${match.id}" data-result="home" data-odds="${odds.home}" ${alreadyBet ? "disabled" : ""}>
          1 · ${match.home_team}<br>
          <strong>${odds.home.toFixed(2)}</strong>
        </button>

        <button type="button" class="bet-option" data-match-id="${match.id}" data-result="draw" data-odds="${odds.draw}" ${alreadyBet ? "disabled" : ""}>
          X · Remíza<br>
          <strong>${odds.draw.toFixed(2)}</strong>
        </button>

        <button type="button" class="bet-option" data-match-id="${match.id}" data-result="away" data-odds="${odds.away}" ${alreadyBet ? "disabled" : ""}>
          2 · ${match.away_team}<br>
          <strong>${odds.away.toFixed(2)}</strong>
        </button>
      </div>

      <div class="bet-summary">
        <input type="number" class="stake-input" data-match-id="${match.id}" min="100" step="100" placeholder="Vklad Kč" ${alreadyBet ? "disabled" : ""}>

        <div class="potential-win" data-match-id="${match.id}">
          Možná výhra: <strong>0 Kč</strong>
        </div>

        <button type="button" class="place-bet-btn" data-match-id="${match.id}" ${alreadyBet ? "disabled" : ""}>
          💰 Vsadit
        </button>

        <span class="submit-note">
          ${alreadyBet ? "Na tento zápas už máš vsazeno." : "Nejdřív vyber kurz, potom zadej vklad."}
        </span>
      </div>
    `;

    container.appendChild(card);
  });

  setupBetButtons(playerName);
}

function setupBetButtons(playerName) {
  document.querySelectorAll(".bet-option").forEach(button => {
    button.addEventListener("click", () => {
      const matchId = button.getAttribute("data-match-id");

      document
        .querySelectorAll(`.bet-option[data-match-id="${matchId}"]`)
        .forEach(item => item.classList.remove("selected"));

      button.classList.add("selected");
      updatePotentialWin(matchId);
    });
  });

  document.querySelectorAll(".stake-input").forEach(input => {
    input.addEventListener("input", () => {
      const matchId = input.getAttribute("data-match-id");
      updatePotentialWin(matchId);
    });
  });

  document.querySelectorAll(".place-bet-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const matchId = button.getAttribute("data-match-id");

      const selectedButton = document.querySelector(
        `.bet-option.selected[data-match-id="${matchId}"]`
      );

      if (!selectedButton) {
        alert("Nejdřív vyber kurz.");
        return;
      }

      const selectedResult = selectedButton.getAttribute("data-result");
      const odds = Number(selectedButton.getAttribute("data-odds"));

      const stakeInput = document.querySelector(
        `.stake-input[data-match-id="${matchId}"]`
      );

      const stake = Number(stakeInput.value);
      const budget = getPlayerBudget(playerName);

      if (!stake || stake <= 0) {
        alert("Zadej vklad.");
        return;
      }

      if (stake < 100) {
        alert("Minimální vklad je 100 Kč.");
        return;
      }

      if (stake > budget) {
        alert("Nemáš dostatečný zůstatek.");
        return;
      }

      await placeBet(playerName, matchId, selectedResult, odds, stake);
    });
  });
}

function updatePotentialWin(matchId) {
  const selectedButton = document.querySelector(
    `.bet-option.selected[data-match-id="${matchId}"]`
  );

  const stakeInput = document.querySelector(
    `.stake-input[data-match-id="${matchId}"]`
  );

  const output = document.querySelector(
    `.potential-win[data-match-id="${matchId}"] strong`
  );

  if (!output) return;

  if (!selectedButton || !stakeInput || !stakeInput.value) {
    output.textContent = "0 Kč";
    return;
  }

  const odds = Number(selectedButton.getAttribute("data-odds"));
  const stake = Number(stakeInput.value);
  const win = stake * odds;

  output.textContent = `${formatMoney(Math.round(win))} Kč`;
}

async function placeBet(playerName, matchId, selectedResult, odds, stake) {
  if (!matchId) {
    alert("Chybí ID zápasu.");
    return;
  }

  const { error } = await supabaseClient
    .from("bets")
    .insert({
      player_name: playerName,
      match_id: Number(matchId),
      selected_result: selectedResult,
      odds: odds,
      stake: stake
    });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  await loadBets();

  renderCurrentPlayer();
  renderLeaderboard();
  renderGlobalStats();
}

function renderMyBets(playerName) {
  const tbody =
    document.querySelector("#my-bets-table tbody");

  if (!tbody) return;

  if (!playerName) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Vyber sázkaře.</td>
      </tr>
    `;
    return;
  }

  const myBets = allBets.filter(bet => {
    return bet.player_name === playerName;
  });

  if (myBets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Zatím nemáš žádné sázky.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = myBets.map(bet => {
    const match = allMatches.find(item => {
      return String(item.id) === String(bet.match_id);
    });

    const matchName = match
      ? `${match.home_team} vs ${match.away_team}`
      : "Neznámý zápas";

    const selectedText =
      bet.selected_result === "home"
        ? "1"
        : bet.selected_result === "away"
        ? "2"
        : "X";

    return `
      <tr>
        <td>${matchName}</td>
        <td>${selectedText}</td>
        <td>${Number(bet.odds).toFixed(2)}</td>
        <td>${formatMoney(bet.stake)} Kč</td>
        <td>${getBetStatus(bet)}</td>
      </tr>
    `;
  }).join("");
}

function renderLeaderboard() {
  const tbody =
    document.querySelector("#betting-leaderboard tbody");

  if (!tbody) return;

  const players = ["Kuba", "Dejv", "Jiřoch", "Luba"];

  const leaderboard = players.map(player => {
    const playerBets = allBets.filter(bet => {
      return bet.player_name === player;
    });

    const totalStake = playerBets.reduce((sum, bet) => {
      return sum + Number(bet.stake);
    }, 0);

    const wins = playerBets.filter(isBetWon).length;

    return {
      name: player,
      budget: getPlayerBudget(player),
      totalStake,
      wins
    };
  }).sort((a, b) => b.budget - a.budget);

  tbody.innerHTML = leaderboard.map((player, index) => {
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${player.name}</td>
        <td>${formatMoney(player.budget)} Kč</td>
        <td>${formatMoney(player.totalStake)} Kč</td>
        <td>${player.wins}</td>
      </tr>
    `;
  }).join("");

  const bestBettor =
    document.getElementById("best-bettor");

  if (bestBettor && leaderboard.length > 0) {
    bestBettor.textContent = leaderboard[0].name;
  }
}

function renderGlobalStats() {
  const openBetsCount =
    document.getElementById("open-bets-count");

  const openBets = allBets.filter(bet => {
    const match = allMatches.find(item => {
      return String(item.id) === String(bet.match_id);
    });

    return !match || !isMatchPlayed(match);
  });

  if (openBetsCount) {
    openBetsCount.textContent = openBets.length;
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString("cs-CZ");
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
