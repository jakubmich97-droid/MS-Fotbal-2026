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
  { name: "Bosna a Hercegovina", flag: "ba" },
  { name: "Brazílie", flag: "br" },
  { name: "Kanada", flag: "ca" },
  { name: "Kapverdy", flag: "cv" },
  { name: "Kolumbie", flag: "co" },
  { name: "Chorvatsko", flag: "hr" },
  { name: "Kurakao", flag: "cw" },
  { name: "Česko", flag: "cz" },
  { name: "DR Kongo", flag: "cd" },
  { name: "Ekvádor", flag: "ec" },
  { name: "Egypt", flag: "eg" },
  { name: "Francie", flag: "fr" },
  { name: "Německo", flag: "de" },
  { name: "Ghana", flag: "gh" },
  { name: "Haiti", flag: "ht" },
  { name: "Írán", flag: "ir" },
  { name: "Irák", flag: "iq" },
  { name: "Japonsko", flag: "jp" },
  { name: "Jordánsko", flag: "jo" },
  { name: "Jižní Korea", flag: "kr" },
  { name: "Maroko", flag: "ma" },
  { name: "Mexiko", flag: "mx" },
  { name: "Nizozemsko", flag: "nl" },
  { name: "Nový Zéland", flag: "nz" },
  { name: "Norsko", flag: "no" },
  { name: "Panama", flag: "pa" },
  { name: "Paraguay", flag: "py" },
  { name: "Portugalsko", flag: "pt" },
  { name: "Katar", flag: "qa" },
  { name: "Saúdská Arábie", flag: "sa" },
  { name: "Skotsko", flag: "gb-sct" },
  { name: "Senegal", flag: "sn" },
  { name: "Jihoafrická republika", flag: "za" },
  { name: "Španělsko", flag: "es" },
  { name: "Švédsko", flag: "se" },
  { name: "Švýcarsko", flag: "ch" },
  { name: "Tunisko", flag: "tn" },
  { name: "Turecko", flag: "tr" },
  { name: "USA", flag: "us" },
  { name: "Uruguay", flag: "uy" },
  { name: "Uzbekistán", flag: "uz" },
  { name: "Pobřeží slonoviny", flag: "ci" }
];

let allMatches = [];

initAdmin();

async function initAdmin() {
  fillTeamSelects();
  setupAdminEvents();
  await loadMatches();
}

function setupAdminEvents() {
  const matchForm = document.getElementById("match-form");
  const resultForm = document.getElementById("result-form");

  if (matchForm) {
    matchForm.addEventListener("submit", async event => {
      event.preventDefault();
      await submitMatch();
    });
  }

  if (resultForm) {
    resultForm.addEventListener("submit", async event => {
      event.preventDefault();
      await submitResult();
    });
  }
}

function fillTeamSelects() {
  const homeSelect = document.getElementById("home-team");
  const awaySelect = document.getElementById("away-team");

  if (!homeSelect || !awaySelect) return;

  const options = `
    <option value="">Vyber tým</option>
    ${teams.map(team => `
      <option value="${team.name}">
        ${team.name}
      </option>
    `).join("")}
  `;

  homeSelect.innerHTML = options;
  awaySelect.innerHTML = options;
}

function getFlagByTeam(teamName) {
  const team = teams.find(item => item.name === teamName);
  return team ? team.flag : "";
}

async function loadMatches() {
  const { data, error } = await supabaseClient
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  if (error) {
    console.error(error);
    setStatus("admin-status", "❌ Nepodařilo se načíst zápasy.");
    return;
  }

  allMatches = data || [];

  renderResultSelect();
  renderMatchesTable();
}

