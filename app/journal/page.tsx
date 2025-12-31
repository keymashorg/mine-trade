'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getJournal } from '@/app/actions/vault';

export default function JournalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJournal = useCallback(async (userId: string) => {
    try {
      const journalPages = await getJournal(userId);
      setPages(journalPages);
    } catch (err) {
      console.error('Error loading journal:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    loadJournal(userData.id);
  }, [router, loadJournal]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Journal</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => {
            const filledCount = page.slots.filter((s: any) => s.filled).length;
            const totalSlots = page.slots.length;
            const progress = (filledCount / totalSlots) * 100;

            return (
              <div key={page.id} className="bg-gray-800 p-6 rounded">
                <h2 className="text-xl font-bold mb-2">{page.name}</h2>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{filledCount}/{totalSlots}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {page.slots.map((slot: any) => (
                    <div
                      key={slot.id}
                      className={`aspect-square rounded border-2 flex items-center justify-center ${
                        slot.filled
                          ? 'bg-green-600/20 border-green-500'
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    >
                      {slot.filled ? '✓' : ''}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

