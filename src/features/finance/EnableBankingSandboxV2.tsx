/**
 * Enable Banking Sandbox V2
 *
 * Refactored to use the new hexagonal banking architecture (BankingCore).
 * This replaces direct Edge Function calls with the BankingCore API.
 */

import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, TabGroup, TabList, Tab, TabPanels, TabPanel, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Select, SelectItem } from '@tremor/react';
import { BuildingLibraryIcon, CodeBracketIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { associationService } from '../../lib/association';
import { getBankingModule } from './banking';
import type { BankInfo, BankAccount, BankTransaction } from './banking/types';

export const EnableBankingSandboxV2: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    // Banking state
    const [availableBanks, setAvailableBanks] = useState<BankInfo[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [loadingBanks, setLoadingBanks] = useState(false);

    // Account state
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');

    // Transaction state
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [syncing, setSyncing] = useState(false);

    // Date range for manual sync
    const [dateFrom, setDateFrom] = useState<string>('2024-01-01');
    const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);

    // Get banking module instance
    const banking = getBankingModule(supabase, {
        enableMock: true, // Enable mock for development
        enableEnableBanking: true,
    });

    const addLog = (msg: string) => {
        console.log(msg);
        setLogs(prev => [...prev, `> ${msg}`]);
    };

    // Initialize: check for OAuth callback or load existing data
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            // Check if already processed (React StrictMode protection)
            const processedCode = sessionStorage.getItem('eb_processed_code');
            if (processedCode === code) {
                addLog("Code already processed, skipping...");
                window.history.replaceState({}, '', window.location.pathname);
                return;
            }

            sessionStorage.setItem('eb_processed_code', code);
            handleCallback(code);
        } else {
            // No callback, load existing accounts
            loadExistingAccounts();
        }
    }, []);

    // Load available banks
    const fetchAvailableBanks = async () => {
        setLoadingBanks(true);
        addLog("Fetching available banks...");

        try {
            // Get banks from both providers
            const allBanks = await banking.getAllAvailableBanks('NL');

            // Also add sandbox mock
            const mockBanks = await banking.getAvailableBanks('enable_banking', 'XS');

            const combined = [...mockBanks, ...allBanks];
            setAvailableBanks(combined);
            addLog(`Found ${combined.length} banks`);

            if (combined.length > 0 && !selectedBankId) {
                setSelectedBankId(combined[0].id);
            }
        } catch (e: any) {
            addLog(`Error fetching banks: ${e.message}`);
        } finally {
            setLoadingBanks(false);
        }
    };

    useEffect(() => {
        fetchAvailableBanks();
    }, []);

    // Load existing accounts for current association
    const loadExistingAccounts = async () => {
        try {
            const associationId = await associationService.getCurrentAssociationId();
            addLog("Loading existing accounts...");

            const existingAccounts = await banking.getAccounts(associationId);

            if (existingAccounts.length > 0) {
                setAccounts(existingAccounts);
                setSelectedAccountId(existingAccounts[0].id);
                setStatus('connected');
                addLog(`Loaded ${existingAccounts.length} existing account(s)`);
            } else {
                addLog("No existing accounts found");
                setStatus('idle');
            }
        } catch (e: any) {
            addLog(`Error loading accounts: ${e.message}`);
        }
    };

    // Start connection flow
    const handleConnect = async () => {
        if (!selectedBankId) {
            addLog("Please select a bank first!");
            return;
        }

        setStatus('connecting');
        const bank = availableBanks.find(b => b.id === selectedBankId);
        addLog(`Initiating auth with ${bank?.name}...`);

        try {
            const associationId = await associationService.getCurrentAssociationId();
            const redirectUri = window.location.href.split('?')[0]; // Clean URL

            // Determine provider based on bank
            const providerId = bank?.name.includes('Mock') ? 'mock' : 'enable_banking';

            const { authUrl } = await banking.initiateConnection(
                providerId as any,
                selectedBankId,
                redirectUri,
                associationId
            );

            addLog(`Redirecting to bank...`);

            // For mock, the authUrl already includes the code, so we handle it immediately
            if (providerId === 'mock') {
                const url = new URL(authUrl);
                const code = url.searchParams.get('code');
                if (code) {
                    sessionStorage.setItem('eb_processed_code', code);
                    await handleCallback(code);
                    return;
                }
            }

            // For real providers, redirect
            window.location.href = authUrl;
        } catch (e: any) {
            setStatus('error');
            addLog(`ERROR: ${e.message}`);
        }
    };

    // Handle OAuth callback
    const handleCallback = async (code: string) => {
        setStatus('connecting');
        addLog("Processing auth callback...");

        try {
            const associationId = await associationService.getCurrentAssociationId();

            // Determine provider from session or default to enable_banking
            const providerId = 'enable_banking'; // TODO: store this in sessionStorage during init

            const { connection, accounts: newAccounts } = await banking.completeConnection(
                providerId as any,
                code,
                associationId
            );

            addLog(`Connection established! Found ${newAccounts.length} account(s)`);
            setAccounts(newAccounts);

            if (newAccounts.length > 0) {
                setSelectedAccountId(newAccounts[0].id);
            }

            setStatus('connected');
            window.history.replaceState({}, '', window.location.pathname);
        } catch (e: any) {
            setStatus('error');
            addLog(`Callback error: ${e.message}`);
        }
    };

    // Sync single account
    const handleSync = async () => {
        if (!selectedAccountId) {
            addLog("Please select an account to sync");
            return;
        }

        setSyncing(true);
        addLog(`Syncing account...`);

        try {
            const result = await banking.syncAccount(selectedAccountId, {
                dateFrom: new Date(dateFrom),
                dateTo: new Date(dateTo),
            });

            if (result.success) {
                addLog(`✓ Sync complete! Added: ${result.transactionsAdded}, Skipped: ${result.transactionsSkipped}`);
                await loadTransactionsForAccount(selectedAccountId);

                // Refresh accounts to update last_synced_at
                await loadExistingAccounts();
            } else {
                addLog(`✗ Sync failed: ${result.error}`);
            }
        } catch (e: any) {
            addLog(`Sync error: ${e.message}`);
        } finally {
            setSyncing(false);
        }
    };

    // Sync all accounts
    const handleSyncAll = async () => {
        if (accounts.length === 0) {
            addLog("No accounts to sync");
            return;
        }

        setSyncing(true);
        addLog(`Syncing all ${accounts.length} account(s)...`);

        try {
            const associationId = await associationService.getCurrentAssociationId();
            const results = await banking.syncAllAccounts(associationId);

            let totalAdded = 0;
            let totalSkipped = 0;

            results.forEach((result, idx) => {
                const acc = accounts[idx];
                if (result.success) {
                    addLog(`  ✓ ${acc.name}: +${result.transactionsAdded}`);
                    totalAdded += result.transactionsAdded;
                    totalSkipped += result.transactionsSkipped;
                } else {
                    addLog(`  ✗ ${acc.name}: ${result.error}`);
                }
            });

            addLog(`Sync complete! Total added: ${totalAdded}, skipped: ${totalSkipped}`);

            // Refresh current account transactions
            if (selectedAccountId) {
                await loadTransactionsForAccount(selectedAccountId);
            }

            // Refresh accounts list
            await loadExistingAccounts();
        } catch (e: any) {
            addLog(`Sync all error: ${e.message}`);
        } finally {
            setSyncing(false);
        }
    };

    // Load transactions when account selection changes
    useEffect(() => {
        if (selectedAccountId) {
            loadTransactionsForAccount(selectedAccountId);

            // Update date picker based on last sync
            const account = accounts.find(a => a.id === selectedAccountId);
            if (account?.lastSyncedAt) {
                setDateFrom(account.lastSyncedAt.toISOString().split('T')[0]);
            }
        }
    }, [selectedAccountId]);

    const loadTransactionsForAccount = async (accountId: string) => {
        try {
            const txs = await banking.getTransactions(accountId, {
                limit: 100,
            });

            setTransactions(txs);

            if (txs.length > 0) {
                addLog(`Loaded ${txs.length} transactions`);
            }
        } catch (e: any) {
            addLog(`Error loading transactions: ${e.message}`);
        }
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    return (
        <div className="p-6 space-y-6 animate-fade-in bg-sea-salt min-h-screen">
            <header className="mb-8">
                <Title className="font-heading text-slate-blue">Enable Banking (V2 - Hexagonal)</Title>
                <Text className="text-slate-blue/70">Nieuwe modulaire architectuur met BankingCore</Text>
            </header>

            <TabGroup>
                <TabList className="mt-8">
                    <Tab>Status & Connectie</Tab>
                    <Tab>Transacties</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            {/* Configuration Card */}
                            <Card className="rounded-card shadow-card ring-0 bg-white p-6">
                                <Title className="font-heading text-slate-blue mb-4">Connectie Status</Title>
                                <div className="space-y-4">
                                    {/* Status Indicator */}
                                    <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className={`p-3 rounded-full ${status === 'connected' ? 'bg-sage-green/10 text-sage-green' : 'bg-slate-200 text-slate-500'}`}>
                                            <BuildingLibraryIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <Text className="font-medium text-slate-blue">
                                                {status === 'connected' ? 'Verbonden' : 'Niet verbonden'}
                                            </Text>
                                            <Text className="text-xs text-slate-500">
                                                {accounts.length} account(s)
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
                                                {availableBanks.map((bank) => (
                                                    <div
                                                        key={bank.id}
                                                        onClick={() => setSelectedBankId(bank.id)}
                                                        className={`
                                                            cursor-pointer p-3 rounded-lg border transition-all duration-200 flex items-center space-x-3
                                                            ${selectedBankId === bank.id
                                                                ? 'border-slate-blue bg-slate-50 shadow-sm ring-1 ring-slate-blue'
                                                                : 'border-slate-200 hover:border-slate-300 hover:bg-gray-50'
                                                            }
                                                        `}
                                                    >
                                                        {bank.logoUrl ? (
                                                            <img src={bank.logoUrl} alt={bank.name} className="w-8 h-8 object-contain" />
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

                                    <Button
                                        onClick={handleConnect}
                                        loading={status === 'connecting'}
                                        color="slate"
                                        className="w-full bg-slate-blue hover:bg-slate-700 border-none"
                                        disabled={!selectedBankId || loadingBanks}
                                    >
                                        Start Authenticatie
                                    </Button>

                                    {/* Connected: Account Management */}
                                    {status === 'connected' && accounts.length > 0 && (
                                        <div className="mt-8 space-y-6 animate-fade-in border-t border-slate-100 pt-6">
                                            <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-lg">
                                                <Badge color="green" size="xs">✓</Badge>
                                                <Text className="font-medium text-sm">Verbonden met {accounts.length} rekening(en)</Text>
                                            </div>

                                            <div className="space-y-3">
                                                <Text className="text-sm font-medium text-slate-blue">Selecteer Account:</Text>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {accounts.map((acc) => {
                                                        const isSelected = selectedAccountId === acc.id;
                                                        return (
                                                            <div
                                                                key={acc.id}
                                                                onClick={() => setSelectedAccountId(acc.id)}
                                                                className={`
                                                                    cursor-pointer p-4 rounded-xl border transition-all duration-200
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
                                                                            {acc.iban || 'Geen IBAN'} • {acc.currency}
                                                                        </Text>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Badge size="xs" color="blue">Geselecteerd</Badge>
                                                                    )}
                                                                </div>
                                                                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                                                    <Text className="text-xs text-gray-500">Laatst gesynchroniseerd:</Text>
                                                                    <Text className="text-xs font-medium text-slate-700">
                                                                        {acc.lastSyncedAt
                                                                            ? new Date(acc.lastSyncedAt).toLocaleString('nl-NL')
                                                                            : 'Nog nooit'
                                                                        }
                                                                    </Text>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Date Range */}
                                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                                <div className="space-y-1">
                                                    <Text className="text-xs font-medium text-gray-500 uppercase">Van</Text>
                                                    <input
                                                        type="date"
                                                        value={dateFrom}
                                                        onChange={(e) => setDateFrom(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-slate-blue outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Text className="text-xs font-medium text-gray-500 uppercase">Tot</Text>
                                                    <input
                                                        type="date"
                                                        value={dateTo}
                                                        onChange={(e) => setDateTo(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-slate-blue outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Sync Buttons */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    onClick={handleSync}
                                                    loading={syncing}
                                                    color="emerald"
                                                    disabled={!selectedAccountId}
                                                >
                                                    Sync Geselecteerd
                                                </Button>
                                                <Button
                                                    onClick={handleSyncAll}
                                                    loading={syncing}
                                                    color="blue"
                                                    variant="secondary"
                                                >
                                                    Sync Alle ({accounts.length})
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Debug Log */}
                            <Card className="rounded-card shadow-card ring-0 bg-white p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                    <CodeBracketIcon className="h-5 w-5 text-terracotta" />
                                    <Title className="font-heading text-slate-blue">Debug Output</Title>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto">
                                    {logs.length === 0 ? "> Waiting..." : logs.map((log, i) => (
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
                                        <Text>{selectedAccount?.name || 'Selecteer een account'}</Text>
                                    </div>
                                    <Button
                                        icon={ArrowPathIcon}
                                        variant="secondary"
                                        onClick={handleSync}
                                        loading={syncing}
                                        disabled={!selectedAccountId}
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
                                                    Geen transacties. Synchroniseer eerst met de bank.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transactions.map((tx) => (
                                                <TableRow key={tx.id}>
                                                    <TableCell>{tx.bookingDate.toLocaleDateString('nl-NL')}</TableCell>
                                                    <TableCell>
                                                        <Text className="font-medium text-slate-blue">
                                                            {tx.counterpartyName || 'Onbekend'}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Text className="truncate max-w-xs" title={tx.description || ''}>
                                                            {tx.description || '-'}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Text className={`font-medium ${tx.creditDebit === 'CRDT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {tx.creditDebit === 'CRDT' ? '+' : '-'}
                                                            € {tx.amount.toFixed(2)}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge size="xs" color={tx.status === 'BOOK' ? 'green' : 'gray'}>
                                                            {tx.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
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
