/**
 * FeatureRoute Component
 * Protects routes based on feature availability
 * Redirects to upgrade page if feature is disabled
 * Part of Fase 3: Dynamic Routing for Freemium Model
 */

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useFeature } from '../hooks/useFeature';
import type { FeatureName } from '../config/features';

interface FeatureRouteProps {
  /**
   * The feature required to access this route
   */
  feature: FeatureName;

  /**
   * Optional redirect path if feature is disabled
   * @default '/upgrade'
   */
  redirectTo?: string;

  /**
   * Optional fallback element to show instead of redirecting
   */
  fallback?: React.ReactElement;
}

/**
 * FeatureRoute component
 *
 * Wraps routes that require a specific feature to be enabled.
 * If the feature is disabled, either redirects or shows a fallback.
 *
 * @example
 * // In App.tsx routes:
 * <Route element={<FeatureRoute feature="banking" />}>
 *   <Route path="/finance/bank" element={<BankAccountPage />} />
 * </Route>
 *
 * @example
 * // With custom redirect:
 * <Route element={<FeatureRoute feature="voting" redirectTo="/pricing" />}>
 *   <Route path="/association/voting" element={<ProposalsPage />} />
 * </Route>
 *
 * @example
 * // With custom fallback:
 * <Route element={<FeatureRoute feature="accounting" fallback={<PricingPage />} />}>
 *   <Route path="/finance/accounting" element={<AccountingPage />} />
 * </Route>
 */
export const FeatureRoute: React.FC<FeatureRouteProps> = ({
  feature,
  redirectTo = '/upgrade',
  fallback
}) => {
  const isEnabled = useFeature(feature);

  if (!isEnabled) {
    if (fallback) {
      return fallback;
    }

    return <Navigate to={redirectTo} replace />;
  }

  // Feature is enabled, render nested routes
  return <Outlet />;
};

/**
 * Upgrade/Pricing page component
 * Shown when user tries to access a disabled feature
 */
export const UpgradePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
            <svg
              className="h-8 w-8 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Premium Functie
          </h2>

          <p className="text-lg text-gray-600 mb-8">
            Deze functie is alleen beschikbaar met een premium abonnement.
            Upgrade vandaag om toegang te krijgen tot alle functies van VvE Control.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-start text-left">
              <svg className="h-6 w-6 text-green-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">Bankkoppelingen</h3>
                <p className="text-sm text-gray-600">Automatische transactie-synchronisatie via PSD2</p>
              </div>
            </div>

            <div className="flex items-start text-left">
              <svg className="h-6 w-6 text-green-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">Digitale Stemmingen</h3>
                <p className="text-sm text-gray-600">Eenvoudig online vergaderen en stemmen</p>
              </div>
            </div>

            <div className="flex items-start text-left">
              <svg className="h-6 w-6 text-green-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">Boekhouding</h3>
                <p className="text-sm text-gray-600">Professionele financiële administratie</p>
              </div>
            </div>

            <div className="flex items-start text-left">
              <svg className="h-6 w-6 text-green-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">Onderhoudsbeheer</h3>
                <p className="text-sm text-gray-600">Track reparaties en onderhoudstaken</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Terug
            </button>
            <button
              onClick={() => window.location.href = '/pricing'}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Bekijk Prijzen
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Vragen? Neem contact op met ons support team.
          </p>
        </div>
      </div>
    </div>
  );
};
