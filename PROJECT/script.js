/* =========================================================
   SAFEHER — App logic
   Now talks to the real backend (Express + MySQL) instead of
   storing everything in localStorage. Only the auth token and
   a small cached copy of the logged-in user stay in localStorage.
   ========================================================= */

const API_BASE = 'http://localhost:5000/api';

const STORE_KEYS = {
  token: 'safeher_token',
  user: 'safeher_user'
};

/* ---------- generic storage helpers ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- toast ---------- */
function showToast(message, duration = 2200) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ---------- nav bar active state ---------- */
function markActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const target = item.getAttribute('data-page');
    item.classList.toggle('active', target === path);
  });
}

/* ---------- session (token + cached user) ---------- */
function getToken() {
  return localStorage.getItem(STORE_KEYS.token);
}
function setSession(token, user) {
  localStorage.setItem(STORE_KEYS.token, token);
  saveJSON(STORE_KEYS.user, user);
}
function clearSession() {
  localStorage.removeItem(STORE_KEYS.token);
  localStorage.removeItem(STORE_KEYS.user);
}
function currentUser() {
  return loadJSON(STORE_KEYS.user, null);
}
function logoutUser() {
  clearSession();
}

/**
 * Redirects to the login page if there's no active session.
 * Pass the correct relative path to login.html from the current page
 * (e.g. 'login.html' from the root, '../login.html' from /pages/).
 */
function guardAuth(loginPath = 'login.html') {
  if (!getToken()) {
    window.location.href = loginPath;
  }
}

/* ---------- low-level API helper ---------- */
async function apiFetch(path, options = {}) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {}
  );
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body is fine */ }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

/* ---------- auth ---------- */
async function registerUser(name, email, phone, password) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, phone, password })
  });
  setSession(data.token, data.user);
  return data.user;
}

async function loginUser(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setSession(data.token, data.user);
  return data.user;
}

/* ---------- emergency contacts ---------- */
async function getContacts() {
  const data = await apiFetch('/contacts');
  return data.contacts;
}
async function addContact(name, phone, relation) {
  const data = await apiFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify({ name, phone, relation })
  });
  return data.contacts;
}
async function removeContact(id) {
  const data = await apiFetch(`/contacts/${id}`, { method: 'DELETE' });
  return data.contacts;
}
function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

/* ---------- location history ---------- */
async function getHistory() {
  const data = await apiFetch('/history');
  return data.history;
}

/* ---------- geolocation ---------- */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device/browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
function formatCoords(coords) {
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

/* ---------- SOS ---------- */
async function getSosStatus() {
  return apiFetch('/sos/status'); // { sosActive, lastLocation }
}

async function triggerSosAlert() {
  let lat, lng, coordsLabel = 'location unavailable';
  try {
    const coords = await getCurrentPosition();
    lat = coords.latitude;
    lng = coords.longitude;
    coordsLabel = formatCoords(coords);
  } catch (e) {
    /* fall back gracefully — the server just won't get a location */
  }

  const body = (typeof lat === 'number' && typeof lng === 'number') ? { lat, lng } : {};

  const data = await apiFetch('/sos/trigger', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  return { contacts: data.notifiedContacts, coordsLabel: data.coords || coordsLabel };
}

async function cancelSos() {
  return apiFetch('/sos/cancel', { method: 'POST' });
}

/* ---------- live tracking ---------- */
async function startTracking() {
  return apiFetch('/tracking/start', { method: 'POST' });
}
async function stopTracking() {
  return apiFetch('/tracking/stop', { method: 'POST' });
}
async function updateTrackingLocation(lat, lng) {
  return apiFetch('/tracking/update', {
    method: 'POST',
    body: JSON.stringify({ lat, lng })
  });
}

/* ---------- relative time formatting ---------- */
function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* ---------- run on every page ---------- */
document.addEventListener('DOMContentLoaded', markActiveNav);
