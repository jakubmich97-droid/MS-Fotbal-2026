const SUPABASE_URL =
  "https://rmqaiaybfxdfxbqznhab.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWFpYXliZnhkZnhicXpuaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDk4NzEsImV4cCI6MjA5NDUyNTg3MX0.tF9SRcNiwbNmBv7fr0GV-psZ76AKOgiSFCOAn1degok";

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allMatches = [];
let groupTables = {};

async function initStandingsPage() {
  await loadMatches();

  groupTables = buildAllGroupTables(allMatches);

  setupViewSwitch();
  setupPlayoffStageSwitch();

  renderGroups();
  renderThirdPlaceTable();
  renderQualifiedTeams();
  renderPlayoffStage("r32");
}

initStandingsPage();

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

function isGroupMatch(match) {
  return (
    match.group_name &&
    match.group_name.startsWith("Skupina") &&
    match.result_home !== null &&
    match.result_away !== null
  );
}

function buildAllGroupTables(matches) {
  const groups = {};

  matches
    .filter(match => {
      return (
        match.group_name &&
        match.group_name.startsWith("Skupina")
      );
    })
    .forEach(match => {
      if (!groups[match.group_name]) {
        groups[match.group_name] = [];
      }

      groups[match.group_name].push(match);
    });

  const tables = {};

  Object.entries(groups).forEach(([groupName, groupMatches]) => {
    tables[groupName] = buildGroupTable(groupName, groupMatches);
  });

  return tables;
}

function createEmptyTeam(teamName, flag, groupName) {
  return {
    team: teamName,
    flag,
    groupName,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0
  };
}

function buildGroupTable(groupName, groupMatches) {
  const teamsMap = {};

  groupMatches.forEach(match => {
    if (!teamsMap[match.home_team]) {
      teamsMap[match.home_team] =
        createEmptyTeam(match.home_team, match.home_flag, groupName);
    }

    if (!teamsMap[match.away_team]) {
      teamsMap[match.away_team] =
        createEmptyTeam(match.away_team, match.away_flag, groupName);
    }

    if (match.result_home === null || match.result_away === null) {
      return;
    }

    const home = teamsMap[match.home_team];
    const away = teamsMap[match.away_team];

    const homeGoals = Number(match.result_home);
    const awayGoals = Number(match.result_away);

    home.played += 1;
    away.played += 1;

    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;

    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (awayGoals > homeGoals) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  const table = Object.values(teamsMap).map(team => {
    return {
      ...team,
      goalDiff: team.goalsFor - team.goalsAgainst
    };
  });

  return sortGroupTable(table, groupMatches);
}

function sortGroupTable(table, groupMatches) {
  return table.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    const tiedTeams = table.filter(team => {
      return team.points === a.points;
    });

    if (tiedTeams.length > 1) {
      const miniA = getHeadToHeadStats(a.team, tiedTeams, groupMatches);
      const miniB = getHeadToHeadStats(b.team, tiedTeams, groupMatches);

      if (miniB.points !== miniA.points) {
        return miniB.points - miniA.points;
      }

      if (miniB.goalDiff !== miniA.goalDiff) {
        return miniB.goalDiff - miniA.goalDiff;
      }

      if (miniB.goalsFor !== miniA.goalsFor) {
        return miniB.goalsFor - miniA.goalsFor;
      }
    }

    if (b.goalDiff !== a.goalDiff) {
      return b.goalDiff - a.goalDiff;
    }

    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }

    return a.team.localeCompare(b.team, "cs");
  });
}

