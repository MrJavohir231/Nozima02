const STORAGE_KEYS = {
  bookings: 'nozima_bookings',
  blocked: 'nozima_blocked_times',
  admin: 'nozima_admin_logged_in'
};

const ADMIN_PASSWORD = 'Nozima0409';

const bookingForm = document.getElementById('bookingForm');
const timeSelect = document.getElementById('time');
const bookingMessage = document.getElementById('bookingMessage');
const yearElement = document.getElementById('year');
const loader = document.getElementById('loader');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

const adminModal = document.getElementById('adminModal');
const adminOpenBtn = document.getElementById('adminOpenBtn');
const adminCloseBtn = document.getElementById('adminCloseBtn');
const adminLoginView = document.getElementById('adminLoginView');
const adminPanelView = document.getElementById('adminPanelView');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminPasswordInput = document.getElementById('adminPassword');
const adminLoginMessage = document.getElementById('adminLoginMessage');
const bookingsList = document.getElementById('bookingsList');
const blockTimeForm = document.getElementById('blockTimeForm');
const blockTimeSelect = document.getElementById('blockTimeSelect');
const blockedList = document.getElementById('blockedList');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

const pad = (num) => String(num).padStart(2, '0');

function createTimeSlots() {
  const slots = [];
  for (let hour = 9; hour <= 20; hour += 1) {
    for (let minute = 0; minute < 60; minute += 10) {
      if (hour === 20 && minute > 0) break;
      slots.push(`${pad(hour)}:${pad(minute)}`);
    }
  }
  return slots;
}

const ALL_TIME_SLOTS = createTimeSlots();

function getData(key, fallback = []) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.error(`Storage read error for ${key}:`, error);
    return fallback;
  }
}

function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getBookings() {
  return getData(STORAGE_KEYS.bookings, []);
}

function getBlockedTimes() {
  return getData(STORAGE_KEYS.blocked, []);
}

function isAdminLoggedIn() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.admin) || 'false');
}

function setAdminLoggedIn(value) {
  localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify(value));
}

function getUnavailableTimes() {
  const bookedTimes = getBookings().map((booking) => booking.time);
  return [...new Set([...bookedTimes, ...getBlockedTimes()])].sort();
}

function populateTimeSelect(selectEl, includeCurrentValue = '') {
  const unavailable = new Set(getUnavailableTimes());
  const current = includeCurrentValue || '';

  selectEl.innerHTML = '<option value="">Bo‘sh vaqtni tanlang</option>';

  ALL_TIME_SLOTS.forEach((slot) => {
    const option = document.createElement('option');
    const isUnavailable = unavailable.has(slot) && slot !== current;
    option.value = slot;
    option.textContent = isUnavailable ? `${slot} — band / bloklangan` : slot;
    option.disabled = isUnavailable;
    if (slot === current) option.selected = true;
    selectEl.appendChild(option);
  });
}

