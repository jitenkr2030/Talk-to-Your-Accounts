import { useState, useEffect } from 'react';
import subscriptionService from '../../services/subscriptionService';
import paymentService from '../../services/paymentService';
import useAppStore from '../../stores/appStore';

const PricingPlans = ({ onSelectPlan, onClose }) => {
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { currentUser, showPricingModal } = useAppStore();

  // Use provided onClose or fall back to store action
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      showPricingModal(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const fetchedPlans = await subscriptionService.getPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = async (plan) => {
    if (plan.plan_id === 'free') {
      // Free plan - activate immediately
      setProcessing(true);
      try {
        await subscriptionService.createSubscription(currentUser?.id, 'free', 'monthly');
        onSelectPlan?.(plan);
        handleClose();
      } catch (error) {
        console.error('Failed to activate free plan:', error);
      } finally {
        setProcessing(false);
      }
    } else {
      // Paid plan - initiate payment
      setProcessing(true);
      try {
        if (paymentService.isDemoMode()) {
          // Demo mode - simulate payment
          const result = await paymentService.simulatePayment(
            plan.plan_id,
            currentUser?.id,
            billingCycle
          );
          if (result.success) {
            onSelectPlan?.(plan);
            handleClose();
          }
        } else {
          // Production - open Razorpay
          const order = await paymentService.createSubscriptionOrder(
            plan.plan_id,
            currentUser?.id,
            billingCycle
          );
          const payment = await paymentService.openCheckout(order, {
            userId: currentUser?.id,
            name: currentUser?.username,
            email: currentUser?.email,
            phone: currentUser?.phone
          });
          await paymentService.processPayment(currentUser?.id, payment);
          onSelectPlan?.(plan);
          handleClose();
        }
      } catch (error) {
        console.error('Payment failed:', error);
      } finally {
        setProcessing(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
              <p className="text-gray-600 mt-1">Select the plan that best fits your business needs</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Billing Toggle */}
          <div className="mt-6 flex justify-center">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="ml-2 text-green-600 text-xs">Save 17%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
              const monthlyEquivalent = billingCycle === 'yearly'
                ? Math.round(plan.yearly_price / 12)
                : plan.monthly_price;
              const features = subscriptionService.getPlanFeatures(plan.features);
              const isPopular = plan.plan_id === 'starter';

              return (
                <div
                  key={plan.plan_id}
                  className={`relative rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${
                    isPopular
                      ? 'border-blue-500 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        {subscriptionService.formatCurrency(price)}
                      </span>
                      <span className="text-gray-500">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-sm text-gray-500 mt-1">
                        ₹{monthlyEquivalent}/month equivalent
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanSelect(plan)}
                    disabled={processing}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                      isPopular
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