function getHeadToHeadStats(teamName, tiedTeams, groupMatches) {
  const tiedNames = tiedTeams.map(team => team.team);

  const stats = {
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0
  };

  groupMatches.forEach(match => {
    const isRelevant =
      tiedNames.includes(match.home_team) &&
      tiedNames.includes(match.away_team);

    const involvesTeam =
      match.home_team === teamName ||
      match.away_team === teamName;

    if (
      !isRelevant ||
      !involvesTeam ||
      match.result_home === null ||
      match.result_away === null
    ) {
      return;
    }

    const isHome = match.home_team === teamName;

    const goalsFor = isHome
      ? Number(match.result_home)
      : Number(match.result_away);

    const goalsAgainst = isHome
      ? Number(match.result_away)
      : Number(match.result_home);

    stats.goalsFor += goalsFor;
    stats.goalsAgainst += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      stats.points += 3;
    } else if (goalsFor === goalsAgainst) {
      stats.points += 1;
    }
  });

  stats.goalDiff = stats.goalsFor - stats.goalsAgainst;

  return stats;
}

function renderGroups() {
  const container = document.getElementById("groups-tables");

  if (!container) return;

  const groupNames = Object.keys(groupTables).sort((a, b) => {
    return a.localeCompare(b, "cs", { numeric: true });
  });

  if (groupNames.length === 0) {
    container.innerHTML = `
      <div class="card rules">
        Zatím nejsou k dispozici žádné skupiny.
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  groupNames.forEach(groupName => {
    const table = groupTables[groupName];

    const card = document.createElement("div");
    card.className = "card group-card";

    card.innerHTML = `
      <h3>${groupName}</h3>

      <table class="group-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tým</th>
            <th>Z</th>
            <th>V</th>
            <th>R</th>
            <th>P</th>
            <th>Skóre</th>
            <th>RG</th>
            <th>B</th>
          </tr>
        </thead>

        <tbody>
          ${table.map((team, index) => renderGroupRow(team, index)).join("")}
        </tbody>
      </table>
    `;

    container.appendChild(card);
  });
}

function renderGroupRow(team, index) {
  let rowClass = "";

  if (index <= 1) {
    rowClass = "qualified-row";
  } else if (index === 2) {
    rowClass = "third-place-row";
  }

  return `
    <tr class="${rowClass}">
      <td>
      ${index + 1}
      ${index <= 1 ? " ✅" : index === 2 ? " 🟡" : ""}
    </td>
      <td>
        <div class="table-team">
          <img
            src="./images/flags/${team.flag}.webp"
            class="table-flag"
            alt="${team.team}"
          >
          <span>${team.team}</span>
        </div>
      </td>
      <td>${team.played}</td>
      <td>${team.wins}</td>
      <td>${team.draws}</td>
      <td>${team.losses}</td>
      <td>${team.goalsFor}:${team.goalsAgainst}</td>
      <td>${formatGoalDiff(team.goalDiff)}</td>
      <td><strong>${team.points}</strong></td>
    </tr>
  `;
}

function renderThirdPlaceTable() {
  const tbody = document.querySelector("#third-place-table tbody");

  if (!tbody) return;

  const thirdTeams = getThirdPlaceTeams();

  if (thirdTeams.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10">Zatím nejsou k dispozici třetí týmy.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = thirdTeams.map((team, index) => {
    const rowClass = index < 8
      ? "qualified-row"
      : "relegated-row";

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td>
          <div class="table-team">
            <img
              src="./images/flags/${team.flag}.webp"
              class="table-flag"
              alt="${team.team}"
            >
            <span>${team.team}</span>
          </div>
        </td>
        <td>${team.groupName}</td>
        <td>${team.played}</td>
        <td>${team.wins}</td>
        <td>${team.draws}</td>
        <td>${team.losses}</td>
        <td>${team.goalsFor}:${team.goalsAgainst}</td>
        <td>${formatGoalDiff(team.goalDiff)}</td>
        <td><strong>${team.points}</strong></td>
      </tr>
    `;
  }).join("");
}

function getThirdPlaceTeams() {
  const thirdTeams = Object.values(groupTables)
    .map(table => table[2])
    .filter(Boolean);

  return sortThirdTeams(thirdTeams);
}

function sortThirdTeams(teams) {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    return a.team.localeCompare(b.team, "cs");
  });
}

