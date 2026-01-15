import React, { useState, useEffect } from 'react';
import {
    Title,
    Text,
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Card,
    Button,
    Icon,
    Select,
    SelectItem,
    Switch
} from '@tremor/react';
import { memberService } from '../members/memberService';
import { supabase } from '../../lib/supabase';
import { bankService } from '../finance/bankService';
import {
    BuildingLibraryIcon,
    UserIcon,
    Cog6ToothIcon,
    ExclamationCircleIcon,
    TrashIcon,
    CreditCardIcon,
    CircleStackIcon
} from '@heroicons/react/24/outline';
import { useSearchParams } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();

    // Bank state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeConnections, setActiveConnections] = useState<any[]>([]);
    const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

    // Preferences state
    const [confirmTags, setConfirmTags] = useState(false);

    useEffect(() => {
        loadPreferences();
        handleCallback();
        refreshBankData();
    }, []);

    const loadPreferences = async () => {
        try {
            const profile = await memberService.getCurrentProfile();
            if (profile?.preferences) {
                setConfirmTags(!!profile.preferences.confirm_tags);
            }
        } catch (e) {
            console.error('Failed to load preferences', e);
        }
    };

    const handleToggleConfirmTags = async (val: boolean) => {
        setConfirmTags(val);
        try {
            await memberService.updatePreferences({ confirm_tags: val });
        } catch (e) {
            console.error('Failed to update preferences', e);
            // Revert on error
            setConfirmTags(!val);
        }
    };

    const refreshBankData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Connections
            const { data: connections } = await supabase
                .from('bank_connections')
                .select('*')
                .eq('status', 'LINKED')
                .order('created_at', { ascending: false });

            setActiveConnections(connections || []);

            // 2. Get Accounts
            const accounts = await bankService.getAccounts();
            setConnectedAccounts(accounts);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCallback = async () => {
        const callbackType = searchParams.get('callback');
        const ref = searchParams.get('ref');

        if (callbackType === 'mock' && ref) {
            setLoading(true);
            try {
                await bankService.saveConnection(ref, 'LINKED');
                await refreshBankData();
                setSearchParams({});
            } catch (err: any) {
                console.error(err);
                setError('Fout bij het koppelen van de mock bank.');
                setLoading(false);
            }
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await bankService.createRequisition();
            window.location.href = result.link;
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Kon geen verbinding maken met de bank service.');
            setLoading(false);
        }
    };

    const handleDisconnect = async (connectionId: string) => {
        if (!confirm('Weet u zeker dat u deze koppeling wilt verbreken? Alle gerelateerde rekeningen en verificaties worden verwijderd.')) return;

        setLoading(true);
        try {
            await bankService.deleteConnection(connectionId);
            await refreshBankData();
        } catch (err: any) {
            console.error(err);
            setError('Kon koppeling niet verwijderen.');
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = async (accountId: string, newType: string) => {
        try {
            setLoading(true);
            await bankService.updateAccountType(accountId, newType as 'PAYMENT' | 'SAVINGS');
            await refreshBankData();
        } catch (e) {
            console.error(e);
            setError('Kon rekeningtype niet aanpassen.');
            setLoading(false);
        }
    };

    // Helper to get accounts for a specific connection
    const getAccountsForConnection = (connectionId: string) => {
        return connectedAccounts.filter(acc => acc.connection_id === connectionId);
    };

    return (
        <div className="p-6 space-y-6">
            <header>
                <Title>Instellingen</Title>
                <Text>Beheer uw VvE instellingen en koppelingen.</Text>
            </header>

            <TabGroup index={selectedTab} onIndexChange={setSelectedTab}>
                <TabList>
                    <Tab icon={Cog6ToothIcon}>Algemeen</Tab>
                    <Tab icon={BuildingLibraryIcon}>Bankkoppelingen</Tab>
                    <Tab icon={UserIcon}>Profiel</Tab>
                </TabList>
                <TabPanels>
                    {/* General Settings */}
                    <TabPanel>
                        <div className="mt-6">
                            <Card>
                                <Title className="mb-4">Algemene Instellingen</Title>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Text className="font-medium text-gray-900">Nieuwe tags bevestigen</Text>
                                            <Text className="text-sm text-gray-500">
                                                Toon een bevestiging wanneer u een nieuwe categorie toevoegt die nog niet bestaat.
                                            </Text>
                                        </div>
                                        <Switch
                                            checked={confirmTags}
                                            onChange={handleToggleConfirmTags}
                                        />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </TabPanel>

                    {/* Bank Integrations */}
                    <TabPanel>
                        <div className="mt-6 space-y-6">
                            <Card>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <Title className="mb-2">Bankrekening Koppelen</Title>
                                        <Text>
                                            Beheer hier uw koppelingen met banken.
                                        </Text>
                                    </div>
                                    <Button
                                        size="md"
                                        color="indigo"
                                        onClick={handleConnect}
                                        loading={loading}
                                    >
                                        Nieuwe Koppeling
                                    </Button>
                                </div>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
                                        <Icon icon={ExclamationCircleIcon} color="red" variant="simple" />
                                        {error}
                                    </div>
                                )}

                                <Title className="text-sm uppercase text-gray-500 mb-4">Actieve Koppelingen & Rekeningen</Title>

                                {activeConnections.length === 0 ? (
                                    <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
                                        <BuildingLibraryIcon className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                                        <Text>Er zijn nog geen bankkoppelingen actief.</Text>
                                        <Button variant="light" onClick={handleConnect} className="mt-2">
                                            Koppel nu een (Mock) bank
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {activeConnections.map(conn => (
                                            <div key={conn.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                                {/* Connection Header */}
                                                <div className="bg-gray-50 p-4 flex justify-between items-center border-b border-gray-200">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-white p-2 rounded-md border border-gray-200">
                                                            <BuildingLibraryIcon className="h-6 w-6 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <Text className="font-bold text-gray-900">{conn.provider_name}</Text>
                                                            <Text className="text-xs text-gray-500">
                                                                Verbonden: {new Date(conn.created_at).toLocaleDateString()}
                                                            </Text>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="xs"
                                                        variant="secondary"
                                                        color="red"
                                                        icon={TrashIcon}
                                                        onClick={() => handleDisconnect(conn.id)}
                                                    >
                                                        Verwijder
                                                    </Button>
                                                </div>

                                                {/* Accounts List */}
                                                <div className="divide-y divide-gray-100">
                                                    {getAccountsForConnection(conn.id).map(acc => (
                                                        <div key={acc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            <div className="flex items-center gap-3">
                                                                <Icon
                                                                    icon={acc.account_type === 'SAVINGS' ? CircleStackIcon : CreditCardIcon}
                                                                    variant="light"
                                                                    color={acc.account_type === 'SAVINGS' ? "cyan" : "indigo"}
                                                                    size="lg"
                                                                />
                                                                <div>
                                                                    <Text className="font-medium text-gray-900">{acc.name || 'Naamloze Rekening'}</Text>
                                                                    <Text className="text-sm font-mono text-gray-500">{acc.iban}</Text>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <div className="text-right mr-4 hidden sm:block">
                                                                    <Text className="font-mono font-medium">€ {acc.balance_amount?.toFixed(2)}</Text>
                                                                </div>

                                                                <div className="w-40">
                                                                    <Select
                                                                        value={acc.account_type || 'PAYMENT'}
                                                                        onValueChange={(val) => handleTypeChange(acc.id, val)}
                                                                        enableClear={false}
                                                                    >
                                                                        <SelectItem value="PAYMENT" icon={CreditCardIcon}>
                                                                            Betaal
                                                                        </SelectItem>
                                                                        <SelectItem value="SAVINGS" icon={CircleStackIcon}>
                                                                            Spaar
                                                                        </SelectItem>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {getAccountsForConnection(conn.id).length === 0 && (
                                                        <div className="p-4 text-center italic text-gray-500">
                                                            Geen rekeningen gevonden voor deze koppeling.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </TabPanel>

                    {/* Profile Settings */}
                    <TabPanel>
                        <div className="mt-6">
                            <Card>
                                <Title>Mijn Profiel</Title>
                                <div className="mt-4 space-y-4 max-w-md">
                                    <Text>Profielgegevens bewerken kan via de ledenlijst.</Text>
                                    <Button
                                        variant="secondary"
                                        onClick={() => supabase.auth.signOut()}
                                    >
                                        Uitloggen
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    );
};
