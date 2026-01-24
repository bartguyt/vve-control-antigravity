/**
 * FeatureGate Component
 * Conditionally renders children based on feature availability
 * Part of Fase 1: Feature Flag Infrastructure for Freemium Model
 */

import React, { ReactNode } from 'react';
import { useFeature, useAllFeaturesEnabled } from '../hooks/useFeature';
import { FeatureName } from '../config/features';
import { Card, Title, Text, Button } from '@tremor/react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface FeatureGateProps {
  /**
   * The feature(s) required to show the children
   * Can be a single feature or array of features (all must be enabled)
   */
  feature: FeatureName | FeatureName[];

  /**
   * Content to show when feature is enabled
   */
  children: ReactNode;

  /**
   * Optional fallback content when feature is disabled
   * If not provided, shows default upgrade prompt
   */
  fallback?: ReactNode;

  /**
   * Whether to show a default upgrade prompt when disabled
   * @default true
   */
  showUpgradePrompt?: boolean;
}

/**
 * Default upgrade prompt shown when a feature is disabled
 */
const DefaultUpgradePrompt: React.FC<{ featureName: string }> = ({ featureName }) => {
  return (
    <Card className="mt-6">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <LockClosedIcon className="h-8 w-8 text-gray-400" />
        </div>
        <Title className="text-gray-700 mb-2">Premium Functie</Title>
        <Text className="text-gray-500 mb-4 max-w-md">
          De functie "{featureName}" is niet beschikbaar in je huidige abonnement.
          Upgrade naar een premium abonnement om toegang te krijgen.
        </Text>
        <Button
          onClick={() => (window.location.href = '/upgrade')}
          color="indigo"
        >
          Upgrade naar Premium
        </Button>
      </div>
    </Card>
  );
};

/**
 * FeatureGate component
 *
 * Usage examples:
 *
 * // Single feature
 * <FeatureGate feature="banking">
 *   <BankingDashboard />
 * </FeatureGate>
 *
 * // Multiple features (all required)
 * <FeatureGate feature={['banking', 'accounting']}>
 *   <FinancialReport />
 * </FeatureGate>
 *
 * // Custom fallback
 * <FeatureGate feature="voting" fallback={<div>Voting uitgeschakeld</div>}>
 *   <VotingPanel />
 * </FeatureGate>
 *
 * // No upgrade prompt
 * <FeatureGate feature="banking" showUpgradePrompt={false}>
 *   <BankingWidget />
 * </FeatureGate>
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true
}) => {
  // Handle single feature
  const isSingleFeature = typeof feature === 'string';
  const singleFeatureEnabled = useFeature(isSingleFeature ? feature : feature[0]);

  // Handle multiple features
  const multipleFeatures = Array.isArray(feature) ? feature : [feature];
  const allFeaturesEnabled = useAllFeaturesEnabled(multipleFeatures);

  const isEnabled = isSingleFeature ? singleFeatureEnabled : allFeaturesEnabled;

  if (isEnabled) {
    return <>{children}</>;
  }

  // Feature is disabled - show fallback or upgrade prompt
  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    const featureDisplayName = Array.isArray(feature) ? feature.join(', ') : feature;
    return <DefaultUpgradePrompt featureName={featureDisplayName} />;
  }

  // Don't show anything
  return null;
};

/**
 * Inline feature gate for smaller UI elements
 * Returns null if feature is disabled (no upgrade prompt)
 *
 * @example
 * <InlineFeatureGate feature="banking">
 *   <BankingButton />
 * </InlineFeatureGate>
 */
export const InlineFeatureGate: React.FC<Omit<FeatureGateProps, 'showUpgradePrompt'>> = ({
  feature,
  children,
  fallback
}) => {
  return (
    <FeatureGate feature={feature} fallback={fallback} showUpgradePrompt={false}>
      {children}
    </FeatureGate>
  );
};
