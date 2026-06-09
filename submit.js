const SUPABASE_URL =
  "https://rmqaiaybfxdfxbqznhab.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWFpYXliZnhkZnhicXpuaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDk4NzEsImV4cCI6MjA5NDUyNTg3MX0.tF9SRcNiwbNmBv7fr0GV-psZ76AKOgiSFCOAn1degok";

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const teams = [
  { name: "Alžírsko", flag: "dz" },
  { name: "Anglie", flag: "gb" },
  { name: "Argentina", flag: "ar" },
  { name: "Austrálie", flag: "au" },
  { name: "Rakousko", flag: "at" },
  { name: "Belgie", flag: "be" },
  { name: "Brazílie", flag: "br" },
  { name: "Kanada", flag: "ca" },
  { name: "Kapverdy", flag: "cv" },
  { name: "Kolumbie", flag: "co" },
  { name: "Chorvatsko", flag: "hr" },
  { name: "Curacao", flag: "cw" },
  { name: "DR Kongo", flag: "cd" },
  { name: "Ekvádor", flag: "ec" },
  { name: "Egypt", flag: "eg" },
  { name: "Francie", flag: "fr" },
  { name: "Ghana", flag: "gh" },
  { name: "Haiti", flag: "ht" },
  { name: "Írán", flag: "ir" },
  { name: "Japonsko", flag: "jp" },
  { name: "Jižní Korea", flag: "kr" },
  { name: "Jordánsko", flag: "jo" },
  { name: "Maroko", flag: "ma" },
  { name: "Mexiko", flag: "mx" },
  { name: "Německo", flag: "de" },
  { name: "Nizozemsko", flag: "nl" },
  { name: "Norsko", flag: "no" },
  { name: "Nový Zéland", flag: "nz" },
  { name: "Panama", flag: "pa" },
  { name: "Paraguay", flag: "py" },
  { name: "Portugalsko", flag: "pt" },
  { name: "Pobřeží slonoviny", flag: "ci" },
  { name: "Saúdská Arábie", flag: "sa" },
  { name: "Senegal", flag: "sn" },
  { name: "Skotsko", flag: "gb-sct" },
  { name: "Španělsko", flag: "es" },
  { name: "Švédsko", flag: "se" },
  { name: "Švýcarsko", flag: "ch" },
  { name: "Tunisko", flag: "tn" },
  { name: "Turecko", flag: "tr" },
  { name: "Uruguay", flag: "uy" },
  { name: "USA", flag: "us" },
  { name: "Uzbekistán", flag: "uz" }
];

let allMatches = [];
let allTips = [];

async function initSubmitPage() {
  await loadMatches();
  await loadTips();

  fillPredictedTeamSelect();
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
    resetTipMode();
  });

  matchSelect.addEventListener("change", () => {
    renderOtherTips();
    updateTipMode();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    await submitTip();
  });
}

function fillPredictedTeamSelect() {
  const select = document.getElementById("predicted-team");

  if (!select) return;

  select.innerHTML = `
    <option value="">Vyber tým</option>
    ${teams.map(team => `
      <option value="${team.name}">
        ${team.name}
      </option>
    `).join("")}
  `;
}

function isMatchUpcoming(match) {
  return match.result_home === null || match.result_away === null;
}

function isBonusMatch(match) {
  return match.group_name === "Bonus";
}

function getSelectedMatch() {
  const matchId = document.getElementById("match-select").value;

  if (!matchId) return null;

  return allMatches.find(match => {
    return String(match.id) === String(matchId);
  });
}

function updateTipMode() {
  const match = getSelectedMatch();

  const scoreInputs =
    document.querySelector(".score-inputs");

  const teamTipWrapper =
    document.getElementById("team-tip-wrapper");

  const tipHome =
    document.getElementById("tip-home");

  const tipAway =
    document.getElementById("tip-away");

  const predictedTeam =
    document.getElementById("predicted-team");

  if (!scoreInputs || !teamTipWrapper) return;

  if (match && isBonusMatch(match)) {
    scoreInputs.style.display = "none";
    teamTipWrapper.style.display = "block";

    tipHome.required = false;
    tipAway.required = false;
    predictedTeam.required = true;

    tipHome.value = "";
    tipAway.value = "";
  } else {
    scoreInputs.style.display = "grid";
    teamTipWrapper.style.display = "none";

    tipHome.required = true;
    tipAway.required = true;
    predictedTeam.required = false;

    predictedTeam.value = "";
  }
}

