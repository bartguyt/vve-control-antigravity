import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const [loginMethod, setLoginMethod] = useState<'password' | 'magic_link'>('password');
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (loginMethod === 'password') {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;

                // Track login
                const { activityService } = await import('../../services/activityService');
                await activityService.logActivity({
                    action: 'login',
                    targetType: 'member',
                    description: 'Gebruiker is ingelogd met wachtwoord'
                });

                navigate('/');
            } else {
                // Magic Link Header
                const { error: otpError } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                        emailRedirectTo: window.location.origin,
                    }
                });
                if (otpError) throw otpError;
                setMagicLinkSent(true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResetSent(false);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/update-password',
            });

            if (resetError) throw resetError;

            setResetSent(true);
        } catch (err: any) {
            setError(err.message || 'Kon wachtwoordherstel niet aanvragen.');
        } finally {
            setLoading(false);
        }
    };

    if (isForgotPassword) {
        // ... (Forgot Password Render - kept as is)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Wachtwoord Herstellen
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Vul uw e-mailadres in om een reset-link te ontvangen.
                        </p>
                    </div>

                    {resetSent ? (
                        <div className="rounded-md bg-green-50 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-800">Email verzonden!</h3>
                                    <div className="mt-2 text-sm text-green-700">
                                        <p>Controleer uw email ({email}) en klik op de link om uw wachtwoord opnieuw in te stellen.</p>
                                    </div>
                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                                            className="text-sm font-medium text-green-600 hover:text-green-500 underline"
                                        >
                                            Terug naar inloggen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                            <div className="rounded-md shadow-sm -space-y-px">
                                <div>
                                    <label htmlFor="email-address-reset" className="sr-only">Email adres</label>
                                    <input
                                        id="email-address-reset"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                        placeholder="Email adres"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-500 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {loading ? 'Verzenden...' : 'Verzend Link'}
                                </button>
                            </div>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(false)}
                                    className="font-medium text-indigo-600 hover:text-indigo-500 text-sm"
                                >
                                    Terug naar inloggen
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // Main Login Render
    if (magicLinkSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">Magic Link Verzonden!</h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>We hebben een magische link gestuurd naar <strong>{email}</strong>.</p>
                                    <p className="mt-1">Klik op de link in de e-mail om direct in te loggen.</p>
                                </div>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setMagicLinkSent(false); }}
                                        className="text-sm font-medium text-green-600 hover:text-green-500 underline"
                                    >
                                        Terug naar inloggen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        VvE Control
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Log in op uw account
                    </p>
                </div>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-50 text-gray-500">Kies methode</span>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setLoginMethod('password')}
                            className={`w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${loginMethod === 'password' ? 'ring-2 ring-offset-2 ring-indigo-500 border-indigo-500 text-indigo-700' : ''}`}
                        >
                            Wachtwoord
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginMethod('magic_link')}
                            className={`w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${loginMethod === 'magic_link' ? 'ring-2 ring-offset-2 ring-indigo-500 border-indigo-500 text-indigo-700' : ''}`}
                        >
                            Magic Link
                        </button>
                    </div>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email adres</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${loginMethod === 'password' ? 'rounded-t-md' : 'rounded-md'}`}
                                placeholder="Email adres"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        {loginMethod === 'password' && (
                            <div>
                                <label htmlFor="password" className="sr-only">Wachtwoord</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Wachtwoord"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {loginMethod === 'password' && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(true)}
                                    className="font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Wachtwoord vergeten?
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Laden...' : (loginMethod === 'password' ? 'Inloggen' : 'Stuur Magic Link')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
