import React, { useEffect, useState } from 'react';
import { Card, Title, Text, List, ListItem, Flex, Badge, Icon, Button } from '@tremor/react';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { memberService } from '../members/memberService';
import { supabase } from '../../lib/supabase';
import type { AssociationMembership } from '../../types/database';

export const AssociationsWidget: React.FC = () => {
    const [associations, setAssociations] = useState<{ id: string; name: string; member_count: number; role: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssociations = async () => {
            try {
                // 1. Get current user profile with all memberships
                const profile = await memberService.getCurrentProfile();
                if (!profile || !profile.association_memberships) return;

                // 2. Fetch details for each association (Active ones)
                const activeMemberships = profile.association_memberships.filter(m => m.is_active);

                const data = await Promise.all(activeMemberships.map(async (m) => {
                    if (!m.association_id) {
                        console.warn('Membership missing association_id:', m);
                        return null;
                    }

                    // Check if associated data is already loaded, otherwise fetch
                    let name = m.associations?.name || 'Unknown Association';
                    if (!m.associations) {
                        try {
                            const { data: assoc } = await supabase.from('associations').select('name').eq('id', m.association_id).single();
                            if (assoc) name = assoc.name;
                        } catch (err) {
                            console.error('Error fetching association name:', err);
                        }
                    }

                    // Count members for this association
                    let memberCount = 0;
                    try {
                        const { count } = await supabase
                            .from('members')
                            .select('id', { count: 'exact', head: true })
                            .eq('association_id', m.association_id);
                        memberCount = count || 0;
                    } catch (err) {
                        console.error('Error counting members:', err);
                    }

                    return {
                        id: m.association_id,
                        name: name,
                        member_count: memberCount,
                        role: m.function || m.role // Prefer function if set, else role
                    };
                }));

                // Filter out nulls
                const validData = data.filter((d): d is NonNullable<typeof d> => d !== null);

                setAssociations(validData);
            } catch (e) {
                console.error('Error loading associations', e);
            } finally {
                setLoading(false);
            }
        };

        fetchAssociations();
    }, []);

    const roleMap: Record<string, string> = {
        'admin': 'Beheerder',
        'board': 'Bestuur',
        'member': 'Lid',
        'tech_comm': 'Tech. Comm.',
        'audit_comm': 'Kascommissie'
    };

    const getRoleLabel = (role: string) => roleMap[role] || role;

    if (loading) return <Card><Text>Laden...</Text></Card>;

    return (
        <Card>
            <Title>Mijn Verenigingen</Title>
            <List className="mt-4">
                {associations.length === 0 ? (
                    <Text className="italic p-4">Geen verenigingen gevonden.</Text>
                ) : (
                    associations.map((assoc) => (
                        <ListItem key={assoc.id}>
                            <Flex justifyContent="start" className="space-x-4">
                                <Icon icon={BuildingOfficeIcon} variant="light" size="lg" color="blue" />
                                <div className="truncate">
                                    <Text className="font-medium text-gray-900 truncate">{assoc.name}</Text>
                                    <Text className="text-xs text-gray-500">{assoc.member_count} Leden</Text>
                                </div>
                            </Flex>
                            <Badge size="xs" color="gray">
                                {getRoleLabel(assoc.role)}
                            </Badge>
                        </ListItem>
                    ))
                )}
            </List>
        </Card>
    );
};
