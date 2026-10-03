const express = require('express');
const crypto = require('crypto');

const db = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/contacts
router.get('/', async (req, res) => {
  try {
    const user = await db.findUserById(req.user.userId);
    res.json({ contacts: user.contacts || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch contacts.' });
  }
});

// POST /api/contacts
router.post('/', async (req, res) => {
  try {
    const { name, phone, relation } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    const contact = {
      id: crypto.randomUUID(),
      name,
      phone,
      relation: relation || 'Other'
    };

    const contacts = await db.addContact(req.user.userId, contact);
    res.status(201).json({ contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add contact.' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    const contacts = await db.removeContact(req.user.userId, req.params.id);
    if (!contacts) return res.status(404).json({ error: 'User not found.' });
    res.json({ contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not remove contact.' });
  }
});

module.exports = router;