function resetTipMode() {
  const scoreInputs =
    document.querySelector(".score-inputs");

  const teamTipWrapper =
    document.getElementById("team-tip-wrapper");

  if (scoreInputs) scoreInputs.style.display = "grid";
  if (teamTipWrapper) teamTipWrapper.style.display = "none";
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

    const label = isBonusMatch(match)
      ? `${formatDate(match.match_date)} · 🏆 ${match.home_team}`
      : `${formatDate(match.match_date)} · ${match.group_name} · ${match.home_team} vs ${match.away_team}`;

    option.textContent = label;

    matchSelect.appendChild(option);
  });
}

function renderOtherTips() {
  const match = getSelectedMatch();

  const container =
    document.getElementById("other-tips");

  container.innerHTML = "";

  if (!match) return;

  const tipsForMatch = allTips.filter(tip => {
    return String(tip.match_id) === String(match.id);
  });

  const tipsHtml = tipsForMatch.length > 0
    ? tipsForMatch.map(tip => {
        const tipText = isBonusMatch(match)
          ? tip.predicted_team
          : `${tip.tip_home}:${tip.tip_away}`;

        return `
          <tr>
            <td>${tip.player_name}</td>
            <td>${tipText || "-"}</td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="2">Zatím nikdo netipoval.</td>
      </tr>
    `;

  const scoreline = isBonusMatch(match)
    ? "výběr týmu"
    : "čeká se";

  const homeFlag = isBonusMatch(match)
    ? "worldcup"
    : match.home_flag;

  const awayFlag = isBonusMatch(match)
    ? "football"
    : match.away_flag;

  container.innerHTML = `
    <div class="match-card submit-preview">
      <div class="match-header">
        <div>
          <div class="match-date">
            ${formatDate(match.match_date)}
          </div>

          <div class="match-scoreline">
          const homeDisplay = isBonusMatch(match)
            ? `
              <div class="team-side">
                <span class="team-name">
                  ${
                    match.home_team === "Mistr světa"
                      ? "🏆 Mistr světa"
                      : match.home_team === "Finalista"
                      ? "🥈 Finalista"
                      : "🥉 Třetí místo"
                  }
                </span>
              </div>
            `
            : `
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
            `;

            <div class="score-pill">
              ${scoreline}
            </div>

            const awayDisplay = isBonusMatch(match)
              ? `
                <div class="team-side">
                  <span class="team-name">
                    ⚽ Výběr týmu
                  </span>
                </div>
              `
              : `
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
              `;
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

  const match = getSelectedMatch();

  if (!playerName || !match) {
    status.innerHTML = "❌ Vyber tipéra a zápas.";
    return;
  }

  const tipsForMatch = allTips.filter(tip => {
    return String(tip.match_id) === String(match.id);
  });

  const samePlayerAlreadyTipped = tipsForMatch.some(tip => {
    return tip.player_name === playerName;
  });

  if (samePlayerAlreadyTipped) {
    status.innerHTML = "❌ Tenhle zápas už máš natipovaný.";
    return;
  }

  let insertData = {
    player_name: playerName,
    match_id: match.id
  };

  if (isBonusMatch(match)) {
    const predictedTeam =
      document.getElementById("predicted-team").value;

    if (!predictedTeam) {
      status.innerHTML = "❌ Vyber tým.";
      return;
    }

    insertData.predicted_team = predictedTeam;
    insertData.tip_home = null;
    insertData.tip_away = null;
  } else {
    const tipHome =
      Number(document.getElementById("tip-home").value);

    const tipAway =
      Number(document.getElementById("tip-away").value);

    if (
      Number.isNaN(tipHome) ||
      Number.isNaN(tipAway) ||
      tipHome < 0 ||
      tipAway < 0
    ) {
      status.innerHTML = "❌ Zadej platné skóre.";
      return;
    }

    insertData.tip_home = tipHome;
    insertData.tip_away = tipAway;
    insertData.predicted_team = null;
  }

  status.innerHTML = "⏳ Odesílám tip...";

  const { error } = await supabaseClient
    .from("tips")
    .insert(insertData);

  if (error) {
    console.error(error);
    status.innerHTML = `❌ ${error.message}`;
    return;
  }

  status.innerHTML = "✅ Tip byl úspěšně odeslán!";

  document.getElementById("tip-home").value = "";
  document.getElementById("tip-away").value = "";
  document.getElementById("predicted-team").value = "";

  await loadTips();

  renderAvailableMatches();
  clearTipPreview();
  resetTipMode();
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
