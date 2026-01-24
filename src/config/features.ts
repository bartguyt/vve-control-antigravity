/**
 * Feature Configuration Layer
 * Defines all features in the system with their tiers, dependencies, and routes
 * Part of Fase 1: Feature Flag Infrastructure for Freemium Model
 */

export type FeatureName =
  | 'members'
  | 'contributions'
  | 'banking'
  | 'accounting'
  | 'voting'
  | 'tasks'
  | 'assignments'
  | 'suppliers'
  | 'documents'
  | 'agenda';

export type SubscriptionTier = 'base' | 'premium' | 'enterprise';

export interface FeatureConfig {
  name: FeatureName;
  displayName: string;
  tier: SubscriptionTier;
  dependencies: FeatureName[];
  routes: string[];
  description?: string;
}

/**
 * Complete feature registry with tier assignments
 *
 * Tier Structure:
 * - base: Free tier (Members + Contributions)
 * - premium: Paid tier (Banking + Accounting + Voting + Tasks)
 * - enterprise: Advanced tier (All features)
 */
export const FEATURE_REGISTRY: Record<FeatureName, FeatureConfig> = {
  // BASE TIER - Always available
  members: {
    name: 'members',
    displayName: 'Ledenbeheer',
    tier: 'base',
    dependencies: [],
    routes: ['/association/members'],
    description: 'Beheer van leden en appartementsrechten'
  },

  contributions: {
    name: 'contributions',
    displayName: 'Ledenbijdragen',
    tier: 'base',
    dependencies: ['members'],
    routes: ['/finance/contributions'],
    description: 'Beheer van ledenbijdragen en servicekosten'
  },

  documents: {
    name: 'documents',
    displayName: 'Documenten',
    tier: 'base',
    dependencies: [],
    routes: ['/documents'],
    description: 'Document management en opslag'
  },

  agenda: {
    name: 'agenda',
    displayName: 'Agenda',
    tier: 'base',
    dependencies: [],
    routes: ['/association/agenda'],
    description: 'Evenementen en activiteiten planning'
  },

  // PREMIUM TIER - Requires payment
  banking: {
    name: 'banking',
    displayName: 'Bankkoppelingen',
    tier: 'premium',
    dependencies: ['members', 'contributions'],
    routes: ['/finance/bank', '/system/connections/bank', '/finance/enable-banking-dev'],
    description: 'PSD2 bankkoppelingen en transactie-synchronisatie'
  },

  accounting: {
    name: 'accounting',
    displayName: 'Boekhouding',
    tier: 'premium',
    dependencies: ['members'],
    routes: ['/finance/accounting'],
    description: 'Grootboek en journaalposten'
  },

  voting: {
    name: 'voting',
    displayName: 'Stemmingen',
    tier: 'premium',
    dependencies: ['members'],
    routes: ['/association/voting'],
    description: 'Vergaderingen en stemmingen beheer'
  },

  tasks: {
    name: 'tasks',
    displayName: 'Onderhoud & Taken',
    tier: 'premium',
    dependencies: ['members'],
    routes: ['/association/tasks'],
    description: 'Onderhouds- en reparatietaken tracking'
  },

  // ENTERPRISE TIER - Optional add-ons
  assignments: {
    name: 'assignments',
    displayName: 'Opdrachten',
    tier: 'enterprise',
    dependencies: ['members', 'suppliers'],
    routes: ['/assignments'],
    description: 'Werkorders en opdrachten beheer'
  },

  suppliers: {
    name: 'suppliers',
    displayName: 'Leveranciers',
    tier: 'enterprise',
    dependencies: [],
    routes: ['/suppliers'],
    description: 'Leveranciersbeheer en contacten'
  }
};

/**
 * Get feature configuration by name
 */
export function getFeatureConfig(featureName: FeatureName): FeatureConfig | null {
  return FEATURE_REGISTRY[featureName] || null;
}

/**
 * Get all features for a specific tier (including lower tiers)
 */
export function getFeaturesForTier(tier: SubscriptionTier): FeatureName[] {
  const tierHierarchy: Record<SubscriptionTier, SubscriptionTier[]> = {
    base: ['base'],
    premium: ['base', 'premium'],
    enterprise: ['base', 'premium', 'enterprise']
  };

  const allowedTiers = tierHierarchy[tier];

  return Object.values(FEATURE_REGISTRY)
    .filter(feature => allowedTiers.includes(feature.tier))
    .map(feature => feature.name);
}

/**
 * Get the feature that owns a specific route
 * Used for route protection and navigation filtering
 */
export function getFeatureForRoute(path: string): FeatureName | null {
  for (const [name, config] of Object.entries(FEATURE_REGISTRY)) {
    // Check if path starts with any of the feature's routes
    if (config.routes.some(route => path.startsWith(route))) {
      return name as FeatureName;
    }
  }
  return null;
}

/**
 * Check if all dependencies for a feature are met
 */
export function areDependenciesMet(
  featureName: FeatureName,
  enabledFeatures: Record<FeatureName, boolean>
): boolean {
  const config = FEATURE_REGISTRY[featureName];
  if (!config) return false;

  // Check if all dependencies are enabled
  return config.dependencies.every(dep => enabledFeatures[dep] === true);
}

/**
 * Get features grouped by tier for display purposes
 */
export function getFeaturesByTier(): Record<SubscriptionTier, FeatureConfig[]> {
  const result: Record<SubscriptionTier, FeatureConfig[]> = {
    base: [],
    premium: [],
    enterprise: []
  };

  for (const feature of Object.values(FEATURE_REGISTRY)) {
    result[feature.tier].push(feature);
  }

  return result;
}

/**
 * Validate a feature flags object
 * Ensures all required keys are present and dependencies are satisfied
 */
export function validateFeatureFlags(
  flags: Record<string, boolean>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all features are present
  const allFeatures = Object.keys(FEATURE_REGISTRY) as FeatureName[];
  for (const feature of allFeatures) {
    if (!(feature in flags)) {
      errors.push(`Missing feature flag: ${feature}`);
    }
  }

  // Check dependencies
  for (const feature of allFeatures) {
    if (flags[feature]) {
      const config = FEATURE_REGISTRY[feature];
      for (const dep of config.dependencies) {
        if (!flags[dep]) {
          errors.push(`Feature "${feature}" requires "${dep}" to be enabled`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get default feature flags for a subscription tier
 */
export function getDefaultFeatureFlags(tier: SubscriptionTier): Record<FeatureName, boolean> {
  const enabledFeatures = getFeaturesForTier(tier);
  const result = {} as Record<FeatureName, boolean>;

  for (const feature of Object.keys(FEATURE_REGISTRY) as FeatureName[]) {
    result[feature] = enabledFeatures.includes(feature);
  }

  return result;
}
