/**
 * MySQL-backed data layer.
 *
 * Keeps the SAME exported function names as the old file-based db.js,
 * so route files only need small changes: since real DB calls are
 * asynchronous, every route handler that calls these functions must
 * now use `async` + `await` (see the updated route files).
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

/* ---------------- helpers ---------------- */

async function getContactsForUser(userId) {
  const [rows] = await pool.query(
    'SELECT id, name, phone, relation FROM contacts WHERE user_id = ?',
    [userId]
  );
  return rows;
}

async function getHistoryForUser(userId) {
  const [rows] = await pool.query(
    'SELECT type, label, coords, time FROM activity_log WHERE user_id = ? ORDER BY time DESC LIMIT 200',
    [userId]
  );
  return rows;
}

function shapeUser(row, contacts, history) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    joined: row.joined,
    sosActive: !!row.sos_active,
    lastLocation: row.last_location_lat != null ? {
      lat: parseFloat(row.last_location_lat),
      lng: parseFloat(row.last_location_lng),
      at: row.last_location_at
    } : null,
    contacts: contacts || [],
    history: history || []
  };
}

/* ---------------- users ---------------- */

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows[0]) return null;
  const contacts = await getContactsForUser(rows[0].id);
  const history = await getHistoryForUser(rows[0].id);
  return shapeUser(rows[0], contacts, history);
}

async function findUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!rows[0]) return null;
  const contacts = await getContactsForUser(id);
  const history = await getHistoryForUser(id);
  return shapeUser(rows[0], contacts, history);
}

async function createUser(user) {
  await pool.query(
    `INSERT INTO users (id, name, email, phone, password_hash, joined)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, user.name, user.email, user.phone || '', user.passwordHash, user.joined]
  );
  return findUserById(user.id);
}

async function updateUser(id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
  if (updates.sosActive !== undefined) { fields.push('sos_active = ?'); values.push(updates.sosActive); }

  if (fields.length === 0) return findUserById(id);

  values.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return findUserById(id);
}

/* ---------------- emergency contacts ---------------- */

async function addContact(userId, contact) {
  await pool.query(
    'INSERT INTO contacts (id, user_id, name, phone, relation) VALUES (?, ?, ?, ?, ?)',
    [contact.id, userId, contact.name, contact.phone, contact.relation || 'Other']
  );
  return getContactsForUser(userId);
}

async function removeContact(userId, contactId) {
  const user = await findUserById(userId);
  if (!user) return null;
  await pool.query('DELETE FROM contacts WHERE id = ? AND user_id = ?', [contactId, userId]);
  return getContactsForUser(userId);
}

/* ---------------- history log ---------------- */

async function addHistoryEntry(userId, entry) {
  await pool.query(
    'INSERT INTO activity_log (user_id, type, label, coords, time) VALUES (?, ?, ?, ?, ?)',
    [userId, entry.type, entry.label, entry.coords || '', entry.time]
  );
  return getHistoryForUser(userId);
}

/* ---------------- SOS + live location state ---------------- */

async function setSosState(userId, sosActive) {
  await pool.query('UPDATE users SET sos_active = ? WHERE id = ?', [sosActive, userId]);
  return findUserById(userId);
}

async function setLastLocation(userId, location) {
  await pool.query(
    `UPDATE users SET last_location_lat = ?, last_location_lng = ?, last_location_at = ?
     WHERE id = ?`,
    [location.lat, location.lng, location.at, userId]
  );
  return findUserById(userId);
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  addContact,
  removeContact,
  addHistoryEntry,
  setSosState,
  setLastLocation
};
