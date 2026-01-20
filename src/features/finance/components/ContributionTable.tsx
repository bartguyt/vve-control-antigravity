import React from 'react';
import {
    Card,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Badge,
    Button,
    Text
} from '@tremor/react';
import { ArrowUturnLeftIcon, EnvelopeIcon, DocumentMagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { MemberContribution, Profile } from '../../../types/database';

interface ContributionTableProps {
    contributions: MemberContribution[];
    onMarkPaid: (c: MemberContribution) => void;
    onUndoPaid: (c: MemberContribution) => void;
    onViewDetails: (member: Profile) => void;
    onRemind: (c: MemberContribution) => void;
    onDelete?: (id: string) => void;
}

export const ContributionTable: React.FC<ContributionTableProps> = ({
    contributions,
    onMarkPaid,
    onUndoPaid,
    onViewDetails,
    onRemind,
    onDelete
}) => {
    return (
        <Card>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>Lid</TableHeaderCell>
                        <TableHeaderCell>Groep</TableHeaderCell>
                        <TableHeaderCell className="text-right">Bedrag</TableHeaderCell>
                        <TableHeaderCell className="text-right">Betaald</TableHeaderCell>
                        <TableHeaderCell className="text-right">Openstaand</TableHeaderCell>
                        <TableHeaderCell className="text-right">Overschot</TableHeaderCell>
                        <TableHeaderCell>Acties</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {contributions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center">
                                <Text>Geen bijdrages gevonden.</Text>
                            </TableCell>
                        </TableRow>
                    ) : (
                        contributions.map(c => {
                            const outstanding = (c.amount_due || 0) - (c.amount_paid || 0);
                            const surplus = outstanding < 0 ? Math.abs(outstanding) : 0;
                            const actualOutstanding = outstanding > 0 ? outstanding : 0;

                            return (
                                <TableRow key={c.id}>
                                    <TableCell>
                                        <div className="font-medium">{c.member?.first_name} {c.member?.last_name}</div>
                                        <div className="text-xs text-gray-500">{c.member?.street} {c.member?.house_number}</div>
                                    </TableCell>
                                    <TableCell>
                                        {c.group ? (
                                            <Badge color="blue" size="xs">{c.group.name}</Badge>
                                        ) : (
                                            <Badge color="gray" size="xs">
                                                {c.year?.base_rate_name || 'Standaard'}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">€ {c.amount_due?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">€ {c.amount_paid?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Text color={actualOutstanding > 0 ? "red" : "emerald"}>
                                            € {actualOutstanding.toFixed(2)}
                                        </Text>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {surplus > 0 ? (
                                            <Text color="blue">€ {surplus.toFixed(2)}</Text>
                                        ) : (
                                            <Text className="text-gray-400">€ 0.00</Text>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2 justify-end">
                                            {(c as any).isGhost && onDelete && (
                                                <Button
                                                    size="xs"
                                                    variant="secondary"
                                                    color="red"
                                                    icon={TrashIcon}
                                                    onClick={() => onDelete(c.id)}
                                                    tooltip="Verwijder Spookregistratie"
                                                >
                                                    Verwijder
                                                </Button>
                                            )}
                                            {c.member && !((c as any).isGhost) && (
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    icon={DocumentMagnifyingGlassIcon}
                                                    onClick={() => onViewDetails(c.member!)}
                                                    tooltip="Bekijk Transacties"
                                                />
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </Card>
    );
};