async function submitMatch() {
  const statusId = "admin-status";

  const matchDate =
    document.getElementById("match-date").value;

  const groupName =
     document.getElementById("match-group").value;

  const homeTeam =
    document.getElementById("home-team").value;

  const awayTeam =
    document.getElementById("away-team").value;

  if (!matchDate || !groupName || !homeTeam || !awayTeam) {
    setStatus(statusId, "❌ Vyplň všechna pole zápasu.");
    return;
  }

  if (homeTeam === awayTeam) {
    setStatus(statusId, "❌ Tým nemůže hrát sám proti sobě.");
    return;
  }

  const duplicateMatch = allMatches.some(match => {
    return (
      match.match_date === matchDate &&
      match.home_team === homeTeam &&
      match.away_team === awayTeam
    );
  });

  if (duplicateMatch) {
    setStatus(statusId, "❌ Tenhle zápas už v databázi existuje.");
    return;
  }

  const homeFlag = getFlagByTeam(homeTeam);
  const awayFlag = getFlagByTeam(awayTeam);

  if (!homeFlag || !awayFlag) {
    setStatus(statusId, "❌ Nepodařilo se dohledat vlajku týmu.");
    return;
  }

  setStatus(statusId, "⏳ Ukládám zápas...");

  const { error } = await supabaseClient
    .from("matches")
    .insert({
      match_date: matchDate,
      group_name: groupName,
      home_team: homeTeam,
      away_team: awayTeam,
      home_flag: homeFlag,
      away_flag: awayFlag,
      result_home: null,
      result_away: null
    });

  if (error) {
    console.error(error);
    setStatus(statusId, "❌ Zápas se nepodařilo uložit.");
    return;
  }

  document.getElementById("match-form").reset();
  fillTeamSelects();

  setStatus(statusId, "✅ Zápas uložen.");
  await loadMatches();
}

async function submitResult() {
  const statusId = "result-status";

  const matchId =
    document.getElementById("result-match-select").value;

  const resultHome =
    document.getElementById("result-home").value;

  const resultAway =
    document.getElementById("result-away").value;

  if (!matchId || resultHome === "" || resultAway === "") {
    setStatus(statusId, "❌ Vyber zápas a doplň výsledek.");
    return;
  }

  setStatus(statusId, "⏳ Ukládám výsledek...");

  const { error } = await supabaseClient
    .from("matches")
    .update({
      result_home: Number(resultHome),
      result_away: Number(resultAway)
    })
    .eq("id", matchId);

  if (error) {
    console.error(error);
    setStatus(statusId, "❌ Výsledek se nepodařilo uložit.");
    return;
  }

  document.getElementById("result-form").reset();

  setStatus(statusId, "✅ Výsledek uložen.");
  await loadMatches();
}

function renderResultSelect() {
  const select =
    document.getElementById("result-match-select");

  if (!select) return;

  const unfinishedMatches = allMatches.filter(match => {
    return match.result_home === null || match.result_away === null;
  });

  select.innerHTML = `
    <option value="">Vyber zápas</option>
    ${unfinishedMatches.map(match => `
      <option value="${match.id}">
        ${formatDate(match.match_date)} · ${match.group_name} · ${match.home_team} vs ${match.away_team}
      </option>
    `).join("")}
  `;
}

function renderMatchesTable() {
  const tbody =
    document.querySelector("#admin-matches-table tbody");

  if (!tbody) return;

  if (allMatches.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">Zatím nejsou vložené žádné zápasy.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allMatches.map(match => {
    const result =
      match.result_home === null || match.result_away === null
        ? "čeká se"
        : `${match.result_home}:${match.result_away}`;

    return `
      <tr>
        <td>${formatDate(match.match_date)}</td>
        <td>${match.group_name}</td>
        <td>
          <img src="./images/flags/${match.home_flag}.webp" class="table-flag" alt="${match.home_team}">
          ${match.home_team}
          vs
          <img src="./images/flags/${match.away_flag}.webp" class="table-flag" alt="${match.away_team}">
          ${match.away_team}
        </td>
        <td>${result}</td>
      </tr>
    `;
  }).join("");
}

function setStatus(elementId, message) {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.innerHTML = message;
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
