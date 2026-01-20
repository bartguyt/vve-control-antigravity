import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, TabGroup, TabList, Tab, TabPanels, TabPanel, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';
import { BuildingLibraryIcon, CodeBracketIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { EnableBankingTransaction, EnableBankingAccount } from './enableBankingTypes';
import { supabase } from '../../lib/supabase';

export const EnableBankingSandbox: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    // State for real data (initially empty)
    const [account, setAccount] = useState<EnableBankingAccount | null>(null);
    const [transactions, setTransactions] = useState<EnableBankingTransaction[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

    // Handle Callback from Enable Banking
    useEffect(() => {
        // Log to browser console to verify component mount
        console.log("EnableBankingSandbox Mounted. URL:", window.location.href);

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            console.log("Auth Code detected:", code);
            // Ignore status check for now to ensure it fires
            handleCallback(code);
        } else {
            console.log("No auth code in URL.");
        }
    }, []); // Run once on mount

    const handleCallback = async (code: string) => {
        // Prevent double execution if already processing
        if (status === 'connecting' || status === 'connected') return;

        setStatus('connecting');
        addLog(`Callback received! Processing code...`);
        console.log("Processing callback with code:", code);

        try {
            addLog("Invoking Edge Function to exchange code...");

            // Invoke Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: { action: 'get_transactions', code }
            });

            if (error) {
                console.error("Supabase Invoke Error:", error);
                throw error;
            }

            if (data?.error) {
                console.error("Function returned error:", data.error);
                throw new Error(data.error);
            }

            console.log("Data received from Edge Function:", data);
            addLog("Data received successfully!");

            setAccount(data.account);
            setTransactions(data.transactions || []);
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

    const handleConnect = async () => {
        setStatus('connecting');
        addLog("Initializing auth flow via Edge Function...");

        try {
            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: { action: 'init_auth' }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            addLog(`Received auth URL: ${data.url}`);
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

                                    <Button
                                        onClick={handleConnect}
                                        loading={status === 'connecting'}
                                        color="slate"
                                        className="w-full bg-slate-blue hover:bg-slate-700 border-none"
                                    >
                                        Start Authenticatie Flow
                                    </Button>

                                    {status === 'connected' && account && (
                                        <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                                            <Text className="font-bold">Gekoppelde Rekening:</Text>
                                            <Text>{account.name} ({account.currency})</Text>
                                            <Text className="font-mono text-xs mt-1">{account.bicFi}</Text>
                                            <Text className="text-xs text-gray-400 mt-2">ID: {account.id || account.resourceId}</Text>
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
                                    <Button icon={ArrowPathIcon} variant="secondary" color="slate">
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
                                            transactions.map((tx, idx) => (
                                                <TableRow key={tx.entryReference || idx}>
                                                    <TableCell>{tx.bookingDate}</TableCell>
                                                    <TableCell>
                                                        <Text className="font-medium text-slate-blue">
                                                            {tx.creditor?.name || "Onbekend"}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Text className="truncate max-w-xs" title={tx.remittanceInformation?.[0] || ''}>
                                                            {tx.remittanceInformation?.[0] || '-'}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Text className={`font-medium ${tx.creditDebitIndicator === 'CRDT'
                                                                ? 'text-emerald-600'
                                                                : 'text-slate-600'
                                                            }`}>
                                                            {tx.creditDebitIndicator === 'CRDT' ? '+' : '-'}
                                                            € {tx.transactionAmount?.amount}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge size="xs" color="gray">{tx.status}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )))}
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
