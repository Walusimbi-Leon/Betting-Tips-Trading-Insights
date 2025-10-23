// Sample tips + rendering, search, filter, sort, copy, favorite (localStorage)
const SAMPLE_TIPS = [
    {
        id: 't1',
        league: 'Premier League',
        match: 'Manchester United vs Liverpool',
        tip: 'Liverpool win (1-2) — Back at 2.10',
        odds: 2.10,
        confidence: 85,
        date: '2025-10-16'
    },
    {
        id: 't2',
        league: 'La Liga',
        match: 'Real Madrid vs Barcelona',
        tip: 'Both teams to score — Yes @1.75',
        odds: 1.75,
        confidence: 78,
        date: '2025-10-15'
    },
    {
        id: 't3',
        league: 'Champions League',
        match: 'PSG vs Bayern Munich',
        tip: 'Under 3.5 goals @1.60',
        odds: 1.60,
        confidence: 72,
        date: '2025-10-14'
    },
    {
        id: 't4',
        league: 'Serie A',
        match: 'Juventus vs AC Milan',
        tip: 'Juventus win to nil @2.40',
        odds: 2.40,
        confidence: 68,
        date: '2025-10-13'
    },
    {
        id: 't5',
        league: 'Premier League',
        match: 'Arsenal vs Chelsea',
        tip: 'Draw @3.20',
        odds: 3.20,
        confidence: 60,
        date: '2025-10-12'
    },
    {
        id: 't6',
        league: 'Premier League',
        match: 'Arsenal vs Chelsea',
        tip: 'Draw @3.20',
        odds: 3.20,
        confidence: 60,
        date: '2025-10-12'
    },
    {
        id: 't7',
        league: 'Premier League',
        match: 'Arsenal vs Chelsea',
        tip: 'Draw @3.20',
        odds: 3.20,
        confidence: 60,
        date: '2025-10-12'
    },
    {
        id: 't8',
        league: 'Premier League',
        match: 'Arsenal vs Chelsea',
        tip: 'Draw @3.20',
        odds: 3.20,
        confidence: 60,
        date: '2025-10-12'
    },
    {
        id: 't9',
        league: 'Premier League',
        match: 'Arsenal vs Chelsea',
        tip: 'Draw @3.20',
        odds: 3.20,
        confidence: 60,
        date: '2025-10-12'
    }
];

const tipsContainer = document.getElementById('tips-container');
const searchInput = document.getElementById('search');
const leagueFilter = document.getElementById('league-filter');
const sortBy = document.getElementById('sort-by');
const countEl = document.getElementById('count');
const featuredEl = document.getElementById('featured-tip');

let tips = SAMPLE_TIPS.slice();
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

function renderTips(list) {
    tipsContainer.innerHTML = '';
    if (!list.length) {
        tipsContainer.innerHTML = '<p class="tip-card">No tips found.</p>';
    }
    list.forEach(t => {
        const card = document.createElement('div');
        card.className = 'tip-card';
        card.innerHTML = `
            <div class="tip-meta">
                <div class="league">${escapeHtml(t.league)}</div>
                <div class="meta-right">
                    <span class="small muted">${t.date}</span>
                </div>
            </div>
            <div class="match">${escapeHtml(t.match)}</div>
            <div class="tip-text">${escapeHtml(t.tip)}</div>
            <div class="controls">
                <div>
                    <button class="icon-btn btn-copy" data-id="${t.id}">Copy</button>
                    <button class="icon-btn fav-btn" data-id="${t.id}">${favorites.includes(t.id) ? '★ Favorited' : '☆ Favorite'}</button>
                </div>
                <div class="small muted">Odds: ${t.odds} • Confidence: ${t.confidence}%</div>
            </div>
        `;
        tipsContainer.appendChild(card);
    });
    countEl.textContent = list.length;
    // show featured tip (highest confidence)
    const top = list.slice().sort((a,b)=>b.confidence-a.confidence)[0];
    if (top) {
        featuredEl.hidden = false;
        featuredEl.innerHTML = `
            <div class="tip-meta"><div class="league">${escapeHtml(top.league)}</div><div class="small muted">${top.date}</div></div>
            <div class="match">${escapeHtml(top.match)}</div>
            <div class="tip-text">${escapeHtml(top.tip)}</div>
            <div class="small muted">Odds: ${top.odds} • Confidence: ${top.confidence}%</div>
        `;
    } else {
        featuredEl.hidden = true;
    }
    attachListeners();
}

function attachListeners(){
    document.querySelectorAll('.btn-copy').forEach(btn=>{
        btn.onclick = () => {
            const id = btn.dataset.id;
            const tip = tips.find(t=>t.id===id);
            if (tip) {
                navigator.clipboard?.writeText(`${tip.match} — ${tip.tip} (Odds: ${tip.odds})`)
                    .then(()=> btn.textContent = 'Copied!')
                    .catch(()=> alert('Copy failed — try manually'));
                setTimeout(()=> btn.textContent = 'Copy',1200);
            }
        };
    });
    document.querySelectorAll('.fav-btn').forEach(btn=>{
        btn.onclick = () => {
            const id = btn.dataset.id;
            toggleFavorite(id);
            renderTips(filteredList());
        };
    });
}

function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function toggleFavorite(id){
    const i = favorites.indexOf(id);
    if (i === -1) favorites.push(id);
    else favorites.splice(i,1);
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function filteredList(){
    const q = (searchInput.value || '').toLowerCase().trim();
    let list = tips.filter(t=>{
        if (leagueFilter.value !== 'all' && t.league !== leagueFilter.value) return false;
        if (!q) return true;
        return (t.match + ' ' + t.tip + ' ' + t.league).toLowerCase().includes(q);
    });
    if (sortBy.value === 'confidence') list.sort((a,b)=>b.confidence - a.confidence);
    else if (sortBy.value === 'odds') list.sort((a,b)=>a.odds - b.odds);
    else list.sort((a,b)=> new Date(b.date) - new Date(a.date));
    return list;
}

/* event listeners */
searchInput.addEventListener('input', () => renderTips(filteredList()));
leagueFilter.addEventListener('change', () => renderTips(filteredList()));
sortBy.addEventListener('change', () => renderTips(filteredList()));

/* theme toggle */
document.getElementById('theme-toggle').addEventListener('click', (e)=>{
    const btn = e.currentTarget;
    if (document.documentElement.classList.toggle('light')) {
        btn.textContent = 'Light';
    } else btn.textContent = 'Dark';
});

/* init */
renderTips(filteredList());