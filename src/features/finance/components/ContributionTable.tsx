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
import { ArrowUturnLeftIcon, EnvelopeIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { MemberContribution, Profile } from '../../../types/database';

interface ContributionTableProps {
    contributions: MemberContribution[];
    onMarkPaid: (c: MemberContribution) => void;
    onUndoPaid: (c: MemberContribution) => void;
    onViewDetails: (member: Profile) => void;
    onRemind: (c: MemberContribution) => void;
}

export const ContributionTable: React.FC<ContributionTableProps> = ({
    contributions,
    onMarkPaid,
    onUndoPaid,
    onViewDetails,
    onRemind
}) => {
    return (
        <Card>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>Lid</TableHeaderCell>
                        <TableHeaderCell>Groep</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell className="text-right">Bedrag</TableHeaderCell>
                        <TableHeaderCell className="text-right">Betaald</TableHeaderCell>
                        <TableHeaderCell className="text-right">Openstaand</TableHeaderCell>
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
                                            <Text className="text-xs text-gray-400">
                                                {c.year?.base_rate_name || 'Standaard'}
                                            </Text>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={
                                            c.status === 'PAID' ? 'emerald' :
                                                c.status === 'PARTIAL' ? 'yellow' :
                                                    c.status === 'OVERDUE' ? 'red' : 'gray'
                                        }>
                                            {c.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">€ {c.amount_due?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">€ {c.amount_paid?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Text color={outstanding > 0 ? "red" : "emerald"}>
                                            € {outstanding?.toFixed(2)}
                                        </Text>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2 justify-end">
                                            {outstanding > 0 && (
                                                <Button
                                                    size="xs"
                                                    variant="secondary"
                                                    icon={EnvelopeIcon}
                                                    color="orange"
                                                    disabled={outstanding <= 0}
                                                    onClick={() => onRemind(c)}
                                                    tooltip="Stuur Herinnering"
                                                >
                                                    Herinner
                                                </Button>
                                            )}

                                            {c.status !== 'PAID' && (
                                                <Button size="xs" variant="secondary" onClick={() => onMarkPaid(c)}>
                                                    Betaald
                                                </Button>
                                            )}
                                            {c.status === 'PAID' && (
                                                <Button size="xs" variant="light" color="red" icon={ArrowUturnLeftIcon} onClick={() => onUndoPaid(c)}>
                                                    Ongedaan
                                                </Button>
                                            )}
                                            {c.member && (
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


