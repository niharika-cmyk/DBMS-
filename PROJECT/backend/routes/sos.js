const express = require('express');

const db = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * Stand-in for a real alert delivery step (SMS/WhatsApp/push).
 * Replace this with a real provider call, e.g. Twilio.
 */
function notifyContacts(contacts, message) {
  contacts.forEach(contact => {
    console.log(`[SOS ALERT] → ${contact.name} (${contact.phone}): ${message}`);
  });
}

// POST /api/sos/trigger  { lat, lng }
router.post('/trigger', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const user = await db.findUserById(req.user.userId);
    const contacts = user.contacts || [];

    const location = (typeof lat === 'number' && typeof lng === 'number')
      ? { lat, lng, at: new Date() }
      : null;

    await db.setSosState(req.user.userId, true);
    if (location) await db.setLastLocation(req.user.userId, location);

    const coordsLabel = location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'location unavailable';
    const message = `${user.name} triggered an SOS alert. Last known location: ${coordsLabel}`;
    notifyContacts(contacts, message);

    const history = await db.addHistoryEntry(req.user.userId, {
      type: 'sos',
      label: `SOS alert sent to ${contacts.length} contact${contacts.length === 1 ? '' : 's'}`,
      coords: coordsLabel,
      time: new Date()
    });

    res.json({
      sosActive: true,
      notifiedContacts: contacts,
      coords: coordsLabel,
      history
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not trigger SOS.' });
  }
});

// POST /api/sos/cancel
router.post('/cancel', async (req, res) => {
  try {
    await db.setSosState(req.user.userId, false);

    const history = await db.addHistoryEntry(req.user.userId, {
      type: 'safe',
      label: 'SOS cancelled — marked as safe',
      coords: '',
      time: new Date()
    });

    res.json({ sosActive: false, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not cancel SOS.' });
  }
});

// GET /api/sos/status
router.get('/status', async (req, res) => {
  try {
    const user = await db.findUserById(req.user.userId);
    res.json({ sosActive: !!user.sosActive, lastLocation: user.lastLocation || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch SOS status.' });
  }
});

module.exports = router;