function getQualifiedTeams() {
  const directQualified = [];

  Object.values(groupTables).forEach(table => {
    directQualified.push(...table.slice(0, 2));
  });

  const thirdQualified = getThirdPlaceTeams().slice(0, 8);

  return [...directQualified, ...thirdQualified];
}

function renderQualifiedTeams() {
  const container = document.getElementById("qualified-teams");

  if (!container) return;

  const qualified = getQualifiedTeams();

  if (qualified.length === 0) {
    container.innerHTML = `
      <div class="card rules">
        Zatím není známý žádný postupující tým.
      </div>
    `;
    return;
  }

  container.innerHTML = qualified.map((team, index) => {
    return `
      <div class="qualified-team-card">
        <span class="qualified-number">${index + 1}</span>
        <img
          src="./images/flags/${team.flag}.webp"
          class="table-flag"
          alt="${team.team}"
        >
        <strong>${team.team}</strong>
        <span>${team.groupName}</span>
      </div>
    `;
  }).join("");
}

function setupViewSwitch() {
  document.querySelectorAll(".standings-tab").forEach(button => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;

      document.querySelectorAll(".standings-tab").forEach(item => {
        item.classList.remove("active");
      });

      document.querySelectorAll(".standings-view").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      document
        .getElementById(`${view}-view`)
        .classList.add("active");
      
            if (view === "playoff") {
        document
          .getElementById("playoff-view")
          .scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
      }
    });
  });
}

function setupPlayoffStageSwitch() {
  document.querySelectorAll(".playoff-stage-btn").forEach(button => {
    button.addEventListener("click", () => {
      const stage = button.dataset.stage;

      document.querySelectorAll(".playoff-stage-btn").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      renderPlayoffStage(stage);
    });
  });
}

function renderPlayoffStage(stage) {
  const container = document.getElementById("playoff-bracket");

  if (!container) return;

  const qualified = getQualifiedTeams();

  if (qualified.length < 32) {
    container.innerHTML = `
      <div class="card rules">
        Pro predikci 1/16 finále je potřeba mít 32 postupujících týmů.
        Aktuálně: ${qualified.length}/32.
      </div>
    `;
    return;
  }

  const pairings = buildPlayoffPairings(qualified, stage);

  container.innerHTML = pairings.map(pair => {
    return `
      <div class="playoff-card">
        <div class="playoff-title">${getStageLabel(stage)}</div>

        <div class="playoff-teams">
          ${renderPlayoffTeam(pair[0])}

          <div class="playoff-vs">vs</div>

          ${renderPlayoffTeam(pair[1])}
        </div>
      </div>
    `;
  }).join("");
}

function buildPlayoffPairings(qualified, stage) {
  const sorted = [...qualified].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    return a.team.localeCompare(b.team, "cs");
  });

  let stageTeams = sorted;

  if (stage === "r16") {
    stageTeams = sorted.slice(0, 16);
  }

  if (stage === "qf") {
    stageTeams = sorted.slice(0, 8);
  }

  if (stage === "sf") {
    stageTeams = sorted.slice(0, 4);
  }

  if (stage === "final") {
    stageTeams = sorted.slice(0, 2);
  }

  const pairings = [];

  for (let i = 0; i < stageTeams.length / 2; i++) {
    pairings.push([
      stageTeams[i],
      stageTeams[stageTeams.length - 1 - i]
    ]);
  }

  return pairings;
}

function renderPlayoffTeam(team) {
  if (!team) {
    return `
      <div class="playoff-team empty">
        TBD
      </div>
    `;
  }

  return `
    <div class="playoff-team">
      <img
        src="./images/flags/${team.flag}.webp"
        class="playoff-flag"
        alt="${team.team}"
      >
      <span>${team.team}</span>
    </div>
  `;
}

function getStageLabel(stage) {
  if (stage === "r32") return "1/16 finále";
  if (stage === "r16") return "Osmifinále";
  if (stage === "qf") return "Čtvrtfinále";
  if (stage === "sf") return "Semifinále";
  if (stage === "final") return "Finále";

  return "Play-off";
}

function formatGoalDiff(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}
