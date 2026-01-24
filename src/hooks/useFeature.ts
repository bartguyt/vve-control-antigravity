/**
 * Feature Flag Hooks
 * Convenient hooks for checking feature availability
 * Part of Fase 1: Feature Flag Infrastructure for Freemium Model
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatureContext } from '../contexts/FeatureContext';
import { FeatureName } from '../config/features';

/**
 * Check if a specific feature is enabled
 *
 * @example
 * const isBankingEnabled = useFeature('banking');
 * if (isBankingEnabled) {
 *   // Show banking UI
 * }
 */
export function useFeature(featureName: FeatureName): boolean {
  const { isFeatureEnabled } = useFeatureContext();
  return isFeatureEnabled(featureName);
}

/**
 * Require a feature to be enabled, redirect to upgrade page if not
 * Use this in components that absolutely need a feature to be available
 *
 * @example
 * function BankingPage() {
 *   useRequireFeature('banking'); // Redirects if banking is disabled
 *   return <div>Banking content</div>;
 * }
 *
 * @param featureName - The feature that is required
 * @param redirectTo - Where to redirect if feature is disabled (default: /upgrade)
 */
export function useRequireFeature(
  featureName: FeatureName,
  redirectTo: string = '/upgrade'
): void {
  const enabled = useFeature(featureName);
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) {
      console.warn(`Feature "${featureName}" is not enabled, redirecting to ${redirectTo}`);
      navigate(redirectTo, { replace: true });
    }
  }, [enabled, featureName, navigate, redirectTo]);
}

/**
 * Get multiple feature statuses at once
 *
 * @example
 * const { banking, voting } = useFeatures(['banking', 'voting']);
 * if (banking && voting) {
 *   // Both features are enabled
 * }
 */
export function useFeatures(
  featureNames: FeatureName[]
): Record<string, boolean> {
  const { isFeatureEnabled } = useFeatureContext();

  const result: Record<string, boolean> = {};
  for (const feature of featureNames) {
    result[feature] = isFeatureEnabled(feature);
  }

  return result;
}

/**
 * Check if ALL of the specified features are enabled
 *
 * @example
 * const hasAllFeatures = useAllFeaturesEnabled(['banking', 'accounting']);
 */
export function useAllFeaturesEnabled(featureNames: FeatureName[]): boolean {
  const { isFeatureEnabled } = useFeatureContext();
  return featureNames.every(feature => isFeatureEnabled(feature));
}

/**
 * Check if ANY of the specified features are enabled
 *
 * @example
 * const hasAnyFinanceFeature = useAnyFeatureEnabled(['banking', 'accounting']);
 */
export function useAnyFeatureEnabled(featureNames: FeatureName[]): boolean {
  const { isFeatureEnabled } = useFeatureContext();
  return featureNames.some(feature => isFeatureEnabled(feature));
}

/**
 * Get the current subscription tier
 *
 * @example
 * const tier = useSubscriptionTier();
 * if (tier === 'base') {
 *   // Show upgrade prompt
 * }
 */
export function useSubscriptionTier() {
  const { tier } = useFeatureContext();
  return tier;
}

/**
 * Check if a route can be accessed based on feature flags
 *
 * @example
 * const canAccessBanking = useCanAccessRoute('/finance/bank');
 */
export function useCanAccessRoute(path: string): boolean {
  const { canAccessRoute } = useFeatureContext();
  return canAccessRoute(path);
}

/**
 * Get all feature flags and loading state
 * Useful for admin pages that need to display/modify all features
 *
 * @example
 * const { features, loading, error, reload } = useAllFeatures();
 */
export function useAllFeatures() {
  const { features, loading, error, reload } = useFeatureContext();
  return { features, loading, error, reload };
}
