'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getVault } from '@/app/actions/vault';

export default function VaultPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadVault = useCallback(async (userId: string) => {
    try {
      const vaultData = await getVault(userId);
      setVault(vaultData);
    } catch (err) {
      console.error('Error loading vault:', err);
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
    loadVault(userData.id);
  }, [router, loadVault]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  }

  const balances = vault?.balances;
  const specimens = vault?.specimens || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Vault</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded">
            <h2 className="text-2xl font-bold mb-4">Balances</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Credits:</span>
                <span className="font-bold">{balances?.credits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>SOL Units:</span>
                <span>{balances?.solUnits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>AES Units:</span>
                <span>{balances?.aesUnits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>VIR Units:</span>
                <span>{balances?.virUnits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>LUN Units:</span>
                <span>{balances?.lunUnits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>NOC Units:</span>
                <span>{balances?.nocUnits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>CRN Units:</span>
                <span>{balances?.crnUnits || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded">
            <h2 className="text-2xl font-bold mb-4">Specimens ({specimens.length})</h2>
            {specimens.length === 0 ? (
              <div className="text-gray-400">No specimens in vault</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {specimens.map((spec: any) => (
                  <div key={spec.id} className="p-3 bg-gray-700 rounded">
                    <div className="font-bold">{spec.form} {spec.metalType}</div>
                    <div className="text-sm text-gray-400">
                      {spec.grade} - {spec.biome} - Depth {spec.depth}
                    </div>
                    <div className="text-sm">Melt: {spec.meltUnits} units</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

