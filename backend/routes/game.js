const express = require('express');
const router = express.Router();
const { generateCodenamesCards } = require('../ai.js');

router.post('/', async (req, res) => {
  try {
    const cards = await generateCodenamesCards();
    res.json({ success: true, cards });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate game cards.' });
  }
});

module.exports = router;