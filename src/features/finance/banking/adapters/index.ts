/**
 * Banking Module Adapters
 *
 * Adapters implement the ports (interfaces) and handle external integrations:
 * - Primary Adapters (Providers): Connect to external banking APIs
 * - Secondary Adapters (Repositories): Handle data persistence
 */

export * from './EnableBankingAdapter';
export * from './MockBankingAdapter';
export * from './SupabaseRepository';
