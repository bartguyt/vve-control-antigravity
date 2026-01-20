import React, { useEffect, useState } from 'react';
import { Card, Title, Text, List, ListItem, Flex, Badge, Icon } from '@tremor/react';
import { PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { memberService } from '../members/memberService';
import type { Profile } from '../../types/database';

export const ContactsWidget: React.FC = () => {
    const [contacts, setContacts] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const allMembers = await memberService.getMembers();
                // Filter for users who have a specific Function defined (e.g. Voorzitter) or specific Role
                const relevantRoles = ['board', 'tech_comm', 'audit_comm'];

                const filtered = allMembers.filter(m =>
                    m.association_memberships?.some(am =>
                        am.is_active && (relevantRoles.includes(am.role) || am.function)
                    )
                );

                const uniquePeople = new Map<string, Profile & { roles: string[]; functions: string[] }>();

                filtered.forEach(m => {
                    const memberAny = m as any;
                    if (!m.id) return;

                    const personId = memberAny.profile_id;
                    if (!personId) return;

                    const activeMembership = m.association_memberships?.find(am => am.is_active && (relevantRoles.includes(am.role) || am.function));
                    if (!activeMembership) return;

                    const role = activeMembership.role;
                    const func = activeMembership.function;

                    if (!uniquePeople.has(personId)) {
                        uniquePeople.set(personId, { ...m, roles: [role], functions: func ? [func] : [] });
                    } else {
                        const existing = uniquePeople.get(personId)!;
                        if (!existing.roles.includes(role)) {
                            existing.roles.push(role);
                        }
                        if (func && !existing.functions.includes(func)) {
                            existing.functions.push(func);
                        }
                    }
                });

                setContacts(Array.from(uniquePeople.values()));
            } catch (e) {
                console.error('Error loading contacts', e);
            } finally {
                setLoading(false);
            }
        };
        fetchContacts();
    }, []);

    const getRoleName = (role: string) => {
        switch (role) {
            case 'board': return 'Bestuur';
            case 'tech_comm': return 'Technische Commissie';
            case 'audit_comm': return 'Kascommissie';
            default: return role;
        }
    };

    if (loading) return <Card className="rounded-card shadow-card ring-0 bg-white p-6"><Text>Laden...</Text></Card>;

    return (
        <Card className="rounded-card shadow-card ring-0 bg-white p-6">
            <Title className="font-heading text-slate-blue">Contactpersonen</Title>
            <List className="mt-4">
                {contacts.length === 0 ? (
                    <Text className="italic p-4 text-slate-blue/60">Geen contactpersonen gevonden.</Text>
                ) : (
                    contacts.map((contact) => (
                        <ListItem key={(contact as any).profile_id || contact.id} className="border-slate-blue/10">
                            <div className="w-full">
                                <Flex justifyContent="between" alignItems="start">
                                    <div className="truncate">
                                        <Text className="font-medium text-slate-blue truncate">
                                            {contact.first_name} {contact.last_name}
                                        </Text>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(contact as any).functions && (contact as any).functions.length > 0 ? (
                                                (contact as any).functions.map((f: string) => (
                                                    <Badge key={f} size="xs" color="slate" className="rounded-md">
                                                        {f}
                                                    </Badge>
                                                ))
                                            ) : (
                                                (contact as any).roles.map((r: string) => (
                                                    <Badge key={r} size="xs" color="gray" className="rounded-md">
                                                        {getRoleName(r)}
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        {contact.email && (
                                            <a href={`mailto:${contact.email}`} title="Stuur e-mail">
                                                <Icon icon={EnvelopeIcon} variant="simple" color="slate" size="sm" className="text-slate-blue hover:text-sage-green transition-colors" />
                                            </a>
                                        )}
                                        {contact.phone_number && (
                                            <a href={`tel:${contact.phone_number}`} title="Bellen">
                                                <Icon icon={PhoneIcon} variant="simple" color="slate" size="sm" className="text-slate-blue hover:text-sage-green transition-colors" />
                                            </a>
                                        )}
                                    </div>
                                </Flex>
                                <div className="mt-2 text-xs text-slate-blue/60 space-y-1">
                                    {contact.email && (
                                        <div className="flex items-center space-x-2">
                                            <span className="w-4 h-4 flex items-center justify-center">@</span>
                                            <span>{contact.email}</span>
                                        </div>
                                    )}
                                    {contact.phone_number && (
                                        <div className="flex items-center space-x-2">
                                            <PhoneIcon className="w-3 h-3" />
                                            <span>{contact.phone_number}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ListItem>
                    ))
                )}
            </List>
        </Card>
    );
};
