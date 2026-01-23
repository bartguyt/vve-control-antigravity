/**
 * Banking Module - Main Entry Point
 *
 * This module provides a hexagonal architecture for banking operations:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                         APPLICATION                             │
 * │                    (useBanking hook, UI)                        │
 * └─────────────────────────────────────────────────────────────────┘
 *                               │
 *                               ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                          CORE                                   │
 * │              BankingCore (business logic)                       │
 * └─────────────────────────────────────────────────────────────────┘
 *                               │
 *          ┌────────────────────┼────────────────────┐
 *          ▼                    ▼                    ▼
 * ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
 * │  IBankingProvider │  │IBankingRepository│  │  Other Ports...    │
 * └─────────────────┘  └─────────────────┘  └─────────────────────┘
 *          │                    │
 *          ▼                    ▼
 * ┌─────────────────┐  ┌─────────────────┐
 * │EnableBanking    │  │Supabase         │
 * │MockBanking      │  │Repository       │
 * └─────────────────┘  └─────────────────┘
 *
 * Usage:
 * ```typescript
 * import { createBankingModule } from './banking';
 *
 * const banking = createBankingModule(supabase, {
 *   enableMock: import.meta.env.DEV,
 * });
 *
 * // Get available banks
 * const banks = await banking.getAvailableBanks('enable_banking', 'NL');
 *
 * // Start connection flow
 * const { authUrl } = await banking.initiateConnection(
 *   'enable_banking',
 *   'Rabobank',
 *   window.location.href,
 *   associationId
 * );
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BankingCore, createBankingCore } from './core/BankingCore';
import { ProviderRegistry, getProviderRegistry } from './core/ProviderRegistry';
import { createSupabaseRepository } from './adapters/SupabaseRepository';
import { createEnableBankingAdapter } from './adapters/EnableBankingAdapter';
import { createMockBankingAdapter } from './adapters/MockBankingAdapter';

// Re-export types
export * from './types';
export * from './ports';
export * from './core';
export * from './adapters';

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

export interface BankingModuleConfig {
  /**
   * Enable mock banking provider (for development)
   * @default false
   */
  enableMock?: boolean;

  /**
   * Enable Enable Banking provider (for production)
   * @default true
   */
  enableEnableBanking?: boolean;

  /**
   * Default number of days to sync transactions back
   * @default 90
   */
  defaultSyncDaysBack?: number;

  /**
   * Enable auto-categorization of transactions
   * @default true
   */
  enableAutoCategorizaton?: boolean;
}

const DEFAULT_MODULE_CONFIG: Required<BankingModuleConfig> = {
  enableMock: false,
  enableEnableBanking: true,
  defaultSyncDaysBack: 90,
  enableAutoCategorizaton: true,
};

// ============================================================================
// MODULE FACTORY
// ============================================================================

/**
 * Create a fully configured banking module
 */
export function createBankingModule(
  supabase: SupabaseClient,
  config: BankingModuleConfig = {}
): BankingCore {
  const mergedConfig = { ...DEFAULT_MODULE_CONFIG, ...config };

  // Create provider registry
  const registry = new ProviderRegistry();

  // Register providers based on config
  if (mergedConfig.enableEnableBanking) {
    registry.register(createEnableBankingAdapter(supabase));
  }

  if (mergedConfig.enableMock) {
    registry.register(createMockBankingAdapter());
  }

  // Create repository
  const repository = createSupabaseRepository(supabase);

  // Create and return core
  return createBankingCore(registry, repository, {
    defaultSyncDaysBack: mergedConfig.defaultSyncDaysBack,
    enableAutoCategorizaton: mergedConfig.enableAutoCategorizaton,
  });
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let bankingInstance: BankingCore | null = null;

/**
 * Get or create the global banking module instance
 */
export function getBankingModule(
  supabase: SupabaseClient,
  config?: BankingModuleConfig
): BankingCore {
  if (!bankingInstance) {
    bankingInstance = createBankingModule(supabase, config);
  }
  return bankingInstance;
}

/**
 * Reset the global instance (for testing)
 */
export function resetBankingModule(): void {
  bankingInstance = null;
}
