import React, { useEffect, useState } from 'react';
import { Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel, Card, Button, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge } from '@tremor/react';
import { bookkeepingService } from './bookkeepingService';
import type { LedgerAccount, JournalEntry } from '../../types/database';
import { toast } from 'sonner';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

export const AccountingPage: React.FC = () => {
    const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
    const [entries, setEntries] = useState<any[]>([]); // Typed as any for now to handle Joined lines
    const [loading, setLoading] = useState(true);
    const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [accs, ents] = await Promise.all([
                bookkeepingService.getLedgerAccounts(),
                bookkeepingService.getJournalEntries()
            ]);
            setAccounts(accs);
            setEntries(ents);
        } catch (error) {
            console.error(error);
            // Don't toast error immediately on 404/PGRST if table missing, might be confusing.
            // But good to know.
        } finally {
            setLoading(false);
        }
    };

    const handleSeedClick = () => {
        setIsSeedModalOpen(true);
    };

    const confirmSeed = async () => {
        try {
            await bookkeepingService.seedDefaultLedger();
            toast.success('Schema geladen!');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Kon schema niet laden');
        }
    };

    const handlePost = async (id: string) => {
        try {
            const res = await bookkeepingService.postEntry(id);
            if (res && res.success === false) {
                toast.error(res.message);
            } else {
                toast.success('Geboekt!');
                loadData();
            }
        } catch (error: any) {
            toast.error('Fout bij boeken: ' + error.message);
        }
    };

    return (
        <div className="p-6">
            <header className="mb-6">
                <Title>Boekhouding</Title>
                <Text>Beheer grootboekrekeningen en memoriaalboekingen.</Text>
            </header>

            <ConfirmationModal
                isOpen={isSeedModalOpen}
                onClose={() => setIsSeedModalOpen(false)}
                onConfirm={confirmSeed}
                title="Standaard Schema Laden"
                message="Wilt u het standaard rekeningschema laden? Dit voegt een set veelgebruikte grootboekrekeningen toe aan uw administratie."
                confirmLabel="Laden"
            />

            <TabGroup>
                <TabList>
                    <Tab>Journaalposten</Tab>
                    <Tab>Grootboekschema</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <div className="mt-6">
                            <div className="flex justify-between mb-4">
                                <Title>Memoriaal & Boekingen</Title>
                                <Button icon={PlusIcon}>Nieuwe Boeking</Button>
                            </div>

                            <Card>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>Datum</TableHeaderCell>
                                            <TableHeaderCell>Omschrijving</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                            <TableHeaderCell>Totaal</TableHeaderCell>
                                            <TableHeaderCell>Actie</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {entries.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center italic">Geen boekingen gevonden</TableCell>
                                            </TableRow>
                                        )}
                                        {entries.map(entry => {
                                            // Calc total debit for display
                                            const total = entry.journal_lines?.reduce((sum: number, line: any) => sum + line.debit, 0) || 0;

                                            return (
                                                <TableRow key={entry.id}>
                                                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                                                    <TableCell>{entry.description}</TableCell>
                                                    <TableCell>
                                                        <Badge color={entry.status === 'POSTED' ? 'emerald' : 'orange'}>
                                                            {entry.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>€ {total.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        {entry.status === 'DRAFT' && (
                                                            <Button size="xs" variant="secondary" onClick={() => handlePost(entry.id)}>
                                                                Definitief maken
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </TabPanel>

                    <TabPanel>
                        <div className="mt-6">
                            <div className="flex justify-between mb-4">
                                <Title>Rekeningschema</Title>
                                <div className="flex gap-2">
                                    <Button variant="secondary" icon={ArrowPathIcon} onClick={handleSeedClick}>
                                        Standaard Schema Laden
                                    </Button>
                                    <Button icon={PlusIcon}>Rekening Toevoegen</Button>
                                </div>
                            </div>

                            <Card>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>Code</TableHeaderCell>
                                            <TableHeaderCell>Naam</TableHeaderCell>
                                            <TableHeaderCell>Type</TableHeaderCell>
                                            <TableHeaderCell>Systeem</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {accounts.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center italic">Geen rekeningen. Klik op "Standaard Schema Laden".</TableCell>
                                            </TableRow>
                                        )}
                                        {accounts.map(acc => (
                                            <TableRow key={acc.id}>
                                                <TableCell className="font-mono">{acc.code}</TableCell>
                                                <TableCell>{acc.name}</TableCell>
                                                <TableCell>
                                                    <Badge color="gray">{acc.type}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {acc.is_system ? '🔒' : ''}
                                                </TableCell>
                                            </TableRow>
                                        ))}
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
