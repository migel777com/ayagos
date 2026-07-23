// wishes.js: Uses server API to read/write wishes.json (no localStorage). XSS-safe rendering
(function(){
  const form = document.getElementById('wishForm');
  const list = document.getElementById('wishesList');
  const statusEl = document.getElementById('formStatus');

  // Optional Google Forms integration: if window.GOOGLE_FORM_URL is set, embed it and skip local wishes logic
  try {
    const raw = (window.GOOGLE_FORM_URL || '').trim();
    if (raw) {
      const section = document.getElementById('wishes');
      const container = section ? section.querySelector('.container') : null;
      const url = new URL(raw, location.href);
      // Ensure we use the embedded view
      if (!url.searchParams.has('embedded')) url.searchParams.append('embedded', 'true');
      // Hide/remove local form and list
      form?.remove();
      list?.remove();
      if (statusEl) statusEl.textContent = '';
      if (container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'gform-embed';
        wrapper.innerHTML = `
          <p class="status">Тілек қалдыру үшін төмендегі форманы пайдаланыңыз.</p>
          <iframe title="Құттықтаулар формасы" src="${url.toString()}" width="100%" height="900" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
        `;
        container.appendChild(wrapper);
      }
      return; // stop executing the local wishes feature
    }
  } catch {}

  const escapeHtml = (str = '') => String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');

  const api = {
    async list() {
      const res = await fetch('/api/wishes', { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      return Array.isArray(data) ? data.filter(isValidWish).sort((a,b)=> b.createdAt - a.createdAt) : [];
    },
    async add({ name, message }) {
      const res = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
      });
      if (!res.ok) throw new Error('Failed to save');
      const entry = await res.json();
      if (!isValidWish(entry)) throw new Error('Invalid entry');
      return entry;
    },
    async remove(id) {
      const res = await fetch(`/api/wishes/${encodeURIComponent(id)}` , { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return { ok: true };
    }
  };

  function isValidWish(w) {
    return w && typeof w === 'object' && typeof w.name === 'string' && typeof w.message === 'string' && typeof w.createdAt === 'number' && typeof w.id === 'string';
  }

  const render = async () => {
    if (!list) return;
    list.setAttribute('aria-busy','true');
    try {
      const wishes = await api.list();
      list.innerHTML = (wishes && wishes.length ? wishes : []).map(w => {
        const when = new Date(w.createdAt).toLocaleString();
        return `
          <article class="wishes-card" data-id="${escapeHtml(w.id)}">
            <header class="card-head">
              <h4>${escapeHtml(w.name)}</h4>
              <button class="btn link small delete-wish" aria-label="Өшіру" title="Өшіру" data-id="${escapeHtml(w.id)}">✕</button>
            </header>
            <p>${escapeHtml(w.message)}</p>
            <div class="meta">${when}</div>
          </article>`;
      }).join('') || '<p class="status">Әзірге тілек жоқ. Алғашқы болыңыз!</p>';
    } catch (e) {
      list.innerHTML = '<p class="status">Тілектерді жүктеу сәтсіз болды. Серверді іске қосыңыз.</p>';
    } finally {
      list.setAttribute('aria-busy','false');
    }
  };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name')||'').trim();
    const message = String(fd.get('message')||'').trim();

    // validation
    if (!name || !message) {
      statusEl.textContent = 'Аты және тілек мәтіні қажет';
      return;
    }
    if (name.length > 50 || message.length > 500) {
      statusEl.textContent = 'Ұзындық шегі асырылды';
      return;
    }

    statusEl.textContent = 'Сақталуда...';
    try {
      await api.add({ name, message });
      form.reset();
      statusEl.textContent = 'Тілек сақталды!';
      await render();
    } catch (e) {
      statusEl.textContent = 'Сақтау сәтсіз болды. Серверді іске қосыңыз.';
    } finally {
      setTimeout(()=> statusEl.textContent = '', 2500);
    }
  });

  // Delegate delete buttons
  list?.addEventListener('click', async (e) => {
    const btn = e.target.closest && e.target.closest('.delete-wish');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (!id) return;
    btn.disabled = true;
    try {
      await api.remove(id);
      await render();
    } catch (err) {
      alert('Өшіру сәтсіз болды. Серверді іске қосыңыз.');
    } finally {
      btn.disabled = false;
    }
  });

  // initial render
  render();
})();