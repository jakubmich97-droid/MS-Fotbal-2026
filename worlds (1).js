const flags = {
  "Česko": "cz",
  "Kanada": "ca",
  "Finsko": "fi",
  "Švédsko": "se",
  "Německo": "de",
  "USA": "us",
  "Švýcarsko": "ch",
  "Dánsko": "dk",
  "Slovensko": "sk",
  "Lotyšsko": "lv",
  "Rakousko": "at",
  "Norsko": "no",
  "Slovinsko": "si",
  "Maďarsko": "hu",
  "Velká Británie": "gb",
  "Itálie": "it"
};

async function loadWorlds() {
  const response = await fetch("./data/matches.json");
  const data = await response.json();

  startWorlds(data.matches);
}

loadWorlds();

function isMatchPlayed(match) {
  return match.resultHome !== "-" && match.resultAway !== "-";
}

function startWorlds(matches) {

  const select = document.getElementById("player-select");
  const players = [];

  matches.forEach(match => {

    match.tips.forEach(tip => {

      if (!players.includes(tip.name)) {
        players.push(tip.name);
      }

    });

  });

  players.sort();

  players.forEach(player => {

    const option = document.createElement("option");

    option.value = player;
    option.textContent = player;

    select.appendChild(option);

  });

  renderAll(matches, players[0]);

  select.addEventListener("change", event => {

    renderAll(matches, event.target.value);

  });
}

function renderAll(matches, playerName) {

  const realA =
    calculateTable(matches, null, "A");

  const realB =
    calculateTable(matches, null, "B");

  const predictedA =
    calculateTable(matches, playerName, "A");

  const predictedB =
    calculateTable(matches, playerName, "B");

  renderGroupTable(
    predictedA,
    realA,
    "group-a-table"
  );

  renderGroupTable(
    predictedB,
    realB,
    "group-b-table"
  );

  renderPlayoff(
    predictedA,
    predictedB
  );
}

function calculateTable(
  matches,
  playerName,
  groupName
) {

  const table = {};

  const filteredMatches = matches.filter(match => {
    return (
      match.group === groupName &&
      isMatchPlayed(match)
    );
  });

  filteredMatches.forEach(match => {

    const homeTeam = match.home;
    const awayTeam = match.away;

    if (!table[homeTeam]) {
      table[homeTeam] = createTeamStats();
    }

    if (!table[awayTeam]) {
      table[awayTeam] = createTeamStats();
    }

    let homeGoals;
    let awayGoals;

    if (playerName) {

      const playerTip = match.tips.find(
        tip => tip.name === playerName
      );

      if (!playerTip) return;

      homeGoals = playerTip.home;
      awayGoals = playerTip.away;

    } else {

      homeGoals = match.resultHome;
      awayGoals = match.resultAway;

    }

    table[homeTeam].played += 1;
    table[awayTeam].played += 1;

    table[homeTeam].gf += homeGoals;
    table[homeTeam].ga += awayGoals;

    table[awayTeam].gf += awayGoals;
    table[awayTeam].ga += homeGoals;

    if (homeGoals > awayGoals) {

      table[homeTeam].points += 3;
      table[homeTeam].wins += 1;

      table[awayTeam].losses += 1;

    } else if (awayGoals > homeGoals) {

      table[awayTeam].points += 3;
      table[awayTeam].wins += 1;

      table[homeTeam].losses += 1;

    } else {

      table[homeTeam].points += 1;
      table[awayTeam].points += 1;

    }

  });

  return Object.entries(table)
    .sort((a, b) => {

      const statsA = a[1];
      const statsB = b[1];

      if (statsB.points !== statsA.points) {
        return statsB.points - statsA.points;
      }

      const diffA =
        statsA.gf - statsA.ga;

      const diffB =
        statsB.gf - statsB.ga;

      if (diffB !== diffA) {
        return diffB - diffA;
      }

      return statsB.gf - statsA.gf;
    });
}

function renderGroupTable(
  predicted,
  real,
  tableId
) {

  const tbody = document.querySelector(
    `#${tableId} tbody`
  );

  tbody.innerHTML = "";

  predicted.forEach((team, index) => {

    const name = team[0];
    const stats = team[1];

    const realPosition =
      real.findIndex(
        realTeam => realTeam[0] === name
      );

    const diff =
      realPosition - index;

    let diffHtml = "";

    if (diff > 0) {

      diffHtml = `
        <span class="diff-up">
          (+${diff})
        </span>
      `;

    } else if (diff < 0) {

      diffHtml = `
        <span class="diff-down">
          (${diff})
        </span>
      `;

    } else {

      diffHtml = `
        <span class="diff-same">
          (=)
        </span>
      `;
    }

    const row =
      document.createElement("tr");

    if (index < 4) {
      row.classList.add("qualified-row");
    }

    if (index >= 7) {
      row.classList.add("relegated-row");
    }

    row.innerHTML = `
      <td>${index + 1}</td>

      <td>

        <div class="table-team">

          <img
            src="./images/flags/${flags[name]}.webp"
            class="table-flag"
            alt="${name}"
          >

          <span>
            ${name}
          </span>

          ${diffHtml}

        </div>

      </td>

      <td>${stats.played}</td>

      <td>${stats.wins}</td>

      <td>${stats.losses}</td>

      <td>
        ${stats.gf}:${stats.ga}
      </td>

      <td>${stats.points}</td>
    `;

    tbody.appendChild(row);

  });
}

function renderPlayoff(
  groupA,
  groupB
) {

  const container =
    document.getElementById(
      "playoff-bracket"
    );

  container.innerHTML = "";

  if (
    groupA.length < 4 ||
    groupB.length < 4
  ) {
    container.innerHTML = `
      <div class="card rules">
        Play-off bude dostupné,
        až budou mít obě skupiny
        alespoň 4 týmy.
      </div>
    `;

    return;
  }

  const matches = [
    ["A1", groupA[0][0], "B4", groupB[3][0]],
    ["A2", groupA[1][0], "B3", groupB[2][0]],
    ["B1", groupB[0][0], "A4", groupA[3][0]],
    ["B2", groupB[1][0], "A3", groupA[2][0]]
  ];

  matches.forEach(match => {

    const card =
      document.createElement("div");

    card.className = "playoff-card";

card.innerHTML = `
  <div class="playoff-title">
    ${match[0]} vs ${match[2]}
  </div>

  <div class="playoff-teams">
    <div class="playoff-team">
      <img
        src="./images/flags/${flags[match[1]]}.webp"
        class="playoff-flag"
        alt="${match[1]}"
      >
      <span>${match[1]}</span>
    </div>

    <div class="playoff-vs">
      vs
    </div>

    <div class="playoff-team">
      <img
        src="./images/flags/${flags[match[3]]}.webp"
        class="playoff-flag"
        alt="${match[3]}"
      >
      <span>${match[3]}</span>
    </div>
  </div>
`;

    container.appendChild(card);

  });
}

function createTeamStats() {

  return {
    played: 0,
    wins: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0
  };
}
