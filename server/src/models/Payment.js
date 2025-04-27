const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['membership', 'class', 'personal_training', 'product', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'other'],
    required: true
  },
  paymentDetails: {
    // For card payments
    card: {
      last4: String,
      brand: String,
      expiryMonth: Number,
      expiryYear: Number
    },
    // For bank transfers
    bank: {
      accountNumber: String,
      routingNumber: String,
      bankName: String
    }
  },
  subscription: {
    isSubscription: {
      type: Boolean,
      default: false
    },
    interval: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual']
    },
    startDate: Date,
    endDate: Date,
    nextBillingDate: Date,
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  items: [{
    type: {
      type: String,
      enum: ['membership', 'class', 'personal_training', 'product']
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'items.type'
    },
    quantity: {
      type: Number,
      default: 1
    },
    price: Number,
    description: String
  }],
  tax: {
    amount: Number,
    rate: Number
  },
  discount: {
    code: String,
    amount: Number,
    percentage: Number
  },
  invoiceNumber: {
    type: String,
    unique: true
  },
  receiptUrl: String,
  notes: String,
  metadata: mongoose.Schema.Types.Mixed,
  refund: {
    amount: Number,
    reason: String,
    processedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
paymentSchema.index({ member: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'subscription.nextBillingDate': 1 });

// Method to calculate total amount including tax and discount
paymentSchema.methods.calculateTotal = function() {
  let total = this.amount;
  
  if (this.tax && this.tax.amount) {
    total += this.tax.amount;
  }
  
  if (this.discount) {
    if (this.discount.amount) {
      total -= this.discount.amount;
    } else if (this.discount.percentage) {
      total -= (total * this.discount.percentage / 100);
    }
  }
  
  return total;
};

// Method to generate invoice number
paymentSchema.methods.generateInvoiceNumber = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};

// Method to check if payment is overdue
paymentSchema.methods.isOverdue = function() {
  if (this.status === 'pending' && this.createdAt) {
    const now = new Date();
    const paymentDate = new Date(this.createdAt);
    const daysDiff = Math.floor((now - paymentDate) / (1000 * 60 * 60 * 24));
    return daysDiff > 7; // Consider payment overdue after 7 days
  }
  return false;
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 