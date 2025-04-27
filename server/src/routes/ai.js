const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Configuration, OpenAIApi } = require('openai');
const User = require('../models/User');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Generate personalized workout plan
router.post('/workout-plan', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { goals, preferences, fitnessLevel } = req.body;

    const prompt = `Create a personalized workout plan for a ${user.profile.age}-year-old ${user.profile.gender} with the following details:
    - Fitness Level: ${fitnessLevel}
    - Goals: ${goals.join(', ')}
    - Preferences: ${preferences.join(', ')}
    - Available Days: ${user.profile.preferences.availableDays.join(', ')}
    - Preferred Time: ${user.profile.preferences.preferredTime}
    - Medical Conditions: ${user.profile.medicalConditions.join(', ') || 'None'}
    
    Please provide a detailed weekly workout plan with exercises, sets, reps, and rest periods.`;

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const workoutPlan = completion.data.choices[0].text;

    // Save the workout plan to user's profile
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        'profile.workoutPlan': workoutPlan,
        'profile.lastPlanUpdate': new Date()
      }
    });

    res.json({ workoutPlan });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get fitness recommendations
router.post('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { activityHistory } = user;
    const lastMonthActivities = activityHistory
      .filter(activity => activity.date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const prompt = `Based on the following activity history, provide personalized fitness recommendations:
    ${lastMonthActivities.map(activity => 
      `- ${activity.type}: ${activity.duration} minutes, ${activity.calories} calories burned`
    ).join('\n')}
    
    User Profile:
    - Age: ${user.profile.age}
    - Gender: ${user.profile.gender}
    - Goals: ${user.profile.fitnessGoals.join(', ')}
    - Medical Conditions: ${user.profile.medicalConditions.join(', ') || 'None'}
    
    Please provide specific recommendations for:
    1. Areas of improvement
    2. Suggested new activities
    3. Recovery and rest advice
    4. Nutrition tips`;

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const recommendations = completion.data.choices[0].text;
    res.json({ recommendations });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// AI Chatbot for fitness advice
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const user = await User.findById(req.user.id);

    const prompt = `You are a fitness expert chatbot. The user is a ${user.profile.age}-year-old ${user.profile.gender} with the following details:
    - Fitness Goals: ${user.profile.fitnessGoals.join(', ')}
    - Medical Conditions: ${user.profile.medicalConditions.join(', ') || 'None'}
    - Current Workout Plan: ${user.profile.workoutPlan || 'Not specified'}
    
    User's message: ${message}
    
    Please provide a helpful and professional response.`;

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.data.choices[0].text;
    res.json({ response });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 