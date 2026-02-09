const API_KEY = '2b151fe564284b03a07cdd3e0d310257';
const COMPETITION_ID = 'PD';

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['matchData'], (result) => {
    const matches = result.matchData || [];

    renderView(matches);

    if (matches.length > 0) {
      checkForLiveUpdates(matches);
    }
  });
});

function checkForLiveUpdates(matches) {
  const now = new Date();
  const needsUpdate = matches.some((m) => {
    const start = new Date(m.utcDate);
    const end = new Date(start.getTime() + 130 * 60000);
    return now >= start && now <= end;
  });

  if (needsUpdate) {
    const statusBox = document.getElementById('status-box');
    if (statusBox)
      statusBox.innerHTML +=
        "<br><small style='font-weight:normal'>(Actualizando goles...)</small>";
    fetchLiveMatches();
  }
}

async function fetchLiveMatches() {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.football-data.org/v4/competitions/${COMPETITION_ID}/matches?dateFrom=${today}&dateTo=${today}`;

  try {
    const response = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } });
    const data = await response.json();
    if (data.matches) {
      chrome.storage.local.set({ matchData: data.matches });
      renderView(data.matches);
    }
  } catch (e) {
    console.error('Error actualizando:', e);
  }
}

function renderView(matches) {
  const list = document.getElementById('match-list');
  const statusBox = document.getElementById('status-box');
  const header = document.getElementById('main-header');
  const now = new Date();

  list.innerHTML = '';

  if (matches.length === 0) {
    statusBox.innerText = 'Hoy no juega nadie. Internet libre.';
    statusBox.className = 'status-card status-safe';
    list.innerHTML =
      "<li style='padding:10px; text-align:center; color:#999'>Sin eventos programados</li>";
    return;
  }

  let activeGames = 0;

  matches.forEach((match) => {
    const li = document.createElement('li');
    li.className = 'match-item';

    const start = new Date(match.utcDate);
    const end = new Date(start.getTime() + 120 * 60000);
    const localTime = start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    let statusText = localTime;
    let badgeClass = 'badge';
    let scoreHtml = '';
    let rowStyle = '';

    const isInPlay = match.status === 'IN_PLAY' || match.status === 'PAUSED';

    const isTime = now >= start && now <= end;

    if (isInPlay || (isTime && match.status !== 'FINISHED')) {
      activeGames++;
      statusText = 'EN JUEGO';
      badgeClass = 'badge-live';
      rowStyle = 'background-color: #fff0f0;';

      // Goles
      if (match.score && match.score.fullTime) {
        const home = match.score.fullTime.home ?? 0;
        const away = match.score.fullTime.away ?? 0;
        scoreHtml = `<span class="score">${home} - ${away}</span>`;
      }
    } else if (match.status === 'FINISHED') {
      statusText = 'FIN';
      rowStyle = 'opacity: 0.6;';
      if (match.score && match.score.fullTime) {
        scoreHtml = `<span class="score" style="color:#666; border-color:#eee">${match.score.fullTime.home}-${match.score.fullTime.away}</span>`;
      }
    }

    li.style = rowStyle;
    li.innerHTML = `
      <div class="match-info">
        <span class="teams">${match.homeTeam.shortName} vs ${match.awayTeam.shortName}</span>
        <div style="margin-top:4px;">${scoreHtml}</div>
      </div>
      <span class="badge ${badgeClass}">${statusText}</span>
    `;
    list.appendChild(li);
  });

  if (activeGames > 0) {
    statusBox.innerHTML = `⚠️ <b>${activeGames} PARTIDO(S) EN CURSO</b><br><small>Red comprometida</small>`;
    statusBox.className = 'status-card status-critical';
  } else {
    statusBox.innerHTML =
      '⚠️ <b>Partidos hoy</b><br><small>Precaución a la hora señalada</small>';
    statusBox.className = 'status-card status-danger';
  }
}
