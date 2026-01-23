import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';
import { PlusIcon, BuildingLibraryIcon, TrashIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { BankConnectionWizard } from './BankConnectionWizard';
import { supabase } from '../../lib/supabase';
import { associationService } from '../../lib/association';

interface ConnectedAccount {
    id: string;
    external_account_uid: string;
    name: string;
    iban: string;
    currency: string;
    is_active: boolean;
    last_synced_at: string | null;
    created_at: string;
    connection_id: string;
}

interface Transaction {
    id: string;
    booking_date: string;
    amount: number;
    currency: string;
    counterparty_name: string | null;
    description: string | null;
    credit_debit: string;
}

export const ConnectionsPage: React.FC = () => {
    const [showWizard, setShowWizard] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewingTransactions, setViewingTransactions] = useState<ConnectedAccount | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('nl-NL');
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    useEffect(() => {
        // Check if we're returning from OAuth (code parameter in URL)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            // OAuth callback detected - show wizard to handle it
            addLog('🔗 OAuth callback detected - showing wizard');
            setShowWizard(true);
        } else {
            addLog('🚀 Connections page loaded');
        }

        loadConnectedAccounts();
    }, []);

    const loadConnectedAccounts = async () => {
        setLoading(true);
        try {
            const associationId = await associationService.getCurrentAssociationId();
            addLog(`📂 Loading connected accounts for association ${associationId}`);

            const { data, error } = await supabase
                .from('bank_accounts')
                .select('*')
                .eq('association_id', associationId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            addLog(`✅ Loaded ${data?.length || 0} connected accounts`);
            setConnectedAccounts(data || []);
        } catch (err) {
            console.error('Error loading connected accounts:', err);
            addLog(`❌ Error loading accounts: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const handleWizardComplete = () => {
        setShowWizard(false);
        loadConnectedAccounts();
    };

    const handleSync = async (accountUid: string) => {
        try {
            setLoading(true);
            const associationId = await associationService.getCurrentAssociationId();

            // Find the account to preserve its name
            const account = connectedAccounts.find(a => a.external_account_uid === accountUid);
            const accountName = account?.name || 'Unknown Account';

            addLog(`🔄 Starting sync for: ${accountName}`);
            addLog(`   Account UID: ${accountUid}`);
            addLog(`   Association ID: ${associationId}`);

            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: {
                    action: 'sync_transactions',
                    account_uid: accountUid,
                    account_name: accountName,
                    association_id: associationId
                }
            });

            if (error) {
                addLog(`❌ Supabase error: ${error.message}`);
                throw error;
            }

            if (data?.error) {
                addLog(`❌ Edge Function error: ${data.error}`);
                throw new Error(data.error);
            }

            // Log response details
            addLog(`📊 Response received from Edge Function`);
            if (data._meta) {
                addLog(`   Source: ${data._meta.source || 'unknown'}`);
                addLog(`   Accounts processed: ${data._meta.accounts_count || 1}`);
                addLog(`   Total transactions: ${data._meta.transactions_count || 0}`);

                if (data._meta.debug && Array.isArray(data._meta.debug)) {
                    data._meta.debug.forEach((d: any) => {
                        addLog(`   Account ${d.account}: ${d.count || 0} transactions (${d.pages || 0} pages)`);
                    });
                }
            }

            const transactionCount = data._meta?.transactions_count || data.transactions?.length || 0;
            addLog(`✅ Sync completed! ${transactionCount} transacties verwerkt.`);

            await loadConnectedAccounts();
        } catch (err: any) {
            console.error(err);
            addLog(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (accountId: string) => {
        const account = connectedAccounts.find(a => a.id === accountId);
        const accountName = account?.name || 'Unknown Account';

        if (!confirm(`Weet u zeker dat u "${accountName}" wilt verwijderen? Transacties blijven behouden.`)) {
            return;
        }

        try {
            setLoading(true);
            addLog(`🗑️ Removing account: ${accountName} (${accountId})`);

            const { error } = await supabase
                .from('bank_accounts')
                .update({ is_active: false })
                .eq('id', accountId);

            if (error) {
                addLog(`❌ Error removing account: ${error.message}`);
                throw error;
            }

            addLog(`✅ Account removed successfully`);
            await loadConnectedAccounts();
        } catch (err: any) {
            console.error(err);
            addLog(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTransactions = async (account: ConnectedAccount) => {
        setViewingTransactions(account);
        setLoadingTransactions(true);

        try {
            addLog(`🔍 Viewing transactions for: ${account.name}`);
            addLog(`   Account ID: ${account.id}`);

            const { data, error, count } = await supabase
                .from('bank_transactions')
                .select('*', { count: 'exact' })
                .eq('bank_account_id', account.id)
                .order('booking_date', { ascending: false });

            if (error) {
                addLog(`❌ Error loading transactions: ${error.message}`);
                throw error;
            }

            addLog(`✅ Loaded ${count || 0} transactions`);
            setTransactions(data || []);

            if (!data || data.length === 0) {
                addLog(`⚠️ No transactions found - this could mean:`);
                addLog(`   1. No transactions synced yet`);
                addLog(`   2. Mock ASPSP has no test data`);
            }
        } catch (err: any) {
            console.error('Error loading transactions:', err);
            addLog(`❌ Error: ${err.message}`);
        } finally {
            setLoadingTransactions(false);
        }
    };

    if (showWizard) {
        return (
            <div>
                <div className="mb-6">
                    <Button
                        variant="secondary"
                        onClick={() => setShowWizard(false)}
                    >
                        ← Terug naar overzicht
                    </Button>
                </div>
                <BankConnectionWizard onComplete={handleWizardComplete} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <Title>Bankkoppelingen</Title>
                        <Text className="mt-2">
                            Beheer de bankkoppelingen van uw vereniging
                        </Text>
                    </div>
                    <Button
                        icon={PlusIcon}
                        onClick={() => setShowWizard(true)}
                        className="bg-slate-blue hover:bg-slate-700"
                    >
                        Nieuwe Koppeling
                    </Button>
                </div>
            </Card>

            {/* Connected Accounts */}
            <Card>
                <Title className="mb-4">Gekoppelde Bankrekeningen</Title>

                {loading && connectedAccounts.length === 0 ? (
                    <div className="text-center py-8">
                        <Text>Laden...</Text>
                    </div>
                ) : connectedAccounts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <BuildingLibraryIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <Text className="text-gray-600 mb-4">Nog geen bankrekeningen gekoppeld</Text>
                        <Button
                            variant="secondary"
                            icon={PlusIcon}
                            onClick={() => setShowWizard(true)}
                        >
                            Voeg uw eerste koppeling toe
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {connectedAccounts.map(account => (
                            <div key={account.id} className="border border-gray-200 rounded-lg p-4 hover:border-slate-blue transition-colors">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <BuildingLibraryIcon className="h-8 w-8 text-slate-blue" />
                                        <div>
                                            <Text className="font-semibold text-base">{account.name}</Text>
                                            <Text className="text-sm text-gray-500 font-mono">{account.iban}</Text>
                                        </div>
                                    </div>
                                    <Badge color={account.is_active ? 'green' : 'gray'}>
                                        {account.is_active ? 'Actief' : 'Inactief'}
                                    </Badge>
                                </div>

                                {/* Details */}
                                <div className="space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
                                    <div className="flex justify-between">
                                        <Text className="text-xs text-gray-600">Valuta:</Text>
                                        <Text className="text-xs font-medium">{account.currency}</Text>
                                    </div>
                                    <div className="flex justify-between">
                                        <Text className="text-xs text-gray-600">Laatst gesynchroniseerd:</Text>
                                        <Text className="text-xs font-medium">
                                            {account.last_synced_at
                                                ? new Date(account.last_synced_at).toLocaleString('nl-NL')
                                                : 'Nog nooit'}
                                        </Text>
                                    </div>
                                    <div className="flex justify-between">
                                        <Text className="text-xs text-gray-600">Account ID:</Text>
                                        <Text className="text-xs font-mono text-gray-400">{account.id.slice(0, 8)}...</Text>
                                    </div>
                                    {/* Debug: External Account UID */}
                                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                                        <Text className="text-xs text-orange-600 font-medium">External UID (debug):</Text>
                                        <Text className="text-xs font-mono text-orange-600">{account.external_account_uid}</Text>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        icon={MagnifyingGlassIcon}
                                        onClick={() => handleViewTransactions(account)}
                                        disabled={loading}
                                        className="flex-1"
                                    >
                                        Transacties
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        icon={ArrowPathIcon}
                                        onClick={() => handleSync(account.external_account_uid)}
                                        disabled={loading}
                                        className="flex-1"
                                    >
                                        Sync
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        color="red"
                                        icon={TrashIcon}
                                        onClick={() => handleRemove(account.id)}
                                        disabled={loading}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <Title className="text-blue-900 mb-2">Over Bankkoppelingen</Title>
                <Text className="text-blue-800 text-sm">
                    Bankkoppelingen maken gebruik van PSD2 Open Banking via Enable Banking.
                    Na het koppelen kunt u automatisch transacties synchroniseren en deze koppelen
                    aan leden en leveranciers.
                </Text>
            </Card>

            {/* Debug Log Panel */}
            <Card className="bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                    <Title className="text-sm">Debug Log</Title>
                    <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setLogs([])}
                    >
                        Clear Log
                    </Button>
                </div>

                <div className="bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-md font-mono text-xs max-h-60 overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="text-gray-400">Logs will appear here...</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))
                    )}
                </div>
            </Card>

            {/* Transactions Modal */}
            {viewingTransactions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="max-w-5xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <Title>Transacties - {viewingTransactions.name}</Title>
                                <Text className="text-sm text-gray-600 mt-1">
                                    {viewingTransactions.iban}
                                </Text>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => setViewingTransactions(null)}
                            >
                                Sluiten
                            </Button>
                        </div>

                        {loadingTransactions ? (
                            <div className="text-center py-8">
                                <Text>Laden...</Text>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-8">
                                <Text className="text-gray-500">Geen transacties gevonden</Text>
                            </div>
                        ) : (
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeaderCell>Datum</TableHeaderCell>
                                        <TableHeaderCell>Tegenpartij</TableHeaderCell>
                                        <TableHeaderCell>Omschrijving</TableHeaderCell>
                                        <TableHeaderCell>Bedrag</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>
                                                <Text className="text-sm">
                                                    {new Date(tx.booking_date).toLocaleDateString('nl-NL')}
                                                </Text>
                                            </TableCell>
                                            <TableCell>
                                                <Text className="text-sm">
                                                    {tx.counterparty_name || '-'}
                                                </Text>
                                            </TableCell>
                                            <TableCell>
                                                <Text className="text-sm">
                                                    {tx.description || '-'}
                                                </Text>
                                            </TableCell>
                                            <TableCell>
                                                <Text className={`text-sm font-medium ${tx.credit_debit === 'CRDT' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.credit_debit === 'CRDT' ? '+' : '-'}€{Math.abs(tx.amount).toFixed(2)}
                                                </Text>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};
