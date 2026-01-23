import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Switch, Select, SelectItem, TextInput } from '@tremor/react';
import { memberService } from '../members/memberService';
import { associationService } from '../../lib/association';
import { ThemeSelector } from '../../components/ui/ThemeSelector';

export const GeneralSettingsPage: React.FC = () => {
    // Preferences state
    const [confirmTags, setConfirmTags] = useState(false);

    // Voting Settings State
    const [currentAssociationId, setCurrentAssociationId] = useState<string | null>(null);
    const [votingStrategy, setVotingStrategy] = useState<string>('HEAD');
    const [quorumRequired, setQuorumRequired] = useState<boolean>(true);
    const [quorumPercentage, setQuorumPercentage] = useState<number>(50);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const profile = await memberService.getCurrentProfile();
            if (profile?.preferences) {
                setConfirmTags(!!profile.preferences.confirm_tags);
            }

            // Load Association Settings
            if (profile?.association_memberships) {
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
            updateAssociationSetting({ quorum_percentage: num });
        }
    };

    const handleToggleConfirmTags = async (val: boolean) => {
        setConfirmTags(val);
        try {
            await memberService.updatePreferences({ confirm_tags: val });
        } catch (e) {
            console.error('Failed to update preferences', e);
            setConfirmTags(!val);
        }
    };

    return (
        <div className="space-y-6">
            {/* General Settings Card */}
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
                                window.dispatchEvent(new Event('storage'));
                                window.dispatchEvent(new Event('debugModeChanged'));
                                window.location.reload();
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Voting Configuration Card */}
            <Card>
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
    );
};
