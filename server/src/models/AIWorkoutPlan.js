const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goal: {
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness'],
    required: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  duration: {
    type: Number, // in weeks
    required: true
  },
  schedule: [{
    day: {
      type: Number,
      min: 0,
      max: 6,
      required: true
    },
    workouts: [{
      type: {
        type: String,
        enum: ['strength', 'cardio', 'flexibility', 'hiit', 'recovery'],
        required: true
      },
      exercises: [{
        name: String,
        sets: Number,
        reps: Number,
        weight: {
          type: Number,
          min: 0
        },
        duration: Number, // in minutes
        rest: Number, // in seconds
        notes: String
      }],
      duration: Number, // total duration in minutes
      intensity: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      focus: [String], // e.g., ['upper_body', 'core', 'legs']
      equipment: [String]
    }]
  }],
  preferences: {
    availableEquipment: [String],
    timePerSession: Number, // in minutes
    daysPerWeek: Number,
    preferredTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'any']
    },
    restrictions: [String] // e.g., ['no_heavy_lifting', 'low_impact']
  },
  progress: [{
    week: Number,
    completedWorkouts: Number,
    totalWorkouts: Number,
    feedback: {
      difficulty: {
        type: Number,
        min: 1,
        max: 5
      },
      enjoyment: {
        type: Number,
        min: 1,
        max: 5
      },
      notes: String
    },
    measurements: {
      weight: Number,
      bodyFat: Number,
      muscleMass: Number
    }
  }],
  aiRecommendations: [{
    type: {
      type: String,
      enum: ['exercise_modification', 'intensity_adjustment', 'schedule_change', 'goal_update'],
      required: true
    },
    reason: String,
    suggestion: String,
    implemented: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient querying
workoutPlanSchema.index({ member: 1, status: 1 });
workoutPlanSchema.index({ 'schedule.day': 1 });

// Method to calculate completion percentage
workoutPlanSchema.methods.calculateCompletion = function() {
  if (!this.progress.length) return 0;
  
  const latestProgress = this.progress[this.progress.length - 1];
  return (latestProgress.completedWorkouts / latestProgress.totalWorkouts) * 100;
};

// Method to get current week's schedule
workoutPlanSchema.methods.getCurrentWeekSchedule = function() {
  const startDate = new Date(this.startDate);
  const now = new Date();
  const weekDiff = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000));
  
  if (weekDiff >= this.duration) return null;
  
  return this.schedule.map(day => ({
    ...day.toObject(),
    week: weekDiff + 1
  }));
};

// Method to generate progress report
workoutPlanSchema.methods.generateProgressReport = function() {
  if (!this.progress.length) return null;
  
  const report = {
    weeksCompleted: this.progress.length,
    totalWeeks: this.duration,
    completionRate: this.calculateCompletion(),
    measurements: this.progress.map(p => p.measurements),
    averageFeedback: {
      difficulty: this.progress.reduce((acc, p) => acc + p.feedback.difficulty, 0) / this.progress.length,
      enjoyment: this.progress.reduce((acc, p) => acc + p.feedback.enjoyment, 0) / this.progress.length
    }
  };
  
  return report;
};

const AIWorkoutPlan = mongoose.model('AIWorkoutPlan', workoutPlanSchema);

module.exports = AIWorkoutPlan; 