const SUPABASE_URL =
  "https://rmqaiaybfxdfxbqznhab.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWFpYXliZnhkZnhicXpuaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDk4NzEsImV4cCI6MjA5NDUyNTg3MX0.tF9SRcNiwbNmBv7fr0GV-psZ76AKOgiSFCOAn1degok";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let allMatches = [];
let allTips = [];

async function initSubmitPage() {
  await loadMatches();
  await loadTips();

  setupEvents();
}

initSubmitPage();

async function loadMatches() {
  const response = await fetch("./data/matches.json");
  const data = await response.json();

  allMatches = data.matches;
}

async function loadTips() {
  const { data, error } = await supabaseClient
    .from("tips_inbox")
    .select("*");

  if (error) {
    console.error(error);
    allTips = [];
    return;
  }

  allTips = data || [];
}

function setupEvents() {
  const playerSelect = document.getElementById("player-name");
  const matchSelect = document.getElementById("match-select");
  const form = document.getElementById("tip-form");

  playerSelect.addEventListener("change", () => {
    renderAvailableMatches();
    clearTipPreview();
  });

  matchSelect.addEventListener("change", () => {
    renderOtherTips();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    await submitTip();
  });
}

function isMatchUpcoming(match) {
  return match.resultHome === "-" && match.resultAway === "-";
}

function getMatchId(match) {
  return `${match.home}-${match.away}-${match.date}`;
}

function renderAvailableMatches() {
  const playerName =
    document.getElementById("player-name").value;

  const matchSelect =
    document.getElementById("match-select");

  matchSelect.innerHTML = "";

  if (!playerName) {
    matchSelect.disabled = true;
    matchSelect.innerHTML =
      `<option value="">Nejdřív vyber tipéra</option>`;
    return;
  }

  const availableMatches = allMatches.filter(match => {
    if (!isMatchUpcoming(match)) return false;

    const matchId = getMatchId(match);

    const alreadyTipped = allTips.some(tip => {
      return (
        tip.player_name === playerName &&
        tip.match_id === matchId
      );
    });

    return !alreadyTipped;
  });

  if (availableMatches.length === 0) {
    matchSelect.disabled = true;
    matchSelect.innerHTML =
      `<option value="">Nemáš žádné dostupné zápasy</option>`;
    return;
  }

  matchSelect.disabled = false;

  matchSelect.innerHTML =
    `<option value="">Vyber zápas</option>`;

  availableMatches.forEach(match => {
    const option = document.createElement("option");

    option.value = getMatchId(match);

    option.textContent =
      `${formatDate(match.date)} · ${match.home} vs ${match.away}`;

    matchSelect.appendChild(option);
  });
}

function renderOtherTips() {
  const matchId =
    document.getElementById("match-select").value;

  const container =
    document.getElementById("other-tips");

  container.innerHTML = "";

  if (!matchId) return;

  const match = allMatches.find(item => {
    return getMatchId(item) === matchId;
  });

  if (!match) return;

  const tipsForMatch = allTips.filter(tip => {
    return tip.match_id === matchId;
  });

  const tipsHtml = tipsForMatch.length > 0
    ? tipsForMatch.map(tip => {
        return `
          <tr>
            <td>${tip.player_name}</td>
            <td>${tip.tip_home}:${tip.tip_away}</td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="2">Zatím nikdo netipoval.</td>
      </tr>
    `;

  container.innerHTML = `
    <div class="match-card submit-preview">
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
              čeká se
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
          </tr>
        </thead>

        <tbody>
          ${tipsHtml}
        </tbody>
      </table>
    </div>
  `;
}

function clearTipPreview() {
  document.getElementById("other-tips").innerHTML = "";
}

async function submitTip() {
  const status =
    document.getElementById("submit-status");

  const playerName =
    document.getElementById("player-name").value;

  const matchId =
    document.getElementById("match-select").value;

  const tipHome =
    Number(document.getElementById("tip-home").value);

  const tipAway =
    Number(document.getElementById("tip-away").value);

  if (!playerName || !matchId) {
    status.innerHTML = "❌ Vyber tipéra a zápas.";
    return;
  }

  const match = allMatches.find(item => {
    return getMatchId(item) === matchId;
  });

  if (!match) {
    status.innerHTML = "❌ Zápas se nepodařilo najít.";
    return;
  }

  const tipsForMatch = allTips.filter(tip => {
    return tip.match_id === matchId;
  });

  const samePlayerAlreadyTipped = tipsForMatch.some(tip => {
    return tip.player_name === playerName;
  });

  if (samePlayerAlreadyTipped) {
    status.innerHTML = "❌ Tenhle zápas už máš natipovaný.";
    return;
  }

  const duplicateScore = tipsForMatch.some(tip => {
    return (
      Number(tip.tip_home) === tipHome &&
      Number(tip.tip_away) === tipAway
    );
  });

  if (duplicateScore) {
    status.innerHTML =
      "❌ Tenhle přesný tip už někdo dal. Vyber jiné skóre.";
    return;
  }

  status.innerHTML = "⏳ Odesílám tip...";

  const { error } = await supabaseClient
    .from("tips_inbox")
    .insert({
      player_name: playerName,
      match_id: matchId,
      match_date: match.date,
      home_team: match.home,
      away_team: match.away,
      tip_home: tipHome,
      tip_away: tipAway
    });

  if (error) {
    console.error(error);
    status.innerHTML = "❌ Nepodařilo se uložit tip.";
    return;
  }

  status.innerHTML = "✅ Tip byl úspěšně odeslán!";

  document.getElementById("tip-home").value = "";
  document.getElementById("tip-away").value = "";

  await loadTips();

  renderAvailableMatches();
  clearTipPreview();
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long"
  });
}
