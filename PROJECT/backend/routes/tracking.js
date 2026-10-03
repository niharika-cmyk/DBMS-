const express = require('express');

const db = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/tracking/update  { lat, lng }
router.post('/update', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng (numbers) are required.' });
    }

    const location = { lat, lng, at: new Date() };
    const user = await db.setLastLocation(req.user.userId, location);
    res.json({ lastLocation: user.lastLocation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update location.' });
  }
});

// POST /api/tracking/start
router.post('/start', async (req, res) => {
  try {
    const history = await db.addHistoryEntry(req.user.userId, {
      type: 'tracking',
      label: 'Started live location sharing',
      coords: '',
      time: new Date()
    });
    res.json({ tracking: true, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not start tracking.' });
  }
});

// POST /api/tracking/stop
router.post('/stop', async (req, res) => {
  try {
    const history = await db.addHistoryEntry(req.user.userId, {
      type: 'tracking',
      label: 'Stopped live location sharing',
      coords: '',
      time: new Date()
    });
    res.json({ tracking: false, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not stop tracking.' });
  }
});

// GET /api/tracking/current
router.get('/current', async (req, res) => {
  try {
    const user = await db.findUserById(req.user.userId);
    res.json({ lastLocation: user.lastLocation || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch current location.' });
  }
});

module.exports = router;
