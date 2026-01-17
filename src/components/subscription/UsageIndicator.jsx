import { useState } from 'react';
import useAppStore from '../../stores/appStore';
import subscriptionService from '../../services/subscriptionService';

const UsageIndicator = ({ compact = false }) => {
  const { subscription, currentUser, loadSubscription } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const usageLimits = subscription.usageLimits;
  const usage = subscription.usage;
  const planId = subscription.currentSubscription?.plan_id || 'free';

  if (!usageLimits || !usage) {
    return null;
  }

  const limits = usageLimits.limits;
  const percentages = {
    transactions: subscriptionService.getUsagePercentage(usage.transaction_count, limits.transactions?.limit),
    parties: subscriptionService.getUsagePercentage(usage.party_count, limits.parties?.limit),
    products: subscriptionService.getUsagePercentage(usage.product_count, limits.products?.limit)
  };

  const maxPercentage = Math.max(
    percentages.transactions,
    percentages.parties,
    percentages.products
  );

  const hasWarning = maxPercentage >= 75;
  const hasCritical = maxPercentage >= 90;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
          hasCritical
            ? 'bg-red-100 text-red-700'
            : hasWarning
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-600'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`w-2 h-2 rounded-full ${
          hasCritical ? 'bg-red-500' : hasWarning ? 'bg-amber-500' : 'bg-green-500'
        }`} />
        <span>
          {usage.transaction_count}/{limits.transactions?.limit || 50} transactions
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>

        {isExpanded && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-48">
            <UsageDetail label="Transactions" used={usage.transaction_count} limit={limits.transactions?.limit} percentage={percentages.transactions} />
            <UsageDetail label="Parties" used={usage.party_count} limit={limits.parties?.limit} percentage={percentages.parties} />
            <UsageDetail label="Products" used={usage.product_count} limit={limits.products?.limit} percentage={percentages.products} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Usage This Month</h3>
        <span className="text-sm text-gray-500">
          {usage.current_month ? new Date(usage.current_month + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : 'Current month'}
        </span>
      </div>

      <div className="space-y-4">
        <UsageDetail
          label="Transactions"
          used={usage.transaction_count}
          limit={limits.transactions?.limit}
          percentage={percentages.transactions}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <UsageDetail
          label="Parties/Ledgers"
          used={usage.party_count}
          limit={limits.parties?.limit}
          percentage={percentages.parties}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <UsageDetail
          label="Products/Items"
          used={usage.product_count}
          limit={limits.products?.limit}
          percentage={percentages.products}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
      </div>

      {/* Upgrade Prompt */}
      {planId === 'free' && hasWarning && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg">
          <p className="text-sm text-amber-700 text-center">
            You're running low on your free plan limits.{' '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openPricing'))}
              className="font-medium underline hover:no-underline"
            >
              Upgrade now
            </button>{' '}
            for higher limits
          </p>
        </div>
      )}

      {/* Critical Warning */}
      {hasCritical && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700 text-center">
            You've reached your {planId === 'free' ? 'free' : planId} plan limits.{' '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openPricing'))}
              className="font-medium underline hover:no-underline"
            >
              Upgrade now
            </button>{' '}
            to continue using all features
          </p>
        </div>
      )}
    </div>
  );
};

// Usage Detail Component
const UsageDetail = ({ label, used, limit, percentage, icon }) => {
  const statusColor = subscriptionService.getUsageStatusColor(percentage);
  const formattedLimit = subscriptionService.formatLimit(used, limit);
  const formattedUsed = used.toLocaleString();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span className="text-sm text-gray-600">{label}</span>
        </div>
        <span className="text-sm font-medium text-gray-900">
          {formattedUsed} / {formattedLimit === 'Unlimited' ? '∞' : formattedLimit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: limit === -1 ? '100%' : `${Math.min(percentage, 100)}%`,
            backgroundColor: limit === -1 ? '#22c55e' : statusColor
          }}
        />
      </div>
      {limit !== -1 && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs" style={{ color: statusColor }}>
            {percentage}% used
          </span>
          {percentage >= 90 && (
            <span className="text-xs text-red-600 font-medium">
              Limit nearly reached
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UsageIndicator;
