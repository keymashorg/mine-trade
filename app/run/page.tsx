'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveRun, repairRig, payDayDue } from '@/app/actions/run';
import { executeDepthTrackNode, extractFromDepthTrack } from '@/app/actions/depthTrack';
import { meltSpecimen, sellUnits } from '@/app/actions/mining';
import { BIOMES, MINING_MODES, METALS } from '@/lib/game/constants';
import { getHazardChoices, type HazardType } from '@/lib/game/depthTrack';
import Link from 'next/link';
import RunHUD from '@/components/RunHUD';
import DepthTrack from '@/components/DepthTrack';
import HazardModal from '@/components/HazardModal';
import ResourceIcon from '@/components/ResourceIcon';
import { getMetalIcon, getFormIcon, getBiomeIcon } from '@/lib/game/icons';

export default function RunPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBiome, setSelectedBiome] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<'Drill' | 'Blast'>('Drill');
  const [miningResult, setMiningResult] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [useLoanVoucher, setUseLoanVoucher] = useState(false);
  const [hazardModal, setHazardModal] = useState<{
    open: boolean;
    hazard: HazardType | null;
    choice1Action: () => void;
    choice2Action: () => void;
  }>({
    open: false,
    hazard: null,
    choice1Action: () => {},
    choice2Action: () => {},
  });
  const [noSpecimenChance, setNoSpecimenChance] = useState(false);

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
        setShowPayment(false);
      } else if (currentDayState && !currentDayState.paid && currentDayState.depthTrackExtracted) {
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

  const handleContinueNode = async () => {
    if (!run || !selectedBiome || !user) return;
    try {
      const result = await executeDepthTrackNode(
        run.id,
        user.id,
        selectedBiome,
        selectedMode,
        noSpecimenChance
      );
      
      setMiningResult(result);
      setNoSpecimenChance(false); // Reset after use
      
      // If hazard triggered, show modal
      if (result.hazardTriggered) {
        const choices = getHazardChoices(result.hazardTriggered);
        setHazardModal({
          open: true,
          hazard: result.hazardTriggered,
          choice1Action: () => handleHazardChoice(result.hazardTriggered!, 1),
          choice2Action: () => handleHazardChoice(result.hazardTriggered!, 2),
        });
      }
      
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Mining failed');
    }
  };

  const handleExtract = async () => {
    if (!run || !user) return;
    try {
      await extractFromDepthTrack(run.id, user.id);
      await loadRun();
      setShowPayment(true);
    } catch (err: any) {
      alert(err.message || 'Extract failed');
    }
  };

  const handleHazardChoice = async (hazard: HazardType, choice: 1 | 2) => {
    if (!run || !user) return;
    
    setHazardModal({ ...hazardModal, open: false });
    
    try {
      // Import hazard handler action
      const { handleHazardChoiceAction } = await import('@/app/actions/depthTrack');
      await handleHazardChoiceAction(run.id, user.id, hazard, choice, {
        stashItems: run.stashItems || [],
        specimens: run.specimens || [],
        credits: run.credits,
        rigHP: run.rigHP,
      });
      
      // Handle client-side state updates
      if (hazard === 'equipment_jam' && choice === 1) {
        setNoSpecimenChance(true);
      }
      if (hazard === 'gas_pocket' && choice === 2) {
        await extractFromDepthTrack(run.id, user.id);
        setShowPayment(true);
      }
      
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Hazard choice failed');
    }
  };

  const handleRepair = async () => {
    if (!run || !user) return;
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
    if (!run || !user) return;
    try {
      await payDayDue(run.id, user.id, useLoanVoucher);
      await loadRun();
      setShowPayment(false);
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const handleMelt = async (specimenId: string) => {
    if (!run || !user) return;
    try {
      await meltSpecimen(specimenId, run.id, user.id);
      await loadRun();
      setMiningResult(null);
    } catch (err: any) {
      alert(err.message || 'Melt failed');
    }
  };

  const handleSell = async (metalType: string, units: number) => {
    if (!run || !user) return;
    try {
      await sellUnits(run.id, user.id, metalType, units);
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Sell failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!run) return null;

  const currentDayState = run.dayStates?.find((ds: any) => ds.day === run.currentDay);
  const currentNode = currentDayState?.depthTrackNode ?? 0;
  const isExtracted = currentDayState?.depthTrackExtracted ?? false;
  const canMine = !isExtracted && currentNode < 5;
  const repairCost = (10 - run.rigHP) * 180;
  const canRepair = run.rigHP < 10 && run.credits >= repairCost;

  // Group stash items by metal
  const stashByMetal: Record<string, number> = {};
  run.stashItems?.forEach((item: any) => {
    stashByMetal[item.metalType] = (stashByMetal[item.metalType] || 0) + item.units;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <RunHUD
        day={run.currentDay}
        due={currentDayState?.due ?? 0}
        credits={run.credits}
        hp={run.rigHP}
        maxHp={10}
        stashSlotsUsed={run.stashSlotsUsed ?? 0}
        stashSlotsMax={run.stashSlots ?? 12}
      />

      <div className="container mx-auto max-w-6xl p-4">
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Run - Day {run.currentDay}/12</h1>
        </div>

        {/* Depth Track */}
        {canMine && (
          <div className="mb-6">
            <DepthTrack
              currentNode={currentNode}
              mode={selectedMode}
              biome={selectedBiome || 'Select Biome'}
              onContinue={handleContinueNode}
              onExtract={handleExtract}
              disabled={!selectedBiome}
            />
          </div>
        )}

        {/* Biome and Mode Selection */}
        {canMine && (
          <div className="bg-gray-800 p-4 rounded mb-6">
            <h2 className="text-xl font-bold mb-4">Select Mining Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Biome</label>
                <select
                  value={selectedBiome}
                  onChange={(e) => setSelectedBiome(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded"
                >
                  <option value="">Select Biome</option>
                  {BIOMES.map((biome) => (
                    <option key={biome} value={biome}>
                      {biome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mode</label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value as 'Drill' | 'Blast')}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded"
                >
                  {MINING_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Mining Result */}
        {miningResult && (
          <div className="bg-gray-800 p-6 rounded mb-6">
            <h2 className="text-2xl font-bold mb-4">Reward</h2>
            {miningResult.reward && (
              <div className="flex items-center gap-4">
                <ResourceIcon
                  iconName={getMetalIcon(miningResult.reward.metalType)}
                  alt={miningResult.reward.metalType}
                  size={48}
                />
                {miningResult.reward.type === 'specimen' ? (
                  <div>
                    <div className="font-bold">
                      {miningResult.reward.specimen?.form} {miningResult.reward.metalType}
                    </div>
                    <div className="text-sm text-gray-400">
                      Grade: {miningResult.reward.specimen?.grade}
                    </div>
                    <button
                      onClick={() => handleMelt(run.specimens?.[run.specimens.length - 1]?.id)}
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Melt to Units
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="font-bold">
                      {miningResult.reward.units} {miningResult.reward.metalType} Units
                    </div>
                  </div>
                )}
              </div>
            )}
            {miningResult.damage > 0 && (
              <div className="mt-4 text-red-400">
                Took {miningResult.damage} damage!
              </div>
            )}
          </div>
        )}

        {/* Stash */}
        <div className="bg-gray-800 p-6 rounded mb-6">
          <h2 className="text-2xl font-bold mb-4">Stash</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(stashByMetal).map(([metal, units]) => (
              <div key={metal} className="bg-gray-700 p-4 rounded">
                <ResourceIcon
                  iconName={getMetalIcon(metal as any)}
                  alt={metal}
                  size={32}
                  className="inline mr-2"
                />
                <div className="font-bold">{metal}</div>
                <div className="text-sm text-gray-400">{units} units</div>
                <button
                  onClick={() => handleSell(metal, units)}
                  className="mt-2 w-full px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                >
                  Sell All
                </button>
              </div>
            ))}
          </div>
          {run.specimens && run.specimens.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Specimens</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {run.specimens.map((spec: any) => (
                  <div key={spec.id} className="bg-gray-700 p-4 rounded">
                    <ResourceIcon
                      iconName={getFormIcon(spec.form)}
                      alt={spec.form}
                      size={32}
                      className="inline mr-2"
                    />
                    <div className="font-bold">{spec.form}</div>
                    <div className="text-sm">{spec.metalType}</div>
                    <div className="text-xs text-gray-400">{spec.grade}</div>
                    <button
                      onClick={() => handleMelt(spec.id)}
                      className="mt-2 w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      Melt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPayment && currentDayState && !currentDayState.paid && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-3xl font-bold mb-4 text-center">PAY DAY DUE</h2>
              <div className="mb-6 text-center">
                <div className="text-2xl font-bold mb-2">
                  Due: {currentDayState.due ?? 0} credits
                </div>
                <div className="text-lg">You have: {run.credits} credits</div>
                {run.credits < (currentDayState.due ?? 0) && (
                  <div className="mt-4 text-red-400">
                    Shortfall: {(currentDayState.due ?? 0) - run.credits} credits
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <button
                  onClick={handlePayDue}
                  disabled={run.credits < (currentDayState.due ?? 0) && !useLoanVoucher}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded font-semibold"
                >
                  Pay Due
                </button>
                {run.credits < (currentDayState.due ?? 0) && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useLoanVoucher}
                      onChange={(e) => setUseLoanVoucher(e.target.checked)}
                    />
                    Use Loan Voucher (+35% next day)
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hazard Modal */}
        {hazardModal.hazard && (
          <HazardModal
            hazard={hazardModal.hazard}
            open={hazardModal.open}
            onChoice1={hazardModal.choice1Action}
            onChoice2={hazardModal.choice2Action}
          />
        )}
      </div>
    </div>
  );
}
