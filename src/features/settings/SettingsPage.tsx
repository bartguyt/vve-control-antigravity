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
    Switch,
    Dialog,
    DialogPanel,
    TextInput
} from '@tremor/react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { memberService } from '../members/memberService';
import { associationService } from '../../lib/association';
import { supabase } from '../../lib/supabase';
import { bankService } from '../finance/bankService';
import { useColumnConfig } from '../../hooks/useColumnConfig';
import type { ColumnConfig } from '../../hooks/useColumnConfig';
import {
    BuildingLibraryIcon,
    UserIcon,
    Cog6ToothIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    TrashIcon,
    CreditCardIcon,
    CircleStackIcon,
    BoltIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    ListBulletIcon,
    Bars3Icon
} from '@heroicons/react/24/outline';
import { useSearchParams } from 'react-router-dom';
import { seedFinanceData } from '../../utils/seedFinance';
import { ThemeSelector } from '../../components/ui/ThemeSelector';

const DEFAULT_MEMBER_COLUMNS: ColumnConfig[] = [
    { id: 'name', label: 'Name', visible: true, order: 0 },
    { id: 'address', label: 'Address', visible: true, order: 1 },
    { id: 'member_number', label: 'Member Number', visible: true, order: 2 },
    { id: 'email', label: 'Email', visible: true, order: 3 },
    { id: 'role', label: 'Role', visible: true, order: 4 },
];

function SortableItem(props: { id: string; column: ColumnConfig; onToggle: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm mb-2">
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
                    <Bars3Icon className="h-5 w-5" />
                </div>
                <Text className="font-medium text-gray-900">{props.column.label}</Text>
            </div>
            <Switch
                checked={props.column.visible}
                onChange={() => props.onToggle(props.column.id)}
            />
        </div>
    );
}

