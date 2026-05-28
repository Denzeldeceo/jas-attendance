// ── JAS Page Transition System ────────────────────────────
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@600&display=swap');

    .jas-transition {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: #0d0700;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .jas-transition.visible {
      opacity: 1; pointer-events: all;
    }

    /* Big JAS logo */
    .jas-tlogo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 5rem; letter-spacing: 10px;
      color: #FF6B00;
      text-shadow: 0 0 40px rgba(255,107,0,0.5),
                   0 0 80px rgba(255,107,0,0.2);
      line-height: 1;
      margin-bottom: 6px;
    }

    /* Sub text */
    .jas-tsub {
      font-family: 'Outfit', sans-serif;
      font-size: 9px; font-weight: 600;
      letter-spacing: 4px; text-transform: uppercase;
      color: rgba(255,255,255,0.25);
      margin-bottom: 24px;
    }

    /* Progress bar track */
    .jas-bar-track {
      width: 160px; height: 3px;
      background: rgba(255,107,0,0.15);
      border-radius: 99px;
      overflow: hidden;
    }

    /* Progress bar fill */
    .jas-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #FF6B00, #ffaa55);
      border-radius: 99px;
      box-shadow: 0 0 8px rgba(255,107,0,0.6);
      transition: width 0.05s linear;
    }

    /* Page fade-in on load */
    body { animation: jasPageIn 0.45s ease both; }
    @keyframes jasPageIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: none; }
    }
  `;
  document.head.appendChild(style);

  // Inject overlay
  const overlay = document.createElement('div');
  overlay.className = 'jas-transition';
  overlay.id = 'jasTransition';
  overlay.innerHTML = `
    <div class="jas-tlogo">JAS</div>
    <div class="jas-tsub">Photography &amp; Glam Saloon</div>
    <div class="jas-bar-track">
      <div class="jas-bar-fill" id="jasBarFill"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Animate the progress bar filling up
  function startBar(onComplete) {
    const fill = document.getElementById('jasBarFill');
    if (!fill) return;
    fill.style.width = '0%';
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 8; // random increments feel natural
      if (progress >= 100) {
        progress = 100;
        fill.style.width = '100%';
        clearInterval(interval);
        setTimeout(onComplete, 120);
      } else {
        fill.style.width = progress + '%';
      }
    }, 55);
  }

  // Intercept internal link clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

    e.preventDefault();
    const overlay = document.getElementById('jasTransition');
    overlay.classList.add('visible');

    startBar(() => {
      window.location.href = href;
    });
  });
})();
