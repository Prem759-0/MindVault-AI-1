document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const tabMemory = document.getElementById('tab-memory');
  const tabFocus = document.getElementById('tab-focus');
  const viewMemory = document.getElementById('view-memory');
  const viewFocus = document.getElementById('view-focus');

  tabMemory.addEventListener('click', () => {
    tabMemory.classList.add('active');
    tabFocus.classList.remove('active');
    viewMemory.classList.remove('hidden');
    viewFocus.classList.add('hidden');
  });

  tabFocus.addEventListener('click', () => {
    tabFocus.classList.add('active');
    tabMemory.classList.remove('active');
    viewFocus.classList.remove('hidden');
    viewMemory.classList.add('hidden');
  });

  // Load Data
  loadMemory();
  loadAnalytics();

  // Search functionality
  const searchInput = document.getElementById('ai-search');
  searchInput.addEventListener('input', (e) => {
    loadMemory(e.target.value.toLowerCase());
  });
});

function loadMemory(searchQuery = '') {
  chrome.storage.local.get(['visits'], (data) => {
    const list = document.getElementById('memory-list');
    list.innerHTML = '';
    
    let visits = data.visits || [];

    // Local heuristic search (Mocking Natural Language)
    if (searchQuery) {
      visits = visits.filter(v => {
        const text = `${v.title} ${v.summary} ${v.url}`.toLowerCase();
        // If user types "react", it finds anything related
        return text.includes(searchQuery);
      });
    }

    if (visits.length === 0) {
      list.innerHTML = '<p style="text-align:center; color: #94a3b8; margin-top: 20px;">No memories found.</p>';
      return;
    }

    visits.forEach(visit => {
      const el = document.createElement('div');
      el.className = 'memory-item';
      
      const timeStr = new Date(visit.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      el.innerHTML = `
        <div class="memory-header">
          <img src="${visit.favicon || 'icon16.png'}" onerror="this.src='../icons/icon16.png'">
          <h4 title="${visit.title}">${visit.title}</h4>
        </div>
        <p class="memory-summary">${visit.summary}</p>
        <small style="color:#64748b; font-size: 0.7rem; margin-top: 6px; display:block;">${timeStr} • ${new URL(visit.url).hostname}</small>
      `;
      list.appendChild(el);
    });
  });
}

function loadAnalytics() {
  chrome.storage.local.get(['analytics', 'visits'], (data) => {
    const analytics = data.analytics || { totalTime: 0, tabSwitches: 0, doomscrollEvents: 0 };
    
    // Format time
    const minutes = Math.floor(analytics.totalTime / 60000);
    const hours = Math.floor(minutes / 60);
    document.getElementById('stat-time').innerText = `${hours}h ${minutes % 60}m`;
    
    // Calculate pseudo-score
    let score = 100 - (analytics.tabSwitches * 0.5) - (analytics.doomscrollEvents * 5);
    if (score < 10) score = 10;
    document.getElementById('stat-score').innerText = `${Math.round(score)}%`;
    
    document.querySelector('#stat-switches span').innerText = analytics.tabSwitches;
    document.querySelector('#stat-doomscroll span').innerText = analytics.doomscrollEvents;

    // Render CSS Chart for Top Sites
    renderChart(data.visits || []);
  });
}

function renderChart(visits) {
  const chartContainer = document.getElementById('css-chart');
  chartContainer.innerHTML = '';
  
  // Aggregate time by domain
  const domainTimes = {};
  visits.forEach(v => {
    try {
      const domain = new URL(v.url).hostname.replace('www.', '');
      domainTimes[domain] = (domainTimes[domain] || 0) + v.timeSpent;
    } catch(e) {}
  });

  // Sort and get top 5
  const sortedDomains = Object.entries(domainTimes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const maxTime = sortedDomains[0] ? sortedDomains[0][1] : 1;

  sortedDomains.forEach(([domain, time]) => {
    const percentage = Math.min((time / maxTime) * 100, 100);
    
    const el = document.createElement('div');
    el.className = 'chart-bar-container';
    el.innerHTML = `
      <div class="chart-label" title="${domain}">${domain}</div>
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="width: ${percentage}%"></div>
      </div>
    `;
    chartContainer.appendChild(el);
  });
}

/* 
=================================================
PRODUCTION UPGRADE: TRUE AI INTEGRATION
=================================================
To replace the local heuristic search/summary with real AI, 
uncomment and utilize this function. Because of Chrome extension 
security policies, ensure you store the API key securely.
*/
async function callGroqAPI(prompt) {
  // const apiKey = 'YOUR_GROQ_API_KEY_HERE';
  // const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${apiKey}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     model: 'llama3-8b-8192',
  //     messages: [{ role: 'user', content: prompt }]
  //   })
  // });
  // const data = await response.json();
  // return data.choices[0].message.content;
}
