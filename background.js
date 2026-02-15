const API_KEY = '2b151fe564284b03a07cdd3e0d310257';
const COMPETITION_ID = 'PD';

chrome.runtime.onInstalled.addListener(() => checkMatches());
chrome.runtime.onStartup.addListener(() => checkMatches());
chrome.alarms.create('checkStatus', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkStatus') checkMatches();
});

async function checkMatches() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  chrome.storage.local.get(['matchData', 'lastFetchDate'], async (result) => {
    let matches = result.matchData || [];
    let shouldFetch = true;

    if (result.lastFetchDate === today && matches.length > 0) {
      const anyLive = matches.some(
        (m) => m.status === 'IN_PLAY' || m.status === 'PAUSED',
      );
      const anyShouldBeLive = matches.some((m) => {
        if (m.status === 'FINISHED') return false;
        const start = new Date(m.utcDate);
        return now >= start && m.status !== 'IN_PLAY' && m.status !== 'PAUSED';
      });

      if (!anyLive && !anyShouldBeLive) {
        shouldFetch = false;
      }
    }

    if (shouldFetch) {
      console.log(
        '🔄 Background: Datos antiguos o partido en curso -> Pidiendo a API...',
      );
      matches = await fetchFromAPI(today);
    } else {
      console.log('✅ Background: Usando caché (no hay cambios esperados)');
    }

    if (matches) analyzeMatches(matches);
  });
}

async function fetchFromAPI(dateStr) {
  const url = `https://api.football-data.org/v4/competitions/${COMPETITION_ID}/matches?dateFrom=${dateStr}&dateTo=${dateStr}`;
  try {
    const response = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } });
    const data = await response.json();
    if (data.matches) {
      chrome.storage.local.set({
        matchData: data.matches,
        lastFetchDate: dateStr,
      });
      return data.matches;
    }
  } catch (error) {
    console.error('Error API:', error);
    return null;
  }
}

function analyzeMatches(matches) {
  const pendingMatches = matches.filter((m) => m.status !== 'FINISHED');

  let iconName = 'icon_green.png';

  if (pendingMatches.length > 0) {
    iconName = 'icon_orange.png';

    const isLive = pendingMatches.some(
      (match) => match.status === 'IN_PLAY' || match.status === 'PAUSED',
    );

    if (isLive) iconName = 'icon_red.png';
  }

  chrome.action.setIcon({ path: iconName });
}
