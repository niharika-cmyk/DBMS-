# SafeHer App — Backend API

A small Node.js + Express API for the SafeHer App frontend: accounts, emergency
contacts, SOS alerts, live location tracking, and a history log. Data is
stored in a local JSON file (`data/db.json`) — no database server to install.

## Run it in VS Code

1. Unzip this folder and open it in VS Code (`File → Open Folder…`).
2. Open a terminal in VS Code (`` Ctrl+` ``) and install dependencies:
   ```
   npm install
   ```
3. Copy the environment file and open it:
   ```
   cp .env.example .env
   ```
   Then edit `.env` and set `JWT_SECRET` to any long random string, and set
   `CORS_ORIGIN` to whatever URL your frontend runs on (e.g. the Live Server
   address, `http://127.0.0.1:5500`).
4. Start the server:
   ```
   npm start
   ```
   or, for auto-restart on file changes:
   ```
   npm run dev
   ```
5. Confirm it's running by opening **http://localhost:5000/api/health** in
   your browser — you should see `{"status":"ok", ...}`.

## Project structure

```
backend/
├── server.js              → App entry point, mounts all routes
├── package.json
├── .env.example            → Copy to .env and fill in
├── data/
│   └── db.json             → All app data lives here (auto-created)
├── middleware/
│   └── auth.js             → Verifies the login token on protected routes
├── routes/
│   ├── auth.js              → Register / login / current user
│   ├── contacts.js          → Emergency contacts CRUD
│   ├── sos.js                → Trigger / cancel SOS alerts
│   ├── tracking.js           → Live location updates
│   └── history.js            → Location/alert history
└── utils/
    └── db.js                 → Tiny JSON-file data layer
```

## API reference

All request/response bodies are JSON. Protected routes need an
`Authorization: Bearer <token>` header — you get `<token>` back from
register/login.

### Auth
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, phone?, password }` | Password min 8 chars. Returns `{ token, user }`. |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }`. |
| GET  | `/api/auth/me` | — | Requires auth. Returns the logged-in user. |

### Emergency contacts (requires auth)
| Method | Route | Body | Notes |
|---|---|---|---|
| GET | `/api/contacts` | — | List all contacts. |
| POST | `/api/contacts` | `{ name, phone, relation? }` | Adds a contact. |
| DELETE | `/api/contacts/:id` | — | Removes a contact. |

### SOS (requires auth)
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/sos/trigger` | `{ lat?, lng? }` | Marks SOS active, logs to history, "notifies" contacts (see below). |
| POST | `/api/sos/cancel` | — | Marks the user safe again. |
| GET | `/api/sos/status` | — | Returns whether SOS is currently active. |

### Live tracking (requires auth)
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/tracking/update` | `{ lat, lng }` | Saves the latest known location. |
| POST | `/api/tracking/start` | — | Logs a "started sharing" history entry. |
| POST | `/api/tracking/stop` | — | Logs a "stopped sharing" history entry. |
| GET | `/api/tracking/current` | — | Returns the last saved location. |

### History (requires auth)
| Method | Route | Notes |
|---|---|---|
| GET | `/api/history` | Full activity timeline, newest first. |

## Connecting the frontend

The frontend prototype currently stores everything in the browser's
`localStorage`. To wire it up to this API instead, replace the storage-helper
functions in `script.js` with `fetch` calls, for example:

```js
const API_BASE = 'http://localhost:5000/api';

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) return null;
  const { token, user } = await res.json();
  localStorage.setItem('safeher_token', token); // keep the token, not the password
  return user;
}
```

Every protected call after that needs the token attached:

```js
fetch(`${API_BASE}/contacts`, {
  headers: { Authorization: `Bearer ${localStorage.getItem('safeher_token')}` }
});
```

## Sending real SOS alerts

`routes/sos.js` has a `notifyContacts()` function that currently just logs to
the console. To actually text or call contacts, plug in a provider there —
for example [Twilio](https://www.twilio.com/docs/sms/quickstart/node) for SMS:

```js
const twilio = require('twilio')(accountSid, authToken);
await twilio.messages.create({ to: contact.phone, from: TWILIO_NUMBER, body: message });
```

## Moving beyond the prototype

- Swap `utils/db.js` for a real database (Postgres/MongoDB) — every route
  only calls the functions this file exports, so that's the only file to change.
- Add rate limiting on `/api/auth/*` to slow down brute-force login attempts.
- Add input validation (e.g. with `zod` or `joi`) on all POST bodies.
- Serve the frontend and backend over HTTPS in production; never send plain
  passwords over HTTP.
