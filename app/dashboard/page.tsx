'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRun, getActiveRun } from '@/app/actions/run';

interface User {
  id: string;
  email: string;
  username: string;
  sector: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadRun = useCallback(async (userId: string) => {
    try {
      const activeRun = await getActiveRun(userId);
      setRun(activeRun);
    } catch (err) {
      console.error('Error loading run:', err);
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
    loadRun(userData.id);
  }, [router, loadRun]);

  const handleStartRun = async () => {
    if (!user) return;
    try {
      const newRun = await createRun(user.id);
      await loadRun(user.id);
    } catch (err) {
      console.error('Error creating run:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const currentDayState = run?.dayStates?.find((ds: any) => ds.day === run.currentDay);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <div className="flex gap-4 items-center">
            <span className="text-gray-300">Welcome, {user.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/vault"
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition"
          >
            <h2 className="text-2xl font-semibold mb-2">Vault</h2>
            <p className="text-gray-400">View your persistent storage</p>
          </Link>
          <Link
            href="/journal"
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition"
          >
            <h2 className="text-2xl font-semibold mb-2">Journal</h2>
            <p className="text-gray-400">Track your collections</p>
          </Link>
          <Link
            href="/market"
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition"
          >
            <h2 className="text-2xl font-semibold mb-2">Market</h2>
            <p className="text-gray-400">Buy and sell commodities</p>
          </Link>
        </div>

        {!run ? (
          <div className="bg-gray-800 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-semibold mb-4">No Active Run</h2>
            <p className="text-gray-400 mb-6">
              Start a new mining run to begin your adventure!
            </p>
            <button
              onClick={handleStartRun}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
            >
              Start New Run
            </button>
          </div>
        ) : run.status !== 'active' ? (
          <div className="bg-gray-800 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-semibold mb-4">
              Run {run.status === 'won' ? 'Won!' : 'Lost'}
            </h2>
            <button
              onClick={handleStartRun}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold mt-4"
            >
              Start New Run
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 p-8 rounded-lg">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Active Run</h2>
                <p className="text-gray-400">Day {run.currentDay} of 12</p>
              </div>
              <Link
                href="/run"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
              >
                Continue Run
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-sm text-gray-400">Credits</div>
                <div className="text-2xl font-bold">{run.credits}</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-sm text-gray-400">Rig HP</div>
                <div className="text-2xl font-bold">{run.rigHP}/10</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-sm text-gray-400">Day Due</div>
                <div className="text-2xl font-bold">
                  {currentDayState?.due || 0}
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-sm text-gray-400">Shifts Used</div>
                <div className="text-2xl font-bold">
                  {currentDayState?.shiftsUsed || 0}/2
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

