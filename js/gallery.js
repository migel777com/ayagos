// gallery.js: hardcoded gallery in HTML; provide lightbox only (no REST)
(function(){
  const container = document.querySelector('[data-lightbox]');
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCap = document.getElementById('lightbox-caption');
  const lbClose = document.querySelector('.lightbox-close');
  if (!container || !lb || !lbImg || !lbCap || !lbClose) return;

  const open = (href, title) => {
    lbImg.src = href;
    lbImg.alt = title || '';
    lbCap.textContent = title || '';
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lb.focus();
  };
  const close = () => {
    lb.hidden = true;
    lbImg.src = '';
    document.body.style.overflow = '';
  };

  container.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a.m-item');
    if (!a) return;
    e.preventDefault();
    open(a.getAttribute('href'), a.getAttribute('data-title'));
  });

  lbClose.addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) close(); });
})();