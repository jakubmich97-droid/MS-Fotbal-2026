const teams = [
  { name: "Argentina", flag: "ar" },
  { name: "Austrálie", flag: "au" },
  { name: "Belgie", flag: "be" },
  { name: "Brazílie", flag: "br" },
  { name: "Česko", flag: "cz" },
  { name: "Dánsko", flag: "dk" },
  { name: "Anglie", flag: "gb" },
  { name: "Francie", flag: "fr" },
  { name: "Německo", flag: "de" },
  { name: "Itálie", flag: "it" },
  { name: "Japonsko", flag: "jp" },
  { name: "Mexiko", flag: "mx" },
  { name: "Nizozemsko", flag: "nl" },
  { name: "Polsko", flag: "pl" },
  { name: "Portugalsko", flag: "pt" },
  { name: "Španělsko", flag: "es" },
  { name: "Švýcarsko", flag: "ch" },
  { name: "USA", flag: "us" }
];

function fillTeamSelects() {
  const homeSelect = document.getElementById("home-team");
  const awaySelect = document.getElementById("away-team");

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
const homeTeam = document.getElementById("home-team").value;
const awayTeam = document.getElementById("away-team").value;

if (homeTeam === awayTeam) {
  status.innerHTML = "❌ Tým nemůže hrát sám proti sobě.";
  return;
}

const homeFlag = getFlagByTeam(homeTeam);
const awayFlag = getFlagByTeam(awayTeam);
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
