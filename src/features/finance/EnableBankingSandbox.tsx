import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, TabGroup, TabList, Tab, TabPanels, TabPanel, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Select, SelectItem } from '@tremor/react';
import { BuildingLibraryIcon, CodeBracketIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { EnableBankingTransaction, EnableBankingAccount } from './enableBankingTypes';
import { supabase } from '../../lib/supabase';
import { associationService } from '../../lib/association';

export const EnableBankingSandbox: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    // State for real data (initially empty)
    const [account, setAccount] = useState<EnableBankingAccount | null>(null);
    const [transactions, setTransactions] = useState<EnableBankingTransaction[]>([]);

    // Bank selection state
    const [availableBanks, setAvailableBanks] = useState<{ name: string, country: string, logo?: string }[]>([]);
    const [selectedBank, setSelectedBank] = useState<string>('');
    const [loadingBanks, setLoadingBanks] = useState(false);

    // Account selection state (after auth)
    const [accountsList, setAccountsList] = useState<{ uid: string, name: string, iban?: string, currency?: string, dbId?: string, last_synced_at?: string }[]>([]);
    const [selectedAccountUid, setSelectedAccountUid] = useState<string>('');

    // Date range state for sync
    const [dateFrom, setDateFrom] = useState<string>('2024-01-01');
    const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

    // Handle Callback from Enable Banking
    useEffect(() => {
        console.log("EnableBankingSandbox Mounted. URL:", window.location.href);

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            // Check if we already processed this code (guard against StrictMode double-mount)
            const processedCode = sessionStorage.getItem('eb_processed_code');
            if (processedCode === code) {
                console.log("Code already processed, skipping...");
                // Clean URL anyway
                window.history.replaceState({}, '', window.location.pathname);
                return;
            }

            console.log("Auth Code detected:", code);
            // Mark as processing IMMEDIATELY
            sessionStorage.setItem('eb_processed_code', code);


            handleCallback(code);
        } else {
            console.log("No auth code in URL.");
            // Check if we have an active session in storage to restore
            const storedSessionId = sessionStorage.getItem('eb_session_id');
            if (storedSessionId) {
                console.log("Found stored session ID, restoring...", storedSessionId);
                restoreSession();
            } else {
                // Only if NO session, load persisted data
                loadPersistedData();
            }
        }
    }, []);

    // Restore active session from Enable Banking metadata (prevents stale DB data)
    const restoreSession = async () => {
        try {
            setStatus('connecting');
            addLog("Restoring active session...");

            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: { action: 'check_status' }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (data.connected && data.connection) {
                const accounts = data.connection.metadata?.accounts || [];
                console.log("Restored accounts from metadata:", accounts);

                // Map to UI format
                const accountsForUI = accounts.map((acc: any) => ({
                    uid: acc.uid || acc,
                    name: acc.name || acc.account_id?.iban || acc.product || 'Account',
                    iban: acc.account_id?.iban || null,
                    currency: acc.currency || 'EUR',
                    bicFi: acc.bic_fi || null,
                    // Note: We don't have DB ID yet if not synced, so dbId might be undefined
                    // Checks if it already exists in DB to get dbId/last_synced_at? 
                    // ideally we merge this with DB knowledge, but for now just showing Active Connection is priority.
                }));

                // Fetch DB info to merge (get last_synced_at if exists)
                const associationId = await associationService.getCurrentAssociationId();
                const { data: dbAccounts } = await supabase
                    .from('bank_accounts')
                    .select('external_account_uid, id, last_synced_at')
                    .eq('association_id', associationId)
                    .in('external_account_uid', accountsForUI.map((a: any) => a.uid));

                // Merge DB info into UI accounts  
                const mergedAccounts = accountsForUI.map((uiAcc: any) => {
                    const dbAcc = dbAccounts?.find(d => d.external_account_uid === uiAcc.uid);
                    return {
                        ...uiAcc,
                        dbId: dbAcc?.id,
                        last_synced_at: dbAcc?.last_synced_at
                    };
                });

                setAccountsList(mergedAccounts);
                addLog(`Restored session with ${mergedAccounts.length} accounts.`);

                if (mergedAccounts.length > 0) {
                    setSelectedAccountUid(mergedAccounts[0].uid);
                }
                setStatus('connected');
            } else {
                console.log("No active connection logic found during restore, falling back.");
                loadPersistedData();
            }
        } catch (e: any) {
            console.error("Failed to restore session:", e);
            addLog(`Restore Error: ${e.message}`);
            loadPersistedData();
        }
    };

    // Load persisted bank accounts from database
    const loadPersistedData = async () => {
        try {
            const associationId = await associationService.getCurrentAssociationId();

            // Load bank accounts for this association
            const { data: accounts, error: accError } = await supabase
                .from('bank_accounts')
                .select('*')
                .eq('association_id', associationId)
                .eq('is_active', true);

            if (accError) {
                console.error('Failed to load bank accounts:', accError);
                return;
            }

            if (accounts && accounts.length > 0) {
                addLog(`Loaded ${accounts.length} saved account(s) from database`);

                // Map to the accountsList format
                const mappedAccounts = accounts.map(acc => ({
                    uid: acc.external_account_uid,
                    name: acc.name,
                    iban: acc.iban,
                    currency: acc.currency,
                    dbId: acc.id, // Store database ID for transaction loading
                    last_synced_at: acc.last_synced_at // Include last sync timestamp
                }));
                setAccountsList(mappedAccounts);

                // Auto-select first account (useEffect will load transactions)
                if (mappedAccounts.length > 0) {
                    setSelectedAccountUid(mappedAccounts[0].uid);
                }

                setStatus('connected');
            }
        } catch (e) {
            console.error('Failed to load persisted data:', e);
        }
    };

    // Load transactions when account selection changes
    useEffect(() => {
        if (!selectedAccountUid || accountsList.length === 0) return;

        const loadTransactionsForAccount = async () => {
            try {
                const associationId = await associationService.getCurrentAssociationId();

                // Find the database ID for this account
                const { data: bankAccount, error: bankAccountError } = await supabase
                    .from('bank_accounts')
                    .select('id, name')
                    .eq('association_id', associationId)
                    .eq('external_account_uid', selectedAccountUid)
                    .maybeSingle();

                if (bankAccountError && bankAccountError.code !== 'PGRST116') {
                    console.error('Error finding bank account:', bankAccountError);
                    return;
                }

                if (!bankAccount) {
                    addLog(`Account ${selectedAccountUid} not found in DB yet (will be saved on first sync)`);
                    setTransactions([]);
                    // Also clear the display account if not found
                    setAccount(null);
                    return;
                }


                // Load transactions for this account
                const { data: txData, error } = await supabase
                    .from('bank_transactions')
                    .select('*')
                    .eq('bank_account_id', bankAccount.id)
                    .order('booking_date', { ascending: false });

                if (error) {
                    console.error('Failed to load transactions:', error);
                    return;
                }

                if (txData && txData.length > 0) {
                    addLog(`Loaded ${txData.length} transactions for ${bankAccount.name}`);
                    // Map database format to display format
                    const mappedTx = txData.map(tx => ({
                        entry_reference: tx.external_reference,
                        booking_date: tx.booking_date,
                        value_date: tx.value_date,
                        transaction_amount: { amount: String(tx.amount), currency: tx.currency },
                        credit_debit_indicator: tx.credit_debit,
                        creditor: tx.credit_debit === 'DBIT' ? { name: tx.counterparty_name } : null,
                        debtor: tx.credit_debit === 'CRDT' ? { name: tx.counterparty_name } : null,
                        remittance_information: tx.description ? [tx.description] : [],
                        status: tx.status
                    }));
                    setTransactions(mappedTx as any);

                    // Update account display info
                    const accInfo = accountsList.find(a => a.uid === selectedAccountUid);
                    if (accInfo) {
                        setAccount({ ...accInfo } as any);
                    }
                } else {
                    setTransactions([]);
                    addLog(`No saved transactions for ${bankAccount.name}`);
                }
            } catch (e) {
                console.error('Failed to load transactions for account:', e);
            }
        };



        // Auto-update date picker based on last sync
        const accInfo = accountsList.find(a => a.uid === selectedAccountUid);
        if (accInfo?.last_synced_at) {
            setDateFrom(new Date(accInfo.last_synced_at).toISOString().split('T')[0]);
        } else {
            setDateFrom('2024-01-01');
        }

        loadTransactionsForAccount();
    }, [selectedAccountUid, accountsList]);

    const handleCallback = async (code: string) => {
        // Prevent double execution if already processing
        if (status === 'connecting' || status === 'connected') return;

        setStatus('connecting');
        addLog(`Callback received! Processing code...`);
        console.log("Processing callback with code:", code);

        try {
            addLog("Invoking Edge Function to exchange code...");

            // Get the session ID we stored during init_auth
            const storedSessionId = sessionStorage.getItem('eb_session_id');
            if (storedSessionId) {
                addLog(`Using stored Session ID: ${storedSessionId}`);
            } else {
                addLog("WARNING: No stored Session ID found!");
            }

            // Get association_id for this connection
            const associationId = await associationService.getCurrentAssociationId();

            // Step 1: Exchange code for session and get accounts list (don't fetch transactions yet)
            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: {
                    action: 'activate_session',  // New action: just activates session, returns accounts
                    code,
                    session_id: storedSessionId,
                    association_id: associationId
                }
            });

            if (error) {
                console.error("Supabase Invoke Error:", error);
                throw error;
            }

            if (data?.error) {
                console.error("Function returned error:", data.error);
                throw new Error(data.error);
            }

            console.log("Session activated, accounts:", data);
            addLog(`Found ${data.accounts?.length || 0} accounts!`);

            // Store accounts for selection
            const accounts = data.accounts || [];
            setAccountsList(accounts);

            // Auto-select first account if only one
            if (accounts.length === 1) {
                setSelectedAccountUid(accounts[0].uid || accounts[0]);
            }

            setStatus('connected');

            // Clean URL (remove ?code=...)
            window.history.replaceState({}, '', window.location.pathname);

        } catch (e: any) {
            console.error("Callback Exception:", e);
            setStatus('error');
            addLog(`ERROR: ${e.message}`);
            addLog("Check browser console for details.");
        }
    };

    // Fetch available banks on mount
    const fetchAvailableBanks = async () => {
        setLoadingBanks(true);
        addLog("Fetching available banks...");

        try {
            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: { action: 'get_aspsps', country: 'NL' } // NL = Netherlands
            });

            if (error) throw error;

            // Check for error in response and show debug info
            if (data?.error) {
                console.error("Enable Banking Error:", data);
                if (data.debug) {
                    addLog(`❌ Error: ${data.error}`);
                    addLog(`📋 Debug Info:`);
                    addLog(`  APP_ID: ${data.debug.app_id}`);
                    addLog(`  KEY_ID: ${data.debug.key_id}`);
                    addLog(`  URL: ${data.debug.url}`);
                    addLog(`  Status: ${data.debug.status}`);
                }
                throw new Error(data.error);
            }

            // Log the FULL response to see what we get
            console.log("RAW get_aspsps response:", JSON.stringify(data));
            addLog(`Raw response keys: ${Object.keys(data || {}).join(', ')}`);

            // data.aspsps is array of bank objects, or data might be the array directly
            let banks = data.aspsps || data || [];

            // Always add Mock ASPSP as first option for sandbox testing
            const mockASPSP = { name: "Mock ASPSP", country: "XS" };
            if (!banks.some((b: any) => b.name === "Mock ASPSP")) {
                banks = [mockASPSP, ...banks];
            }

            console.log("Available banks:", banks);
            setAvailableBanks(Array.isArray(banks) ? banks : []);
            addLog(`Found ${Array.isArray(banks) ? banks.length : 0} banks (incl. Mock ASPSP)`);

            // Auto-select first bank if available
            if (banks.length > 0 && !selectedBank) {
                setSelectedBank(`${banks[0].name}|${banks[0].country}`);
            }
        } catch (e: any) {
            console.error("Failed to fetch banks:", e);
            addLog(`Error fetching banks: ${e.message}`);
        } finally {
            setLoadingBanks(false);
        }
    };

    // Fetch banks on component mount
    useEffect(() => {
        // Reset status to idle on mount (in case of stale state)
        setStatus('idle');
        fetchAvailableBanks();
    }, []);

    const handleConnect = async () => {
        if (!selectedBank) {
            addLog("Please select a bank first!");
            return;
        }

        const [aspsp_name, aspsp_country] = selectedBank.split('|');

        setStatus('connecting');
        addLog(`Initiating auth with: ${aspsp_name} (${aspsp_country})...`);

        try {
            // Get association_id for this connection
            const associationId = await associationService.getCurrentAssociationId();

            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: {
                    action: 'init_auth',
                    aspsp_name,
                    aspsp_country,
                    association_id: associationId
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            addLog(`Received auth URL: ${data.url}`);

            // Extract Session ID - PRIORITY: URL sessionid > response fields
            let possibleId: string | null = null;

            // FIRST: Try to get sessionid from URL (this is what Enable Banking API needs!)
            try {
                if (data.url) {
                    const urlObj = new URL(data.url);
                    const urlSessionId = urlObj.searchParams.get('sessionid');
                    if (urlSessionId) {
                        possibleId = urlSessionId;
                        console.log("Extracted sessionid from URL:", possibleId);
                        addLog(`Extracted sessionid from URL: ${possibleId}`);
                    }
                }
            } catch (e) {
                console.warn("Could not parse auth URL:", e);
            }

            // FALLBACK: Check response fields only if URL extraction failed
            if (!possibleId) {
                possibleId = data.session_id || data.uid || data.id || data.authorization_id || null;
                if (possibleId) {
                    addLog(`Using response field as session ID: ${possibleId}`);
                }
            }

            // Debug the response structure to find the ID
            console.log("Full Init Auth Response:", data);
            addLog(`Response Keys: ${Object.keys(data).join(', ')}`);

            if (possibleId) {
                sessionStorage.setItem('eb_session_id', possibleId);
                addLog(`Session ID stored: ${possibleId}`);
            } else {
                addLog("CRITICAL: No session_id/uid found in response! Future sync will fail.");
            }

            addLog("Redirecting user to bank selection...");

            // Redirect to Enable Banking Auth UI
            window.location.href = data.url;

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            addLog(`ERROR: ${e.message}`);
            addLog("Ensure the function is deployed: supabase functions deploy enable-banking --no-verify-jwt");
        }
    };

    const handleSync = async () => {
        if (status !== 'connected') {
            addLog("Cannot sync: Not connected.");
            return;
        }

        if (!selectedAccountUid) {
            addLog("Please select an account to sync first!");
            return;
        }

        addLog(`Syncing from ${dateFrom} to ${dateTo}...`);
        try {
            // Get association_id for database persistence
            const currentAssociationId = await associationService.getCurrentAssociationId();

            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: {
                    action: 'sync_transactions',
                    account_uid: selectedAccountUid,
                    date_from: dateFrom,
                    date_to: dateTo,
                    association_id: currentAssociationId
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            console.log("Sync Data Response:", data);
            addLog(`Sync complete! Found ${data.transactions?.length || 0} transactions.`);

            if (data._meta?.persisted) {
                addLog("✓ Transactions saved to database!");
            }

            // Log debug info if available (shows API errors per account)
            if (data._meta?.debug) {
                data._meta.debug.forEach((d: any) => {
                    const accName = accountsList.find(a => a.uid === d.account)?.name || 'Unknown';
                    addLog(`  → ${accName} (${d.account}): ${d.count || 0} tx, status: ${d.status}, error: ${d.error || 'none'}`);
                });
            }

            // Find the synced account from our list
            const syncedAccount = accountsList.find(a => a.uid === selectedAccountUid);
            if (syncedAccount) setAccount(syncedAccount as any);
            if (data.transactions) setTransactions(data.transactions);

            // Refresh account list to update last_synced_at timestamps
            restoreSession();


        } catch (e: any) {
            console.error("Sync failed:", e);
            addLog(`Sync Error: ${e.message}`);
        }
    };

    // Sync ALL accounts in accountsList
    const handleSyncAll = async () => {
        if (status !== 'connected' || accountsList.length === 0) {
            addLog("No accounts to sync.");
            return;
        }

        addLog(`Syncing ALL ${accountsList.length} account(s)...`);
        let totalTransactions = 0;

        try {
            const currentAssociationId = await associationService.getCurrentAssociationId();

            for (const acc of accountsList) {
                addLog(`  → Syncing ${acc.name}...`);

                const { data, error } = await supabase.functions.invoke('enable-banking', {
                    body: {
                        action: 'sync_transactions',
                        account_uid: acc.uid,
                        // date_from: Omitted to allow backend to determine "Smart Sync" start date based on last_synced_at
                        date_to: dateTo,
                        association_id: currentAssociationId
                    }
                });

                if (error) {
                    addLog(`    ✗ Error: ${error.message}`);
                } else if (data?.transactions) {
                    totalTransactions += data.transactions.length;
                    addLog(`    ✓ ${data.transactions.length} transactions`);
                }
            }

            addLog(`Sync All complete! Total: ${totalTransactions} transactions.`);

            // Refresh account list to update last_synced_at timestamps
            restoreSession();
        } catch (e: any) {
            console.error("Sync All failed:", e);
            addLog(`Sync All Error: ${e.message}`);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in bg-sea-salt min-h-screen">
            <header className="mb-8">
                <Title className="font-heading text-slate-blue">Enable Banking (Sandbox)</Title>
                <Text className="text-slate-blue/70">Ontwikkelomgeving voor de nieuwe bankkoppeling</Text>
            </header>

            <TabGroup>
                <TabList className="mt-8">
                    <Tab>Status & Connectie</Tab>
                    <Tab>Transacties (Live)</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            {/* Configuration Card */}
                            <Card className="rounded-card shadow-card ring-0 bg-white p-6">
                                <Title className="font-heading text-slate-blue mb-4">Connectie Status</Title>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className={`p-3 rounded-full ${status === 'connected' ? 'bg-sage-green/10 text-sage-green' : 'bg-slate-200 text-slate-500'}`}>
                                            <BuildingLibraryIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <Text className="font-medium text-slate-blue">
                                                {status === 'connected' ? 'Verbonden met Enable Banking' : 'Niet verbonden'}
                                            </Text>
                                            <Text className="text-xs text-slate-500">
                                                STATUS: {status.toUpperCase()}
                                            </Text>
                                        </div>
                                    </div>

                                    {/* Bank Selection */}
                                    <div className="space-y-2">
                                        <Text className="text-sm font-medium text-slate-blue">Selecteer Bank:</Text>
                                        {loadingBanks ? (
                                            <div className="text-sm text-gray-500 italic">Banken laden...</div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                                                {availableBanks.map((bank, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setSelectedBank(`${bank.name}|${bank.country}`)}
                                                        className={`
                                                            cursor-pointer p-3 rounded-lg border transition-all duration-200 flex items-center space-x-3
                                                            ${selectedBank === `${bank.name}|${bank.country}`
                                                                ? 'border-slate-blue bg-slate-50 shadow-sm ring-1 ring-slate-blue'
                                                                : 'border-slate-200 hover:border-slate-300 hover:bg-gray-50'
                                                            }
                                                        `}
                                                    >
                                                        {bank.logo ? (
                                                            <img src={bank.logo} alt={bank.name} className="w-8 h-8 object-contain" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                                {bank.country}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <Text className="font-medium text-slate-blue truncate">{bank.name}</Text>
                                                            <Text className="text-xs text-gray-500">{bank.country}</Text>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Button
                                            onClick={handleConnect}
                                            loading={status === 'connecting'}
                                            color="slate"
                                            className="w-full bg-slate-blue hover:bg-slate-700 border-none"
                                            disabled={!selectedBank || loadingBanks}
                                        >
                                            Start Authenticatie Flow
                                        </Button>
                                        {status === 'connecting' && (
                                            <Button
                                                onClick={() => setStatus('idle')}
                                                variant="secondary"
                                                color="gray"
                                                className="w-full text-xs"
                                            >
                                                Annuleren
                                            </Button>
                                        )}
                                    </div>

                                    {/* After connection: Account Selection */}
                                    {status === 'connected' && accountsList.length > 0 && (
                                        <div className="mt-8 space-y-6 animate-fade-in border-t border-slate-100 pt-6">
                                            <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-lg">
                                                <Badge color="green" size="xs">✓</Badge>
                                                <Text className="font-medium text-sm">Verbonden met {accountsList.length} rekening(en)</Text>
                                            </div>

                                            <div className="space-y-3">
                                                <Text className="text-sm font-medium text-slate-blue">Selecteer Account om te beheren:</Text>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {accountsList.map((acc, idx) => {
                                                        const isSelected = selectedAccountUid === acc.uid;
                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() => setSelectedAccountUid(acc.uid)}
                                                                className={`
                                                                    cursor-pointer p-4 rounded-xl border transition-all duration-200 text-left group
                                                                    ${isSelected
                                                                        ? 'border-slate-blue bg-blue-50/50 ring-1 ring-slate-blue shadow-md'
                                                                        : 'border-slate-200 hover:border-slate-400 hover:shadow-sm bg-white'
                                                                    }
                                                                `}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <Text className={`font-bold ${isSelected ? 'text-slate-blue' : 'text-gray-700'}`}>
                                                                            {acc.name}
                                                                        </Text>
                                                                        <Text className="font-mono text-xs text-slate-500 mt-1">
                                                                            {acc.iban || 'Geen IBAN'} • {acc.currency || 'EUR'}
                                                                        </Text>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Badge size="xs" color="blue">Geselecteerd</Badge>
                                                                    )}
                                                                </div>
                                                                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                                                    <Text className="text-xs text-gray-500">
                                                                        Laatst gesynchroniseerd:
                                                                    </Text>
                                                                    <Text className="text-xs font-medium text-slate-700">
                                                                        {acc.last_synced_at
                                                                            ? new Date(acc.last_synced_at).toLocaleString('nl-NL')
                                                                            : 'Nog nooit'
                                                                        }
                                                                    </Text>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Date Range Selection */}
                                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                                <div className="space-y-1">
                                                    <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">Van</Text>
                                                    <input
                                                        type="date"
                                                        value={dateFrom}
                                                        onChange={(e) => setDateFrom(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-slate-blue focus:border-transparent outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tot</Text>
                                                    <input
                                                        type="date"
                                                        value={dateTo}
                                                        onChange={(e) => setDateTo(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-slate-blue focus:border-transparent outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    onClick={handleSync}
                                                    color="emerald"
                                                    variant="primary"
                                                    disabled={!selectedAccountUid}
                                                    className="shadow-sm"
                                                >
                                                    Sync Geselecteerd
                                                </Button>
                                                <Button
                                                    onClick={handleSyncAll}
                                                    color="blue"
                                                    variant="secondary"
                                                    disabled={accountsList.length === 0}
                                                >
                                                    Sync Alle ({accountsList.length})
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show synced account info */}
                                    {status === 'connected' && account && transactions.length > 0 && (
                                        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg text-sm shadow-sm">
                                            <Text className="font-bold text-slate-blue">Huidige Weergave:</Text>
                                            <Text className="text-gray-700">{account.name} ({account.currency})</Text>
                                            <Text className="font-mono text-xs text-gray-500 mt-1">{account.bicFi}</Text>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge size="xs" color="indigo">{transactions.length} transacties</Badge>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Debug Output */}
                            <Card className="rounded-card shadow-card ring-0 bg-white p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                    <CodeBracketIcon className="h-5 w-5 text-terracotta" />
                                    <Title className="font-heading text-slate-blue">Debug Output</Title>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto">
                                    {logs.length === 0 ? "> Waiting for user action..." : logs.map((log, i) => (
                                        <div key={i}>{log}</div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </TabPanel>

                    <TabPanel>
                        <div className="mt-6">
                            <Card className="rounded-card shadow-card ring-0 bg-white p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <Title className="font-heading text-slate-blue">Transacties</Title>
                                        <Text>Recent opgehaald van bank</Text>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {accountsList.length > 0 && (
                                            <Select
                                                value={selectedAccountUid}
                                                onValueChange={(value) => setSelectedAccountUid(value)}
                                                placeholder="Selecteer account..."
                                                className="min-w-[200px]"
                                            >
                                                {accountsList.map((acc, idx) => (
                                                    <SelectItem key={idx} value={acc.uid}>
                                                        {acc.name} - {acc.currency || 'EUR'}
                                                    </SelectItem>
                                                ))}
                                            </Select>
                                        )}
                                        <Button
                                            icon={ArrowPathIcon}
                                            variant="secondary"
                                            color="slate"
                                            onClick={handleSync}
                                            disabled={!selectedAccountUid}
                                        >
                                            Verversen
                                        </Button>
                                    </div>
                                </div>

                                <Table className="mt-4">
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>Datum</TableHeaderCell>
                                            <TableHeaderCell>Tegenpartij</TableHeaderCell>
                                            <TableHeaderCell>Omschrijving</TableHeaderCell>
                                            <TableHeaderCell className="text-right">Bedrag</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {transactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center italic py-8 text-gray-500">
                                                    Nog geen transacties. Verbind eerst met de bank.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transactions.map((tx, idx) => {
                                                // Handle snake_case from Enable Banking API
                                                const counterparty = tx.creditor?.name || tx.debtor?.name || 'Onbekend';
                                                const bookingDate = tx.booking_date || tx.bookingDate || '-';
                                                const amount = tx.transaction_amount?.amount || tx.transactionAmount?.amount || '0';
                                                const currency = tx.transaction_amount?.currency || tx.transactionAmount?.currency || 'EUR';
                                                const indicator = tx.credit_debit_indicator || tx.creditDebitIndicator || 'DBIT';
                                                const status = tx.status || 'BOOK';
                                                const description = tx.remittance_information || tx.remittanceInformation || [];
                                                const descText = Array.isArray(description)
                                                    ? description.filter(d => d && !d.match(/^\d+$/)).join(' - ') || description[0] || '-'
                                                    : description || '-';

                                                return (
                                                    <TableRow key={`${tx.entry_reference || tx.entryReference || 'no-ref'}-${idx}`}>
                                                        <TableCell>{bookingDate}</TableCell>
                                                        <TableCell>
                                                            <Text className="font-medium text-slate-blue">
                                                                {counterparty}
                                                            </Text>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Text className="truncate max-w-xs" title={descText}>
                                                                {descText}
                                                            </Text>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Text className={`font-medium ${indicator === 'CRDT'
                                                                ? 'text-emerald-600'
                                                                : 'text-red-600'
                                                                }`}>
                                                                {indicator === 'CRDT' ? '+' : '-'}
                                                                {currency === 'EUR' ? '€' : currency} {parseFloat(amount).toFixed(2)}
                                                            </Text>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge size="xs" color={status === 'BOOK' ? 'green' : 'gray'}>{status}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    );
};
