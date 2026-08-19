(() => {
  const root = document.getElementById('formContent');
  if (!root) return;
  const observer = new MutationObserver(() => {
    const result = root.querySelector('.result-header');
    if (!result || root.querySelector('.auravie-deep-dive')) return;
    const preview = root.querySelector('.preview-result');
    const stats = root.querySelector('.chart-stats');
    if (!preview) return;

    const cells = [...preview.children].map(cell => ({
      label: cell.querySelector('small')?.textContent?.replace(/^\S+\s*/, '').trim() || '',
      sign: cell.querySelector('strong')?.textContent?.trim() || '—',
      degree: cell.querySelector('span')?.textContent?.trim() || ''
    }));
    const aspectCount = stats?.textContent?.match(/(\d+) major aspects/)?.[1] || '0';

    const section = document.createElement('section');
    section.className = 'auravie-deep-dive';
    section.innerHTML = `
      <div class="deep-dive-head">
        <div><div class="form-eyebrow">YOUR CHART AT A GLANCE</div><h3>The three layers to know first.</h3></div>
        <span class="aspect-badge">✦ ${aspectCount} major aspects</span>
      </div>
      <div class="placement-grid">
        ${cells.map((x, i) => `
          <article class="placement-card placement-${i}">
            <div class="placement-glyph">${i === 0 ? '☉' : i === 1 ? '☾' : '↑'}</div>
            <div><small>${x.label}</small><strong>${x.sign}</strong><span>${x.degree}</span></div>
            <div class="placement-bar"><i></i></div>
          </article>`).join('')}
      </div>
      <div class="chart-map" aria-label="Astrology chart visualization">
        <div class="chart-ring ring-1"></div><div class="chart-ring ring-2"></div><div class="chart-ring ring-3"></div>
        <div class="chart-cross horizontal"></div><div class="chart-cross vertical"></div>
        <span class="chart-node n1">☉</span><span class="chart-node n2">☾</span><span class="chart-node n3">✦</span><span class="chart-node n4">♃</span>
        <div class="chart-center">✦<small>NATAL<br>SKY</small></div>
      </div>
      <div class="deep-dive-note"><span>✧</span><div><strong>This is only the first layer.</strong><p>Your placements become much more meaningful when we connect them to houses, aspects, planetary relationships and current timing.</p></div></div>
    `;
    const cards = root.querySelector('.free-reading-list');
    if (cards) cards.before(section); else root.append(section);
  });
  observer.observe(root, { childList: true, subtree: true });
})();
