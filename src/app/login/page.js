'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Login failed (${res.status})`);
      }

      // Login success, redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
        
        {/* Aesthetic design accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E94444]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-[#172B44]">Zero Designs</h1>
          <p className="text-slate-400 text-xs mt-1 font-medium tracking-wide uppercase">
            Invoice Manager Security
          </p>
          <p className="text-slate-500 text-sm mt-3">
            Please enter admin credentials to access the dashboard.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#E94444] hover:bg-[#d63a3a] text-white font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-sm mt-2"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>


      </div>
    </div>
  );
}
