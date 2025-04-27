const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['workout', 'class', 'measurement', 'goal', 'achievement'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  duration: {
    type: Number, // in minutes
    required: function() {
      return this.type === 'workout' || this.type === 'class';
    }
  },
  caloriesBurned: {
    type: Number,
    min: 0
  },
  // For workouts
  workoutDetails: {
    exercises: [{
      name: String,
      sets: Number,
      reps: Number,
      weight: Number,
      duration: Number,
      notes: String
    }],
    intensity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    notes: String
  },
  // For classes
  classDetails: {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    attendance: {
      type: Boolean,
      default: false
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String
    }
  },
  // For measurements
  measurements: {
    weight: Number,
    height: Number,
    bodyFat: Number,
    muscleMass: Number,
    waist: Number,
    hips: Number,
    chest: Number,
    arms: Number,
    thighs: Number
  },
  // For goals
  goalDetails: {
    type: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'other']
    },
    target: mongoose.Schema.Types.Mixed,
    deadline: Date,
    progress: Number,
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'in_progress'
    }
  },
  // For achievements
  achievementDetails: {
    title: String,
    description: String,
    badge: String,
    points: Number
  },
  // Integration with wearables
  wearableData: {
    deviceType: String,
    steps: Number,
    heartRate: {
      average: Number,
      max: Number,
      min: Number
    },
    sleep: {
      duration: Number,
      quality: Number
    },
    calories: Number,
    distance: Number
  },
  notes: String,
  isPrivate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
activitySchema.index({ member: 1, date: -1 });
activitySchema.index({ type: 1, date: -1 });
activitySchema.index({ 'wearableData.deviceType': 1 });

// Method to calculate progress percentage for goals
activitySchema.methods.calculateProgress = function() {
  if (this.type !== 'goal') return null;
  
  const current = this.measurements || this.goalDetails.progress;
  const target = this.goalDetails.target;
  
  if (typeof current === 'number' && typeof target === 'number') {
    return (current / target) * 100;
  }
  return null;
};

// Method to get activity summary
activitySchema.methods.getSummary = function() {
  const summary = {
    type: this.type,
    date: this.date,
    duration: this.duration,
    caloriesBurned: this.caloriesBurned
  };

  if (this.type === 'workout') {
    summary.exercises = this.workoutDetails.exercises.length;
  } else if (this.type === 'class') {
    summary.className = this.classDetails.classId;
    summary.attendance = this.classDetails.attendance;
  }

  return summary;
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity; 