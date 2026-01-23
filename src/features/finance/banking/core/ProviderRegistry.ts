/**
 * Provider Registry
 *
 * Simple registry for managing banking provider adapters.
 * Allows runtime registration and lookup of providers.
 */

import type { IBankingProvider, IProviderRegistry } from '../ports';

export class ProviderRegistry implements IProviderRegistry {
  private providers: Map<string, IBankingProvider> = new Map();

  /**
   * Register a provider adapter
   */
  register(provider: IBankingProvider): void {
    if (this.providers.has(provider.providerId)) {
      console.warn(
        `Provider "${provider.providerId}" is already registered, replacing...`
      );
    }
    this.providers.set(provider.providerId, provider);
  }

  /**
   * Get a provider by ID
   */
  get(providerId: string): IBankingProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAll(): IBankingProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a provider is registered
   */
  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Unregister a provider
   */
  unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
  }
}

/**
 * Singleton instance for global use
 */
let globalRegistry: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry();
  }
  return globalRegistry;
}

/**
 * Reset global registry (for testing)
 */
export function resetProviderRegistry(): void {
  globalRegistry = null;
}
