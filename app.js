(() => {
  'use strict';

  const state = {
    step: 1,
    data: { name:'', dob:'', time:'', place:'', situation:'', context:'', style:'A balanced mix', topics:[] },
    chart: null,
    geo: null
  };

  const modal = document.getElementById('onboarding');
  const content = document.getElementById('formContent');
  const bar = document.getElementById('progressBar');

  const situations = [
    ['❤️','Struggling in love or relationships','Feeling disconnected, confused or uncertain.'],
    ['💼','Working hard but not moving forward','Burnout, career uncertainty or stalled progress.'],
    ['🔮','Unsure of my direction','Questioning your purpose or next chapter.'],
    ['💰','Constant financial anxiety or instability','Wanting greater security or relief from money stress.'],
    ['🧠','Feeling stuck in my own patterns','Overthinking, self-doubt or repeating behaviors.'],
    ['🌱','Going through a major life change','A breakup, career shift, move or new chapter.'],
    ['✦','Other','Tell us what feels most important right now.']
  ];
  const topics = [
    ['❤️','Love & Relationships','Connection, attraction, emotional patterns and partnership.'],
    ['↗','Career & Work','Ambition, direction, work style and professional potential.'],
    ['◌','Money & Financial Stability','Your relationship with earning, security and abundance.'],
    ['☉','Personality & Emotions','Strengths, needs, emotions and inner wiring.'],
    ['✺','Shadow & Growth','Blind spots, recurring patterns and personal evolution.'],
    ['✧','Life Purpose','Meaning, direction and deeper themes.'],
    ['🪐','Timing & Transits','Current cycles and the seasons ahead.']
  ];
  const styles = [
    ['🌿','Gentle & reflective','Thoughtful, supportive and introspective.'],
    ['🎯','Direct & honest','Tell me what the chart suggests without sugar-coating.'],
    ['🔮','Deep & psychological','Focus on patterns, motivations and hidden dynamics.'],
    ['⚡','Practical & actionable','Give me insights I can actually use.'],
    ['✨','A balanced mix','A little of everything.']
  ];
  const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const glyphs = {Sun:'☉',Moon:'☾',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇'};

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signAt = lon => { lon=((lon%360)+360)%360; const i=Math.floor(lon/30); return {index:i,name:signs[i],degree:lon-i*30,longitude:lon}; };
  const fmtPos = p => `${p.degree.toFixed(1)}° ${p.name}`;

  function open() { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); state.step=1; render(); }
  function close() { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  document.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', open));
  document.getElementById('closeModal')?.addEventListener('click', close);
  modal?.addEventListener('click', e => { if(e.target===modal) close(); });

  function setProgress(){ if(bar) bar.style.width=`${Math.min(100,state.step/6*100)}%`; }

  function localToUtc(dob,time,tz){
    const [y,m,d]=dob.split('-').map(Number), [hh,mm]=time.split(':').map(Number);
    let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
    try {
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(guess);
      const o={}; parts.forEach(p=>o[p.type]=p.value);
      const asUtc=Date.UTC(+o.year,+o.month-1,+o.day,+o.hour,+o.minute);
      return new Date(guess.getTime()-(asUtc-guess.getTime()));
    } catch { return guess; }
  }

  const knownPlaces = [
    ['lahore',31.5204,74.3587,'Asia/Karachi'], ['lahore pakistan',31.5204,74.3587,'Asia/Karachi'],
    ['islamabad',33.6844,73.0479,'Asia/Karachi'], ['islamabad pakistan',33.6844,73.0479,'Asia/Karachi'],
    ['karachi',24.8607,67.0011,'Asia/Karachi'], ['karachi pakistan',24.8607,67.0011,'Asia/Karachi'],
    ['rawalpindi',33.5651,73.0169,'Asia/Karachi'], ['peshawar',34.0151,71.5249,'Asia/Karachi'],
    ['multan',30.1575,71.5249,'Asia/Karachi'], ['faisalabad',31.4504,73.1350,'Asia/Karachi'],
    ['new york',40.7128,-74.0060,'America/New_York'], ['london',51.5074,-0.1278,'Europe/London'],
    ['dubai',25.2048,55.2708,'Asia/Dubai'], ['delhi',28.6139,77.2090,'Asia/Kolkata'],
    ['mumbai',19.0760,72.8777,'Asia/Kolkata'], ['toronto',43.6532,-79.3832,'America/Toronto']
  ];

  async function geocode(place){
    const key=place.trim().toLowerCase().replace(/\s+/g,' ');
    const known=knownPlaces.find(x => key===x[0] || key.startsWith(x[0]+',') || key.includes(x[0]));
    if(known) return {lat:known[1],lon:known[2],label:place,timeZone:known[3]};
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8000);
    try {
      const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(place)}`;
      const r=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});
      if(!r.ok) throw new Error('Location lookup failed');
      const rows=await r.json();
      if(!rows.length) throw new Error('We could not find that birthplace. Try "City, Country".');
      return {lat:+rows[0].lat,lon:+rows[0].lon,label:rows[0].display_name};
    } finally { clearTimeout(timer); }
  }

  function getTimeZone(geo){
    if(geo.timeZone) return geo.timeZone;
    if(typeof window.tzlookup==='function') return window.tzlookup(geo.lat,geo.lon);
    return 'UTC';
  }

  function approxSunSign(date){
    const y=date.getUTCFullYear();
    const starts=[[0,20,'Capricorn'],[1,19,'Aquarius'],[2,21,'Pisces'],[3,20,'Aries'],[4,21,'Taurus'],[5,21,'Gemini'],[6,23,'Cancer'],[7,23,'Leo'],[8,23,'Virgo'],[9,23,'Libra'],[10,22,'Scorpio'],[11,22,'Sagittarius']];
    const md=date.getUTCMonth()*100+date.getUTCDate();
    let idx=11;
    for(let i=0;i<starts.length;i++){const n=starts[i][0]*100+starts[i][1]; if(md>=n) idx=i;}
    if(date.getUTCMonth()===0 && date.getUTCDate()<20) idx=11;
    const names=signs; return names.indexOf(starts[idx][2]);
  }

  function fallbackChart(date,lat,lon){
    const sun=signAt(approxSunSign(date)*30+15);
    const moonCycle=((date.getTime()/86400000)+4.5)%27.321661/27.321661*360;
    const moon=signAt(moonCycle);
    const rising=signAt((((date.getTime()/3600000)*15)+lon)%360);
    const placements={Sun:sun,Moon:moon,Rising:rising};
    ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].forEach((n,i)=>placements[n]=signAt((sun.longitude+(i+1)*23)%360));
    return {date,latitude:lat,longitude:lon,placements,aspects:[],fallback:true};
  }

  function ascendant(date,lat,lon){
    const lst=((Astronomy.SiderealTime(date)*15+lon)%360+360)%360, eps=23.4392911*Math.PI/180, phi=lat*Math.PI/180, th=lst*Math.PI/180;
    let a=Math.atan2(-Math.cos(th),Math.sin(th)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps))*180/Math.PI;
    return signAt((a+180+360)%360);
  }

  function majorAspects(p){
    const names=Object.keys(p).filter(x=>x!=='Rising'), out=[];
    const targets=[['Conjunction',0,6],['Sextile',60,4],['Square',90,5],['Trine',120,5],['Opposition',180,6]];
    for(let i=0;i<names.length;i++) for(let j=i+1;j<names.length;j++){
      let diff=Math.abs(p[names[i]].longitude-p[names[j]].longitude); diff=Math.min(diff,360-diff);
      for(const [name,angle,orb] of targets) if(Math.abs(diff-angle)<=orb){out.push({a:names[i],b:names[j],name,orb:+Math.abs(diff-angle).toFixed(1)});break;}
    }
    return out;
  }

  function calculateChart(date,lat,lon){
    if(!window.Astronomy || typeof Astronomy.EclipticLongitude!=='function') return fallbackChart(date,lat,lon);
    const bodies=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'], placements={};
    for(const body of bodies){ placements[body]=signAt(Astronomy.EclipticLongitude(Astronomy.Body[body],date)); }
    placements.Rising=ascendant(date,lat,lon);
    return {date,latitude:lat,longitude:lon,placements,aspects:majorAspects(placements),fallback:false};
  }

  function readingFor(topic,c){
    const p=c.placements, sun=p.Sun, moon=p.Moon, rise=p.Rising, venus=p.Venus, mars=p.Mars, jupiter=p.Jupiter, saturn=p.Saturn, mc=signAt((rise.longitude+270)%360);
    const map={
      'Love & Relationships':`Your ${venus.name} Venus describes how you tend to give and receive affection, while your ${moon.name} Moon speaks to emotional safety. With a ${sun.name} Sun and ${rise.name} Rising, you're likely to respond best to relationships that feel both meaningful and alive. Watch the difference between chemistry and consistency: your chart invites you to value both.`,
      'Career & Work':`Your ${sun.name} Sun points to the kind of expression that keeps you engaged, while ${mars.name} Mars shows how you pursue goals. Your ${mc.name} Midheaven adds a clue about public direction. You may thrive less from one “perfect” job and more from work where your strengths, autonomy and ambition have room to breathe.`,
      'Money & Financial Stability':`Your ${venus.name} Venus and ${jupiter.name} Jupiter are useful lenses for comfort, opportunity and growth, while ${saturn.name} Saturn brings the discipline side. Astrology cannot predict a bank balance, but this combination is useful for reflecting on security, risk, patience and the habits that support long-term stability.`,
      'Personality & Emotions':`Your ${sun.name} Sun describes your core expression, your ${moon.name} Moon adds the private emotional layer, and ${rise.name} Rising describes how you meet the world. That mix can explain why the version of you people first see isn't always the person you experience internally.`,
      'Shadow & Growth':`Your ${saturn.name} Saturn can describe lessons that become easier through maturity, while the ${moon.name} Moon can reveal emotional habits that run before conscious thought. The useful question is not “what is wrong with me?” but “what pattern am I ready to stop repeating?”`,
      'Life Purpose':`Your ${sun.name} Sun is the central thread of self-expression. The ${mc.name} Midheaven and ${mars.name} Mars add clues about direction and contribution. Purpose is better treated as a direction you develop than a single destiny you have to discover.`
    };
    return map[topic] || `Your chart combines a ${sun.name} Sun, ${moon.name} Moon and ${rise.name} Rising. That unique mix becomes the foundation for a deeper ${topic.toLowerCase()} reading.`;
  }

  function render(){
    setProgress(); const d=state.data,c=state.chart;
    if(state.step===1){ content.innerHTML=`<div class="form-eyebrow">01 · YOUR BIRTH DATA</div><h2 class="form-title" id="modal-title">Let's start with the sky you were born under.</h2><p class="form-copy">Your birth details create the foundation of your personal chart. Your name is only used to personalize your reading.</p><div class="field"><label>Your name</label><input id="name" value="${esc(d.name)}" placeholder="What should we call you?" autocomplete="name"></div><div class="field"><label>Date of birth</label><input id="dob" type="date" value="${d.dob}"></div><div class="field"><label>Exact birth time <span style="color:#777">(recommended)</span></label><input id="time" type="time" value="${d.time}"><p class="form-copy">Your Rising sign and houses need an accurate birth time. You can continue without it.</p></div><div class="field"><label>Birthplace</label><input id="place" value="${esc(d.place)}" placeholder="City, country" autocomplete="address-level2"></div><div class="form-actions"><span></span><button class="primary-btn" id="next">Continue →</button></div>`; }
    else if(state.step===2){ content.innerHTML=`<div class="form-eyebrow">02 · YOUR CONTEXT · OPTIONAL</div><h2 class="form-title">What's happening in your life right now?</h2><p class="form-copy">A little context helps make the reading more personal. Or skip it — your chart can lead the way.</p><div class="choice-grid">${situations.map((x,i)=>`<button class="choice ${d.situation===x[1]?'selected':''}" data-sit="${i}"><strong>${x[0]} ${x[1]}</strong><small>${x[2]}</small></button>`).join('')}</div><div class="field"><label>Any specific details? <span style="color:#777">(optional)</span></label><textarea id="context" placeholder="Describe your current situation in a few words...">${esc(d.context)}</textarea></div><div class="form-actions"><button class="back-btn" id="back">← Back</button><div><button class="skip" id="skip">Skip this step</button><button class="primary-btn" id="next">Continue →</button></div></div>`; }
    else if(state.step===3){ content.innerHTML=`<div class="form-eyebrow">03 · YOUR READING STYLE</div><h2 class="form-title">How do you want your reading to feel?</h2><p class="form-copy">We'll shape the voice and emphasis around what actually helps you.</p><div class="choice-grid">${styles.map(x=>`<button class="choice ${d.style===x[1]?'selected':''}" data-style="${x[1]}"><strong>${x[0]} ${x[1]}</strong><small>${x[2]}</small></button>`).join('')}</div><div class="form-actions"><button class="back-btn" id="back">← Back</button><button class="primary-btn" id="next">Continue →</button></div>`; }
    else if(state.step===4){ content.innerHTML=`<div class="form-eyebrow">04 · WHAT MATTERS TO YOU</div><h2 class="form-title">What do you want to understand?</h2><p class="form-copy">Choose up to three. We'll build your free reading around them.</p><p class="form-copy"><strong>${d.topics.length}/3 selected</strong></p><div class="choice-grid">${topics.map((x,i)=>`<button class="choice ${d.topics.includes(x[1])?'selected':''}" data-topic="${i}"><strong>${x[0]} ${x[1]}</strong><small>${x[2]}</small></button>`).join('')}</div><div class="form-actions"><button class="back-btn" id="back">← Back</button><button class="primary-btn" id="next">Calculate my chart ✦</button></div>`; }
    else if(state.step===5){ content.innerHTML=`<div class="form-eyebrow">05 · CALCULATING YOUR CHART</div><h2 class="form-title">The sky is coming into focus.</h2><p class="form-copy" id="calcStatus">Preparing your birth chart…</p><div style="padding:35px 0;text-align:center;font-size:3.2rem">☾ ✦ ☉ ✧</div><div class="form-actions"><button class="back-btn" id="back">← Back</button><button class="primary-btn" id="finish" disabled style="opacity:.55">Preparing reading…</button></div>`; setTimeout(prepareChart,50); }
    else {
      const free=(d.topics.length?d.topics:['Personality & Emotions']).map(t=>`<article class="free-reading-card"><span>${topics.find(x=>x[1]===t)?.[0]||'✦'}</span><h3>${esc(t)}</h3><p>${esc(readingFor(t,c))}</p><div class="locked-line">✦ Deeper chart analysis is waiting below</div></article>`).join('');
      content.innerHTML=`<div class="form-eyebrow">YOUR FREE READING · ${c?.geoLabel?esc(c.geoLabel.split(',')[0]):'NATAL CHART'}</div><h2 class="form-title">The first layer is yours, ${esc(d.name||'stargazer')}.</h2><p class="form-copy">Your chart has been calculated from the birth information you provided.</p>${c?.fallback?'<div class="form-copy" style="padding:10px 14px;border:1px solid rgba(255,255,255,.12);border-radius:12px">A temporary chart-calculation service was unavailable, so Auravie used a safe fallback for the preview. Refreshing later can restore full planetary precision.</div>':''}<div class="preview-result"><div><small>☉ SUN</small><strong>${c?.placements.Sun.name||'—'}</strong><span>${c?fmtPos(c.placements.Sun):'—'}</span></div><div><small>☾ MOON</small><strong>${c?.placements.Moon.name||'—'}</strong><span>${c?fmtPos(c.placements.Moon):'—'}</span></div><div><small>↑ RISING</small><strong>${c?.placements.Rising.name||'—'}</strong><span>${c?fmtPos(c.placements.Rising):'—'}</span></div></div><div class="free-reading-list">${free}</div><div class="premium-tease"><div><span class="form-eyebrow">GO DEEPER</span><h3>Your chart has more to say.</h3><p>Unlock detailed placements, houses, aspects, timing and a longer personalized report.</p></div><button class="primary-btn" type="button" id="premium">Unlock full reading · $9</button></div><p class="disclaimer">Astrology is provided for reflection, curiosity and self-discovery. It is not medical, legal or financial advice.</p><button class="back-btn" id="closeResult">Return to Auravie ✦</button>`;
    }
    bind();
  }

  async function prepareChart(){
    const status=document.getElementById('calcStatus'),finish=document.getElementById('finish'); if(!status||!finish)return;
    try{
      status.textContent='Finding your birthplace…';
      state.geo=await geocode(state.data.place);
      const tz=getTimeZone(state.geo);
      status.textContent=`Found ${state.geo.label.split(',').slice(0,2).join(', ')} · calculating the sky…`;
      let date;
      if(state.data.time) date=localToUtc(state.data.dob,state.data.time,tz); else date=new Date(`${state.data.dob}T12:00:00Z`);
      state.chart=calculateChart(date,state.geo.lat,state.geo.lon);
      state.chart.geoLabel=state.geo.label; state.chart.timezone=tz;
      status.textContent=state.chart.fallback?'Preview chart ready ✓':'Natal chart calculated ✓';
      finish.disabled=false; finish.style.opacity='1'; finish.textContent='See my free reading →'; finish.dataset.retry='';
    }catch(e){
      // Never leave the user trapped on the calculation screen.
      try{
        const date=state.data.dob?new Date(`${state.data.dob}T${state.data.time||'12:00'}:00Z`):new Date();
        state.geo=state.geo||{lat:0,lon:0,label:state.data.place||'Birthplace'};
        state.chart=fallbackChart(date,state.geo.lat,state.geo.lon); state.chart.geoLabel=state.geo.label; state.chart.timezone='UTC';
        status.textContent='Birthplace lookup was unavailable, but your preview is ready.';
        finish.disabled=false; finish.style.opacity='1'; finish.textContent='See my free reading →'; finish.dataset.retry='';
      }catch(err){ status.textContent='We could not prepare the reading. Please refresh and try again.'; finish.disabled=false; finish.style.opacity='1'; finish.textContent='Try again'; finish.dataset.retry='true'; }
    }
  }

  function bind(){
    document.getElementById('next')?.addEventListener('click',()=>{
      if(state.step===1){
        state.data.name=document.getElementById('name')?.value.trim(); state.data.dob=document.getElementById('dob')?.value; state.data.time=document.getElementById('time')?.value; state.data.place=document.getElementById('place')?.value.trim();
        if(!state.data.name||!state.data.dob||!state.data.place){alert('Please enter your name, date of birth and birthplace.');return;}
      }
      if(state.step===2) state.data.context=document.getElementById('context')?.value.trim()||'';
      if(state.step===4 && !state.data.topics.length){state.data.topics=['Personality & Emotions'];}
      state.step++; render();
    });
    document.getElementById('back')?.addEventListener('click',()=>{state.step=Math.max(1,state.step-1);render();});
    document.getElementById('skip')?.addEventListener('click',()=>{state.data.situation='';state.data.context='';state.step++;render();});
    document.querySelectorAll('[data-sit]').forEach(b=>b.addEventListener('click',()=>{state.data.situation=situations[+b.dataset.sit][1];render();}));
    document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{state.data.style=b.dataset.style;render();}));
    document.querySelectorAll('[data-topic]').forEach(b=>b.addEventListener('click',()=>{const t=topics[+b.dataset.topic][1];if(state.data.topics.includes(t))state.data.topics=state.data.topics.filter(x=>x!==t);else if(state.data.topics.length<3)state.data.topics.push(t);render();}));
    document.getElementById('finish')?.addEventListener('click',()=>{if(document.getElementById('finish').dataset.retry){prepareChart();return;}state.step=6;render();});
    document.getElementById('closeResult')?.addEventListener('click',close);
    document.getElementById('premium')?.addEventListener('click',()=>alert('Premium reports and payment integration are coming next. Your free reading is ready now.'));
  }
})();
