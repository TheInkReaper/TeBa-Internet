const API_KEY = '2b151fe564284b03a07cdd3e0d310257';
const COMPETITION_ID = 'PD';

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['matchData'], (result) => {
    const matches = result.matchData || [];
    const activeMatches = matches.filter(m => m.status !== 'FINISHED');
    
    renderView(activeMatches);
    
    if (activeMatches.length > 0) {
      checkForLiveUpdates(activeMatches);
    }
  });

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.style.transform = 'rotate(360deg)';
      fetchLiveMatches(true); 
      setTimeout(() => { refreshBtn.style.transform = 'none'; }, 500);
    });
  }
});

function checkForLiveUpdates(matches) {
  const now = new Date();
  
  const needsUpdate = matches.some((m) => {
    const start = new Date(m.utcDate);
    const end = new Date(start.getTime() + 130 * 60000); 
    const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED';
    const isTime = now >= start && now <= end;
    return isLive || isTime;
  });

  if (needsUpdate) {
    fetchLiveMatches(false);
  }
}

async function fetchLiveMatches(isManual) {
  const statusBox = document.getElementById('status-box');
  
  if (isManual && statusBox) {
    const oldText = statusBox.innerHTML;
    if (!oldText.includes("Actualizando")) {
        statusBox.innerHTML += "<br><small style='font-weight:normal; font-size:10px'>🔄 Conectando...</small>";
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.football-data.org/v4/competitions/${COMPETITION_ID}/matches?dateFrom=${today}&dateTo=${today}`;

  try {
    const response = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } });
    const data = await response.json();
    
    if (data.matches) {
      chrome.storage.local.set({ matchData: data.matches });
      
      const pendingMatches = data.matches.filter(m => m.status !== 'FINISHED');
      renderView(pendingMatches);
    }
  } catch (e) {
    console.error('Error actualizando:', e);
    if (statusBox && isManual) statusBox.innerText = "Error de conexión";
  }
}

function renderView(matches) {
  const list = document.getElementById('match-list');
  const statusBox = document.getElementById('status-box');
  const now = new Date();

  list.innerHTML = '';

  if (matches.length === 0) {
    statusBox.innerHTML = '✅ <b>INTERNET LIBRE</b><br><small>Sin amenazas activas ahora mismo</small>';
    statusBox.className = 'status-card status-safe';
    list.innerHTML = "<li style='padding:15px; text-align:center; color:#999; font-size:12px'>No hay eventos activos ni programados para el resto del día.</li>";
    return;
  }

  let activeGames = 0;

  matches.forEach((match) => {
    const li = document.createElement('li');
    li.className = 'match-item';

    const start = new Date(match.utcDate);
    const end = new Date(start.getTime() + 115 * 60000); 
    
    const localTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let statusText = localTime;
    let badgeClass = 'badge';
    let rowStyle = '';
    let extraInfo = '';
    let scoreHtml = '';

    const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
    
    if (isLive) {
      activeGames++;
      statusText = 'EN JUEGO';
      badgeClass = 'badge-live';
      rowStyle = 'background-color: #fff0f0; border-left: 3px solid #dc3545;';
      extraInfo = `<div style="font-size: 11px; color: #d63384;">Fin aprox: ${endTime}</div>`;
      
      if (match.score && match.score.fullTime) {
          const home = match.score.fullTime.home ?? 0;
          const away = match.score.fullTime.away ?? 0;
          scoreHtml = `<span class="score">${home}-${away}</span>`;
      }
    } else {
      statusText = localTime;
      rowStyle = 'background-color: #fff; border-left: 3px solid #ffc107;';
    }

    li.style = rowStyle;
    li.innerHTML = `
      <div class="match-info">
        <span class="teams">${match.homeTeam.shortName} vs ${match.awayTeam.shortName}</span>
        ${extraInfo} 
        <div style="margin-top:3px">${scoreHtml}</div>
      </div>
      <span class="badge ${badgeClass}">${statusText}</span>
    `;
    list.appendChild(li);
  });

  if (activeGames > 0) {
    statusBox.innerHTML = `⚠️ <b>${activeGames} PARTIDO(S) EN CURSO</b><br><small>Red comprometida</small>`;
    statusBox.className = 'status-card status-critical';
  } else {
    statusBox.innerHTML = '⚠️ <b>Amenaza Pendiente</b><br><small>Partidos programados para hoy</small>';
    statusBox.className = 'status-card status-danger';
  }
}