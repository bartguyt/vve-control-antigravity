import React, { useState, useEffect } from 'react';
import { Title, Text, Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, Button, TextInput, TabGroup, TabList, Tab, TabPanels, TabPanel, Metric, Flex, ProgressBar } from '@tremor/react';
import { superAdminService, type AdminInvite, type EmailLog } from './superAdminService';
import { toast } from 'sonner';
import { ClipboardDocumentCheckIcon, EnvelopeIcon, ServerStackIcon, ClockIcon, UserGroupIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { debugUtils } from '../../utils/debugUtils';

export const SuperAdminPage: React.FC = () => {
    const [invites, setInvites] = useState<AdminInvite[]>([]);
    const [emailQueue, setEmailQueue] = useState<EmailLog[]>([]);
    const [email, setEmail] = useState('');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [batchLoading, setBatchLoading] = useState(false);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(60);

    const loadData = async () => {
        try {
            const [invdata, queuedata] = await Promise.all([
                superAdminService.getInvites(),
                superAdminService.getEmailQueue()
            ]);
            setInvites(invdata);
            setEmailQueue(queuedata);
        } catch (e) {
            console.error(e);
            toast.error('Kon data niet laden');
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Timer countdown effect
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) return 60; // Reset loop
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleRunBatch = async () => {
        setBatchLoading(true);
        try {
            const result = await superAdminService.triggerEmailBatch();
            toast.success(`Batch verwerkt: ${result.processed} emails`);
            loadData();
            setTimeLeft(60); // Reset timer
        } catch (e: any) {
            toast.error(e.message || 'Fout bij verwerken batch');
        } finally {
            setBatchLoading(false);
        }
    };



    const handleInvite = async () => {
        if (!email) return;
        setLoading(true);
        try {
            const { link } = await superAdminService.createInvite(email);
            setGeneratedLink(link);
            toast.success('Invite aangemaakt');
            setGeneratedLink(link);
            toast.success('Invite aangemaakt');
            loadData();
            setEmail('');

            // Try sending email (system level)
            // Note: In this MVP frontend-only setup, we rely on the link display mainly.
            // But we try to queue it.
            const { error: mailError } = await supabase
                .from('outbound_emails')
                .insert({
                    recipient_email: email,
                    subject: 'Uitnodiging Super Admin VvE Control',
                    body: `Beste,\n\nU bent uitgenodigd om Super Admin te worden van VvE Control.\n\nKlik op deze link om te accepteren:\n${link}\n\nDeze link is 7 dagen geldig.`,
                    status: 'pending'
                });

            if (!mailError) {
                toast.success('Email in wachtrij geplaatst');
            } else {
                debugUtils.warn('Mail queue failed', mailError);
                toast.info('Kon email niet direct versturen, gebruik de link.');
            }

        } catch (e: any) {
            toast.error(e.message || 'Fout bij aanmaken invite');
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            toast.success('Link gekopieerd');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <header>
                <Title>Super Admin Beheer</Title>
                <Text>Nodig nieuwe Super Admins uit en beheer openstaande uitnodigingen.</Text>
            </header>

            <TabGroup>
                <TabList>
                    <Tab icon={UserGroupIcon}>Beheerders</Tab>
                    <Tab icon={ServerStackIcon}>Email Wachtrij</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <div className="mt-6 space-y-6">

                            <Card className="max-w-xl">
                                <Title>Nieuwe Admin Uitnodigen</Title>
                                <div className="flex gap-4 mt-4 items-end">
                                    <div className="flex-1">
                                        <Text>Emailadres</Text>
                                        <TextInput
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="naam@voorbeeld.nl"
                                            className="mt-1"
                                        />
                                    </div>
                                    <Button onClick={handleInvite} loading={loading} icon={EnvelopeIcon}>
                                        Nodig Uit
                                    </Button>
                                </div>

                                {generatedLink && (
                                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                        <Text className="text-green-800 font-medium mb-2">Invite Linkgegenereerd!</Text>
                                        <div className="flex gap-2">
                                            <TextInput value={generatedLink} disabled className="bg-white" />
                                            <Button variant="secondary" icon={ClipboardDocumentCheckIcon} onClick={copyLink} tooltip="Kopieer Link" />
                                        </div>
                                        <Text className="text-xs text-green-600 mt-2">
                                            Deel deze link met de gebruiker als de email niet aankomt.
                                        </Text>
                                    </div>
                                )}
                            </Card>

                            <Card>
                                <Title>Uitnodigingen</Title>
                                <Table className="mt-4">
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>Email</TableHeaderCell>
                                            <TableHeaderCell>Rol</TableHeaderCell>
                                            <TableHeaderCell>Gemaakt op</TableHeaderCell>
                                            <TableHeaderCell>Verloopt op</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {invites.map(invite => (
                                            <TableRow key={invite.id}>
                                                <TableCell>{invite.email}</TableCell>
                                                <TableCell><Badge color="purple">Super Admin</Badge></TableCell>
                                                <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Badge color={invite.used ? 'green' : new Date(invite.expires_at) < new Date() ? 'red' : 'blue'}>
                                                        {invite.used ? 'Gebruikt' : new Date(invite.expires_at) < new Date() ? 'Verlopen' : 'Open'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {invites.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center">Geen invites gevonden.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </TabPanel>

                    <TabPanel>
                        <div className="mt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card>
                                    <Text>Wachtrij</Text>
                                    <Metric>{emailQueue.filter(e => e.status === 'pending').length}</Metric>
                                </Card>
                                <Card>
                                    <Text>Verstuurd Vandaag</Text>
                                    <Metric>
                                        {emailQueue.filter(e =>
                                            e.status === 'sent' &&
                                            new Date(e.sent_at!).toDateString() === new Date().toDateString()
                                        ).length}
                                    </Metric>
                                </Card>
                                <Card>
                                    <Text>Volgende Batch</Text>
                                    <Flex className="mt-2" justifyContent="start" alignItems="baseline">
                                        <Metric>{timeLeft}s</Metric>
                                        <Text className="ml-2">tot uitvoering</Text>
                                    </Flex>
                                    <ProgressBar value={((60 - timeLeft) / 60) * 100} className="mt-2" />
                                </Card>
                            </div>

                            <Card>
                                <div className="flex justify-between items-center mb-4">
                                    <Title>Email Logboek</Title>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            icon={ArrowPathIcon}
                                            onClick={loadData}
                                            tooltip="Verversen"
                                        />
                                        <Button
                                            onClick={handleRunBatch}
                                            loading={batchLoading}
                                            icon={ServerStackIcon}
                                        >
                                            Verwerk Wachtrij Nu
                                        </Button>
                                    </div>
                                </div>

                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>Ontvanger</TableHeaderCell>
                                            <TableHeaderCell>VvE</TableHeaderCell>
                                            <TableHeaderCell>Onderwerp</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                            <TableHeaderCell>Tijdstip</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {emailQueue.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {log.recipient?.first_name} {log.recipient?.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{log.recipient_email}</div>
                                                </TableCell>
                                                <TableCell>{log.association?.name || '-'}</TableCell>
                                                <TableCell className="max-w-xs truncate" title={log.subject}>{log.subject}</TableCell>
                                                <TableCell>
                                                    <Badge color={
                                                        log.status === 'sent' ? 'green' :
                                                            log.status === 'failed' ? 'red' : 'yellow'
                                                    }>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {emailQueue.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center">
                                                    <Text>Geen emails gevonden.</Text>
                                                </TableCell>
                                            </TableRow>
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
