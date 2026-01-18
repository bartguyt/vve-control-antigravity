import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Title, Text, Button } from '@tremor/react';
import { supabase } from '../../lib/supabase';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export const AcceptInvitePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const acceptInvite = async () => {
            if (!token) {
                setStatus('error');
                setErrorMessage('Geen token gevonden.');
                return;
            }

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    // Not logged in.
                    // We can redirect to login with return URL, or show a message.
                    // For now, let's assume they might need to login.
                    // Ideally, Supabase auth redirects back here.
                    // But if they are just not logged in:
                    toast.error('Je moet ingelogd zijn om de uitnodiging te accepteren.');
                    // Navigate to login?
                    navigate('/login?redirect=' + encodeURIComponent(`/accept-invite?token=${token}`));
                    return;
                }

                // Call RPC
                const { error } = await supabase.rpc('accept_admin_invite', { invite_token: token });

                if (error) throw error;

                setStatus('success');
                toast.success('Gefeliciteerd! Je bent nu Super Admin.');

                // Refresh profile/session shortly?
                setTimeout(() => {
                    navigate('/');
                    window.location.reload(); // Force reload to pick up new permissions
                }, 2000);

            } catch (e: any) {
                console.error(e);
                setStatus('error');
                setErrorMessage(e.message || 'Kon uitnodiging niet accepteren.');
            }
        };

        acceptInvite();
    }, [token, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="max-w-md text-center">
                {status === 'verifying' && (
                    <div className="py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <Title>Uitnodiging Verifiëren...</Title>
                        <Text>Even geduld a.u.b.</Text>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-8">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <CheckCircleIcon className="h-8 w-8 text-green-600" aria-hidden="true" />
                        </div>
                        <Title>Uitnodiging Geaccepteerd!</Title>
                        <Text className="mt-2 text-gray-600">
                            Je hebt nu Super Admin toegangsrechten. Je wordt doorgestuurd...
                        </Text>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-8">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <XCircleIcon className="h-8 w-8 text-red-600" aria-hidden="true" />
                        </div>
                        <Title>Fout</Title>
                        <Text className="mt-2 text-red-600">
                            {errorMessage}
                        </Text>
                        <Button className="mt-6" onClick={() => navigate('/')}>
                            Terug naar Dashboard
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};
