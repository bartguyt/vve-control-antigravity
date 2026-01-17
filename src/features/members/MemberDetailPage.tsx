import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { memberService } from './memberService';
import { bankService } from '../finance/bankService';
import { EditMemberModal } from './EditMemberModal';
import { OwnershipTransferModal } from './OwnershipTransferModal';
import {
    Card,
    Title,
    Text,
    Grid,
    Col,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Badge,
    Button
} from '@tremor/react';
import { ArrowLeftIcon, ExclamationTriangleIcon, PencilSquareIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Profile } from '../../types/database';

export const MemberDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [member, setMember] = useState<Profile | null>(null);
    const [ibans, setIbans] = useState<string[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    useEffect(() => {
        if (id) loadData(id);
    }, [id]);

    const loadData = async (memberId: string) => {
        try {
            setLoading(true);
            const [members, ibanList, txList] = await Promise.all([
                memberService.getMembers(), // Get all members to find this one (or create specific getMember api)
                memberService.getMemberIbans(memberId),
                bankService.getMemberTransactions(memberId)
            ]);

            const found = members.find(m => m.id === memberId);
            setMember(found || null);
            setIbans(ibanList);
            setTransactions(txList);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6">Laden...</div>;
    if (!member) return <div className="p-6">Lid niet gevonden.</div>;

    return (
        <div className="p-6 space-y-6">
            <Button
                variant="light"
                icon={ArrowLeftIcon}
                onClick={() => navigate('/members')}
                className="mb-4"
            >
                Terug naar ledenlijst
            </Button>

            <PageHeader
                title={`${member.first_name} ${member.last_name}`}
            >
                <div className="flex gap-2">
                    <Button
                        icon={ArrowPathIcon}
                        variant="secondary"
                        color="orange"
                        onClick={() => setTransferModalOpen(true)}
                    >
                        Overdragen
                    </Button>
                    <Button
                        icon={PencilSquareIcon}
                        variant="secondary"
                        onClick={() => setEditModalOpen(true)}
                    >
                        Bewerk Lid
                    </Button>
                </div>
            </PageHeader>

            <OwnershipTransferModal
                isOpen={transferModalOpen}
                onClose={() => setTransferModalOpen(false)}
                onTransferComplete={() => loadData(member.id)}
                memberId={member.id}
                currentOwnerName={`${member.first_name} ${member.last_name}`}
            />

            <Grid numItems={1} numItemsMd={3} className="gap-6">
                {/* Member Details */}
                <Col numColSpan={1} numColSpanMd={1}>
                    <Card>
                        <Title>Gegevens</Title>
                        <div className="mt-4 space-y-2">
                            <div>
                                <Text className="font-medium">Address</Text>
                                <Text>{member.street} {member.house_number}</Text>
                                <Text>{member.zip_code} {member.city}</Text>
                            </div>
                            <div>
                                <Text className="font-medium">Contact</Text>
                                <Text>{member.email}</Text>
                                <Text>{member.phone_number}</Text>
                            </div>
                            <div>
                                <Text className="font-medium">Member Number</Text>
                                <Text>{member.member_number}</Text>
                                <Badge color="blue">{member.association_memberships?.[0]?.role || 'Lid'}</Badge>
                            </div>
                        </div>

                        <div className="mt-6 border-t pt-4">
                            <Title className="mb-2">Gekoppelde IBANs</Title>
                            {ibans.length > 0 ? (
                                <ul className="list-disc list-inside text-sm text-gray-500 font-mono">
                                    {ibans.map(iban => <li key={iban}>{iban}</li>)}
                                </ul>
                            ) : (
                                <Text className="italic text-gray-400">Geen IBANs bekend</Text>
                            )}
                        </div>
                    </Card>

                    {/* Admin Danger Zone */}
                    <Card className="mt-6 border-l-4 border-red-500">
                        <Title className="text-red-700 flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5" />
                            Beheer
                        </Title>
                        <Text className="mt-2 text-sm text-gray-600">
                            Als beheerder kun je hier alle gekoppelde financiële gegevens van dit lid loskoppelen.
                        </Text>
                        <Button
                            size="xs"
                            color="red"
                            variant="secondary"
                            className="mt-4"
                            onClick={async () => {
                                if (confirm('Weet je zeker dat je alle IBAN koppelingen en transactie toewijzingen voor dit lid wilt verwijderen?')) {
                                    try {
                                        setLoading(true);
                                        await memberService.unlinkMemberFinance(member.id);
                                        alert('Financiële gegevens ontkoppeld.');
                                        loadData(member.id); // Reload
                                    } catch (e) {
                                        console.error(e);
                                        alert('Er ging iets mis.');
                                        setLoading(false);
                                    }
                                }
                            }}
                        >
                            Ontkoppel alle bankrekeningen
                        </Button>
                    </Card>
                </Col>

                {/* Financial History */}
                <Col numColSpan={1} numColSpanMd={2}>
                    <Card>
                        <Title>Betaalhistorie</Title>
                        <Text>Overzicht van alle gekoppelde banktransacties.</Text>

                        <Table className="mt-4">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Datum</TableHeaderCell>
                                    <TableHeaderCell>Rekening</TableHeaderCell>
                                    <TableHeaderCell>Omschrijving</TableHeaderCell>
                                    <TableHeaderCell>Bedrag</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            {new Date(tx.booking_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <Text className="font-medium">{tx.creditor_name || tx.debtor_name || 'Onbekend'}</Text>
                                                <Text className="text-xs text-gray-500">{tx.counterparty_iban}</Text>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Text className="truncate max-w-xs text-sm" title={tx.description}>{tx.description}</Text>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                color={tx.amount > 0 ? "emerald" : "red"}
                                                size="xs"
                                            >
                                                {tx.amount > 0 ? '+' : ''} € {Math.abs(tx.amount).toFixed(2)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4}>Geen transacties gevonden.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </Col>
            </Grid>

            <EditMemberModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onMemberUpdated={() => loadData(member.id)}
                member={member}
            />
        </div>
    );
};
