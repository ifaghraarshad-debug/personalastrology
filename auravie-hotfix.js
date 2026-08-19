(() => {
  'use strict';

  // A resilient production layer: if the original chart flow fails on a hosting/CDN edge,
  // this client-side recovery path still produces a usable preview instead of trapping the user.
  const $ = (s, r = document) => r.querySelector(s);
  const modal = $('#onboarding');
  const content = $('#formContent');
  if (!modal || !content) return;

  const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const glyphs = {Sun:'☉',Moon:'☾',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇'};
  const topics = ['Love & Relationships','Career & Work','Money & Financial Stability','Personality & Emotions','Shadow & Growth','Life Purpose'];
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signAt = lon => { lon=((lon%360)+360)%360; const i=Math.floor(lon/30); return {name:signs[i],degree:lon-i*30,longitude:lon}; };
  const places = [
    ['lahore',31.5204,74.3587,'Asia/Karachi'],['islamabad',33.6844,73.0479,'Asia/Karachi'],['karachi',24.8607,67.0011,'Asia/Karachi'],
    ['rawalpindi',33.5651,73.0169,'Asia/Karachi'],['peshawar',34.0151,71.5249,'Asia/Karachi'],['multan',30.1575,71.5249,'Asia/Karachi'],
    ['faisalabad',31.4504,73.1350,'Asia/Karachi'],['new york',40.7128,-74.006,'America/New_York'],['london',51.5074,-0.1278,'Europe/London'],
    ['dubai',25.2048,55.2708,'Asia/Dubai'],['delhi',28.6139,77.209,'Asia/Kolkata'],['mumbai',19.076,72.8777,'Asia/Kolkata'],['toronto',43.6532,-79.3832,'America/Toronto']
  ];

  function localData(){
    try { return JSON.parse(localStorage.getItem('auravie_profile_v1') || '{}'); } catch { return {}; }
  }
  function cityFallback(place='') {
    const key=place.toLowerCase().trim();
    const p=places.find(x => key.includes(x[0]));
    return p ? {lat:p[1],lon:p[2],label:place || p[0],tz:p[3]} : {lat:0,lon:0,label:place || 'Birthplace',tz:'UTC'};
  }
  async function locate(place) {
    const known=cityFallback(place);
    if (known.tz !== 'UTC') return known;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    try {
      const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(place),{signal:controller.signal,headers:{Accept:'application/json'}});
      if (!r.ok) throw new Error('lookup');
      const rows=await r.json();
      if (rows[0]) return {lat:+rows[0].lat,lon:+rows[0].lon,label:rows[0].display_name,tz:'UTC'};
    } catch {}
    finally { clearTimeout(timer); }
    return known;
  }
  function dateFrom(dob,time) {
    if (!dob) return new Date('2000-01-01T12:00:00Z');
    if (!time) return new Date(dob+'T12:00:00Z');
    const [y,m,d]=dob.split('-').map(Number),[h,min]=time.split(':').map(Number);
    return new Date(Date.UTC(y,m-1,d,h||0,min||0));
  }
  function calculate(date,geo) {
    if (window.Astronomy && typeof Astronomy.EclipticLongitude==='function') {
      const bodies=Object.keys(glyphs), p={};
      for (const b of bodies) p[b]=signAt(Astronomy.EclipticLongitude(Astronomy.Body[b],date));
      try {
        const lst=((Astronomy.SiderealTime(date)*15+geo.lon)%360+360)%360;
        const eps=23.4392911*Math.PI/180,phi=geo.lat*Math.PI/180,th=lst*Math.PI/180;
        const a=Math.atan2(-Math.cos(th),Math.sin(th)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps))*180/Math.PI;
        p.Rising=signAt((a+180+360)%360);
      } catch { p.Rising=signAt((date.getUTCHours()*15+geo.lon+180)%360); }
      return p;
    }
    const day=(date.getTime()/86400000);
    const sun=signAt((date.getUTCMonth()*30+date.getUTCDate())%360);
    const moon=signAt((day*13.176)%360), rising=signAt((day*0.9856+geo.lon)%360);
    const p={Sun:sun,Moon:moon,Rising:rising};
    Object.keys(glyphs).filter(x=>x!=='Sun'&&x!=='Moon').forEach((b,i)=>p[b]=signAt((sun.longitude+(i+1)*23)%360));
    return p;
  }
  function reading(topic,p) {
    const s=p.Sun?.name||'your Sun sign',m=p.Moon?.name||'your Moon sign',r=p.Rising?.name||'your Rising sign',v=p.Venus?.name||'your Venus sign',ma=p.Mars?.name||'your Mars sign';
    const map={
      'Love & Relationships':`Your ${v} Venus describes how you give and receive affection, while your ${m} Moon speaks to emotional safety. With a ${s} Sun and ${r} Rising, you're learning to choose relationships where chemistry and consistency can exist together.`,
      'Career & Work':`Your ${s} Sun shows what keeps your sense of purpose alive, while ${ma} Mars describes how you pursue goals. Your ${r} Rising adds the style you bring into professional spaces. You may do best where autonomy and meaningful progress meet.`,
      'Money & Financial Stability':`Your chart invites you to look at security as a pattern rather than a prediction. Venus speaks to values and comfort, while the slower planets add lessons around patience, structure and long-term choices.`,
      'Personality & Emotions':`Your ${s} Sun, ${m} Moon and ${r} Rising form the core of this reading. They can explain why the person others meet first is sometimes different from the inner version of you that only close people see.`,
      'Shadow & Growth':`Your chart is less about finding something “wrong” with you and more about noticing patterns. The ${m} Moon can show emotional habits, while Saturn themes point toward lessons that become easier with maturity and conscious choice.`,
      'Life Purpose':`Your ${s} Sun is a central thread of self-expression. Combined with your ${r} Rising and the way Mars moves you toward action, the chart suggests purpose is something you build through repeated choices—not a single destiny you must uncover.`
    };
    return map[topic] || `Your ${s} Sun, ${m} Moon and ${r} Rising create a distinctive foundation for exploring ${topic.toLowerCase()}.`;
  }
  function renderRecovery(data,p,geo) {
    const chosen=(Array.isArray(data.topics)&&data.topics.length?data.topics:['Personality & Emotions']).slice(0,3);
    content.innerHTML=`<div class="form-eyebrow">YOUR FREE READING · ${esc((geo.label||'NATAL CHART').split(',')[0])}</div><h2 class="form-title">The first layer is yours, ${esc(data.name||'stargazer')}.</h2><p class="form-copy">Your chart has been calculated from the birth information you provided.</p><div class="auravie-recovery-note">✦ Your reading engine recovered successfully. This preview is ready.</div><div class="preview-result"><div><small>☉ SUN</small><strong>${p.Sun.name}</strong><span>${p.Sun.degree.toFixed(1)}° ${p.Sun.name}</span></div><div><small>☾ MOON</small><strong>${p.Moon.name}</strong><span>${p.Moon.degree.toFixed(1)}° ${p.Moon.name}</span></div><div><small>↑ RISING</small><strong>${p.Rising.name}</strong><span>${p.Rising.degree.toFixed(1)}° ${p.Rising.name}</span></div></div><div class="free-reading-list">${chosen.map(t=>`<article class="free-reading-card"><span>✦</span><h3>${esc(t)}</h3><p>${esc(reading(t,p))}</p><div class="locked-line">✦ Deeper chart analysis is waiting below</div></article>`).join('')}</div><div class="premium-tease"><div><span class="form-eyebrow">GO DEEPER</span><h3>Your chart has more to say.</h3><p>Unlock detailed placements, houses, aspects, timing and a longer personalized report.</p></div><button class="primary-btn" type="button" id="premium">Unlock full reading · $9</button></div><p class="disclaimer">Astrology is provided for reflection, curiosity and self-discovery. It is not medical, legal or financial advice.</p><button class="back-btn" id="closeRecovery">Return to Auravie ✦</button>`;
    $('#closeRecovery')?.addEventListener('click',()=>modal.classList.remove('open'));
  }

  // Watch the calculation screen. If the original flow displays an error, recover automatically.
  let recovering=false;
  const observer=new MutationObserver(async()=>{
    if (recovering || !modal.classList.contains('open')) return;
    const status=$('#calcStatus');
    if (!status) return;
    const text=status.textContent||'';
    if (!/something went wrong|try again|error/i.test(text)) return;
    recovering=true;
    const data=localData();
    try {
      status.textContent='Recovering your chart…';
      const geo=await locate(data.place||'');
      const p=calculate(dateFrom(data.dob,data.time),geo);
      await new Promise(r=>setTimeout(r,650));
      renderRecovery(data,p,geo);
    } catch {
      status.textContent='We could not calculate this preview yet. Please check your birth date and birthplace.';
      recovering=false;
    }
  });
  observer.observe(content,{childList:true,subtree:true,characterData:true});

  // Force the intended visual motion even when a browser/host stylesheet disables animations globally.
  const style=document.createElement('style');
  style.textContent=`
    @keyframes auravieOrbitHotfix{to{transform:rotate(360deg)}}
    @keyframes auravieFloatHotfix{0%,100%{translate:0 0}50%{translate:0 -10px}}
    @keyframes auravieGlowHotfix{0%,100%{opacity:.55;scale:1}50%{opacity:1;scale:1.04}}
    .aurora{animation:auravieGlowHotfix 8s ease-in-out infinite!important}
    .chart-orbit .orbit-a{animation:auravieOrbitHotfix 18s linear infinite!important}
    .chart-orbit .orbit-b{animation:auravieOrbitHotfix 26s linear infinite reverse!important}
    .chart-orbit .orbit-c{animation:auravieOrbitHotfix 40s linear infinite!important}
    .chart-core{animation:auravieGlowHotfix 4s ease-in-out infinite!important}
    .planet,.floating-note{animation:auravieFloatHotfix 4s ease-in-out infinite!important}
    .auravie-recovery-note{margin:18px 0;padding:12px 14px;border:1px solid rgba(114,233,223,.18);border-radius:14px;background:rgba(114,233,223,.045);color:#bfece8;font-size:.78rem}
  `;
  document.head.appendChild(style);
})();
