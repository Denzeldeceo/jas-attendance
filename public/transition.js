// ── Page Transition System ────────────────────────────────
(function() {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    .jas-transition {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: #0d0700;
      opacity: 0; pointer-events: none;
      transition: opacity 0.35s ease;
    }
    .jas-transition.visible {
      opacity: 1; pointer-events: all;
    }
    .jas-spin {
      width: 52px; height: 52px;
      border: 3px solid rgba(255,107,0,0.15);
      border-top-color: #FF6B00;
      border-radius: 50%;
      animation: jasSpin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes jasSpin { to { transform: rotate(360deg); } }
    .jas-spin-logo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 2.2rem; letter-spacing: 4px;
      color: #FF6B00;
      text-shadow: 0 0 30px rgba(255,107,0,0.4);
      animation: jasPulse 1.2s ease-in-out infinite;
    }
    @keyframes jasPulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
    .jas-spin-sub {
      font-family: 'Outfit', sans-serif;
      font-size: 10px; font-weight: 600;
      letter-spacing: 3px; text-transform: uppercase;
      color: rgba(255,255,255,0.3); margin-top: 6px;
    }
    /* Page fade-in on load */
    body { animation: jasPageIn 0.4s ease both; }
    @keyframes jasPageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  `;
  document.head.appendChild(style);

  // Inject overlay HTML
  const overlay = document.createElement('div');
  overlay.className = 'jas-transition';
  overlay.id = 'jasTransition';
  overlay.innerHTML = `
    <div class="jas-spin"></div>
    <div class="jas-spin-logo">JAS</div>
    <div class="jas-spin-sub">Loading...</div>
  `;
  document.body.appendChild(overlay);

  // Intercept all internal link clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    // Only intercept same-origin, non-hash, non-external links
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

    e.preventDefault();
    const overlay = document.getElementById('jasTransition');
    overlay.classList.add('visible');
    setTimeout(() => { window.location.href = href; }, 400);
  });
})();
