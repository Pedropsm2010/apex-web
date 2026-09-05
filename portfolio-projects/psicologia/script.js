(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORAGE_KEY = 'anima_appointments';
  const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const typeOptions = document.getElementById('type-options');
  const modalityOptions = document.getElementById('modality-options');
  const dateInput = document.getElementById('date-input');
  const dateHint = document.getElementById('date-hint');
  const timeOptions = document.getElementById('time-options');
  const form = document.getElementById('booking-form');
  const errorEl = document.getElementById('booking-error');
  const bookingsList = document.getElementById('bookings-list');

  let selectedType = null;
  let selectedModality = 'Online';
  let selectedDate = null;
  let selectedTime = null;

  function formatDateLabel(date) {
    return `${WEEKDAY_LABELS[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function hoursForWeekday(day) {
    if (day === 0) return null;
    if (day === 6) return { open: 8 * 60, close: 12 * 60 };
    return { open: 8 * 60, close: 19 * 60 };
  }

  function setupDateInput() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 90);
    dateInput.min = isoDate(today);
    dateInput.max = isoDate(maxDate);
  }

  function handleDateChange() {
    const value = dateInput.value;
    selectedTime = null;

    if (!value) {
      selectedDate = null;
      timeOptions.innerHTML = '<p class="booking-hint">Escolha uma data para ver os horários disponíveis.</p>';
      dateHint.hidden = true;
      return;
    }

    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const hours = hoursForWeekday(date.getDay());

    if (!hours) {
      selectedDate = null;
      timeOptions.innerHTML = '';
      dateHint.textContent = 'Fechado aos domingos — escolha outro dia.';
      dateHint.hidden = false;
      return;
    }

    dateHint.hidden = true;
    selectedDate = value;
    buildTimeOptions(value);
  }

  function hashSlot(dateStr, index) {
    let hash = 0;
    const str = dateStr + '-' + index;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 97;
    }
    return hash;
  }

  function buildTimeOptions(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const hours = hoursForWeekday(date.getDay());
    timeOptions.innerHTML = '';
    if (!hours) return;

    let index = 0;
    for (let minutes = hours.open; minutes < hours.close; minutes += 30) {
      const h = String(Math.floor(minutes / 60)).padStart(2, '0');
      const min = String(minutes % 60).padStart(2, '0');
      const label = `${h}:${min}`;
      const occupied = hashSlot(dateStr, index) < 20;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-chip small' + (occupied ? ' disabled' : '');
      btn.dataset.value = label;
      btn.textContent = label;
      if (occupied) {
        btn.disabled = true;
        btn.title = 'Horário indisponível';
      }
      timeOptions.appendChild(btn);
      index += 1;
    }
  }

  function selectChip(container, target, onSelect) {
    container.querySelectorAll('.option-chip').forEach(chip => chip.classList.remove('active'));
    target.classList.add('active');
    onSelect(target.dataset.value);
  }

  typeOptions.addEventListener('click', (e) => {
    const chip = e.target.closest('.option-chip');
    if (!chip) return;
    selectChip(typeOptions, chip, (value) => { selectedType = value; });
  });

  modalityOptions.addEventListener('click', (e) => {
    const chip = e.target.closest('.option-chip');
    if (!chip) return;
    selectChip(modalityOptions, chip, (value) => { selectedModality = value; });
  });

  dateInput.addEventListener('change', handleDateChange);

  timeOptions.addEventListener('click', (e) => {
    const chip = e.target.closest('.option-chip');
    if (!chip || chip.disabled) return;
    selectChip(timeOptions, chip, (value) => { selectedTime = value; });
  });

  function loadBookings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveBookings(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function formatStoredDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${String(date.getDate()).padStart(2, '0')} de ${MONTH_LABELS[date.getMonth()]}`;
  }

  function renderBookings() {
    const bookings = loadBookings();
    if (!bookings.length) {
      bookingsList.innerHTML = '<p class="bookings-empty">Nenhum agendamento ainda.</p>';
      return;
    }
    bookingsList.innerHTML = bookings.map(b => `
      <div class="booking-item" data-id="${b.id}">
        <div>
          <strong>${b.type} · ${b.modality}</strong>
          <span>${formatStoredDate(b.date)} às ${b.time} · ${b.name}</span>
        </div>
        <button type="button" class="booking-cancel" data-id="${b.id}">Cancelar</button>
      </div>
    `).join('');
  }

  bookingsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.booking-cancel');
    if (!btn) return;
    const id = btn.dataset.id;
    const bookings = loadBookings().filter(b => String(b.id) !== id);
    saveBookings(bookings);
    renderBookings();
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const name = document.getElementById('booking-name').value.trim();
    const phone = document.getElementById('booking-phone').value.trim();

    if (!selectedType) return showError('Escolha o tipo de atendimento.');
    if (!selectedDate) return showError('Escolha uma data.');
    if (!selectedTime) return showError('Escolha um horário.');
    if (!name) return showError('Informe seu nome.');
    if (!phone) return showError('Informe seu WhatsApp.');

    const bookings = loadBookings();
    bookings.unshift({
      id: Date.now(),
      type: selectedType,
      modality: selectedModality,
      date: selectedDate,
      time: selectedTime,
      name,
      phone
    });
    saveBookings(bookings);
    renderBookings();

    form.reset();
    selectedType = null;
    selectedDate = null;
    selectedTime = null;
    selectedModality = 'Online';
    typeOptions.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
    modalityOptions.querySelectorAll('.option-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    dateHint.hidden = true;
    timeOptions.innerHTML = '<p class="booking-hint">Escolha uma data para ver os horários disponíveis.</p>';

    document.querySelector('.my-bookings').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  });

  function findNextAvailableSlot() {
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);
      const hours = hoursForWeekday(date.getDay());
      if (!hours) continue;

      const dateStr = isoDate(date);
      let index = 0;
      for (let minutes = hours.open; minutes < hours.close; minutes += 30) {
        const slotDate = new Date(date);
        slotDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        const isPast = dayOffset === 0 && slotDate <= now;
        const occupied = hashSlot(dateStr, index) < 20;
        if (!isPast && !occupied) {
          const h = String(Math.floor(minutes / 60)).padStart(2, '0');
          const m = String(minutes % 60).padStart(2, '0');
          return { dayOffset, date, time: `${h}:${m}` };
        }
        index += 1;
      }
    }
    return null;
  }

  function renderNextSlot() {
    const el = document.getElementById('next-slot-value');
    if (!el) return;
    const slot = findNextAvailableSlot();
    if (!slot) { el.textContent = 'Consulte disponibilidade'; return; }
    if (slot.dayOffset === 0) el.textContent = `Hoje, ${slot.time}`;
    else if (slot.dayOffset === 1) el.textContent = `Amanhã, ${slot.time}`;
    else el.textContent = `${formatDateLabel(slot.date)}, ${slot.time}`;
  }

  setupDateInput();
  renderBookings();
  renderNextSlot();

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
  }

  function closeModal(overlay) {
    overlay.classList.remove('open');
    overlay.querySelectorAll('[data-view]').forEach((view, i) => { view.hidden = i !== 0; });
    overlay.querySelectorAll('form').forEach(f => f.reset());
  }

  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(btn.dataset.openModal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay); });
    overlay.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(overlay)));
  });

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const overlay = document.getElementById('modal-login');
    overlay.querySelector('[data-view="form"]').hidden = true;
    overlay.querySelector('[data-view="success"]').hidden = false;
  });

  document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const overlay = document.getElementById('modal-contact');
    overlay.querySelector('[data-view="form"]').hidden = true;
    overlay.querySelector('[data-view="success"]').hidden = false;
  });

  // Scroll-triggered reveal
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

  // Header shrink + progress + active link + back-to-top
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
    navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${currentId}`));
  }

  let scrollScheduled = false;
  window.addEventListener('scroll', () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    setTimeout(() => { onScroll(); scrollScheduled = false; }, 50);
  });

  onScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  // Spotlight hover
  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-spotlight]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  }

  // Mouse parallax on hero visual
  const heroSection = document.querySelector('.hero');
  const parallaxEls = document.querySelectorAll('[data-parallax]');

  if (heroSection && parallaxEls.length && !prefersReducedMotion) {
    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const offsetX = (e.clientX - rect.left) / rect.width - 0.5;
      const offsetY = (e.clientY - rect.top) / rect.height - 0.5;

      parallaxEls.forEach(el => {
        const strength = Number(el.getAttribute('data-parallax-strength')) || 16;
        el.style.transform = `translate(${offsetX * strength}px, ${offsetY * strength}px)`;
      });
    });

    heroSection.addEventListener('mouseleave', () => {
      parallaxEls.forEach(el => { el.style.transform = ''; });
    });
  }
})();
