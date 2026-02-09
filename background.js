const API_KEY = '2b151fe564284b03a07cdd3e0d310257';
const COMPETITION_ID = 'PD'; 

chrome.runtime.onInstalled.addListener(() => checkMatches());
chrome.runtime.onStartup.addListener(() => checkMatches());
chrome.alarms.create("checkStatus", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkStatus") checkMatches();
});

async function checkMatches() {
  const today = new Date().toISOString().split('T')[0];
  
  chrome.storage.local.get(['matchData', 'lastFetchDate'], async (result) => {
    let matches = [];
    if (result.matchData && result.lastFetchDate === today) {
      matches = result.matchData;
    } else {
      matches = await fetchFromAPI(today);
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
      chrome.storage.local.set({ matchData: data.matches, lastFetchDate: dateStr });
      return data.matches;
    }
  } catch (error) { console.error(error); return null; }
}

function analyzeMatches(matches) {
  const now = new Date();
  let iconName = "icon_green.png"; 

  if (matches.length > 0) {
      iconName = "icon_orange.png"; 
      
      const isLive = matches.some(match => {
          const start = new Date(match.utcDate);
          const end = new Date(start.getTime() + (130 * 60000)); 
          return (now >= start && now <= end);
      });

      if (isLive) iconName = "icon_red.png"; 
  }
  
  chrome.action.setIcon({ path: iconName });
}