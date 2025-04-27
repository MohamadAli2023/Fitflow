const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const Class = require('../models/Class');
const Booking = require('../models/Booking');

// Create a new class (admin/trainer only)
router.post('/classes', 
  auth, 
  auth.checkRole(['admin', 'trainer']),
  [
    body('title').notEmpty(),
    body('description').notEmpty(),
    body('date').isISO8601(),
    body('duration').isNumeric(),
    body('capacity').isNumeric(),
    body('trainerId').isMongoId()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const newClass = new Class({
        ...req.body,
        createdBy: req.user.id
      });

      await newClass.save();
      res.json(newClass);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Get all classes
router.get('/classes', auth, async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('trainerId', 'name')
      .sort({ date: 1 });
    res.json(classes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Book a class
router.post('/bookings', 
  auth,
  [
    body('classId').isMongoId(),
    body('date').isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { classId, date } = req.body;

      // Check if class exists and has available spots
      const gymClass = await Class.findById(classId);
      if (!gymClass) {
        return res.status(404).json({ message: 'Class not found' });
      }

      const currentBookings = await Booking.countDocuments({ classId });
      if (currentBookings >= gymClass.capacity) {
        return res.status(400).json({ message: 'Class is full' });
      }

      // Check if user already booked this class
      const existingBooking = await Booking.findOne({
        classId,
        userId: req.user.id
      });
      if (existingBooking) {
        return res.status(400).json({ message: 'Already booked this class' });
      }

      const newBooking = new Booking({
        classId,
        userId: req.user.id,
        date
      });

      await newBooking.save();
      res.json(newBooking);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Get user's bookings
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('classId')
      .sort({ date: 1 });
    res.json(bookings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Cancel a booking
router.delete('/bookings/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns the booking
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await booking.remove();
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 