export const SettingsPage: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();

    // Sync tab with URL
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam) {
            const index = parseInt(tabParam, 10);
            if (!isNaN(index)) {
                setSelectedTab(index);
            }
        }
    }, [searchParams]);

    // Update URL when tab changes
    const handleTabChange = (index: number) => {
        setSelectedTab(index);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', index.toString());
            return newParams;
        });
    };

    // Member Columns State
    const {
        columns: memberColumns,
        toggleColumn: toggleMemberColumn,
        reorderColumns: reorderMemberColumns,
    } = useColumnConfig('member_column_config', DEFAULT_MEMBER_COLUMNS);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = memberColumns.findIndex((c) => c.id === active.id);
            const newIndex = memberColumns.findIndex((c) => c.id === over?.id);
            const newOrder = arrayMove(memberColumns, oldIndex, newIndex);
            reorderMemberColumns(newOrder);
        }
    }

    // Bank state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeConnections, setActiveConnections] = useState<any[]>([]);
    const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

    // Preferences state
    const [confirmTags, setConfirmTags] = useState(false);

    // Seed Modal state
    const [seedModalOpen, setSeedModalOpen] = useState(false);
    const [selectedSeedAccount, setSelectedSeedAccount] = useState<string>('');

    // Renaming state
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [tempAccountName, setTempAccountName] = useState('');

    // Voting Settings State
    const [currentAssociationId, setCurrentAssociationId] = useState<string | null>(null);
    const [votingStrategy, setVotingStrategy] = useState<string>('HEAD');
    const [quorumRequired, setQuorumRequired] = useState<boolean>(true);
    const [quorumPercentage, setQuorumPercentage] = useState<number>(50);

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

            // Load Association Settings
            if (profile?.association_memberships) {
                // Determine active association
                // Ideally this should come from a centralized context or active_id, 
                // but getCurrentProfile returns memberships.

                // We use memberService which wraps associationService logic for 'current' usually,
                // but here let's rely on what we have.
                // We'll trust associationService.getCurrentAssociationId logic implicitly by finding the right membership?
                // actually we can just look up the association from the membership list if we knew the ID.

                // Let's assume the first one or active one.
                const activeId = localStorage.getItem('active_association_id');
                const activeMembership = profile.association_memberships.find(m => m.association_id === activeId)
                    || profile.association_memberships[0];

                if (activeMembership && activeMembership.associations) {
                    const assoc = activeMembership.associations;
                    setCurrentAssociationId(assoc.id);
                    setVotingStrategy(assoc.voting_strategy || 'HEAD');
                    setQuorumRequired(assoc.quorum_required ?? true);
                    setQuorumPercentage(assoc.quorum_percentage ?? 50);
                }
            }
        } catch (e) {
            console.error('Failed to load preferences', e);
        }
    };

    // Voting Handlers
    const updateAssociationSetting = async (updates: any) => {
        if (!currentAssociationId) return;
        try {
            await associationService.updateAssociation(currentAssociationId, updates);
        } catch (e) {
            console.error('Failed to update association settings', e);
            // Revert? (Complex without previous state tracking)
            // Ideally show toast error
        }
    };

    const handleVotingStrategyChange = (val: string) => {
        setVotingStrategy(val);
        updateAssociationSetting({ voting_strategy: val });
    };

    const handleQuorumRequiredChange = (val: boolean) => {
        setQuorumRequired(val);
        updateAssociationSetting({ quorum_required: val });
    };

    const handleQuorumPercentageChange = (val: string) => {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 0 && num <= 100) {
            setQuorumPercentage(num);
            // Debounce this? For now direct update is okay if user types slow, otherwise onBlur preference.
            // But Select/Switch trigger immediately. Text input might spam.
            // Let's just update for now.
            updateAssociationSetting({ quorum_percentage: num });
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

    const handleStartEditing = (acc: any) => {
        setEditingAccountId(acc.id);
        setTempAccountName(acc.name || '');
    };

    const handleSaveName = async (accountId: string) => {
        try {
            setLoading(true);
            // We need a bankService method for this, or just update directly via supabase if service is missing method.
            // Let's assume we can add it or just use supabase for speed here.
            await supabase.from('bank_accounts').update({ name: tempAccountName }).eq('id', accountId);
            await refreshBankData();
            setEditingAccountId(null);
        } catch (e) {
            console.error(e);
            setError('Kon naam niet wijzigen.');
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
                <Text>Beheer uw Vereniging instellingen en koppelingen.</Text>
            </header>

            <TabGroup index={selectedTab} onIndexChange={handleTabChange}>
                <TabList>
                    <Tab icon={Cog6ToothIcon}>Algemeen</Tab>
                    <Tab icon={ListBulletIcon}>Lijsten & Weergave</Tab>
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

                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div>
                                            <Text className="font-medium text-gray-900">Thema</Text>
                                            <Text className="text-sm text-gray-500">
                                                Kies uw voorkeur voor de weergave.
                                            </Text>
                                        </div>
                                        <div className="w-40">
                                            <ThemeSelector />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Text className="font-medium text-gray-900">Developer Mode</Text>
                                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded border border-gray-200 font-mono">DEV</span>
                                            </div>
                                            <Text className="text-sm text-gray-500">
                                                Toon technische debug informatie onderaan het scherm.
                                            </Text>
                                        </div>
                                        <Switch
                                            checked={localStorage.getItem('vve_debug_mode') === 'true'}
                                            onChange={(val) => {
                                                localStorage.setItem('vve_debug_mode', String(val));
                                                // Dispatch event so DebugBar picks it up immediately
                                                window.dispatchEvent(new Event('storage'));
                                                // Force re-render of this switch (simple way)
                                                window.location.reload();
                                            }}
                                        />
                                    </div>
                                </div>
                            </Card>

                            {/* Voting Configuration */}
                            <Card className="mt-4">
                                <Title className="mb-4">Steminstellingen</Title>
                                <div className="space-y-4">
                                    {/* Strategy */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Text className="font-medium text-gray-900">Stemmethodiek</Text>
                                            <Text className="text-sm text-gray-500">
                                                Bepaal hoe stemmen worden geteld.
                                            </Text>
                                        </div>
                                        <div className="w-40">
                                            <Select
                                                value={votingStrategy}
                                                onValueChange={handleVotingStrategyChange}
                                                enableClear={false}
                                            >
                                                <SelectItem value="HEAD">Hoofdelijk (1 stem p.p.)</SelectItem>
                                                <SelectItem value="FRACTION">Breukdeel (Gewogen)</SelectItem>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Quorum Switch */}
                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div>
                                            <Text className="font-medium text-gray-900">Quorum Vereist</Text>
                                            <Text className="text-sm text-gray-500">
                                                Is er een minimaal aantal aanwezigen nodig voor besluitvorming?
                                            </Text>
                                        </div>
                                        <Switch
                                            checked={quorumRequired}
                                            onChange={handleQuorumRequiredChange}
                                        />
                                    </div>

                                    {/* Quorum Percentage */}
                                    {quorumRequired && (
                                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div>
                                                <Text className="font-medium text-gray-900">Quorum Percentage</Text>
                                                <Text className="text-sm text-gray-500">
                                                    Percentage leden/stemmen dat aanwezig moet zijn.
                                                </Text>
                                            </div>
                                            <div className="w-24">
                                                <TextInput
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={String(quorumPercentage)}
                                                    onValueChange={(v) => handleQuorumPercentageChange(v)}
                                                    icon={undefined}
                                                    placeholder="50"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </TabPanel>

                    {/* List Settings */}
                    <TabPanel>
                        <div className="mt-6">
                            <Card>
                                <Title className="mb-4">Ledenlijst Configuratie</Title>
                                <Text className="mb-6">Sleep de kolommen om de volgorde te wijzigen. Gebruik de schakelaar om kolommen te verbergen.</Text>

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={memberColumns.map(c => c.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="max-w-xl">
                                            {memberColumns.map((col) => (
                                                <SortableItem
                                                    key={col.id}
                                                    id={col.id}
                                                    column={col}
                                                    onToggle={toggleMemberColumn}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
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
                                    <div className="flex space-x-2">
                                        <Button
                                            size="md"
                                            color="gray"
                                            variant="secondary"
                                            icon={BoltIcon}
                                            onClick={() => {
                                                if (connectedAccounts.length > 0) {
                                                    setSelectedSeedAccount(connectedAccounts[0].id);
                                                }
                                                setSeedModalOpen(true);
                                            }}
                                        >
                                            Seed Demo Data
                                        </Button>

                                        {/* Seed Modal */}
                                        <Dialog open={seedModalOpen} onClose={() => setSeedModalOpen(false)} static={true}>
                                            <DialogPanel>
                                                <Title className="mb-4">Demo Data Genereren</Title>
                                                <Text className="mb-4">
                                                    Dit maakt 10 leden en 100 transacties aan.<br />
                                                    Kies op welke rekening de transacties moeten worden bijgeschreven.
                                                </Text>

                                                <div className="mb-6">
                                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                        Selecteer Rekening
                                                    </label>
                                                    <Select
                                                        value={selectedSeedAccount}
                                                        onValueChange={setSelectedSeedAccount}
                                                        placeholder="Kies een rekening..."
                                                    >
                                                        {connectedAccounts.map(acc => (
                                                            <SelectItem key={acc.id} value={acc.id} icon={CreditCardIcon}>
                                                                {acc.name} ({acc.iban})
                                                            </SelectItem>
                                                        ))}
                                                    </Select>
                                                    {connectedAccounts.length === 0 && (
                                                        <Text className="text-xs text-red-500 mt-1">Geen rekeningen gevonden. Er wordt een nieuwe aangemaakt.</Text>
                                                    )}
                                                </div>

                                                <div className="flex justify-end space-x-2">
                                                    <Button variant="secondary" onClick={() => setSeedModalOpen(false)}>
                                                        Annuleren
                                                    </Button>
                                                    <Button
                                                        loading={loading}
                                                        onClick={async () => {
                                                            setLoading(true);
                                                            try {
                                                                const res = await seedFinanceData();
                                                                if (res) {
                                                                    alert(`Succes! ${res.members} leden en ${res.transactions} transacties aangemaakt.`);
                                                                    await refreshBankData();
                                                                    setSeedModalOpen(false);
                                                                } else {
                                                                    alert('Geen Vereniging gevonden of er is iets misgegaan.');
                                                                }
                                                            } catch (e: any) {
                                                                alert('Fout: ' + e.message);
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                    >
                                                        Start Genereren
                                                    </Button>
                                                </div>
                                            </DialogPanel>
                                        </Dialog>
                                        <Button
                                            size="md"
                                            color="indigo"
                                            onClick={handleConnect}
                                            loading={loading}
                                        >
                                            Nieuwe Koppeling
                                        </Button>
                                    </div>
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
                                                                    {editingAccountId === acc.id ? (
                                                                        <div className="flex items-center space-x-2">
                                                                            <TextInput
                                                                                value={tempAccountName}
                                                                                onValueChange={setTempAccountName}
                                                                                onBlur={() => handleSaveName(acc.id)}
                                                                                className="max-w-xs"
                                                                            />
                                                                            <Button
                                                                                size="xs"
                                                                                variant="secondary"
                                                                                color="green"
                                                                                icon={CheckIcon}
                                                                                onClick={() => handleSaveName(acc.id)}
                                                                            />
                                                                            <Button
                                                                                size="xs"
                                                                                variant="secondary"
                                                                                color="red"
                                                                                icon={XMarkIcon}
                                                                                onClick={() => setEditingAccountId(null)}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center space-x-2">
                                                                            <Text className="font-medium text-gray-900">{acc.name || 'Naamloze Rekening'}</Text>
                                                                            <button
                                                                                className="text-gray-400 hover:text-blue-600"
                                                                                onClick={() => handleStartEditing(acc)}
                                                                            >
                                                                                <PencilIcon className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    )}
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

                                                                <Button
                                                                    size="xs"
                                                                    variant="secondary"
                                                                    color="red"
                                                                    title="Verwijder alle transacties van deze rekening"
                                                                    icon={TrashIcon}
                                                                    onClick={async () => {
                                                                        if (confirm(`Weet u zeker dat u alle transacties van ${acc.name} (${acc.iban}) wilt verwijderen?`)) {
                                                                            try {
                                                                                setLoading(true);
                                                                                await bankService.deleteAccountTransactions(acc.id);
                                                                                await refreshBankData(); // Refresh to update balances if we tracked that, or just to be safe
                                                                                alert('Transacties verwijderd.');
                                                                            } catch (e: any) {
                                                                                console.error(e);
                                                                                alert('Fout: ' + e.message);
                                                                            } finally {
                                                                                setLoading(false);
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    Leegmaken
                                                                </Button>
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


                            {/* Danger Zone */}
                            <Card className="border-l-4 border-red-500">
                                <Title className="text-red-700 flex items-center gap-2 mb-2">
                                    <ExclamationTriangleIcon className="h-6 w-6" />
                                    Danger Zone
                                </Title>
                                <Text className="text-gray-600 mb-4">
                                    Deze acties zijn onomkeerbaar. Wees voorzichtig.
                                </Text>

                                <div className="p-4 bg-red-50 rounded-md border border-red-100 flex justify-between items-center bg-opacity-50">
                                    <div>
                                        <Text className="font-bold text-red-900">Reset Financiële Koppelingen</Text>
                                        <Text className="text-xs text-red-800">
                                            Verwijder **alle** koppelingen tussen leden en bankrekeningnummers.<br />
                                            Alle transacties worden weer "Onbekend".
                                        </Text>
                                    </div>
                                    <Button
                                        color="red"
                                        variant="primary"
                                        onClick={async () => {
                                            if (confirm('WAARSCHUWING: Dit verwijdert ALLE koppelingen tussen leden en IBANs voor de hele Vereniging. Weet u dit zeker?')) {
                                                if (confirm('Echt zeker? Dit kan niet ongedaan worden gemaakt.')) {
                                                    try {
                                                        setLoading(true);
                                                        await memberService.resetAllFinanceLinks(
                                                            (await memberService.getCurrentProfile())?.association_id || ''
                                                        );
                                                        alert('Alle koppelingen zijn verwijderd.');
                                                        await refreshBankData();
                                                    } catch (e: any) {
                                                        console.error(e);
                                                        alert('Fout: ' + e.message);
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }
                                            }
                                        }}
                                    >
                                        Reset Alles
                                    </Button>
                                </div>
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
        </div >
    );
};
