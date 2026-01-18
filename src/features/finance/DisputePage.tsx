import React, { useState } from 'react';
import { Card, Title, Text, Textarea, Button, TextInput } from '@tremor/react';
import { notificationService } from '../../services/notificationService';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const DisputePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(searchParams.get('amount') || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!description) {
            toast.error('Geef aub een reden op.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Je moet ingelogd zijn.');
                navigate('/login');
                return;
            }

            // Get profile and association for better notification details
            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, association:associations(name)')
                .eq('id', user.id)
                .single();

            const senderName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email : user.email;
            const associationName = (profile?.association as any)?.name || 'Onbekende VvE';

            await notificationService.createDispute(user.id, senderName || 'Lid', associationName, description, parseFloat(amount) || 0);

            toast.success('Melding verstuurd naar het bestuur.');
            setTimeout(() => navigate('/'), 2000);
        } catch (e) {
            console.error(e);
            toast.error('Er ging iets mis.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center p-6 bg-gray-50 min-h-screen">
            <Card className="max-w-lg w-full h-fit">
                <Title>Betaling Betwisten</Title>
                <Text className="mb-4">
                    Bent u het niet eens met een openstaande vordering? Laat het ons weten. Het bestuur ontvangt hiervan direct een melding.
                </Text>

                <div className="space-y-4">
                    <div>
                        <Text className="mb-1">Betreft Bedrag (€) (Optioneel)</Text>
                        <TextInput
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            type="number"
                        />
                    </div>

                    <div>
                        <Text className="mb-1">Reden / Toelichting</Text>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ik heb al betaald op..."
                            rows={4}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => navigate('/')}>Annuleren</Button>
                        <Button onClick={handleSubmit} loading={loading} color="red">
                            Verstuur Melding
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
