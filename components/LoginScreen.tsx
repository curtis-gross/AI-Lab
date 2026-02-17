import React, { useState } from 'react';
import { User } from '../types';
import { Info } from 'lucide-react';

interface LoginScreenProps {
    onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [step, setStep] = useState<'welcome' | 'form'>('welcome');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                onLoginSuccess(data.user);
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 relative overflow-hidden">
            {/* Background Image - Grocery Store Vibe */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center brightness-[0.6] grayscale-[0.2]"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2574&auto=format&fit=crop")' }}
            ></div>

            {/* Content Card */}
            <div className="bg-white z-10 w-[450px] p-12 shadow-2xl rounded-sm flex flex-col items-center text-center">

                {/* Logo Area */}
                <div className="mb-10">
                    {/* Albertsons-style Logo */}
                    <img
                        src="/albertsons-logo.png"
                        alt="Albertsons Logo"
                        className="h-24 w-auto object-contain"
                    />
                </div>

                {step === 'welcome' ? (
                    <>
                        <h1 className="text-[28px] font-normal text-[#333] mb-6 tracking-tight">Welcome to the Marketing Portal!</h1>

                        <div className="flex items-center justify-center gap-2 text-sm text-[#666] mb-10">
                            <span>Enter your company email address on the next page.</span>
                            <Info size={16} className="text-blue-600" />
                        </div>

                        <button
                            onClick={() => setStep('form')}
                            className="w-full bg-[#00529b] text-white font-bold py-3 px-4 rounded-sm hover:bg-[#003d75] transition-colors mb-6 text-sm"
                        >
                            Continue to Sign In
                        </button>

                        <p className="text-[11px] text-[#666] mt-4">We use Microsoft to manage the sign-in process.</p>
                    </>
                ) : (
                    <form onSubmit={handleLogin} className="w-full">
                        <h2 className="text-2xl font-bold text-[#333] mb-8">Sign In</h2>

                        <div className="text-left mb-6">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full border border-gray-300 p-3 rounded-sm focus:border-[#00529b] focus:ring-1 focus:ring-[#00529b] focus:outline-none text-sm"
                                placeholder="Enter username"
                                autoFocus
                            />
                        </div>

                        <div className="text-left mb-8">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-300 p-3 rounded-sm focus:border-[#00529b] focus:ring-1 focus:ring-[#00529b] focus:outline-none text-sm"
                                placeholder="Enter password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-[13px] p-3 rounded-sm mb-6 border border-red-100">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#00529b] text-white font-bold py-3 px-4 rounded-sm hover:bg-[#003d75] transition-colors disabled:bg-gray-300 text-sm uppercase tracking-widest"
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('welcome')}
                            className="mt-6 text-xs text-[#666] hover:text-[#00529b] underline transition-colors"
                        >
                            Return to Welcome
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
