// Subscription Service - Manages tier limits, usage tracking, and license verification via IPC

const subscriptionService = {
  // Get all available plans from backend
  async getPlans() {
    return await window.api.subscription.getPlans();
  },

  // Get plan by ID
  async getPlan(planId) {
    return await window.api.subscription.getPlan(planId);
  },

  // Get user's current subscription
  async getSubscription(userId) {
    return await window.api.subscription.getSubscription(userId);
  },

  // Create or update subscription
  async createSubscription(userId, planId, billingCycle = 'monthly') {
    return await window.api.subscription.create(userId, planId, billingCycle);
  },

  // Update subscription status
  async updateSubscriptionStatus(userId, status, razorpaySubscriptionId = null) {
    return await window.api.subscription.updateStatus(userId, status, razorpaySubscriptionId);
  },

  // Get usage data for current month
  async getUsage(userId) {
    return await window.api.subscription.getUsage(userId);
  },

  // Check usage limits
  async checkLimits(userId) {
    return await window.api.subscription.checkLimits(userId);
  },

  // Increment usage counter
  async incrementUsage(userId, type) {
    return await window.api.subscription.incrementUsage(userId, type);
  },

  // Get payment history
  async getPaymentHistory(userId) {
    return await window.api.subscription.getPaymentHistory(userId);
  },

  // Diagnostic function to check subscription system health
  async diagnose() {
    return await window.api.subscription.diagnose();
  },

  // Format currency
  formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Get plan features as array
  getPlanFeatures(featuresJson) {
    try {
      return JSON.parse(featuresJson);
    } catch {
      return [];
    }
  },

  // Check if user can perform action based on subscription
  canPerformAction(plan, action) {
    const actionRequirements = {
      'create_transaction': { minPlan: 'free' },
      'generate_report': { minPlan: 'free' },
      'export_pdf': { minPlan: 'starter' },
      'export_excel': { minPlan: 'professional' },
      'gst_features': { minPlan: 'starter' },
      'ai_insights': { minPlan: 'professional' },
      'api_access': { minPlan: 'professional' },
      'multi_user': { minPlan: 'starter' },
      'voice_commands': { minPlan: 'starter' },
      'bank_reconciliation': { minPlan: 'starter' }
    };

    const requirement = actionRequirements[action];
    if (!requirement) return { allowed: true };

    const planPriority = this.getPlanPriority(plan);
    const minPriority = this.getPlanPriority(requirement.minPlan);

    if (planPriority < minPriority) {
      return {
        allowed: false,
        reason: `This feature requires ${requirement.minPlan.charAt(0).toUpperCase() + requirement.minPlan.slice(1)} plan or higher`,
        requiredTier: requirement.minPlan
      };
    }

    return { allowed: true };
  },

  // Get plan priority for comparison
  getPlanPriority(planId) {
    const priorities = { 'free': 0, 'starter': 1, 'professional': 2 };
    return priorities[planId] || 0;
  },

  // Calculate usage percentage
  getUsagePercentage(used, limit) {
    if (limit === 0) return 0;
    if (limit === -1) return 0; // Unlimited
    return Math.round((used / limit) * 100);
  },

  // Get usage status color
  getUsageStatusColor(percentage) {
    if (percentage >= 90) return '#ef4444'; // Red - critical
    if (percentage >= 75) return '#f59e0b'; // Orange - warning
    return '#22c55e'; // Green - okay
  },

  // Format limit text
  formatLimit(used, limit) {
    if (limit === -1) return 'Unlimited';
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
  },

  // Get renewal days remaining
  getDaysRemaining(endDate) {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  // Check if subscription is expiring soon
  isExpiringSoon(endDate, daysThreshold = 7) {
    const days = this.getDaysRemaining(endDate);
    return days !== null && days <= daysThreshold && days > 0;
  },

  // Get plan display name
  getPlanDisplayName(planId) {
    const names = {
      'free': 'Free',
      'starter': 'Starter',
      'professional': 'Professional'
    };
    return names[planId] || 'Unknown';
  },

  // Get annual savings
  getAnnualSavings(monthlyPrice, yearlyPrice) {
    const annualMonthly = monthlyPrice * 12;
    return annualMonthly - yearlyPrice;
  },

  // Calculate discount percentage
  getDiscountPercentage(monthlyPrice, yearlyPrice) {
    const annualMonthly = monthlyPrice * 12;
    if (annualMonthly === 0) return 0;
    return Math.round(((annualMonthly - yearlyPrice) / annualMonthly) * 100);
  }
};

export default subscriptionService;
