# SafeHer — Women Safety App (Frontend Prototype)

A plain HTML/CSS/JS front end for a women's safety app with SOS alerts,
emergency contact management, live location tracking, and location history.
No build step, no backend — everything runs in the browser and is stored
in `localStorage`.

## Run it in VS Code

1. Unzip this folder and open it in VS Code (`File → Open Folder…`).
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.
4. The landing page opens at `http://127.0.0.1:5500`. Click **Get started**
   to register, then explore the SOS button, contacts, tracking, and history.

You can also just double-click `index.html` to open it directly in a browser,
but Live Server is recommended because the SOS live-tracking page uses the
browser's Geolocation API, which some browsers only allow on `localhost` or
`https://`.

## Project structure

```
frontend/
│
├── index.html          → Landing / marketing page
├── login.html          → Login page
├── register.html       → Registration page
├── dashboard.html       → App home: SOS hero button + quick links
├── style.css            → Design system (colors, type, components)
├── script.js            → Auth, contacts, SOS, history, geolocation logic
│
├── images/
│   └── icon.svg
└── pages/
    ├── sos.html          → Hold-to-send SOS with live countdown + alert state
    ├── contacts.html     → Add / remove emergency contacts
    ├── tracking.html     → Start/stop live location sharing
    └── history.html      → Timeline of alerts and tracking sessions
```

## What's real vs. simulated

- **Real:** the Geolocation API call (`navigator.geolocation`), all
  localStorage-based data (account, contacts, history), and all UI logic.
- **Simulated (for a real app you'd replace these):** actually sending SMS/push
  alerts to contacts, and multi-device live-tracking (currently the "map" is a
  placeholder grid with your own coordinates, not a real map tile provider).

## Next steps for a production version

- Swap `localStorage` for a real backend (auth, contacts, alert delivery).
- Wire up an SMS/WhatsApp API (e.g. Twilio) to actually message contacts.
- Add a real map (Leaflet/Mapbox/Google Maps) to `tracking.html`.
- Add push notifications for check-in reminders.
