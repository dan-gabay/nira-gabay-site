'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/manage/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'login failed');
      }
      const from = searchParams.get('from');
      // Only allow internal /manage destinations to avoid an open redirect.
      router.push(from && from.startsWith('/manage') ? from : '/manage');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-8 w-full max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-stone-100 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-7 h-7 text-stone-700" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 text-center mb-2">אזור ניהול</h1>
        <p className="text-stone-500 text-sm text-center mb-6">הזינו את סיסמת הניהול כדי להמשיך</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="manage-password" className="sr-only">
            סיסמה
          </label>
          <input
            id="manage-password"
            type="password"
            autoFocus
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-stone-800 hover:bg-stone-900 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ManageLoginPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
