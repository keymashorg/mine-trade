'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveRun, repairRig, payDayDue } from '@/app/actions/run';
import { executeMiningShift, meltSpecimen, sellUnits } from '@/app/actions/mining';
import { BIOMES, DEPTHS, MINING_MODES, METALS } from '@/lib/game/constants';
import Link from 'next/link';

export default function RunPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBiome, setSelectedBiome] = useState<string>('');
  const [selectedDepth, setSelectedDepth] = useState<number>(1);
  const [selectedMode, setSelectedMode] = useState<'Drill' | 'Blast'>('Drill');
  const [miningResult, setMiningResult] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [useLoanVoucher, setUseLoanVoucher] = useState(false);

  const loadRun = useCallback(async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const userData = JSON.parse(userStr);
    try {
      const activeRun = await getActiveRun(userData.id);
      if (!activeRun) {
        router.push('/dashboard');
        return;
      }
      setRun(activeRun);
      const currentDayState = activeRun.dayStates?.find((ds: any) => ds.day === activeRun.currentDay);
      if (currentDayState?.paid && activeRun.currentDay < 12) {
        // Day paid, ready for next day
        setShowPayment(false);
      } else if (!currentDayState?.paid && currentDayState?.shiftsUsed >= 2) {
        // All shifts used, show payment
        setShowPayment(true);
      }
    } catch (err) {
      console.error('Error loading run:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));
    loadRun();
  }, [router, loadRun]);

  const handleMine = async () => {
    if (!run || !selectedBiome) return;
    try {
      const result = await executeMiningShift(run.id, user.id, selectedBiome, selectedDepth, selectedMode);
      setMiningResult(result);
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Mining failed');
    }
  };

  const handleRepair = async () => {
    if (!run) return;
    const damage = 10 - run.rigHP;
    if (damage <= 0) return;
    try {
      await repairRig(run.id, user.id, damage);
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Repair failed');
    }
  };

  const handlePayDue = async () => {
    if (!run) return;
    try {
      await payDayDue(run.id, user.id, useLoanVoucher);
      await loadRun();
      setShowPayment(false);
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const handleMelt = async (specimenId: string) => {
    try {
      await meltSpecimen(specimenId, run.id, user.id);
      await loadRun();
      setMiningResult(null);
    } catch (err: any) {
      alert(err.message || 'Melt failed');
    }
  };

  const handleSell = async (metalType: string, units: number) => {
    try {
      await sellUnits(run.id, user.id, metalType, units);
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Sell failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  }

  if (!run || run.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <Link href="/dashboard" className="text-blue-400 hover:underline">
          ← Back to Dashboard
        </Link>
        <div className="mt-8">No active run</div>
      </div>
    );
  }

  const currentDayState = run.dayStates?.find((ds: any) => ds.day === run.currentDay);
  const canMine = currentDayState && currentDayState.shiftsUsed < 2;
  const repairCost = (10 - run.rigHP) * 180;
  const canRepair = run.rigHP < 10 && run.credits >= repairCost;

  // Group stash items by metal
  const stashByMetal: Record<string, number> = {};
  run.stashItems?.forEach((item: any) => {
    stashByMetal[item.metalType] = (stashByMetal[item.metalType] || 0) + item.units;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Run - Day {run.currentDay}/12</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Credits</div>
            <div className="text-2xl font-bold">{run.credits}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Rig HP</div>
            <div className="text-2xl font-bold">{run.rigHP}/10</div>
            {canRepair && (
              <button
                onClick={handleRepair}
                className="mt-2 text-sm bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded"
              >
                Repair ({repairCost} credits)
              </button>
            )}
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Day Due</div>
            <div className="text-2xl font-bold">{currentDayState?.due || 0}</div>
            {currentDayState && !currentDayState.paid && (
              <div className={`text-sm mt-1 ${run.credits >= currentDayState.due ? 'text-green-400' : 'text-red-400'}`}>
                {run.credits >= currentDayState.due ? 'Can pay' : 'Cannot pay'}
              </div>
            )}
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Shifts</div>
            <div className="text-2xl font-bold">
              {currentDayState?.shiftsUsed || 0}/2
            </div>
          </div>
        </div>

        {showPayment && currentDayState && !currentDayState.paid && (
          <div className="bg-yellow-900/50 border border-yellow-600 p-6 rounded mb-6">
            <h2 className="text-2xl font-bold mb-4">Pay Day Due</h2>
            <div className="mb-4">
              <div>Due: {currentDayState.due} credits</div>
              <div>You have: {run.credits} credits</div>
              {run.credits < currentDayState.due && (
                <div className="mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useLoanVoucher}
                      onChange={(e) => setUseLoanVoucher(e.target.checked)}
                    />
                    Use Loan Voucher (if available)
                  </label>
                </div>
              )}
            </div>
            <button
              onClick={handlePayDue}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold"
            >
              Pay Due
            </button>
          </div>
        )}

        {canMine && (
          <div className="bg-gray-800 p-6 rounded mb-6">
            <h2 className="text-2xl font-bold mb-4">Mine</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">Biome</label>
                <select
                  value={selectedBiome}
                  onChange={(e) => setSelectedBiome(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded"
                >
                  <option value="">Select biome</option>
                  {BIOMES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Depth</label>
                <select
                  value={selectedDepth}
                  onChange={(e) => setSelectedDepth(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-700 rounded"
                >
                  {DEPTHS.map((d) => (
                    <option key={d} value={d}>
                      Depth {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Mode</label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value as 'Drill' | 'Blast')}
                  className="w-full px-4 py-2 bg-gray-700 rounded"
                >
                  {MINING_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleMine}
              disabled={!selectedBiome}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-semibold"
            >
              Mine Shift
            </button>
          </div>
        )}

        {miningResult && (
          <div className="bg-gray-800 p-6 rounded mb-6">
            <h2 className="text-2xl font-bold mb-4">Mining Results</h2>
            <div className="mb-4">
              <div>Damage taken: {miningResult.damage}</div>
              <div>New HP: {miningResult.newHP}</div>
            </div>
            {miningResult.relicCache && (
              <div className="mb-4 p-4 bg-purple-900/50 rounded">
                <div className="font-bold mb-2">Relic Cache Found!</div>
                <div className="space-y-2">
                  {miningResult.relicOptions?.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={async () => {
                        try {
                          const { claimRelic } = await import('@/app/actions/mining');
                          await claimRelic(run.id, user.id, r.id);
                          alert(`Claimed ${r.name}!`);
                          setMiningResult(null);
                          await loadRun();
                        } catch (err: any) {
                          alert(err.message || 'Failed to claim relic');
                        }
                      }}
                      className="block w-full text-left p-2 bg-purple-800 hover:bg-purple-700 rounded"
                    >
                      {r.name}: {r.description}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-bold mb-2">Drops:</h3>
              <div className="space-y-2">
                {miningResult.drops?.map((drop: any, i: number) => (
                  <div key={i} className="p-2 bg-gray-700 rounded">
                    {drop.type === 'units' ? (
                      <div>
                        {drop.units} units of {drop.metalType}
                      </div>
                    ) : (
                      <div>
                        Specimen: {drop.form} {drop.metalType} ({drop.grade}) - {drop.meltUnits} units
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded">
            <h2 className="text-2xl font-bold mb-4">Stash (Units)</h2>
            {Object.keys(stashByMetal).length === 0 ? (
              <div className="text-gray-400">No units in stash</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(stashByMetal).map(([metal, units]) => (
                  <div key={metal} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <span>{metal}: {units} units</span>
                    <button
                      onClick={() => handleSell(metal, units)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                      Sell All
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-6 rounded">
            <h2 className="text-2xl font-bold mb-4">Specimens</h2>
            {!run.specimens || run.specimens.length === 0 ? (
              <div className="text-gray-400">No specimens</div>
            ) : (
              <div className="space-y-2">
                {run.specimens.map((spec: any) => (
                  <div key={spec.id} className="p-2 bg-gray-700 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold">{spec.form} {spec.metalType}</div>
                        <div className="text-sm text-gray-400">
                          {spec.grade} - {spec.biome} - Depth {spec.depth}
                        </div>
                        <div className="text-sm">Melt value: {spec.meltUnits} units</div>
                      </div>
                      <button
                        onClick={() => handleMelt(spec.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        Melt
                      </button>
                    </div>
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

