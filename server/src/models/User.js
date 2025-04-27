const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['employee', 'admin'],
    default: 'employee'
  },
  membership: {
    type: {
      type: String,
      enum: ['basic', 'premium', 'elite'],
      default: 'basic'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    }
  },
  profile: {
    age: Number,
    gender: String,
    height: Number,
    weight: Number,
    fitnessGoals: [String],
    medicalConditions: [String],
    preferences: {
      workoutTypes: [String],
      availableDays: [String],
      preferredTime: String
    },
    phone: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  activityHistory: [{
    date: Date,
    type: String,
    duration: Number,
    calories: Number,
    notes: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.profile.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema); 