function showMessage(element, text, type = '') {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBookings() {
  const bookings = getBookings().sort((a, b) => a.time.localeCompare(b.time));

  if (!bookings.length) {
    bookingsList.innerHTML = '<div class="booking-item"><div class="booking-item__meta"><strong>Hozircha bronlar yo‘q</strong><span>Yangi bronlar shu yerda ko‘rinadi.</span></div></div>';
    return;
  }

  bookingsList.innerHTML = bookings.map((booking) => `
    <div class="booking-item">
      <div class="booking-item__meta">
        <strong>${escapeHtml(booking.name)} — ${escapeHtml(booking.time)}</strong>
        <span>${escapeHtml(booking.phone)} · ID: ${escapeHtml(booking.id)}</span>
      </div>
      <button type="button" data-booking-id="${escapeHtml(booking.id)}">O‘chirish</button>
    </div>
  `).join('');
}

function renderBlockedTimes() {
  const blocked = getBlockedTimes().sort();
  if (!blocked.length) {
    blockedList.innerHTML = '<span class="message">Bloklangan vaqtlar yo‘q.</span>';
    return;
  }

  blockedList.innerHTML = blocked.map((time) => `
    <span class="token">
      ${escapeHtml(time)}
      <button type="button" data-unblock-time="${escapeHtml(time)}">Ochish</button>
    </span>
  `).join('');
}

function refreshBookingUI() {
  populateTimeSelect(timeSelect);
  populateTimeSelect(blockTimeSelect);
  renderBookings();
  renderBlockedTimes();
}

function addBooking({ name, phone, time }) {
  const bookings = getBookings();
  const blocked = getBlockedTimes();

  const alreadyBooked = bookings.some((booking) => booking.time === time);
  const alreadyBlocked = blocked.includes(time);

  if (alreadyBooked || alreadyBlocked) {
    return { success: false, message: 'Ushbu vaqt band yoki bloklangan. Boshqa vaqt tanlang.' };
  }

  const newBooking = {
    id: `NZ-${Date.now().toString().slice(-6)}`,
    name: name.trim(),
    phone: phone.trim(),
    time
  };

  bookings.push(newBooking);
  setData(STORAGE_KEYS.bookings, bookings);
  return { success: true, booking: newBooking };
}

function deleteBooking(id) {
  const nextBookings = getBookings().filter((booking) => booking.id !== id);
  setData(STORAGE_KEYS.bookings, nextBookings);
  refreshBookingUI();
}

function blockTime(time) {
  const bookings = getBookings();
  const blocked = getBlockedTimes();

  if (bookings.some((booking) => booking.time === time)) {
    return { success: false, message: 'Bu vaqt allaqachon bron qilingan, bloklab bo‘lmaydi.' };
  }

  if (blocked.includes(time)) {
    return { success: false, message: 'Bu vaqt allaqachon bloklangan.' };
  }

  blocked.push(time);
  setData(STORAGE_KEYS.blocked, blocked.sort());
  return { success: true };
}

function unblockTime(time) {
  const nextBlocked = getBlockedTimes().filter((blockedTime) => blockedTime !== time);
  setData(STORAGE_KEYS.blocked, nextBlocked);
  refreshBookingUI();
}

function openAdminModal() {
  adminModal.classList.add('active');
  adminModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  syncAdminViews();
}

function closeAdminModal() {
  adminModal.classList.remove('active');
  adminModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  adminLoginMessage.textContent = '';
  adminPasswordInput.value = '';
}

function syncAdminViews() {
  const loggedIn = isAdminLoggedIn();
  adminLoginView.classList.toggle('hidden', loggedIn);
  adminPanelView.classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    refreshBookingUI();
  }
}

function initRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

window.addEventListener('load', () => {
  setTimeout(() => loader.classList.add('hidden'), 900);
});

yearElement.textContent = new Date().getFullYear();
populateTimeSelect(timeSelect);
populateTimeSelect(blockTimeSelect);
renderBookings();
renderBlockedTimes();
initRevealAnimations();
syncAdminViews();

bookingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const name = formData.get('name')?.toString() || '';
  const phone = formData.get('phone')?.toString() || '';
  const time = formData.get('time')?.toString() || '';

  if (!name.trim() || !phone.trim() || !time) {
    showMessage(bookingMessage, 'Iltimos, barcha maydonlarni to‘ldiring.', 'error');
    return;
  }

  const result = addBooking({ name, phone, time });

  if (!result.success) {
    showMessage(bookingMessage, result.message, 'error');
    refreshBookingUI();
    return;
  }

  bookingForm.reset();
  refreshBookingUI();
  showMessage(bookingMessage, `Bron muvaffaqiyatli qabul qilindi: ${result.booking.time}`, 'success');
});

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('open');
});

document.querySelectorAll('.nav-menu a').forEach((link) => {
  link.addEventListener('click', () => navMenu.classList.remove('open'));
});

adminOpenBtn.addEventListener('click', openAdminModal);
adminCloseBtn.addEventListener('click', closeAdminModal);
adminModal.addEventListener('click', (event) => {
  if (event.target.dataset.close === 'true') closeAdminModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && adminModal.classList.contains('active')) {
    closeAdminModal();
  }
});

adminLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const password = adminPasswordInput.value;

  if (password !== ADMIN_PASSWORD) {
    showMessage(adminLoginMessage, 'Parol noto‘g‘ri.', 'error');
    return;
  }

  setAdminLoggedIn(true);
  showMessage(adminLoginMessage, 'Kirish muvaffaqiyatli.', 'success');
  syncAdminViews();
});

adminLogoutBtn.addEventListener('click', () => {
  setAdminLoggedIn(false);
  syncAdminViews();
});

blockTimeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const time = blockTimeSelect.value;
  if (!time) return;

  const result = blockTime(time);
  if (!result.success) {
    alert(result.message);
    refreshBookingUI();
    return;
  }

  blockTimeForm.reset();
  refreshBookingUI();
});

bookingsList.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const bookingId = target.getAttribute('data-booking-id');
  if (!bookingId) return;

  deleteBooking(bookingId);
});

blockedList.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const time = target.getAttribute('data-unblock-time');
  if (!time) return;

  unblockTime(time);
});
