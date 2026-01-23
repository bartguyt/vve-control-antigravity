import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Badge, TextInput, Select, SelectItem } from '@tremor/react';
import { BuildingLibraryIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { associationService } from '../../lib/association';

interface BankOption {
    name: string;
    country: string;
    logo?: string;
}

interface AccountOption {
    uid: string;
    name: string;
    iban?: string;
    currency?: string;
    dbId?: string;
}

interface Props {
    onComplete: () => void;
}

export const BankConnectionWizard: React.FC<Props> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [logs, setLogs] = useState<string[]>([]);

    // Step 1: Bank Selection
    const [availableBanks, setAvailableBanks] = useState<BankOption[]>([]);
    const [selectedBank, setSelectedBank] = useState<string>(''); // 'country:name' format
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [debugCountryCode, setDebugCountryCode] = useState<string>('NL'); // Debug: allow changing country code

    // Step 2: Authentication (redirect happens)
    const [authenticating, setAuthenticating] = useState(false);

    // Step 3: Account Selection
    const [availableAccounts, setAvailableAccounts] = useState<AccountOption[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
    const [savingAccounts, setSavingAccounts] = useState(false);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    // Load banks on mount and check for OAuth callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            // OAuth callback detected - skip to handling it
            addLog('🔐 OAuth callback detected on mount');
            setCurrentStep(2); // Set to step 2 (authenticating) temporarily
            handleOAuthCallback();
        } else {
            // Normal flow - load banks
            fetchAvailableBanks();
        }
    }, []);

    const fetchAvailableBanks = async (countryCode?: string) => {
        const country = countryCode || debugCountryCode;
        setLoadingBanks(true);
        addLog(`Fetching banks for country: ${country}...`);

        try {
            const requestBody = {
                action: 'get_aspsps',
                country: country // Pass country code to Edge Function
            };

            addLog(`📤 Request: ${JSON.stringify(requestBody)}`);

            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: requestBody
            });

            addLog(`📥 Response: ${JSON.stringify(data)?.substring(0, 500)}...`);

            if (error) {
                addLog(`❌ Supabase Error: ${JSON.stringify(error)}`);
                throw error;
            }

            if (data?.error) {
                if (data.debug) {
                    addLog(`❌ Error: ${data.error}`);
                    addLog(`📋 Debug Info:`);
                    addLog(`  APP_ID: ${data.debug.app_id}`);
                    addLog(`  KEY_ID: ${data.debug.key_id}`);
                    addLog(`  URL: ${data.debug.url}`);
                    addLog(`  STATUS: ${data.debug.status}`);
                }
                throw new Error(data.error);
            }

            const aspsps = data.aspsps || [];
            addLog(`✅ Found ${aspsps.length} banks`);

            if (aspsps.length > 0) {
                addLog(`📋 Banks: ${aspsps.map((a: any) => `${a.name} (${a.country})`).join(', ')}`);
            }

            const banks: BankOption[] = aspsps.map((aspsp: any) => ({
                name: aspsp.name,
                country: aspsp.country,
                logo: aspsp.logo
            }));

            setAvailableBanks(banks);

            // Auto-select Mock bank if available (search by name containing "Mock")
            const mockBank = banks.find(b => b.name.toLowerCase().includes('mock'));
            if (mockBank) {
                setSelectedBank(`${mockBank.country}:${mockBank.name}`);
                addLog(`ℹ️ Mock bank auto-selected: ${mockBank.name}`);
            } else if (banks.length > 0) {
                // Auto-select first bank if no mock
                setSelectedBank(`${banks[0].country}:${banks[0].name}`);
                addLog(`ℹ️ First bank auto-selected: ${banks[0].name}`);
            }
        } catch (err: any) {
            console.error(err);
            addLog(`❌ Error loading banks: ${err.message}`);
            addLog(`📋 Full error: ${JSON.stringify(err)}`);
        } finally {
            setLoadingBanks(false);
        }
    };

    const handleOAuthCallback = async () => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (!code) return;

        // Check if already processed
        const processedCode = sessionStorage.getItem('eb_processed_code');
        if (processedCode === code) {
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        addLog("🔐 OAuth code detected, activating session...");
        sessionStorage.setItem('eb_processed_code', code);

        try {
            const storedSessionId = sessionStorage.getItem('eb_session_id');
            if (!storedSessionId) {
                addLog("⚠️ No session ID found!");
                return;
            }

            const associationId = await associationService.getCurrentAssociationId();

            addLog(`📤 Activate Session Request: code=${code.substring(0, 20)}..., session_id=${storedSessionId}`);

            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: {
                    action: 'activate_session',
                    code,
                    session_id: storedSessionId,
                    association_id: associationId
                }
            });

            addLog(`📥 Activate Session Response: ${JSON.stringify(data)?.substring(0, 500)}...`);

            if (error) {
                addLog(`❌ Supabase Error: ${JSON.stringify(error)}`);
                throw error;
            }

            if (data?.error) {
                addLog(`❌ Error from Edge Function: ${data.error}`);
                throw new Error(data.error);
            }

            const accounts = data.accounts || [];
            addLog(`✅ Session activated! Found ${accounts.length} accounts`);

            const accountsForUI = accounts.map((acc: any) => ({
                uid: acc.uid || acc,
                name: acc.name || acc.account_id?.iban || acc.product || 'Account',
                iban: acc.account_id?.iban || null,
                currency: acc.currency || 'EUR'
            }));

            setAvailableAccounts(accountsForUI);
            setCurrentStep(3); // Go to account selection
            window.history.replaceState({}, '', window.location.pathname);
        } catch (err: any) {
            console.error(err);
            addLog(`❌ Error: ${err.message}`);
        }
    };

    const handleStartAuth = async () => {
        if (!selectedBank) {
            addLog("⚠️ Please select a bank first");
            return;
        }

        const [country, name] = selectedBank.split(':');
        addLog(`Starting authentication with ${name} (${country})...`);
        setAuthenticating(true);

        try {
            const associationId = await associationService.getCurrentAssociationId();

            const requestBody = {
                action: 'init_auth',
                aspsp_name: name,
                aspsp_country: country,
                association_id: associationId
            };

            addLog(`📤 Init Auth Request: ${JSON.stringify(requestBody)}`);

            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: requestBody
            });

            addLog(`📥 Init Auth Response: ${JSON.stringify(data)}`);

            if (error) {
                addLog(`❌ Supabase Error: ${JSON.stringify(error)}`);
                throw error;
            }

            if (data?.error) {
                addLog(`❌ Edge Function Error: ${data.error}`);
                if (data.debug) {
                    addLog(`📋 Debug Info: ${JSON.stringify(data.debug)}`);
                }
                throw new Error(data.error);
            }

            // Enable Banking returns 'url' and 'authorization_id', not 'auth_url' and 'session_id'
            const { url: auth_url, authorization_id: session_id } = data;

            if (!auth_url) {
                addLog(`❌ No url in response!`);
                addLog(`📋 Available fields: ${Object.keys(data).join(', ')}`);
                throw new Error('No url received from Enable Banking');
            }

            if (!session_id) {
                addLog(`❌ No authorization_id in response!`);
                addLog(`📋 Available fields: ${Object.keys(data).join(', ')}`);
                throw new Error('No authorization_id received from Enable Banking');
            }

            addLog(`✅ Auth URL received: ${auth_url.substring(0, 80)}...`);
            addLog(`📋 Authorization ID: ${session_id}`);

            // Store authorization ID (used as session_id in our flow)
            sessionStorage.setItem('eb_session_id', session_id);

            // Redirect to Enable Banking
            addLog(`🔀 Redirecting to Enable Banking in 500ms...`);
            setTimeout(() => {
                window.location.href = auth_url;
            }, 500); // Small delay to ensure log is visible
        } catch (err: any) {
            console.error('handleStartAuth error:', err);
            addLog(`❌ Error: ${err.message}`);
            addLog(`📋 Full error: ${JSON.stringify(err)}`);
            setAuthenticating(false);
        }
    };

    const handleSaveAccounts = async () => {
        if (selectedAccounts.size === 0) {
            addLog("⚠️ Please select at least one account");
            return;
        }

        setSavingAccounts(true);
        addLog(`Saving ${selectedAccounts.size} account(s) to database...`);

        try {
            const associationId = await associationService.getCurrentAssociationId();

            // For each selected account, sync it (which will save it to DB)
            for (const uid of Array.from(selectedAccounts)) {
                addLog(`Syncing account: ${uid}`);

                const { data, error } = await supabase.functions.invoke('enable-banking', {
                    body: {
                        action: 'sync_transactions',
                        account_uid: uid,
                        association_id: associationId
                    }
                });

                if (error) throw error;
                if (data?.error) throw new Error(data.error);

                addLog(`✅ Account ${uid} synced successfully`);
            }

            addLog(`🎉 All accounts saved!`);

            // Clear session storage
            sessionStorage.removeItem('eb_session_id');
            sessionStorage.removeItem('eb_processed_code');

            // Notify parent
            onComplete();
        } catch (err: any) {
            console.error(err);
            addLog(`❌ Error: ${err.message}`);
        } finally {
            setSavingAccounts(false);
        }
    };

    const toggleAccountSelection = (uid: string) => {
        setSelectedAccounts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uid)) {
                newSet.delete(uid);
            } else {
                newSet.add(uid);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-slate-blue' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        currentStep >= 1 ? 'border-slate-blue bg-slate-blue text-white' : 'border-gray-300 text-gray-400'
                    }`}>
                        {currentStep > 1 ? <CheckCircleIcon className="h-5 w-5" /> : '1'}
                    </div>
                    <Text className="font-medium">Bank Selecteren</Text>
                </div>

                <div className={`h-0.5 w-16 ${currentStep >= 2 ? 'bg-slate-blue' : 'bg-gray-300'}`} />

                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-slate-blue' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        currentStep >= 2 ? 'border-slate-blue bg-slate-blue text-white' : 'border-gray-300 text-gray-400'
                    }`}>
                        {currentStep > 2 ? <CheckCircleIcon className="h-5 w-5" /> : '2'}
                    </div>
                    <Text className="font-medium">Authenticeren</Text>
                </div>

                <div className={`h-0.5 w-16 ${currentStep >= 3 ? 'bg-slate-blue' : 'bg-gray-300'}`} />

                <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-slate-blue' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        currentStep >= 3 ? 'border-slate-blue bg-slate-blue text-white' : 'border-gray-300 text-gray-400'
                    }`}>
                        3
                    </div>
                    <Text className="font-medium">Rekeningen Selecteren</Text>
                </div>
            </div>

            {/* Step Content */}
            <Card>
                {currentStep === 1 && (
                    <>
                        <Title className="mb-4">Stap 1: Selecteer een Bank</Title>
                        <Text className="mb-6">Kies de bank waarmee u wilt koppelen</Text>

                        {loadingBanks ? (
                            <div className="text-center py-8">
                                <Text>Banken laden...</Text>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                    {availableBanks.map(bank => {
                                        const key = `${bank.country}:${bank.name}`;
                                        const isSelected = selectedBank === key;
                                        const isMock = bank.country === 'XS';

                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedBank(key)}
                                                className={`p-4 rounded-lg border-2 transition-all text-left ${
                                                    isSelected
                                                        ? 'border-slate-blue bg-blue-50 ring-2 ring-slate-blue ring-offset-2'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <BuildingLibraryIcon className="h-6 w-6 text-gray-600 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Text className="font-medium text-gray-900 truncate">{bank.name}</Text>
                                                            {isMock && (
                                                                <Badge color="green" size="xs">Mock</Badge>
                                                            )}
                                                        </div>
                                                        <Text className="text-xs text-gray-500">{bank.country}</Text>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        onClick={() => setCurrentStep(2)}
                                        disabled={!selectedBank}
                                        className="bg-slate-blue hover:bg-slate-700"
                                    >
                                        Volgende
                                    </Button>
                                </div>
                            </>
                        )}
                    </>
                )}

                {currentStep === 2 && (
                    <>
                        <Title className="mb-4">Stap 2: Authenticatie</Title>
                        <Text className="mb-6">
                            U wordt doorgestuurd naar {selectedBank.split(':')[1]} om in te loggen
                        </Text>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <Text className="text-sm text-blue-900">
                                Na het inloggen wordt u teruggeleid naar deze pagina om uw bankrekeningen te selecteren.
                            </Text>
                        </div>

                        <div className="flex justify-between">
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentStep(1)}
                                disabled={authenticating}
                            >
                                Terug
                            </Button>
                            <Button
                                onClick={handleStartAuth}
                                loading={authenticating}
                                className="bg-slate-blue hover:bg-slate-700"
                            >
                                Start Authenticatie
                            </Button>
                        </div>
                    </>
                )}

                {currentStep === 3 && (
                    <>
                        <Title className="mb-4">Stap 3: Selecteer Bankrekeningen</Title>
                        <Text className="mb-6">Kies welke rekeningen u wilt toevoegen aan de vereniging</Text>

                        <div className="space-y-3 mb-6">
                            {availableAccounts.map(account => {
                                const isSelected = selectedAccounts.has(account.uid);

                                return (
                                    <button
                                        key={account.uid}
                                        onClick={() => toggleAccountSelection(account.uid)}
                                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                            isSelected
                                                ? 'border-slate-blue bg-blue-50 ring-2 ring-slate-blue ring-offset-2'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Text className="font-medium text-gray-900">{account.name}</Text>
                                                {account.iban && (
                                                    <Text className="text-sm font-mono text-gray-500">{account.iban}</Text>
                                                )}
                                                <Text className="text-xs text-gray-400">{account.currency}</Text>
                                            </div>
                                            {isSelected && (
                                                <CheckCircleIcon className="h-6 w-6 text-slate-blue" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={handleSaveAccounts}
                                disabled={selectedAccounts.size === 0}
                                loading={savingAccounts}
                                className="bg-slate-blue hover:bg-slate-700"
                            >
                                Rekeningen Toevoegen ({selectedAccounts.size})
                            </Button>
                        </div>
                    </>
                )}
            </Card>

            {/* Debug Panel */}
            <Card className="bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                    <Title className="text-sm">Debug Controls & Log</Title>
                    <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setLogs([])}
                    >
                        Clear Log
                    </Button>
                </div>

                {/* Debug Controls */}
                <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <Text className="text-xs font-medium text-gray-700 mb-2">Country Code (Sandbox)</Text>
                    <div className="flex gap-2">
                        <Select
                            value={debugCountryCode}
                            onValueChange={(val) => {
                                setDebugCountryCode(val);
                                addLog(`🔧 Country code changed to: ${val}`);
                            }}
                            className="w-32"
                        >
                            <SelectItem value="NL">NL (Dutch + Mock)</SelectItem>
                            <SelectItem value="XS">XS (Mock Only)</SelectItem>
                            <SelectItem value="BE">BE (Belgian)</SelectItem>
                            <SelectItem value="DE">DE (German)</SelectItem>
                            <SelectItem value="GB">GB (UK)</SelectItem>
                        </Select>
                        <Button
                            size="xs"
                            icon={ArrowPathIcon}
                            onClick={() => fetchAvailableBanks(debugCountryCode)}
                            loading={loadingBanks}
                        >
                            Reload Banks
                        </Button>
                    </div>
                    <Text className="text-xs text-gray-500 mt-2">
                        <strong>NL</strong> = Dutch banks + Mock ASPSP (recommended) • <strong>BE/DE/GB</strong> = Other country sandboxes
                    </Text>
                </div>

                {/* Debug Log */}
                <div className="bg-black text-green-400 p-4 rounded-md font-mono text-xs max-h-60 overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="text-gray-500">No logs yet...</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
};
