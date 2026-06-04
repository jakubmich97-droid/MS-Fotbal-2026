const SUPABASE_URL =
  "https://rmqaiaybfxdfxbqznhab.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWFpYXliZnhkZnhicXpuaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDk4NzEsImV4cCI6MjA5NDUyNTg3MX0.tF9SRcNiwbNmBv7fr0GV-psZ76AKOgiSFCOAn1degok";

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allMatches = [];
let allTips = [];

async function initSubmitPage() {
  await loadMatches();
  await loadTips();

  setupEvents();
}

initSubmitPage();

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

async function loadTips() {
  const { data, error } = await supabaseClient
    .from("tips")
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
  return match.result_home === null || match.result_away === null;
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

    const alreadyTipped = allTips.some(tip => {
      return (
        tip.player_name === playerName &&
        String(tip.match_id) === String(match.id)
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

    option.value = match.id;

    option.textContent =
      `${formatDate(match.match_date)} · ${match.group_name} · ${match.home_team} vs ${match.away_team}`;

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
    return String(item.id) === String(matchId);
  });

  if (!match) return;

  const tipsForMatch = allTips.filter(tip => {
    return String(tip.match_id) === String(matchId);
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
            ${formatDate(match.match_date)}
          </div>

          <div class="match-scoreline">
            <div class="team-side">
              <img
                src="./images/flags/${match.home_flag}.webp"
                class="flag"
                alt="${match.home_team}"
              >

              <span class="team-name">
                ${match.home_team}
              </span>
            </div>

            <div class="score-pill">
              čeká se
            </div>

            <div class="team-side">
              <img
                src="./images/flags/${match.away_flag}.webp"
                class="flag"
                alt="${match.away_team}"
              >

              <span class="team-name">
                ${match.away_team}
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

  if (
    Number.isNaN(tipHome) ||
    Number.isNaN(tipAway) ||
    tipHome < 0 ||
    tipAway < 0
  ) {
    status.innerHTML = "❌ Zadej platné skóre.";
    return;
  }

  const match = allMatches.find(item => {
    return String(item.id) === String(matchId);
  });

  if (!match) {
    status.innerHTML = "❌ Zápas se nepodařilo najít.";
    return;
  }

  const tipsForMatch = allTips.filter(tip => {
    return String(tip.match_id) === String(matchId);
  });

  const samePlayerAlreadyTipped = tipsForMatch.some(tip => {
    return tip.player_name === playerName;
  });

  if (samePlayerAlreadyTipped) {
    status.innerHTML = "❌ Tenhle zápas už máš natipovaný.";
    return;
  }

  status.innerHTML = "⏳ Odesílám tip...";

  const { error } = await supabaseClient
    .from("tips")
    .insert({
      player_name: playerName,
      match_id: match.id,
      match_date: match.match_date,
      home_team: match.home_team,
      away_team: match.away_team,
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
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
