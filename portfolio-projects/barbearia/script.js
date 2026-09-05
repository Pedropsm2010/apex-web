(() => {
  const STORAGE_KEY = 'nobre_appointments';
  const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const serviceOptions = document.getElementById('service-options');
  const dateInput = document.getElementById('date-input');
  const dateHint = document.getElementById('date-hint');
  const timeOptions = document.getElementById('time-options');
  const notifyOptions = document.getElementById('notify-options');
  const form = document.getElementById('booking-form');
  const errorEl = document.getElementById('booking-error');
  const bookingsList = document.getElementById('bookings-list');

  let selectedService = null;
  let selectedDate = null;
  let selectedTime = null;
  let selectedNotify = 'whatsapp';

  function formatDateLabel(date) {
    return `${WEEKDAY_LABELS[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function hoursForWeekday(day) {
    if (day === 0 || day === 1) return null;
    if (day === 6) return { open: 9 * 60, close: 17 * 60 };
    return { open: 9 * 60, close: 19 * 60 };
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
      dateHint.textContent = 'Fechado aos domingos e segundas — escolha outro dia.';
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
      const occupied = hashSlot(dateStr, index) < 18;

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

  serviceOptions.addEventListener('click', (e) => {
    const chip = e.target.closest('.option-chip');
    if (!chip) return;
    selectChip(serviceOptions, chip, (value) => { selectedService = value; });
  });

  dateInput.addEventListener('change', handleDateChange);

  timeOptions.addEventListener('click', (e) => {
    const chip = e.target.closest('.option-chip');
    if (!chip || chip.disabled) return;
    selectChip(timeOptions, chip, (value) => { selectedTime = value; });
  });

  notifyOptions.addEventListener('click', (e) => {
    const chip = e.target.closest('.option-chip');
    if (!chip) return;
    selectChip(notifyOptions, chip, (value) => { selectedNotify = value; });
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
          <strong>${b.service}</strong>
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

    if (!selectedService) return showError('Escolha um serviço.');
    if (!selectedDate) return showError('Escolha uma data.');
    if (!selectedTime) return showError('Escolha um horário.');
    if (!name) return showError('Informe seu nome.');
    if (!phone) return showError('Informe seu WhatsApp.');

    const bookings = loadBookings();
    bookings.unshift({
      id: Date.now(),
      service: selectedService,
      date: selectedDate,
      time: selectedTime,
      name,
      phone,
      notify: selectedNotify
    });
    saveBookings(bookings);
    renderBookings();

    form.reset();
    selectedService = null;
    selectedDate = null;
    selectedTime = null;
    selectedNotify = 'whatsapp';
    serviceOptions.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
    notifyOptions.querySelectorAll('.option-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    dateHint.hidden = true;
    timeOptions.innerHTML = '<p class="booking-hint">Escolha uma data para ver os horários disponíveis.</p>';

    document.getElementById('my-bookings').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        const occupied = hashSlot(dateStr, index) < 18;

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
    if (!slot) {
      el.textContent = 'Consulte disponibilidade';
      return;
    }

    if (slot.dayOffset === 0) {
      el.textContent = `Hoje, ${slot.time}`;
    } else if (slot.dayOffset === 1) {
      el.textContent = `Amanhã, ${slot.time}`;
    } else {
      el.textContent = `${formatDateLabel(slot.date)}, ${slot.time}`;
    }
  }

  setupDateInput();
  renderBookings();
  renderNextSlot();
})();
