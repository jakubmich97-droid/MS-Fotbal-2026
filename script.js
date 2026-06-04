const SUPABASE_URL =
  "https://rmqaiaybfxdfxbqznhab.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWFpYXliZnhkZnhicXpuaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDk4NzEsImV4cCI6MjA5NDUyNTg3MX0.tF9SRcNiwbNmBv7fr0GV-psZ76AKOgiSFCOAn1degok";

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let pointsChartInstance = null;

async function initApp() {
  const matches = await loadMatchesFromSupabase();
  const tips = await loadTipsFromSupabase();

  const preparedMatches = prepareMatches(matches, tips);

  startApp(preparedMatches);
}

initApp();

async function loadMatchesFromSupabase() {
  const { data, error } = await supabaseClient
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

async function loadTipsFromSupabase() {
  const { data, error } = await supabaseClient
    .from("tips")
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

function prepareMatches(matches, tips) {
  return matches.map(match => {
    const matchTips = tips
      .filter(tip => String(tip.match_id) === String(match.id))
      .map(tip => {
        return {
          name: tip.player_name,
          home: Number(tip.tip_home),
          away: Number(tip.tip_away)
        };
      });

    return {
      id: match.id,
      date: match.match_date,
      home: match.home_team,
      away: match.away_team,
      homeFlag: match.home_flag,
      awayFlag: match.away_flag,
      resultHome: match.result_home ?? "-",
      resultAway: match.result_away ?? "-",
      tips: matchTips
    };
  });
}

function isMatchPlayed(match) {
  return match.resultHome !== "-" && match.resultAway !== "-";
}

function startApp(matches) {
  const leaderboard = {};
  let totalExact = 0;

  matches.forEach(match => {
    if (!isMatchPlayed(match)) return;

    const realWinner = getWinner(match.resultHome, match.resultAway);

    match.tips.forEach(tip => {
      tip.distance = getDistance(
        tip.home,
        tip.away,
        match.resultHome,
        match.resultAway
      );

      tip.correctWinner =
        getWinner(tip.home, tip.away) === realWinner;

      tip.isExact =
        Number(tip.home) === Number(match.resultHome) &&
        Number(tip.away) === Number(match.resultAway);
    });

    const closestTips = getClosestTipsForMatch(match);

    match.tips.forEach(tip => {
      if (!leaderboard[tip.name]) {
        leaderboard[tip.name] = {
          points: 0,
          exact: 0,
          totalTipGoals: 0,
          tipsCount: 0,
          correctWinners: 0,
          totalDistance: 0,
          form: [],
          history: []
        };
      }

      leaderboard[tip.name].totalTipGoals +=
        Number(tip.home) + Number(tip.away);

      leaderboard[tip.name].tipsCount += 1;
      leaderboard[tip.name].totalDistance += tip.distance;

      let earnedPoints = 0;

      if (tip.correctWinner) {
        earnedPoints += 1;
        leaderboard[tip.name].correctWinners += 1;
      }

      if (closestTips.includes(tip)) {
        earnedPoints += 1;
      }

      if (tip.isExact) {
        leaderboard[tip.name].exact += 1;
        totalExact += 1;
      }

      leaderboard[tip.name].points += earnedPoints;

      if (earnedPoints > 0) {
        leaderboard[tip.name].form.push("🟢");
      } else if (tip.correctWinner) {
        leaderboard[tip.name].form.push("🟡");
      } else {
        leaderboard[tip.name].form.push("⚫");
      }

      leaderboard[tip.name].history.push({
        date: match.date,
        homeTeam: match.home,
        awayTeam: match.away,
        resultHome: match.resultHome,
        resultAway: match.resultAway,
        tipHome: tip.home,
        tipAway: tip.away,
        earnedPoints,
        isExact: tip.isExact,
        correctWinner: tip.correctWinner,
        distance: tip.distance
      });
    });
  });

  const sortedPlayers = Object.entries(leaderboard).sort((a, b) => {
    if (b[1].points !== a[1].points) {
      return b[1].points - a[1].points;
    }

    return getPlayerAccuracy(a) - getPlayerAccuracy(b);
  });

  renderLeaderboard(sortedPlayers);
  setupPlayerModal(sortedPlayers);
  renderMatches(matches);
  renderStats(matches, sortedPlayers, totalExact);
  renderLastUpdate();
  renderPointsChart(matches);
}

function getDistance(tipHome, tipAway, resultHome, resultAway) {
  return (
    Math.abs(Number(tipHome) - Number(resultHome)) +
    Math.abs(Number(tipAway) - Number(resultAway))
  );
}

function getWinner(home, away) {
  home = Number(home);
  away = Number(away);

  if (home > away) return "home";
  if (away > home) return "away";

  return "draw";
}

function getClosestTipsForMatch(match) {
  if (!isMatchPlayed(match) || match.tips.length === 0) {
    return [];
  }

  const bestDistance = Math.min(
    ...match.tips.map(tip => tip.distance)
  );

  return match.tips.filter(tip => {
    return tip.distance === bestDistance;
  });
}

function getPlayerAccuracy(player) {
  const data = player[1];

  if (!data.tipsCount) return Infinity;

  return data.totalDistance / data.tipsCount;
}

function getPositionText(players, index) {
  const currentPlayer = players[index];
  const currentPoints = currentPlayer[1].points;
  const currentAccuracy = getPlayerAccuracy(currentPlayer);

  const sameRankPlayers = players.filter(player => {
    return (
      player[1].points === currentPoints &&
      getPlayerAccuracy(player) === currentAccuracy
    );
  });

  if (sameRankPlayers.length === 1) {
    return `${index + 1}`;
  }

  const firstIndex = players.findIndex(player => {
    return (
      player[1].points === currentPoints &&
      getPlayerAccuracy(player) === currentAccuracy
    );
  });

  const lastIndex = firstIndex + sameRankPlayers.length - 1;

  return `${firstIndex + 1}/${lastIndex + 1}`;
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

function renderLeaderboard(players) {
  const tbody = document.querySelector("#leaderboard tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  players.forEach((player, index) => {
    const name = player[0];
    const data = player[1];

    const row = document.createElement("tr");

    let rankClass = "";

    if (index === 0) rankClass = "rank-1";
    if (index === 1) rankClass = "rank-2";
    if (index === 2) rankClass = "rank-3";

    row.innerHTML = `
      <td class="${rankClass}">
        ${getPositionText(players, index)}
      </td>

      <td>
        <button class="player-name-button" data-player="${name}">
          ${name}
        </button>
      </td>

      <td>${data.points}</td>
      <td>${data.exact}</td>
      <td>${data.form.slice(-5).join(" ")}</td>
    `;

    tbody.appendChild(row);
  });
}

function renderMatches(matches) {
  const playedContainer = document.getElementById("played-matches");
  const upcomingContainer = document.getElementById("upcoming-matches");

  if (!playedContainer || !upcomingContainer) return;

  playedContainer.innerHTML = "";
  upcomingContainer.innerHTML = "";

  const playedMatches = matches.filter(isMatchPlayed);
  const upcomingMatches = matches.filter(match => !isMatchPlayed(match));

  renderMatchesByDate(playedMatches, playedContainer, true);
  renderMatchesByDate(upcomingMatches, upcomingContainer, false);
}

function renderMatchesByDate(matches, container, played) {
  if (matches.length === 0) {
    container.innerHTML = `
      <div class="card rules">
        ${played
          ? "Zatím nejsou žádné odehrané zápasy."
          : "Žádné nadcházející zápasy."}
      </div>
    `;
    return;
  }

  const groupedMatches = {};

  matches.forEach(match => {
    if (!groupedMatches[match.date]) {
      groupedMatches[match.date] = [];
    }

    groupedMatches[match.date].push(match);
  });

  const dates = Object.keys(groupedMatches).sort((a, b) => {
    return new Date(a) - new Date(b);
  });

  if (played) dates.reverse();

  dates.forEach((date, index) => {
    const dayWrapper = document.createElement("div");
    dayWrapper.className = "day-group";

    const isOpen = index === 0;

    dayWrapper.innerHTML = `
      <button class="day-toggle ${isOpen ? "is-open" : ""}" type="button">
        <span>
          ${played ? "✅" : "⏳"} ${formatDate(date)}
        </span>

        <span class="day-count">
          ${groupedMatches[date].length}
          ${groupedMatches[date].length === 1 ? "zápas" : "zápasy"}
        </span>
      </button>

      <div class="day-content ${isOpen ? "is-open" : ""}"></div>
    `;

    const content = dayWrapper.querySelector(".day-content");
    const button = dayWrapper.querySelector(".day-toggle");

    groupedMatches[date].forEach(match => {
      content.appendChild(createMatchCard(match, played));
    });

    button.addEventListener("click", () => {
      button.classList.toggle("is-open");
      content.classList.toggle("is-open");
    });

    container.appendChild(dayWrapper);
  });
}

function createMatchCard(match, played) {
  const closestTips =
    played ? getClosestTipsForMatch(match) : [];

  const resultText =
    played ? `${match.resultHome}:${match.resultAway}` : "čeká se";

  const tipsHtml = match.tips.length > 0
    ? match.tips.map(tip => {
        let badge = `
          <span class="badge badge-zero">
            ${played ? "0 bodů" : "nehráno"}
          </span>
        `;

        if (played) {
          let points = 0;

          if (tip.correctWinner) points += 1;
          if (closestTips.includes(tip)) points += 1;

          if (points > 0) {
            badge = `
              <span class="badge ${points === 2 ? "badge-exact" : "badge-close"}">
                +${points} ${points === 1 ? "bod" : "body"}
              </span>
            `;
          }
        }

        return `
          <tr>
            <td>${tip.name}</td>
            <td>${tip.home}:${tip.away}</td>
            <td>${badge}</td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="3">Zatím nikdo netipoval.</td>
      </tr>
    `;

  const card = document.createElement("div");

  card.className =
    played
      ? "match-card"
      : "match-card match-card-upcoming";

  card.innerHTML = `
    <div class="match-header">
      <div>
        <div class="match-date">
          ${formatDate(match.date)}
        </div>

        <div class="match-scoreline">
          <div class="team-side">
            <img
              src="./images/flags/${match.homeFlag}.webp"
              class="flag"
              alt="${match.home}"
            >

            <span class="team-name">
              ${match.home}
            </span>
          </div>

          <div class="score-pill">
            ${resultText}
          </div>

          <div class="team-side">
            <img
              src="./images/flags/${match.awayFlag}.webp"
              class="flag"
              alt="${match.away}"
            >

            <span class="team-name">
              ${match.away}
            </span>
          </div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Hráč</th>
          <th>Tip</th>
          <th>Body</th>
        </tr>
      </thead>

      <tbody>
        ${tipsHtml}
      </tbody>
    </table>
  `;

  return card;
}

function renderStats(matches, players, totalExact) {
  const playedMatches = matches.filter(isMatchPlayed);

  animateNumber(
    document.getElementById("players-count"),
    players.length
  );

  animateNumber(
    document.getElementById("matches-count"),
    playedMatches.length
  );

  animateNumber(
    document.getElementById("exact-count"),
    totalExact
  );

  const leaderElement = document.getElementById("current-leader");

  if (!leaderElement) return;

  if (players.length > 0) {
    const topPoints = players[0][1].points;

    const leaders = players
      .filter(player => player[1].points === topPoints)
      .map(player => player[0]);

    leaderElement.innerHTML = `
      <span class="leader-badge">
        👑 ${leaders.join(" / ")}
      </span>
    `;
  } else {
    leaderElement.textContent = "-";
  }
}

function renderLastUpdate() {
  const element = document.getElementById("last-update");

  if (!element) return;

  element.textContent =
    `Poslední aktualizace: ${new Date().toLocaleString("cs-CZ")}`;
}

function renderPointsChart(matches) {
  const canvas = document.getElementById("pointsChart");

  if (!canvas) return;

  const playedMatches = [...matches]
    .filter(isMatchPlayed)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const players = [];

  playedMatches.forEach(match => {
    match.tips.forEach(tip => {
      if (!players.includes(tip.name)) {
        players.push(tip.name);
      }
    });
  });

  const matchesByDate = {};

  playedMatches.forEach(match => {
    if (!matchesByDate[match.date]) {
      matchesByDate[match.date] = [];
    }

    matchesByDate[match.date].push(match);
  });

  const dates = Object.keys(matchesByDate)
    .sort((a, b) => new Date(a) - new Date(b));

  const pointsByPlayer = {};
  const history = {};

  players.forEach(player => {
    pointsByPlayer[player] = 0;
    history[player] = [];
  });

  const labels = dates.map(date => formatDate(date));

  dates.forEach(date => {
    const dayMatches = matchesByDate[date];

    dayMatches.forEach(match => {
      const closestTips = getClosestTipsForMatch(match);

      match.tips.forEach(tip => {
        let points = 0;

        if (tip.correctWinner) points += 1;
        if (closestTips.includes(tip)) points += 1;

        pointsByPlayer[tip.name] += points;
      });
    });

    players.forEach(player => {
      history[player].push(pointsByPlayer[player]);
    });
  });

  const datasets = players.map(player => {
    return {
      label: player,
      data: history[player],
      tension: 0.35,
      borderWidth: 4,
      fill: false,
      pointRadius: 5,
      pointHoverRadius: 8
    };
  });

  if (pointsChartInstance) {
    pointsChartInstance.destroy();
  }

  pointsChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: "#e0f2fe"
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y} bodů`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8"
          },
          grid: {
            color: "rgba(148, 163, 184, 0.12)"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#94a3b8",
            stepSize: 1
          },
          grid: {
            color: "rgba(148, 163, 184, 0.12)"
          }
        }
      }
    }
  });
}

function setupPlayerModal(players) {
  const modal = document.getElementById("player-modal");
  const closeButton = document.getElementById("player-modal-close");

  if (!modal || !closeButton) return;

  document.querySelectorAll(".player-name-button").forEach(button => {
    button.addEventListener("click", () => {
      const playerName = button.dataset.player;
      const player = players.find(item => item[0] === playerName);

      if (!player) return;

      openPlayerModal(player);
    });
  });

  closeButton.addEventListener("click", () => {
    modal.classList.remove("is-open");
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      modal.classList.remove("is-open");
    }
  });
}

function openPlayerModal(player) {
  const modal = document.getElementById("player-modal");
  const nameElement = document.getElementById("player-modal-name");
  const statsElement = document.getElementById("player-modal-stats");

  if (!modal || !nameElement || !statsElement) return;

  const name = player[0];
  const data = player[1];
  const history = data.history || [];

  const avgGoals =
    data.tipsCount > 0
      ? (data.totalTipGoals / data.tipsCount).toFixed(1)
      : "-";

  const winnerAccuracy =
    data.tipsCount > 0
      ? Math.round((data.correctWinners / data.tipsCount) * 100)
      : 0;

  const form =
    data.form && data.form.length > 0
      ? data.form.slice(-5).join(" ")
      : "-";

  const bestHit = history.find(item => item.isExact);

  const worstFail = history.length > 0
    ? [...history].sort((a, b) => b.distance - a.distance)[0]
    : null;

  const scoreAccuracy =
    history.length > 0
      ? (
          history.reduce((sum, item) => sum + item.distance, 0) /
          history.length
        ).toFixed(2)
      : "-";

  const longestPointStreak = getLongestPointStreak(history);
  const mostCommonTip = getMostCommonTip(history);

  const offensiveAvg =
    history.length > 0
      ? (
          history.reduce((sum, item) => {
            return sum + Number(item.tipHome) + Number(item.tipAway);
          }, 0) / history.length
        ).toFixed(1)
      : "-";

  const conservativeLabel =
    offensiveAvg !== "-" && Number(offensiveAvg) <= 2,5
      ? "Spíš konzervativní"
      : "Spíš ofenzivní";

  nameElement.textContent = name;

  statsElement.innerHTML = `
    <div class="player-stat-box">
      <span>Body</span>
      <strong>${data.points}</strong>
    </div>

    <div class="player-stat-box">
      <span>Přesné trefy</span>
      <strong>${data.exact}</strong>
    </div>

    <div class="player-stat-box">
      <span>Úspěšnost vítěz/remíza</span>
      <strong>${winnerAccuracy}%</strong>
    </div>

    <div class="player-stat-box">
      <span>Průměr gólů v tipech</span>
      <strong>${avgGoals}</strong>
    </div>

    <div class="player-stat-box player-stat-wide">
      <span>Forma posledních 5 zápasů</span>
      <strong>${form}</strong>
    </div>

    <div class="player-stat-box player-stat-wide">
      <span>🏆 Nejlepší trefa</span>
      <strong>${formatBestHit(bestHit)}</strong>
    </div>

    <div class="player-stat-box player-stat-wide">
      <span>💣 Největší fail</span>
      <strong>${formatWorstFail(worstFail)}</strong>
    </div>

    <div class="player-stat-box">
      <span>🎯 Přesnost skóre</span>
      <strong>${scoreAccuracy}</strong>
    </div>

    <div class="player-stat-box">
      <span>🔥 Nejdelší bodová série</span>
      <strong>${longestPointStreak}</strong>
    </div>

    <div class="player-stat-box">
      <span>⚔️ Nejčastější tip</span>
      <strong>${mostCommonTip}</strong>
    </div>

    <div class="player-stat-box">
      <span>📈 Ofenzivnost</span>
      <strong>${offensiveAvg}</strong>
    </div>

    <div class="player-stat-box player-stat-wide">
      <span>🧊 Styl tipování</span>
      <strong>${conservativeLabel}</strong>
    </div>
  `;

  modal.classList.add("is-open");
}

function getLongestPointStreak(history) {
  let currentStreak = 0;
  let longestStreak = 0;

  history.forEach(item => {
    if (item.earnedPoints > 0) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  return `${longestStreak} zápasů`;
}

function getMostCommonTip(history) {
  if (history.length === 0) return "-";

  const counts = {};

  history.forEach(item => {
    const score = `${item.tipHome}:${item.tipAway}`;

    if (!counts[score]) {
      counts[score] = 0;
    }

    counts[score] += 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];
}

function formatBestHit(item) {
  if (!item) return "Zatím žádná přesná trefa";

  return `${item.homeTeam} ${item.resultHome}:${item.resultAway} ${item.awayTeam} · tip ${item.tipHome}:${item.tipAway}`;
}

function formatWorstFail(item) {
  if (!item) return "-";

  return `${item.homeTeam} ${item.resultHome}:${item.resultAway} ${item.awayTeam} · tip ${item.tipHome}:${item.tipAway} · odchylka ${item.distance}`;
}

function animateNumber(element, targetValue, duration = 700) {
  if (!element) return;

  const target = Number(targetValue);

  if (Number.isNaN(target)) {
    element.textContent = targetValue;
    return;
  }

  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.round(target * progress);

    element.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}
