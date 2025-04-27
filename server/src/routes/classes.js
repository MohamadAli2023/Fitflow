const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const auth = require('../middleware/auth');

// Get all classes
router.get('/', auth, async (req, res) => {
  try {
    const { type, category, instructor, startDate, endDate } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (category) query.category = category;
    if (instructor) query.instructor = instructor;
    if (startDate && endDate) {
      query['schedule.startTime'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const classes = await Class.find(query)
      .populate('instructor', 'firstName lastName')
      .sort({ 'schedule.startTime': 1 });

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching classes', error: error.message });
  }
});

// Get class by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('instructor', 'firstName lastName')
      .populate('enrolledMembers.member', 'firstName lastName');

    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classItem);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching class', error: error.message });
  }
});

// Create new class (admin/staff only)
router.post('/', [auth, auth.checkRole(['admin', 'staff'])], async (req, res) => {
  try {
    const classItem = new Class(req.body);
    await classItem.save();

    res.status(201).json({
      message: 'Class created successfully',
      class: classItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating class', error: error.message });
  }
});

// Update class (admin/staff only)
router.put('/:id', [auth, auth.checkRole(['admin', 'staff'])], async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'name', 'description', 'type', 'category', 'difficulty',
      'capacity', 'duration', 'schedule', 'location', 'price',
      'equipment', 'requirements', 'notes'
    ];

    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    updates.forEach(update => classItem[update] = req.body[update]);
    await classItem.save();

    res.json({
      message: 'Class updated successfully',
      class: classItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating class', error: error.message });
  }
});

// Register for class (members only)
router.post('/:id/register', [auth, auth.checkRole(['member'])], async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classItem.status !== 'scheduled') {
      return res.status(400).json({ message: 'Class is not available for registration' });
    }

    // Check if already registered
    const existingRegistration = classItem.enrolledMembers.find(
      member => member.member.toString() === req.user._id.toString()
    );

    if (existingRegistration) {
      return res.status(400).json({ message: 'Already registered for this class' });
    }

    // Check if class is full
    if (classItem.isFull()) {
      // Add to waitlist
      classItem.enrolledMembers.push({
        member: req.user._id,
        status: 'waitlisted'
      });
    } else {
      // Register normally
      classItem.enrolledMembers.push({
        member: req.user._id,
        status: 'registered'
      });
    }

    await classItem.save();

    res.json({
      message: classItem.isFull() ? 'Added to waitlist' : 'Registered successfully',
      class: classItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering for class', error: error.message });
  }
});

// Cancel registration (members only)
router.post('/:id/cancel', [auth, auth.checkRole(['member'])], async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const registrationIndex = classItem.enrolledMembers.findIndex(
      member => member.member.toString() === req.user._id.toString()
    );

    if (registrationIndex === -1) {
      return res.status(400).json({ message: 'Not registered for this class' });
    }

    // Remove registration
    classItem.enrolledMembers.splice(registrationIndex, 1);

    // If there are waitlisted members, move the first one to registered
    const waitlistedIndex = classItem.enrolledMembers.findIndex(
      member => member.status === 'waitlisted'
    );

    if (waitlistedIndex !== -1) {
      classItem.enrolledMembers[waitlistedIndex].status = 'registered';
    }

    await classItem.save();

    res.json({
      message: 'Registration cancelled successfully',
      class: classItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling registration', error: error.message });
  }
});

// Update class status (admin/staff only)
router.put('/:id/status', [auth, auth.checkRole(['admin', 'staff'])], async (req, res) => {
  try {
    const { status } = req.body;
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    classItem.status = status;
    await classItem.save();

    res.json({
      message: 'Class status updated successfully',
      class: classItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating class status', error: error.message });
  }
});

// Delete class (admin only)
router.delete('/:id', [auth, auth.checkRole(['admin'])], async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    classItem.isActive = false;
    await classItem.save();

    res.json({ message: 'Class deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating class', error: error.message });
  }
});

module.exports = router; 