/**
 * Feature Context Provider
 * Manages feature flags state and provides access throughout the application
 * Part of Fase 1: Feature Flag Infrastructure for Freemium Model
 */

import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { associationService } from '../lib/association';
import type { FeatureName, SubscriptionTier } from '../config/features';
import {
  FEATURE_REGISTRY,
  getFeatureForRoute,
  getDefaultFeatureFlags
} from '../config/features';

interface FeatureContextValue {
  /**
   * Current subscription tier of the association
   */
  tier: SubscriptionTier;

  /**
   * Feature flags - which features are enabled
   */
  features: Record<FeatureName, boolean>;

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error state
   */
  error: string | null;

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled: (feature: FeatureName) => boolean;

  /**
   * Check if user can access a specific route
   */
  canAccessRoute: (path: string) => boolean;

  /**
   * Reload feature flags from database
   */
  reload: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextValue | undefined>(undefined);

interface FeatureProviderProps {
  children: ReactNode;
}

export const FeatureProvider: React.FC<FeatureProviderProps> = ({ children }) => {
  const [tier, setTier] = useState<SubscriptionTier>('premium');
  const [features, setFeatures] = useState<Record<FeatureName, boolean>>(
    getDefaultFeatureFlags('premium') // Default to all enabled during migration
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeatureFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current association ID
      const associationId = await associationService.getCurrentAssociationId();
      if (!associationId) {
        console.warn('No association ID found, using default premium features');
        setTier('premium');
        setFeatures(getDefaultFeatureFlags('premium'));
        return;
      }

      // Load association with feature flags
      const { data: association, error: fetchError } = await supabase
        .from('associations')
        .select('subscription_tier, feature_flags')
        .eq('id', associationId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading feature flags:', fetchError);
        setError(fetchError.message);
        // Fallback to premium with all features enabled
        setTier('premium');
        setFeatures(getDefaultFeatureFlags('premium'));
        return;
      }

      if (!association) {
        console.warn('Association not found, using default premium features');
        setTier('premium');
        setFeatures(getDefaultFeatureFlags('premium'));
        return;
      }

      // Set tier (default to premium for backwards compatibility)
      const associationTier = (association.subscription_tier || 'premium') as SubscriptionTier;
      setTier(associationTier);

      // Parse feature flags
      const featureFlags = association.feature_flags as Record<string, boolean> | null;

      if (featureFlags) {
        // Ensure all features are present with defaults
        const completeFlags: Record<FeatureName, boolean> = {} as Record<FeatureName, boolean>;

        for (const featureName of Object.keys(FEATURE_REGISTRY) as FeatureName[]) {
          completeFlags[featureName] = featureFlags[featureName] ?? true; // Default true for backwards compatibility
        }

        setFeatures(completeFlags);
      } else {
        // No feature flags in database, use tier-based defaults
        setFeatures(getDefaultFeatureFlags(associationTier));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading features';
      console.error('Error in loadFeatureFlags:', errorMessage);
      setError(errorMessage);

      // Fallback to safe defaults
      setTier('premium');
      setFeatures(getDefaultFeatureFlags('premium'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatureFlags();

    // Optional: Set up real-time subscription for feature flag changes
    // This allows instant updates when an admin changes features
    const associationId = associationService.getCurrentAssociationId();
    if (!associationId) return;

    const subscription = supabase
      .channel('feature-flags-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'associations',
          filter: `id=eq.${associationId}`
        },
        (payload) => {
          console.log('Feature flags updated:', payload);
          loadFeatureFlags();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadFeatureFlags]);

  const isFeatureEnabled = useCallback(
    (feature: FeatureName): boolean => {
      return features[feature] === true;
    },
    [features]
  );

  const canAccessRoute = useCallback(
    (path: string): boolean => {
      // Check if route belongs to a feature
      const feature = getFeatureForRoute(path);

      // If route is not feature-specific, allow access
      if (!feature) {
        return true;
      }

      // Check if feature is enabled
      return isFeatureEnabled(feature);
    },
    [isFeatureEnabled]
  );

  const value: FeatureContextValue = {
    tier,
    features,
    loading,
    error,
    isFeatureEnabled,
    canAccessRoute,
    reload: loadFeatureFlags
  };

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
};

/**
 * Hook to access feature context
 * Throws error if used outside of FeatureProvider
 */
export function useFeatureContext(): FeatureContextValue {
  const context = React.useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatureContext must be used within a FeatureProvider');
  }
  return context;
}

export { FeatureContext };
