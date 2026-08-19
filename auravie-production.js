(() => {
  'use strict';

  const KEY = 'auravie_profile_v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Preserve onboarding progress between accidental refreshes.
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } })();
  if (saved) {
    document.documentElement.classList.add('has-saved-profile');
  }

  const toast = (message) => {
    let el = $('#auravieToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'auravieToast';
      el.className = 'auravie-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2800);
  };

  // Make the topic cards genuinely interactive instead of decorative.
  $$('.topic-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    const title = $('h3', card)?.textContent?.trim();
    const activate = () => {
      const starter = $('[data-start]');
      if (starter) {
        starter.click();
        toast(title ? `Let's build your ${title.toLowerCase()} reading.` : 'Let’s build your reading.');
      }
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });

  // Smooth anchor navigation with a small cinematic focus treatment.
  $$('a[href^="#"]').forEach(link => link.addEventListener('click', e => {
    const target = $(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => target.classList.add('auravie-focus'), 350);
    setTimeout(() => target.classList.remove('auravie-focus'), 1200);
  }));

  // Header becomes compact after the hero, giving the product a more premium feel.
  const header = $('.site-header');
  const syncHeader = () => header?.classList.toggle('scrolled', window.scrollY > 28);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  // Reveal sections as the visitor moves through the page.
  const revealItems = $$('.section-shell, .seo-proof, .step-card, .topic-card, .forecast-banner, .compat, .faq-section, .cta-section');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); }
    }), { threshold: 0.08, rootMargin: '0px 0px -40px' });
    revealItems.forEach((el, i) => { el.style.setProperty('--reveal-delay', `${Math.min(i % 6, 5) * 55}ms`); io.observe(el); });
  } else revealItems.forEach(el => el.classList.add('in-view'));

  // Subtle pointer parallax on the hero artwork. Disabled for touch/reduced motion.
  const orbit = $('.chart-orbit');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (orbit && !reduce && matchMedia('(pointer:fine)').matches) {
    let raf = 0;
    window.addEventListener('pointermove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / innerWidth - .5) * 2;
        const y = (e.clientY / innerHeight - .5) * 2;
        orbit.style.setProperty('--mx', `${x * 8}px`);
        orbit.style.setProperty('--my', `${y * 8}px`);
      });
    }, { passive: true });
  }

  // Save completed form fields whenever they change. This is intentionally local-only.
  const form = $('#onboarding');
  if (form) {
    form.addEventListener('input', () => {
      const data = {};
      ['name','dob','time','place','context'].forEach(id => { const el = document.getElementById(id); if (el) data[id] = el.value; });
      if (Object.keys(data).length) try { localStorage.setItem(KEY, JSON.stringify({ ...saved, ...data })); } catch {}
    });
  }

  // Prevent accidental submission when Enter is pressed in text fields.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'TEXTAREA') return;
    const modal = $('#onboarding');
    if (modal?.classList.contains('open') && tag === 'INPUT') {
      const next = $('#next', modal);
      if (next) { e.preventDefault(); next.click(); }
    }
  });

  // If the chart engine fails to load, make the failure graceful rather than blank.
  window.addEventListener('error', e => {
    const msg = String(e?.message || '');
    if (/Astronomy|tzlookup|app\.js/i.test(msg)) toast('Your reading engine is taking a moment. Please try again.');
  });

  // Small product affordance: close modal with Escape.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $('#closeModal')?.click();
  });
})();
