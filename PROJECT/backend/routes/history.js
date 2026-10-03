const express = require('express');

const db = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/history
router.get('/', async (req, res) => {
  try {
    const user = await db.findUserById(req.user.userId);
    res.json({ history: user.history || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

module.exports = router;
