(() => {
  const ASSETS = {
    BTC: { label: 'BTC · Bitcoin', rate: 512340.55, network: 4.9, decimals: 6 },
    ETH: { label: 'ETH · Ethereum', rate: 18450.30, network: 3.5, decimals: 5 },
    USDT: { label: 'USDT · Tether', rate: 5.42, network: 1.2, decimals: 2 }
  };
  const SERVICE_FEE = 12;
  const COUNTDOWN_START = 30;

  let mode = 'comprar';
  let currentAsset = 'BTC';
  let quoteJitter = {};
  let countdown = COUNTDOWN_START;
  let countdownTimer = null;

  const assetSelect = document.getElementById('sim-asset');
  const amountInput = document.getElementById('sim-amount');
  const amountLabel = document.getElementById('sim-amount-label');
  const prefixEl = document.getElementById('sim-prefix');
  const qtyLabel = document.getElementById('sim-qty-label');
  const totalLabel = document.getElementById('sim-total-label');
  const quoteEl = document.getElementById('sim-quote');
  const qtyEl = document.getElementById('sim-qty');
  const feeServiceEl = document.getElementById('sim-fee-service');
  const feeNetworkEl = document.getElementById('sim-fee-network');
  const totalEl = document.getElementById('sim-total');
  const timeEl = document.getElementById('sim-time');
  const countdownEl = document.getElementById('sim-countdown');

  function brl(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatQty(value, decimals) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function parseAmount(str) {
    const cleaned = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  function currentRate() {
    const base = ASSETS[currentAsset].rate;
    const jitter = quoteJitter[currentAsset] || 1;
    return base * jitter;
  }

  function refreshTimestamp() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function updateModeUI() {
    if (mode === 'comprar') {
      amountLabel.textContent = 'Valor em reais (PIX)';
      prefixEl.textContent = 'R$';
      qtyLabel.textContent = 'Quantidade estimada';
      totalLabel.textContent = 'Total a pagar via PIX';
      amountInput.placeholder = '1.000,00';
    } else {
      amountLabel.textContent = `Quantidade de ${currentAsset}`;
      prefixEl.textContent = currentAsset;
      qtyLabel.textContent = 'Valor bruto da venda';
      totalLabel.textContent = 'Total a receber via PIX';
      amountInput.placeholder = ASSETS[currentAsset].decimals <= 2 ? '100,00' : '0,01';
    }
  }

  function recalculate() {
    const asset = ASSETS[currentAsset];
    const rate = currentRate();
    const amount = parseAmount(amountInput.value);
    const decimals = asset.decimals;

    quoteEl.textContent = `${brl(rate)} / ${currentAsset}`;
    feeServiceEl.textContent = brl(SERVICE_FEE);
    feeNetworkEl.textContent = brl(asset.network);

    if (!amount) {
      qtyEl.textContent = '—';
      totalEl.textContent = '—';
      return;
    }

    if (mode === 'comprar') {
      const qty = amount / rate;
      const total = amount + SERVICE_FEE + asset.network;
      qtyEl.textContent = `${formatQty(qty, decimals)} ${currentAsset}`;
      totalEl.textContent = brl(total);
    } else {
      const gross = amount * rate;
      const total = Math.max(gross - SERVICE_FEE - asset.network, 0);
      qtyEl.textContent = brl(gross);
      totalEl.textContent = brl(total);
    }
  }

  function resetCountdown() {
    countdown = COUNTDOWN_START;
    countdownEl.textContent = `${countdown}s`;
  }

  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        quoteJitter[currentAsset] = 1 + (Math.random() * 0.006 - 0.003);
        refreshTimestamp();
        recalculate();
        resetCountdown();
      }
      countdownEl.textContent = `${countdown}s`;
    }, 1000);
  }

  function setMode(newMode) {
    mode = newMode;
    document.querySelectorAll('.sim-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === newMode));
    updateModeUI();
    recalculate();
  }

  document.querySelectorAll('.sim-tab').forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  document.querySelectorAll('[data-sim-mode]').forEach(link => {
    link.addEventListener('click', () => setMode(link.dataset.simMode));
  });

  assetSelect.addEventListener('change', () => {
    currentAsset = assetSelect.value;
    updateModeUI();
    recalculate();
  });

  amountInput.addEventListener('input', recalculate);

  updateModeUI();
  refreshTimestamp();
  recalculate();
  startCountdown();

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-answer').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !isOpen);
      answer.style.maxHeight = !isOpen ? `${answer.scrollHeight}px` : null;
    });
  });

  // Modals
  function openModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) return;
    overlay.classList.add('open');

    if (id === 'confirm') {
      const asset = ASSETS[currentAsset];
      const amount = parseAmount(amountInput.value) || 1000;
      const rate = currentRate();
      const summary = document.getElementById('confirm-summary');
      const qty = mode === 'comprar' ? amount / rate : amount;
      const total = mode === 'comprar'
        ? amount + SERVICE_FEE + asset.network
        : Math.max(qty * rate - SERVICE_FEE - asset.network, 0);

      summary.innerHTML = `
        <div><span>Operação</span><strong>${mode === 'comprar' ? 'Compra' : 'Venda'} de ${currentAsset}</strong></div>
        <div><span>Quantidade</span><strong>${formatQty(qty, asset.decimals)} ${currentAsset}</strong></div>
        <div><span>Cotação</span><strong>${brl(rate)}</strong></div>
        <div><span>Total</span><strong>${brl(total)}</strong></div>
      `;
    }
  }

  function closeModal(overlay) {
    overlay.classList.remove('open');
    overlay.querySelectorAll('[data-view]').forEach((view, i) => {
      view.hidden = i !== 0;
    });
    const forms = overlay.querySelectorAll('form');
    forms.forEach(f => f.reset());
  }

  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(btn.dataset.openModal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
    overlay.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(overlay));
    });
  });

  document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const overlay = document.getElementById('modal-signup');
    overlay.querySelector('[data-view="form"]').hidden = true;
    overlay.querySelector('[data-view="success"]').hidden = false;
  });

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const overlay = document.getElementById('modal-login');
    overlay.querySelector('[data-view="form"]').hidden = true;
    overlay.querySelector('[data-view="success"]').hidden = false;
  });

  document.getElementById('support-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const overlay = document.getElementById('modal-support');
    overlay.querySelector('[data-view="form"]').hidden = true;
    overlay.querySelector('[data-view="success"]').hidden = false;
  });

  document.getElementById('confirm-submit').addEventListener('click', () => {
    const overlay = document.getElementById('modal-confirm');
    overlay.querySelector('[data-view="form"]').hidden = true;
    overlay.querySelector('[data-view="success"]').hidden = false;
    document.getElementById('confirm-protocol').textContent =
      'ARCX-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  });

  // Testimonial pages (groups of 3)
  const testimonialPages = [...document.querySelectorAll('.testimonial-page')];
  const testimonialPrev = document.getElementById('testimonial-prev');
  const testimonialNext = document.getElementById('testimonial-next');
  let pageIndex = 0;

  if (testimonialPages.length) {
    function goToPage(index) {
      pageIndex = (index + testimonialPages.length) % testimonialPages.length;
      testimonialPages.forEach((page, i) => {
        page.hidden = i !== pageIndex;
        page.classList.toggle('active', i === pageIndex);
      });
    }

    testimonialPrev.addEventListener('click', () => goToPage(pageIndex - 1));
    testimonialNext.addEventListener('click', () => goToPage(pageIndex + 1));
  }

  // Scroll-triggered reveal animations
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('[data-reveal]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-delay') || 0;
          entry.target.style.transitionDelay = `${delay * 90}ms`;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  // Header shrink + scroll progress + active nav link + back-to-top
  const header = document.getElementById('site-header');
  const progressBar = document.getElementById('scroll-progress');
  const backToTop = document.getElementById('back-to-top');
  const pageSections = document.querySelectorAll('main section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  function onScroll() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;

    header.classList.toggle('scrolled', scrollY > 20);
    backToTop.classList.toggle('show', scrollY > 600);

    let currentId = '';
    pageSections.forEach(section => {
      const top = section.offsetTop - 140;
      if (scrollY >= top) currentId = section.id;
    });

    navAnchors.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${currentId}`);
    });
  }

  let scrollScheduled = false;
  window.addEventListener('scroll', () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    setTimeout(() => {
      onScroll();
      scrollScheduled = false;
    }, 50);
  });

  onScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  // Spotlight hover effect on feature cards
  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-spotlight]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  }
})();
