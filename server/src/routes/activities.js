const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Sync activity data from wearable device
router.post('/sync', auth, async (req, res) => {
  try {
    const { deviceType, activities } = req.body;
    const user = await User.findById(req.user.id);

    // Process and validate activities
    const processedActivities = activities.map(activity => ({
      date: new Date(activity.timestamp),
      type: activity.type,
      duration: activity.duration,
      calories: activity.calories,
      distance: activity.distance,
      steps: activity.steps,
      heartRate: activity.heartRate,
      deviceType,
      notes: `Synced from ${deviceType} device`
    }));

    // Update user's activity history
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { activityHistory: { $each: processedActivities } } }
    );

    res.json({ message: 'Activities synced successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get activity summary
router.get('/summary', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { activityHistory } = user;

    // Calculate summary for the last 30 days
    const lastMonthActivities = activityHistory
      .filter(activity => activity.date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const summary = {
      totalActivities: lastMonthActivities.length,
      totalDuration: lastMonthActivities.reduce((sum, activity) => sum + activity.duration, 0),
      totalCalories: lastMonthActivities.reduce((sum, activity) => sum + activity.calories, 0),
      totalSteps: lastMonthActivities.reduce((sum, activity) => sum + (activity.steps || 0), 0),
      activityTypes: {},
      dailyAverage: {
        duration: 0,
        calories: 0,
        steps: 0
      }
    };

    // Calculate activity type distribution
    lastMonthActivities.forEach(activity => {
      summary.activityTypes[activity.type] = (summary.activityTypes[activity.type] || 0) + 1;
    });

    // Calculate daily averages
    const days = Math.max(1, Math.ceil((Date.now() - lastMonthActivities[0]?.date) / (24 * 60 * 60 * 1000)));
    summary.dailyAverage = {
      duration: Math.round(summary.totalDuration / days),
      calories: Math.round(summary.totalCalories / days),
      steps: Math.round(summary.totalSteps / days)
    };

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get activity history with filters
router.get('/history', auth, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const user = await User.findById(req.user.id);

    let activities = user.activityHistory;

    // Apply filters
    if (startDate) {
      activities = activities.filter(activity => activity.date >= new Date(startDate));
    }
    if (endDate) {
      activities = activities.filter(activity => activity.date <= new Date(endDate));
    }
    if (type) {
      activities = activities.filter(activity => activity.type === type);
    }

    // Sort by date
    activities.sort((a, b) => b.date - a.date);

    res.json(activities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add manual activity
router.post('/manual', auth, async (req, res) => {
  try {
    const { type, duration, calories, distance, steps, notes } = req.body;

    const newActivity = {
      date: new Date(),
      type,
      duration,
      calories,
      distance,
      steps,
      notes,
      deviceType: 'manual'
    };

    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { activityHistory: newActivity } }
    );

    res.json({ message: 'Activity added successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get activity goals
router.get('/goals', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { activityHistory } = user;

    // Calculate progress for the current week
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const weeklyActivities = activityHistory.filter(
      activity => activity.date >= startOfWeek
    );

    const goals = {
      weekly: {
        target: {
          duration: 150, // minutes
          calories: 2000,
          steps: 70000
        },
        current: {
          duration: weeklyActivities.reduce((sum, activity) => sum + activity.duration, 0),
          calories: weeklyActivities.reduce((sum, activity) => sum + activity.calories, 0),
          steps: weeklyActivities.reduce((sum, activity) => sum + (activity.steps || 0), 0)
        }
      }
    };

    // Calculate progress percentage
    goals.weekly.progress = {
      duration: Math.min(100, Math.round((goals.weekly.current.duration / goals.weekly.target.duration) * 100)),
      calories: Math.min(100, Math.round((goals.weekly.current.calories / goals.weekly.target.calories) * 100)),
      steps: Math.min(100, Math.round((goals.weekly.current.steps / goals.weekly.target.steps) * 100))
    };

    res.json(goals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 