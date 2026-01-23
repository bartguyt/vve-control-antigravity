import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';
import { PlusIcon, BuildingLibraryIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
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

export const ConnectionsPage: React.FC = () => {
    const [showWizard, setShowWizard] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if we're returning from OAuth (code parameter in URL)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            // OAuth callback detected - show wizard to handle it
            console.log('OAuth callback detected, showing wizard');
            setShowWizard(true);
        }

        loadConnectedAccounts();
    }, []);

    const loadConnectedAccounts = async () => {
        setLoading(true);
        try {
            const associationId = await associationService.getCurrentAssociationId();

            const { data, error } = await supabase
                .from('bank_accounts')
                .select('*')
                .eq('association_id', associationId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setConnectedAccounts(data || []);
        } catch (err) {
            console.error('Error loading connected accounts:', err);
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

            const { data, error } = await supabase.functions.invoke('enable-banking', {
                body: {
                    action: 'sync_transactions',
                    account_uid: accountUid,
                    association_id: associationId
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            alert(`✅ Rekening gesynchroniseerd! ${data.transaction_count} transacties verwerkt.`);
            await loadConnectedAccounts();
        } catch (err: any) {
            console.error(err);
            alert(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (accountId: string) => {
        if (!confirm('Weet u zeker dat u deze bankrekening wilt verwijderen? Transacties blijven behouden.')) {
            return;
        }

        try {
            setLoading(true);

            const { error } = await supabase
                .from('bank_accounts')
                .update({ is_active: false })
                .eq('id', accountId);

            if (error) throw error;

            alert('✅ Bankrekening verwijderd');
            await loadConnectedAccounts();
        } catch (err: any) {
            console.error(err);
            alert(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
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
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Naam</TableHeaderCell>
                                <TableHeaderCell>IBAN</TableHeaderCell>
                                <TableHeaderCell>Valuta</TableHeaderCell>
                                <TableHeaderCell>Status</TableHeaderCell>
                                <TableHeaderCell>Laatst Gesynchroniseerd</TableHeaderCell>
                                <TableHeaderCell>Acties</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {connectedAccounts.map(account => (
                                <TableRow key={account.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <BuildingLibraryIcon className="h-5 w-5 text-gray-400" />
                                            <Text className="font-medium">{account.name}</Text>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Text className="font-mono text-sm">{account.iban}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Text>{account.currency}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={account.is_active ? 'green' : 'gray'}>
                                            {account.is_active ? 'Actief' : 'Inactief'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {account.last_synced_at ? (
                                            <Text className="text-sm">
                                                {new Date(account.last_synced_at).toLocaleString('nl-NL')}
                                            </Text>
                                        ) : (
                                            <Text className="text-sm text-gray-400">Nog nooit</Text>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="xs"
                                                variant="secondary"
                                                icon={ArrowPathIcon}
                                                onClick={() => handleSync(account.external_account_uid)}
                                                disabled={loading}
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
                                                Verwijder
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
        </div>
    );
};
