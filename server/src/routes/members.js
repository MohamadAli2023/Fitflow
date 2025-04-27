const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get all members (admin only)
router.get('/', [auth, auth.checkRole(['admin'])], async (req, res) => {
  try {
    const members = await User.find({ role: 'member' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get member profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update member profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { profile } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { profile } },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update membership status
router.put('/membership', auth, async (req, res) => {
  try {
    const { type, status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $set: { 
          'membership.type': type,
          'membership.status': status,
          'membership.startDate': Date.now(),
          'membership.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add activity to history
router.post('/activity', auth, async (req, res) => {
  try {
    const { type, duration, calories, notes } = req.body;
    const newActivity = {
      date: Date.now(),
      type,
      duration,
      calories,
      notes
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { activityHistory: newActivity } },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get activity history
router.get('/activity', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('activityHistory');
    res.json(user.activityHistory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 