const mongoose = require('mongoose');

const chatbotSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  context: {
    type: {
      type: String,
      enum: ['general', 'fitness', 'membership', 'technical', 'other'],
      default: 'general'
    },
    topic: String,
    subtopics: [String],
    userPreferences: {
      language: {
        type: String,
        default: 'en'
      },
      tone: {
        type: String,
        enum: ['professional', 'casual', 'motivational'],
        default: 'professional'
      }
    }
  },
  conversation: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      intent: String,
      confidence: Number,
      entities: [{
        type: String,
        value: String
      }],
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative']
      }
    }
  }],
  state: {
    currentIntent: String,
    previousIntents: [String],
    requiredInformation: [String],
    collectedInformation: mongoose.Schema.Types.Mixed,
    nextSteps: [String]
  },
  actions: [{
    type: {
      type: String,
      enum: ['information_request', 'appointment_booking', 'payment_processing', 'workout_suggestion', 'goal_setting'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    details: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  }],
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    helpful: Boolean,
    resolution: {
      type: String,
      enum: ['resolved', 'partially_resolved', 'unresolved']
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  duration: Number, // in minutes
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient querying
chatbotSchema.index({ user: 1, status: 1 });
chatbotSchema.index({ 'context.type': 1 });
chatbotSchema.index({ lastInteraction: 1 });

// Method to get conversation summary
chatbotSchema.methods.getConversationSummary = function() {
  return {
    totalMessages: this.conversation.length,
    userMessages: this.conversation.filter(msg => msg.role === 'user').length,
    assistantMessages: this.conversation.filter(msg => msg.role === 'assistant').length,
    duration: this.duration,
    context: this.context.type,
    status: this.status
  };
};

// Method to check if conversation is stale
chatbotSchema.methods.isStale = function() {
  const now = new Date();
  const lastInteraction = new Date(this.lastInteraction);
  const minutesDiff = Math.floor((now - lastInteraction) / (1000 * 60));
  return minutesDiff > 30; // Consider conversation stale after 30 minutes of inactivity
};

// Method to get pending actions
chatbotSchema.methods.getPendingActions = function() {
  return this.actions.filter(action => action.status === 'pending');
};

// Method to calculate conversation metrics
chatbotSchema.methods.calculateMetrics = function() {
  const metrics = {
    totalMessages: this.conversation.length,
    averageResponseTime: 0,
    sentimentDistribution: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    intentDistribution: {}
  };

  let totalResponseTime = 0;
  let responseCount = 0;

  this.conversation.forEach((msg, index) => {
    if (msg.role === 'assistant' && index > 0) {
      const prevMsg = this.conversation[index - 1];
      if (prevMsg.role === 'user') {
        const responseTime = (msg.timestamp - prevMsg.timestamp) / 1000; // in seconds
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    if (msg.metadata?.sentiment) {
      metrics.sentimentDistribution[msg.metadata.sentiment]++;
    }

    if (msg.metadata?.intent) {
      metrics.intentDistribution[msg.metadata.intent] = 
        (metrics.intentDistribution[msg.metadata.intent] || 0) + 1;
    }
  });

  metrics.averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

  return metrics;
};

const Chatbot = mongoose.model('Chatbot', chatbotSchema);

module.exports = Chatbot; 