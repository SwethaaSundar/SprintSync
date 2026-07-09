(function(){

  // ---------- Data ----------
  const columns = [
    {id:'backlog',  name:'Backlog',     color:'var(--status-backlog)'},
    {id:'todo',     name:'To do',       color:'var(--status-todo)'},
    {id:'progress', name:'In progress', color:'var(--status-progress)'},
    {id:'review',   name:'Review',      color:'var(--status-review)'},
    {id:'done',     name:'Done',        color:'var(--status-done)'},
  ];

  const team = [
    {id:'am', name:'Ana Moreno',  color:'#ff9d6f'},
    {id:'dk', name:'Deepa Kumar', color:'#8b7cf6'},
    {id:'jl', name:'Jonas Lind',  color:'#4ade80'},
    {id:'rt', name:'Rui Tanaka',  color:'#4a9eff'},
    {id:'sv', name:'Sofia Vidal', color:'#f5b942'},
  ];

  let tasks = [
    {id:'NOVA-101', title:'Design retry UI for failed payments', assignee:'am', points:5, priority:'high', column:'backlog'},
    {id:'NOVA-102', title:'Audit checkout analytics events', assignee:'rt', points:3, priority:'low', column:'backlog'},
    {id:'NOVA-103', title:'Spike: split checkout into micro-steps', assignee:'jl', points:8, priority:'med', column:'backlog'},
    {id:'NOVA-104', title:'Write copy for empty cart state', assignee:'sv', points:1, priority:'low', column:'backlog'},
    {id:'NOVA-105', title:'Define beta cohort rollout list', assignee:'dk', points:2, priority:'med', column:'backlog'},
    {id:'NOVA-106', title:'Migrate address form to new schema', assignee:'am', points:5, priority:'high', column:'backlog'},

    {id:'NOVA-107', title:'Build payment-retry state machine', assignee:'dk', points:8, priority:'high', column:'todo'},
    {id:'NOVA-108', title:'Add feature flag for new checkout', assignee:'rt', points:2, priority:'med', column:'todo'},
    {id:'NOVA-109', title:'Update shipping cost calculator', assignee:'jl', points:3, priority:'med', column:'todo'},
    {id:'NOVA-110', title:'QA plan for beta cohort', assignee:'sv', points:2, priority:'low', column:'todo'},

    {id:'NOVA-111', title:'Implement retry-loop backoff logic', assignee:'dk', points:5, priority:'high', column:'progress'},
    {id:'NOVA-112', title:'Wire new checkout to feature flag', assignee:'am', points:3, priority:'high', column:'progress'},
    {id:'NOVA-113', title:'Responsive pass on order summary', assignee:'rt', points:3, priority:'med', column:'progress'},

    {id:'NOVA-114', title:'Cart persistence across sessions', assignee:'jl', points:5, priority:'med', column:'review'},
    {id:'NOVA-115', title:'Refactor discount-code validator', assignee:'sv', points:3, priority:'low', column:'review'},

    {id:'NOVA-116', title:'Set up checkout error logging', assignee:'am', points:2, priority:'med', column:'done'},
    {id:'NOVA-117', title:'Remove legacy payment provider', assignee:'dk', points:5, priority:'high', column:'done'},
    {id:'NOVA-118', title:'Update Stripe SDK to latest', assignee:'rt', points:3, priority:'med', column:'done'},
    {id:'NOVA-119', title:'Fix tax calc rounding bug', assignee:'jl', points:2, priority:'high', column:'done'},
    {id:'NOVA-120', title:'Add loading skeleton to cart', assignee:'sv', points:1, priority:'low', column:'done'},
    {id:'NOVA-121', title:'Write checkout QA test plan', assignee:'am', points:3, priority:'low', column:'done'},
    {id:'NOVA-122', title:'Localize checkout error strings', assignee:'rt', points:3, priority:'med', column:'done'},
    {id:'NOVA-123', title:'Instrument funnel drop-off events', assignee:'dk', points:2, priority:'med', column:'done'},
  ];

  const burndownIdeal = [45,38,31,24,17,10,3,0];
  const burndownActual = [45,41,36,32];
  const sprintTotalDays = 8;
  const daysLeft = sprintTotalDays - burndownActual.length;

  let filters = {search:'', assignee:'', priority:''};
  let dragTaskId = null;

  // ---------- Helpers ----------
  const teamById = Object.fromEntries(team.map(t=>[t.id,t]));
  const initials = name => name.split(' ').map(w=>w[0]).join('').toUpperCase();
  const priLabel = p => ({high:'High',med:'Med',low:'Low'})[p];

  // ---------- Render: ring + sparkline ----------
  function renderPulse(){
    const r = 31, circ = 2*Math.PI*r;
    const fracLeft = daysLeft/sprintTotalDays;
    const fill = document.getElementById('ringFill');
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1-fracLeft);
    document.getElementById('daysLeft').textContent = daysLeft;

    const remaining = 45 - burndownActual[burndownActual.length-1];
    document.getElementById('velocityNum').textContent = 45-remaining;

    const svg = document.getElementById('sparkline');
    const w=90,h=26, max=45;
    const pts = burndownActual.map((v,i)=>{
      const x = (i/(burndownActual.length-1))*w;
      const y = h - (v/max)*h;
      return [x,y];
    });
    const path = pts.map(p=>p.join(',')).join(' ');
    svg.innerHTML = `
      <polyline points="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pts[pts.length-1][0]}" cy="${pts[pts.length-1][1]}" r="2.5" fill="var(--accent)"/>
    `;
  }

  // ---------- Render: filter dropdowns ----------
  function populateFilters(){
    const asg = document.getElementById('filterAssignee');
    team.forEach(t=>{
      const o = document.createElement('option');
      o.value = t.id; o.textContent = t.name;
      asg.appendChild(o);
    });
    const newAsg = document.getElementById('newAssignee');
    team.forEach(t=>{
      const o = document.createElement('option');
      o.value = t.id; o.textContent = t.name;
      newAsg.appendChild(o);
    });
    const newCol = document.getElementById('newColumn');
    columns.forEach(c=>{
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.name;
      newCol.appendChild(o);
    });
  }

  // ---------- Render: column tabs (mobile) ----------
  function renderTabs(){
    const wrap = document.getElementById('colTabs');
    wrap.innerHTML = '';
    columns.forEach((c,i)=>{
      const btn = document.createElement('button');
      btn.textContent = c.name;
      if(i===0) btn.classList.add('active');
      btn.addEventListener('click', ()=>{
        wrap.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('col-'+c.id).scrollIntoView({behavior:'smooth', inline:'start', block:'nearest'});
      });
      wrap.appendChild(btn);
    });
  }

  // ---------- Render: board ----------
  function taskMatchesFilters(t){
    if(filters.assignee && t.assignee !== filters.assignee) return false;
    if(filters.priority && t.priority !== filters.priority) return false;
    if(filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) && !t.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }

  function makeCard(t){
    const member = teamById[t.assignee];
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = t.id;
    card.innerHTML = `
      <div class="card-top">
        <p class="card-title">${t.title}</p>
        <span class="card-points">${t.points}</span>
      </div>
      <div class="card-tags">
        <span class="tag pri-${t.priority}">${priLabel(t.priority)}</span>
      </div>
      <div class="card-bottom">
        <span class="card-key">${t.id}</span>
        <span class="avatar" style="background:${member.color}" title="${member.name}">${initials(member.name)}</span>
      </div>
    `;
    card.addEventListener('dragstart', e=>{
      dragTaskId = t.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
    });
    card.addEventListener('dragend', ()=>card.classList.remove('dragging'));
    return card;
  }

  function renderBoard(){
    const board = document.getElementById('board');
    board.innerHTML = '';
    columns.forEach(col=>{
      const colTasks = tasks.filter(t=>t.column===col.id && taskMatchesFilters(t));
      const colEl = document.createElement('div');
      colEl.className = 'column';
      colEl.id = 'col-'+col.id;
      colEl.innerHTML = `
        <div class="column-head">
          <span class="column-title"><span class="dot" style="background:${col.color}"></span>${col.name}</span>
          <span class="column-count">${colTasks.length}</span>
        </div>
        <div class="cards"></div>
      `;
      const cardsWrap = colEl.querySelector('.cards');
      if(colTasks.length===0){
        const hint = document.createElement('div');
        hint.className='empty-hint';
        hint.textContent = 'No tasks here';
        cardsWrap.appendChild(hint);
      } else {
        colTasks.forEach(t=>cardsWrap.appendChild(makeCard(t)));
      }

      colEl.addEventListener('dragover', e=>{
        e.preventDefault();
        colEl.classList.add('drag-over');
      });
      colEl.addEventListener('dragleave', ()=>colEl.classList.remove('drag-over'));
      colEl.addEventListener('drop', e=>{
        e.preventDefault();
        colEl.classList.remove('drag-over');
        const task = tasks.find(t=>t.id===dragTaskId);
        if(task){
          task.column = col.id;
          renderBoard();
          renderTeam();
        }
      });

      board.appendChild(colEl);
    });
  }

  // ---------- Render: team rail ----------
  function renderTeam(){
    const rail = document.getElementById('teamRail');
    rail.innerHTML = '<h3>Team workload</h3>';
    const maxPts = Math.max(...team.map(m=>tasks.filter(t=>t.assignee===m.id && t.column!=='done').reduce((s,t)=>s+t.points,0)), 1);
    team.forEach(m=>{
      const pts = tasks.filter(t=>t.assignee===m.id && t.column!=='done').reduce((s,t)=>s+t.points,0);
      const pct = Math.round((pts/maxPts)*100);
      const row = document.createElement('div');
      row.className = 'team-member';
      row.innerHTML = `
        <span class="avatar" style="background:${m.color};width:28px;height:28px;font-size:11px;">${initials(m.name)}</span>
        <div class="team-info">
          <p class="name">${m.name}</p>
          <div class="workload-bar"><div class="workload-fill" style="width:${pct}%;background:${m.color}"></div></div>
        </div>
        <span class="team-points">${pts}pt</span>
      `;
      rail.appendChild(row);
    });
  }

  // ---------- Modal ----------
  const backdrop = document.getElementById('modalBackdrop');
  document.getElementById('openModalBtn').addEventListener('click', ()=>backdrop.classList.add('open'));
  document.getElementById('cancelModalBtn').addEventListener('click', ()=>backdrop.classList.remove('open'));
  backdrop.addEventListener('click', e=>{ if(e.target===backdrop) backdrop.classList.remove('open'); });

  document.getElementById('saveTaskBtn').addEventListener('click', ()=>{
    const title = document.getElementById('newTitle').value.trim();
    if(!title){ document.getElementById('newTitle').focus(); return; }
    const nextNum = 100 + tasks.length + 1;
    tasks.push({
      id: 'NOVA-'+nextNum,
      title,
      assignee: document.getElementById('newAssignee').value,
      points: parseInt(document.getElementById('newPoints').value,10),
      priority: document.getElementById('newPriority').value,
      column: document.getElementById('newColumn').value,
    });
    document.getElementById('newTitle').value='';
    backdrop.classList.remove('open');
    renderBoard();
    renderTeam();
  });

  // ---------- Filters ----------
  document.getElementById('searchInput').addEventListener('input', e=>{
    filters.search = e.target.value;
    renderBoard();
  });
  document.getElementById('filterAssignee').addEventListener('change', e=>{
    filters.assignee = e.target.value;
    renderBoard();
  });
  document.getElementById('filterPriority').addEventListener('change', e=>{
    filters.priority = e.target.value;
    renderBoard();
  });

  // ---------- Theme ----------
  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('iconMoon').style.display = theme==='light' ? 'inline' : 'none';
    document.getElementById('iconSun').style.display = theme==='light' ? 'none' : 'inline';
  }
  let currentTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(currentTheme);
  document.getElementById('themeToggle').addEventListener('click', ()=>{
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
  });

  // ---------- Init ----------
  populateFilters();
  renderTabs();
  renderPulse();
  renderBoard();
  renderTeam();

})();
