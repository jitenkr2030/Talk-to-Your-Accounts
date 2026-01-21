import { useState } from 'react';
import useAppStore from '../../stores/appStore';
import subscriptionService from '../../services/subscriptionService';

const SubscriptionBanner = ({ onUpgradeClick }) => {
  const { subscription, currentUser, loadSubscription, showPricingModal } = useAppStore();
  const [showDetails, setShowDetails] = useState(false);

  const plan = subscription.currentSubscription;
  const usageLimits = subscription.usageLimits;
  const usage = subscription.usage;

  // Use provided onUpgradeClick or fall back to store action
  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      showPricingModal(true);
    }
  };

  if (!plan) {
    // No subscription - show upgrade prompt
    return (
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Get More with Talk to Your Accounts</h3>
              <p className="text-blue-100 text-sm">Upgrade to unlock unlimited transactions and premium features</p>
            </div>
          </div>
          <button
            onClick={handleUpgradeClick}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  const planName = subscriptionService.getPlanDisplayName(plan.plan_id);
  const daysRemaining = subscriptionService.getDaysRemaining(plan.current_period_end);
  const isExpiringSoon = subscriptionService.isExpiringSoon(plan.current_period_end);
  const isFreePlan = plan.plan_id === 'free';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        {/* Plan Info */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            plan.plan_id === 'professional'
              ? 'bg-gradient-to-br from-purple-500 to-purple-600'
              : plan.plan_id === 'starter'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600'
              : 'bg-gray-100'
          }`}>
            {plan.plan_id === 'professional' ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            ) : plan.plan_id === 'starter' ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{planName} Plan</h3>
              {isFreePlan && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  Free
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {subscriptionService.formatCurrency(plan.monthly_price)}/month
              {plan.billing_cycle === 'yearly' && (
                <span className="text-green-600 ml-1">billed yearly</span>
              )}
            </p>
          </div>
        </div>

        {/* Usage Summary or Expiry */}
        <div className="flex items-center gap-6">
          {!isFreePlan && daysRemaining !== null && (
            <div className={`text-right ${isExpiringSoon ? 'text-amber-600' : 'text-gray-600'}`}>
              <p className="text-sm">
                {isExpiringSoon ? 'Expires in' : 'Renews in'} <strong>{daysRemaining} days</strong>
              </p>
              {isExpiringSoon && (
                <button
                  onClick={handleUpgradeClick}
                  className="text-xs underline hover:no-underline"
                >
                  Renew now
                </button>
              )}
            </div>
          )}

          {isFreePlan && usageLimits && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showDetails ? 'Hide usage' : 'View usage'}
            </button>
          )}

          {!isFreePlan && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showDetails ? 'Hide usage' : 'View usage'}
            </button>
          )}

          {isFreePlan && (
            <button
              onClick={handleUpgradeClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Usage Details */}
      {showDetails && usageLimits && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-6">
            {/* Transactions */}
            <UsageItem
              label="Transactions"
              used={usage?.transaction_count || 0}
              limit={usageLimits.limits?.transactions?.limit || 50}
              color="#3b82f6"
            />

            {/* Parties */}
            <UsageItem
              label="Parties/Ledgers"
              used={usage?.party_count || 0}
              limit={usageLimits.limits?.parties?.limit || 10}
              color="#10b981"
            />

            {/* Products */}
            <UsageItem
              label="Products"
              used={usage?.product_count || 0}
              limit={usageLimits.limits?.products?.limit || 20}
              color="#f59e0b"
            />
          </div>

          {isFreePlan && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                Upgrade to Starter or Professional for higher limits and premium features
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Usage Item Component
const UsageItem = ({ label, used, limit, color }) => {
  const percentage = subscriptionService.getUsagePercentage(used, limit);
  const statusColor = subscriptionService.getUsageStatusColor(percentage);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">
          {subscriptionService.formatLimit(used, limit)}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: limit === -1 ? color : statusColor
          }}
        />
      </div>
      {limit !== -1 && percentage >= 80 && (
        <p className="text-xs mt-1" style={{ color: statusColor }}>
          {percentage}% used
        </p>
      )}
    </div>
  );
};

export default SubscriptionBanner;
