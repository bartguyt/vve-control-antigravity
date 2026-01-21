import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, TabGroup, TabList, Tab, TabPanels, TabPanel, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Select, SelectItem, TextInput } from '@tremor/react';
import { BuildingLibraryIcon, CodeBracketIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { EnableBankingTransaction, EnableBankingAccount } from './enableBankingTypes';
import { supabase } from '../../lib/supabase';

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
    const [accountsList, setAccountsList] = useState<{ uid: string, name: string, iban?: string, currency?: string }[]>([]);
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
            // Clean URL to prevent reload issues
            window.history.replaceState({}, '', window.location.pathname);

            handleCallback(code);
        } else {
            console.log("No auth code in URL.");
        }
    }, []);

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

            // Step 1: Exchange code for session and get accounts list (don't fetch transactions yet)
            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: {
                    action: 'activate_session',  // New action: just activates session, returns accounts
                    code,
                    session_id: storedSessionId
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
            if (data?.error) throw new Error(data.error);

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
            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: { action: 'init_auth', aspsp_name, aspsp_country }
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
            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: {
                    action: 'sync_transactions',
                    account_uid: selectedAccountUid,
                    date_from: dateFrom,
                    date_to: dateTo
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            console.log("Sync Data Response:", data);
            addLog(`Sync complete! Found ${data.transactions?.length || 0} transactions.`);

            // Log debug info if available (shows API errors per account)
            if (data._meta?.debug) {
                data._meta.debug.forEach((d: any) => {
                    addLog(`  → Account ${d.account}: ${d.count || 0} tx, status: ${d.status}, error: ${d.error || 'none'}`);
                });
            }

            // Find the synced account from our list
            const syncedAccount = accountsList.find(a => a.uid === selectedAccountUid);
            if (syncedAccount) setAccount(syncedAccount as any);
            if (data.transactions) setTransactions(data.transactions);

        } catch (e: any) {
            console.error("Sync failed:", e);
            addLog(`Sync Error: ${e.message}`);
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

                                    {/* Bank Selection Dropdown */}
                                    <div className="space-y-2">
                                        <Text className="text-sm font-medium text-slate-blue">Selecteer Bank:</Text>
                                        {loadingBanks ? (
                                            <div className="text-sm text-gray-500 italic">Banken laden...</div>
                                        ) : (
                                            <Select
                                                value={selectedBank}
                                                onValueChange={(value) => setSelectedBank(value)}
                                                placeholder="Kies een bank..."
                                            >
                                                {availableBanks.map((bank, idx) => (
                                                    <SelectItem
                                                        key={idx}
                                                        value={`${bank.name}|${bank.country}`}
                                                    >
                                                        {bank.name} ({bank.country})
                                                    </SelectItem>
                                                ))}
                                            </Select>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleConnect}
                                        loading={status === 'connecting'}
                                        color="slate"
                                        className="w-full bg-slate-blue hover:bg-slate-700 border-none"
                                        disabled={!selectedBank || loadingBanks}
                                    >
                                        Start Authenticatie Flow
                                    </Button>

                                    {/* After connection: Account Selection */}
                                    {status === 'connected' && accountsList.length > 0 && (
                                        <div className="mt-4 space-y-4">
                                            <div className="p-4 bg-green-50 text-green-800 rounded-lg text-sm">
                                                <Text className="font-bold">✓ Verbonden!</Text>
                                                <Text>Selecteer hieronder het account om te synchroniseren:</Text>
                                            </div>

                                            <div className="space-y-2">
                                                <Text className="text-sm font-medium text-slate-blue">Selecteer Account:</Text>
                                                <Select
                                                    value={selectedAccountUid}
                                                    onValueChange={(value) => setSelectedAccountUid(value)}
                                                    placeholder="Kies een account..."
                                                >
                                                    {accountsList.map((acc, idx) => (
                                                        <SelectItem key={idx} value={acc.uid}>
                                                            {acc.name} {acc.iban ? `(${acc.iban})` : ''} - {acc.currency || 'EUR'}
                                                        </SelectItem>
                                                    ))}
                                                </Select>
                                            </div>

                                            {/* Date Range Selection */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Text className="text-sm font-medium text-slate-blue">Van:</Text>
                                                    <input
                                                        type="date"
                                                        value={dateFrom}
                                                        onChange={(e) => setDateFrom(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Text className="text-sm font-medium text-slate-blue">Tot:</Text>
                                                    <input
                                                        type="date"
                                                        value={dateTo}
                                                        onChange={(e) => setDateTo(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <Button
                                                onClick={handleSync}
                                                color="emerald"
                                                className="w-full"
                                                disabled={!selectedAccountUid}
                                            >
                                                Synchroniseer Transacties
                                            </Button>
                                        </div>
                                    )}

                                    {/* Show synced account info */}
                                    {status === 'connected' && account && transactions.length > 0 && (
                                        <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                                            <Text className="font-bold">Gesynchroniseerd Account:</Text>
                                            <Text>{account.name} ({account.currency})</Text>
                                            <Text className="font-mono text-xs mt-1">{account.bicFi}</Text>
                                            <Text className="text-xs text-gray-500 mt-2">
                                                {transactions.length} transacties geladen
                                            </Text>
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
                                    <Button
                                        icon={ArrowPathIcon}
                                        variant="secondary"
                                        color="slate"
                                        onClick={handleSync}
                                        loading={false} // Could add loading state
                                    >
                                        Verversen
                                    </Button>
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
                                                    <TableRow key={tx.entry_reference || tx.entryReference || idx}>
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
