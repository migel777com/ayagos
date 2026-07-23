// main.js: navigation, scroll reveals, share, music, year
(function(){
  const html = document.documentElement;
  const navToggle = document.querySelector('.nav-toggle');
  const navList = document.getElementById('nav-list');
  const musicToggle = document.getElementById('musicToggle');
  const audio = document.getElementById('bg-music');
  const shareBtn = document.getElementById('shareBtn');
  const yearEl = document.getElementById('year');

  // Current year
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = html.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    navList?.addEventListener('click', (e) => {
      const target = e.target;
      if (target instanceof HTMLAnchorElement) {
        html.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Smooth scroll offset fix for sticky header (basic)
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#' ) return;
      const el = document.querySelector(href);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Scroll reveal (IntersectionObserver)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
  }

  // Music toggle (respect autoplay policies - start only on user interaction)
  const MUSIC_KEY = 'musicEnabled';
  try {
    const enabled = localStorage.getItem(MUSIC_KEY) === '1';
    if (enabled) {
      // we'll only try play after a user gesture
      musicToggle?.setAttribute('aria-pressed', 'true');
    }
  } catch {}

  const enableMusic = async (on) => {
    try {
      if (!audio) return;
      if (on) {
        await audio.play().catch(()=>{});
        musicToggle?.setAttribute('aria-pressed', 'true');
        localStorage.setItem(MUSIC_KEY, '1');
      } else {
        audio.pause();
        musicToggle?.setAttribute('aria-pressed', 'false');
        localStorage.setItem(MUSIC_KEY, '0');
      }
    } catch {}
  };

  musicToggle?.addEventListener('click', () => {
    const on = musicToggle.getAttribute('aria-pressed') !== 'true';
    enableMusic(on);
  });

  // Start music if previously enabled on first user interaction
  const onceClick = () => {
    try {
      if (localStorage.getItem(MUSIC_KEY) === '1') enableMusic(true);
    } catch {}
    window.removeEventListener('pointerdown', onceClick);
  };
  window.addEventListener('pointerdown', onceClick, { once: true });

  // Share button
  shareBtn?.addEventListener('click', async () => {
    const data = { title: document.title, text: 'AIZHAN & ZHANTORE – A New Chapter Begins', url: location.href };
    if (navigator.share) {
      try { await navigator.share(data); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(location.href);
        shareBtn.textContent = 'Сілтеме көшірілді';
        setTimeout(()=> shareBtn.textContent = 'Бөлісу', 2000);
      } catch {}
    }
  });
})();