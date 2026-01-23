/**
 * Banking Module Ports
 *
 * Ports are the interfaces that define the boundaries of the hexagonal architecture:
 * - Primary Ports (IBankingProvider): Driven by the application, implemented by adapters
 * - Secondary Ports (IBankingRepository): Drive external systems, implemented by infrastructure
 */

export * from './IBankingProvider';
export * from './IBankingRepository';
