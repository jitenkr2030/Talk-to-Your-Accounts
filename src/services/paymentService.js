// Payment Service - Razorpay Integration for Subscription Payments via IPC

const RAZORPAY_CONFIG = {
  // Razorpay configuration
  key_id: 'rzp_test_your_key_id',
  key_secret: 'your_key_secret',
  currency: 'INR',
  webhook_secret: 'your_webhook_secret',

  // Subscription plans - amounts in paise
  plans: {
    starter: {
      name: 'Starter',
      monthlyAmount: 49900, // ₹499
      yearlyAmount: 499000, // ₹4,990 (2 months free)
      description: 'Perfect for growing small businesses'
    },
    professional: {
      name: 'Professional',
      monthlyAmount: 149900, // ₹1,499
      yearlyAmount: 1499000, // ₹14,990 (2 months free)
      description: 'For established businesses with advanced needs'
    }
  }
};

const paymentService = {
  // Load Razorpay script dynamically
  async loadRazorpay() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.head.appendChild(script);
    });
  },

  // Create subscription order via backend
  async createSubscriptionOrder(planId, userId, billingCycle = 'monthly') {
    const plan = RAZORPAY_CONFIG.plans[planId];
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    // Call backend to create order
    const amount = billingCycle === 'yearly' ? plan.yearlyAmount : plan.monthlyAmount;

    // For demo mode, create a simulated order
    const orderId = `order_${Date.now()}_${userId}_${planId}`;

    return {
      orderId,
      amount,
      currency: RAZORPAY_CONFIG.currency,
      planName: plan.name,
      planId,
      billingCycle
    };
  },

  // Open Razorpay checkout
  async openCheckout(orderDetails, userData) {
    const Razorpay = await this.loadRazorpay();

    return new Promise((resolve, reject) => {
      const options = {
        key: RAZORPAY_CONFIG.key_id,
        amount: orderDetails.amount,
        currency: orderDetails.currency,
        name: 'Talk to Your Accounts',
        description: `${orderDetails.planName} Plan - ${orderDetails.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        order_id: orderDetails.orderId,
        prefill: {
          name: userData.name || '',
          email: userData.email || '',
          contact: userData.phone || ''
        },
        notes: {
          user_id: userData.userId,
          plan_id: orderDetails.planId,
          billing_cycle: orderDetails.billingCycle,
          type: 'subscription'
        },
        theme: {
          color: '#0ea5e9',
          hide_topbar: false
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          }
        },
        handler: (response) => {
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            planId: orderDetails.planId,
            billingCycle: orderDetails.billingCycle
          });
        }
      };

      const checkout = new Razorpay(options);
      checkout.open();
    });
  },

  // Process payment and activate subscription
  async processPayment(userId, paymentDetails) {
    try {
      // Record payment in backend
      await window.api.subscription.recordPayment({
        user_id: userId,
        razorpay_payment_id: paymentDetails.paymentId,
        razorpay_order_id: paymentDetails.orderId,
        amount: paymentDetails.amount || 0,
        payment_status: 'completed'
      });

      // Update subscription status
      await window.api.subscription.updateStatus(
        userId,
        'active',
        paymentDetails.razorpay_subscription_id || null
      );

      return {
        success: true,
        paymentId: paymentDetails.paymentId,
        message: 'Payment successful, subscription activated'
      };
    } catch (error) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Simulate payment for testing (demo mode)
  async simulatePayment(planId, userId, billingCycle = 'monthly') {
    const plan = RAZORPAY_CONFIG.plans[planId];
    const amount = billingCycle === 'yearly' ? plan.yearlyAmount : plan.monthlyAmount;

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create subscription in backend
    const subscription = await window.api.subscription.create(userId, planId, billingCycle);

    // Record payment
    await window.api.subscription.recordPayment({
      user_id: userId,
      razorpay_payment_id: `demo_${Date.now()}`,
      razorpay_order_id: `order_demo_${Date.now()}`,
      amount,
      payment_status: 'completed'
    });

    return {
      success: true,
      paymentId: `demo_${Date.now()}`,
      orderId: `order_demo_${Date.now()}`,
      planId,
      billingCycle,
      subscription,
      message: 'Demo payment successful - Subscription activated'
    };
  },

  // Get payment history
  async getPaymentHistory(userId) {
    return await window.api.subscription.getPaymentHistory(userId);
  },

  // Format amount for display
  formatAmount(amountPaise) {
    const amount = amountPaise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Calculate yearly price with discount
  getYearlyPrice(monthlyPrice) {
    // 12 months - 2 months free = 10 months price
    return monthlyPrice * 10;
  },

  // Get plan price
  getPlanPrice(planId, billingCycle) {
    const plan = RAZORPAY_CONFIG.plans[planId];
    if (!plan) return null;

    return {
      amount: billingCycle === 'yearly' ? plan.yearlyAmount : plan.monthlyAmount,
      display: this.formatAmount(billingCycle === 'yearly' ? plan.yearlyAmount : plan.monthlyAmount),
      monthlyEquivalent: this.formatAmount(plan.monthlyAmount),
      savings: billingCycle === 'yearly'
        ? this.formatAmount((plan.monthlyAmount * 12) - plan.yearlyAmount)
        : null,
      discount: billingCycle === 'yearly' ? 17 : 0 // ~17% discount for yearly
    };
  },

  // Validate payment response
  validatePaymentResponse(response) {
    return response &&
      response.success &&
      response.paymentId &&
      response.orderId;
  },

  // Get Razorpay configuration
  getConfig() {
    return {
      keyId: RAZORPAY_CONFIG.key_id,
      currency: RAZORPAY_CONFIG.currency
    };
  },

  // Check if in demo mode (no real Razorpay keys)
  isDemoMode() {
    return RAZORPAY_CONFIG.key_id === 'rzp_test_your_key_id';
  }
};

export default paymentService;
export { RAZORPAY_CONFIG };
