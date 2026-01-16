'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getActiveRun } from '@/app/actions/run';
import {
  setShiftParameters,
  executeShift,
  chooseDraftModule,
  updatePolicy,
  payDue,
  advanceDay,
  sellUnitsForCredits,
  meltSpecimenForUnits,
  repairRig,
} from '@/app/actions/shift';
import { BIOMES, DEPTHS, METALS, type Biome, type Depth, type MetalType } from '@/lib/game/constants';
import { DEPTH_MODIFIERS } from '@/lib/game/sim/constants';
import type { ModuleDefinition, ShiftSummary } from '@/lib/game/sim/types';
import RunHUD from '@/components/RunHUD';
import ResourceIcon from '@/components/ResourceIcon';
import { getMetalIcon, getFormIcon, getBiomeIcon } from '@/lib/game/icons';

type GamePhase = 'setup' | 'shift' | 'summary' | 'draft' | 'repair' | 'payment' | 'next_day' | 'lost' | 'won';

export default function RunPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<GamePhase>('setup');
  
  // Setup state
  const [selectedBiome, setSelectedBiome] = useState<Biome | ''>('');
  const [selectedDepth, setSelectedDepth] = useState<Depth>(1);
  
  // Shift simulation state (client-side animation)
  const [shiftProgress, setShiftProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Post-shift state
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
  const [draftOptions, setDraftOptions] = useState<ModuleDefinition[]>([]);
  const [rigDamage, setRigDamage] = useState(0);
  
  // Policy state
  const [policy, setPolicy] = useState({
    sellUnits: 'only_if_needed' as 'always' | 'only_if_needed' | 'never',
    keepSpecimens: 'high_plus' as 'high_plus' | 'keep_all' | 'keep_none',
    meltLow: false,
    emergencyMode: true,
  });
  
  const loadRun = useCallback(async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    
    try {
      const activeRun = await getActiveRun(userData.id);
      if (!activeRun) {
        router.push('/dashboard');
        return;
      }
      setRun(activeRun);
      
      // Determine phase
      const currentDayState = activeRun.dayStates?.find((ds: any) => ds.day === activeRun.currentDay);
      if (currentDayState?.paid) {
        setPhase('next_day');
      } else if (currentDayState?.shiftCompleted) {
        if (currentDayState.draftChosen) {
          setPhase('payment');
        } else if (currentDayState.draftOffered) {
          setPhase('draft');
        } else {
          setPhase('summary');
        }
      } else {
        setPhase('setup');
      }
      
      // Load policy from run
      setPolicy({
        sellUnits: activeRun.policySellUnits || 'only_if_needed',
        keepSpecimens: activeRun.policyKeepSpecimens || 'high_plus',
        meltLow: activeRun.policyMeltLow || false,
        emergencyMode: activeRun.policyEmergency ?? true,
      });
    } catch (err) {
      console.error('Error loading run:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  // Start shift simulation
  const handleStartShift = async () => {
    if (!run || !user || !selectedBiome) return;
    
    try {
      // Set parameters
      await setShiftParameters(run.id, user.id, selectedBiome, selectedDepth);
      
      // Start visual simulation
      setIsSimulating(true);
      setPhase('shift');
      setShiftProgress(0);
      
      // Animate progress bar over ~3 seconds (simulating 75 ticks)
      const duration = 3000;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        setShiftProgress(progress);
        
        if (progress < 100) {
          requestAnimationFrame(animate);
        } else {
          // Execute the actual shift
          executeActualShift();
        }
      };
      
      requestAnimationFrame(animate);
    } catch (err: any) {
      alert(err.message || 'Failed to start shift');
      setIsSimulating(false);
    }
  };

  const executeActualShift = async () => {
    try {
      const result = await executeShift(run.id, user.id);
      setShiftSummary(result.summary);
      setDraftOptions(result.draftOptions);
      setRigDamage(result.rigDamage);
      setIsSimulating(false);
      setPhase('summary');
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Shift failed');
      setIsSimulating(false);
    }
  };

  const handleContinueFromSummary = () => {
    if (draftOptions.length > 0) {
      setPhase('draft');
    } else {
      setPhase('payment');
    }
  };

  const handleDraftChoice = async (moduleId: string) => {
    try {
      await chooseDraftModule(run.id, user.id, moduleId);
      await loadRun();
      setPhase('repair');
    } catch (err: any) {
      alert(err.message || 'Draft failed');
    }
  };

  const handleSkipDraft = () => {
    setPhase('repair');
  };

  const handleRepair = async (hp: number) => {
    try {
      await repairRig(run.id, user.id, hp);
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Repair failed');
    }
  };

  const handleContinueToPayment = () => {
    setPhase('payment');
  };

  const handlePayDue = async () => {
    try {
      const result = await payDue(run.id, user.id);
      
      if (result.status === 'lost') {
        setPhase('lost');
      } else if (result.status === 'won') {
        setPhase('won');
      } else {
        setPhase('next_day');
      }
      
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const handleNextDay = async () => {
    try {
      await advanceDay(run.id, user.id);
      setSelectedBiome('');
      setSelectedDepth(1);
      setShiftSummary(null);
      setDraftOptions([]);
      setPhase('setup');
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Failed to advance');
    }
  };

  const handleSellUnits = async (metalType: MetalType, units: number) => {
    try {
      await sellUnitsForCredits(run.id, user.id, metalType, units);
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Sell failed');
    }
  };

  const handleMeltSpecimen = async (specimenId: string) => {
    try {
      await meltSpecimenForUnits(run.id, user.id, specimenId);
      await loadRun();
    } catch (err: any) {
      alert(err.message || 'Melt failed');
    }
  };

  const handlePolicyChange = async (key: string, value: any) => {
    const newPolicy = { ...policy, [key]: value };
    setPolicy(newPolicy);
    try {
      await updatePolicy(run.id, user.id, { [key]: value });
    } catch (err) {
      console.error('Policy update failed:', err);
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
  
  // Group stash items by metal
  const stashByMetal: Record<string, number> = {};
  run.stashItems?.forEach((item: any) => {
    stashByMetal[item.metalType] = (stashByMetal[item.metalType] || 0) + item.units;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* HUD */}
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
          <h1 className="text-3xl font-bold">Day {run.currentDay}/12</h1>
        </div>

        {/* PHASE: Setup - Choose Biome/Depth */}
        {phase === 'setup' && (
          <div className="space-y-6">
            {/* Biome Selection */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Choose Mining Location</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Biome</label>
                <div className="grid grid-cols-3 gap-4">
                  {BIOMES.map((biome) => (
                    <button
                      key={biome}
                      onClick={() => setSelectedBiome(biome)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedBiome === biome
                          ? 'border-yellow-500 bg-yellow-500/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <ResourceIcon
                        iconName={getBiomeIcon(biome)}
                        alt={biome}
                        size={48}
                        className="mx-auto mb-2"
                      />
                      <div className="font-bold">{biome}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Depth</label>
                <div className="grid grid-cols-3 gap-4">
                  {DEPTHS.map((depth) => {
                    const mods = DEPTH_MODIFIERS[depth];
                    return (
                      <button
                        key={depth}
                        onClick={() => setSelectedDepth(depth)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedDepth === depth
                            ? 'border-yellow-500 bg-yellow-500/20'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-2xl font-bold mb-2">Depth {depth}</div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>Throughput: {Math.round(mods.throughputMult * 100)}%</div>
                          <div>Specimen: {Math.round(mods.specimenChance * 100)}%</div>
                          <div>Heat: {Math.round(mods.heatGainMult * 100)}%</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleStartShift}
                disabled={!selectedBiome}
                className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-xl transition-colors"
              >
                Start Mining Shift
              </button>
            </div>

            {/* Automation Policy */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Automation Policy</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Sell Units</label>
                  <select
                    value={policy.sellUnits}
                    onChange={(e) => handlePolicyChange('sellUnits', e.target.value)}
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                  >
                    <option value="always">Always Sell</option>
                    <option value="only_if_needed">Only If Needed for Due</option>
                    <option value="never">Never Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Keep Specimens</label>
                  <select
                    value={policy.keepSpecimens}
                    onChange={(e) => handlePolicyChange('keepSpecimens', e.target.value)}
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                  >
                    <option value="high_plus">High+ Only</option>
                    <option value="keep_all">Keep All</option>
                    <option value="keep_none">Keep None (Melt All)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={policy.meltLow}
                    onChange={(e) => handlePolicyChange('meltLow', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Melt Low-Grade Specimens</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={policy.emergencyMode}
                    onChange={(e) => handlePolicyChange('emergencyMode', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Emergency Auto-Sell</span>
                </label>
              </div>
            </div>

            {/* Current Inventory */}
            <InventoryPanel
              stashByMetal={stashByMetal}
              specimens={run.specimens || []}
              onSell={handleSellUnits}
              onMelt={handleMeltSpecimen}
            />
          </div>
        )}

        {/* PHASE: Shift Animation */}
        {phase === 'shift' && (
          <div className="bg-gray-800 p-8 rounded-lg text-center">
            <h2 className="text-3xl font-bold mb-6">Mining Shift in Progress</h2>
            <div className="mb-4 text-gray-400">
              {selectedBiome} - Depth {selectedDepth}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-6 mb-4">
              <div
                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-6 rounded-full transition-all duration-100"
                style={{ width: `${shiftProgress}%` }}
              />
            </div>
            <div className="text-2xl font-mono">{Math.round(shiftProgress)}%</div>
            
            {/* Animated icons would go here */}
            <div className="mt-8 flex justify-center gap-4 animate-pulse">
              <span className="text-4xl">⛏️</span>
              <span className="text-4xl">💎</span>
              <span className="text-4xl">🔥</span>
            </div>
          </div>
        )}

        {/* PHASE: Summary */}
        {phase === 'summary' && shiftSummary && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Shift Complete!</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded text-center">
                <div className="text-sm text-gray-400">Total Units</div>
                <div className="text-2xl font-bold">
                  {Object.values(shiftSummary.totalUnitsProduced).reduce((a, b) => a + b, 0)}
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded text-center">
                <div className="text-sm text-gray-400">Specimens</div>
                <div className="text-2xl font-bold text-purple-400">
                  {shiftSummary.totalSpecimensFound.length}
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded text-center">
                <div className="text-sm text-gray-400">Heat Max</div>
                <div className={`text-2xl font-bold ${shiftSummary.heatThrottled ? 'text-red-400' : 'text-green-400'}`}>
                  {Math.round(shiftSummary.heatMax)}%
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded text-center">
                <div className="text-sm text-gray-400">Waste</div>
                <div className="text-2xl font-bold">
                  {Math.round(shiftSummary.wastePercent * 100)}%
                </div>
              </div>
            </div>

            {shiftSummary.heatThrottled && (
              <div className="bg-red-900/50 border border-red-500 p-4 rounded mb-6 text-center">
                <span className="text-red-400 font-bold">
                  ⚠️ Heat Throttled! +{shiftSummary.damageFromHeat} Rig Damage
                </span>
              </div>
            )}

            {/* Units breakdown */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
              {Object.entries(shiftSummary.totalUnitsProduced)
                .filter(([_, units]) => units > 0)
                .map(([metal, units]) => (
                  <div key={metal} className="bg-gray-700 p-3 rounded text-center">
                    <ResourceIcon
                      iconName={getMetalIcon(metal as MetalType)}
                      alt={metal}
                      size={32}
                      className="mx-auto mb-1"
                    />
                    <div className="text-xs text-gray-400">{metal}</div>
                    <div className="font-bold">{units}</div>
                  </div>
                ))}
            </div>

            <button
              onClick={handleContinueFromSummary}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
            >
              Continue
            </button>
          </div>
        )}

        {/* PHASE: Module Draft */}
        {phase === 'draft' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Choose an Upgrade Module</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {draftOptions.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => handleDraftChoice(mod.id)}
                  className="bg-gray-700 p-4 rounded-lg border-2 border-gray-600 hover:border-yellow-500 transition-all text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg">{mod.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      mod.rarity === 'rare' ? 'bg-purple-600' :
                      mod.rarity === 'uncommon' ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      {mod.rarity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{mod.description}</p>
                  <div className="text-xs space-y-1">
                    {mod.throughputMod !== 0 && (
                      <div className={mod.throughputMod > 0 ? 'text-green-400' : 'text-red-400'}>
                        Throughput: {mod.throughputMod > 0 ? '+' : ''}{Math.round(mod.throughputMod * 100)}%
                      </div>
                    )}
                    {mod.heatGainMod !== 0 && (
                      <div className={mod.heatGainMod < 0 ? 'text-green-400' : 'text-red-400'}>
                        Heat Gain: {mod.heatGainMod > 0 ? '+' : ''}{Math.round(mod.heatGainMod * 100)}%
                      </div>
                    )}
                    {mod.wasteMod !== 0 && (
                      <div className={mod.wasteMod < 0 ? 'text-green-400' : 'text-red-400'}>
                        Waste: {mod.wasteMod > 0 ? '+' : ''}{Math.round(mod.wasteMod * 100)}%
                      </div>
                    )}
                    {mod.storageMod !== 0 && (
                      <div className={mod.storageMod > 0 ? 'text-green-400' : 'text-red-400'}>
                        Storage: {mod.storageMod > 0 ? '+' : ''}{mod.storageMod}
                      </div>
                    )}
                    {mod.specimenChanceMod !== 0 && (
                      <div className="text-green-400">
                        Specimen Chance: +{Math.round(mod.specimenChanceMod * 100)}%
                      </div>
                    )}
                    {mod.upkeepCost > 0 && (
                      <div className="text-yellow-400">
                        Upkeep: {mod.upkeepCost}/day
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Slots: {mod.slotCost}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleSkipDraft}
              className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            >
              Skip Draft
            </button>
          </div>
        )}

        {/* PHASE: Repair */}
        {phase === 'repair' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Rig Maintenance</h2>
            
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className={i < run.rigHP ? 'text-red-500' : 'text-gray-700'}>
                    ♥
                  </span>
                ))}
              </div>
              <div className="text-xl">{run.rigHP}/10 HP</div>
            </div>

            {run.rigHP < 10 && (
              <div className="space-y-4 mb-6">
                {[1, 2, 5, 10 - run.rigHP].filter((v, i, a) => v > 0 && a.indexOf(v) === i && v <= 10 - run.rigHP).map((hp) => (
                  <button
                    key={hp}
                    onClick={() => handleRepair(hp)}
                    disabled={run.credits < hp * 180}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
                  >
                    Repair {hp} HP for {hp * 180} credits
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleContinueToPayment}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {/* PHASE: Payment */}
        {phase === 'payment' && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-3xl font-bold mb-4 text-center">PAY DAY DUE</h2>
              
              {run.dailyUpkeep > 0 && (
                <div className="bg-gray-800 p-4 rounded mb-4">
                  <div className="text-sm text-gray-400">Module Upkeep</div>
                  <div className="text-xl font-bold text-yellow-400">{run.dailyUpkeep} credits</div>
                </div>
              )}
              
              <div className="mb-6 text-center">
                <div className="text-2xl font-bold mb-2">
                  Due: {currentDayState?.due ?? 0} credits
                </div>
                <div className="text-lg">You have: {run.credits} credits</div>
                
                {run.credits - run.dailyUpkeep < (currentDayState?.due ?? 0) && (
                  <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded">
                    <div className="text-red-400 font-bold">INSUFFICIENT FUNDS</div>
                    <div className="text-sm">
                      Shortfall: {(currentDayState?.due ?? 0) + run.dailyUpkeep - run.credits} credits
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handlePayDue}
                className={`w-full py-4 rounded-lg font-bold text-xl ${
                  run.credits - run.dailyUpkeep >= (currentDayState?.due ?? 0)
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {run.credits - run.dailyUpkeep >= (currentDayState?.due ?? 0)
                  ? 'Pay Due'
                  : 'Cannot Pay - End Run'}
              </button>
            </div>
          </div>
        )}

        {/* PHASE: Next Day */}
        {phase === 'next_day' && (
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <h2 className="text-3xl font-bold mb-4 text-green-400">Day {run.currentDay} Complete!</h2>
            <p className="text-gray-400 mb-6">You survived another day in the mines.</p>
            
            <button
              onClick={handleNextDay}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-xl"
            >
              Continue to Day {run.currentDay + 1}
            </button>
          </div>
        )}

        {/* PHASE: Lost */}
        {phase === 'lost' && (
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <h2 className="text-4xl font-bold mb-4 text-red-500">RUN FAILED</h2>
            <p className="text-xl text-gray-400 mb-6">
              You could not meet the daily payment.
            </p>
            <p className="text-gray-500 mb-8">
              Nothing saved to vault. Try again.
            </p>
            
            <Link
              href="/dashboard"
              className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
            >
              Return to Dashboard
            </Link>
          </div>
        )}

        {/* PHASE: Won */}
        {phase === 'won' && (
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <h2 className="text-4xl font-bold mb-4 text-yellow-400">🏆 RUN COMPLETE! 🏆</h2>
            <p className="text-xl text-gray-300 mb-6">
              You survived all 12 days!
            </p>
            <p className="text-gray-400 mb-8">
              Specimens deposited to your Vault. Check your Journal for new entries!
            </p>
            
            <div className="flex gap-4 justify-center">
              <Link
                href="/vault"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold"
              >
                View Vault
              </Link>
              <Link
                href="/journal"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold"
              >
                View Journal
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Inventory Panel Component
// ============================================
function InventoryPanel({
  stashByMetal,
  specimens,
  onSell,
  onMelt,
}: {
  stashByMetal: Record<string, number>;
  specimens: any[];
  onSell: (metal: MetalType, units: number) => void;
  onMelt: (specimenId: string) => void;
}) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Inventory</h2>
      
      {/* Units */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(stashByMetal).map(([metal, units]) => (
          <div key={metal} className="bg-gray-700 p-3 rounded">
            <div className="flex items-center gap-2 mb-2">
              <ResourceIcon
                iconName={getMetalIcon(metal as MetalType)}
                alt={metal}
                size={24}
              />
              <span className="font-bold">{metal}</span>
            </div>
            <div className="text-sm text-gray-400">{units} units</div>
            <button
              onClick={() => onSell(metal as MetalType, units)}
              className="mt-2 w-full px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
            >
              Sell All
            </button>
          </div>
        ))}
        {Object.keys(stashByMetal).length === 0 && (
          <div className="col-span-full text-gray-500 text-center py-4">
            No units in stash
          </div>
        )}
      </div>

      {/* Specimens */}
      {specimens.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">Specimens</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {specimens.map((spec) => (
              <div
                key={spec.id}
                className={`bg-gray-700 p-3 rounded border-2 ${
                  spec.grade === 'Ultra' ? 'border-purple-500' :
                  spec.grade === 'High' ? 'border-blue-500' : 'border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ResourceIcon
                    iconName={getFormIcon(spec.form)}
                    alt={spec.form}
                    size={24}
                  />
                  <span className="text-sm font-bold">{spec.form}</span>
                </div>
                <div className="text-xs text-gray-400">{spec.metalType}</div>
                <div className={`text-xs ${
                  spec.grade === 'Ultra' ? 'text-purple-400' :
                  spec.grade === 'High' ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {spec.grade}
                </div>
                <button
                  onClick={() => onMelt(spec.id)}
                  className="mt-2 w-full px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs"
                >
                  Melt ({spec.meltUnits})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
