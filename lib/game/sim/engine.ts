// Core simulation engine for the idle loop

import { SeededRNG } from '../rng';
import {
  METALS,
  BIOME_METAL_WEIGHTS,
  FORM_BASE_UNITS,
  GRADE_MULTIPLIERS,
  SPECIMEN_FORMS,
  DEPTH_GRADE_DISTRIBUTION,
  type MetalType,
  type Biome,
  type Depth,
  type SpecimenForm,
  type Grade,
} from '../constants';
import {
  DEFAULT_SHIFT_DURATION,
  HEAT_MAX,
  HEAT_THROTTLE_THRESHOLD,
  HEAT_THROTTLE_PENALTY,
  HEAT_DECAY_PER_TICK,
  BASE_HEAT_GAIN_PER_TICK,
  OVERCLOCK_THROUGHPUT_BONUS,
  OVERCLOCK_HEAT_PENALTY,
  PURGE_COOLDOWN,
  PURGE_HEAT_REDUCTION,
  PURGE_ORE_LOSS,
  BASE_STORAGE,
  SCRAP_VALUE_MULTIPLIER,
  BASE_WASTE_RATE,
  DEPTH_MODIFIERS,
  BASE_UNITS_PER_TICK,
  UNIT_VARIANCE,
} from './constants';
import type {
  ShiftState,
  TickResult,
  ShiftSummary,
  Specimen,
  RigModifiers,
  InstalledModule,
} from './types';

// ============================================
// Initialize Shift State
// ============================================
export function createShiftState(
  biome: Biome,
  depth: Depth,
  rigModifiers: RigModifiers,
  maxTicks: number = DEFAULT_SHIFT_DURATION
): ShiftState {
  const metalTypes: MetalType[] = ['SOL', 'AES', 'VIR', 'LUN', 'NOC', 'CRN'];
  const unitsProduced: Record<MetalType, number> = {} as Record<MetalType, number>;
  metalTypes.forEach(m => unitsProduced[m] = 0);
  
  return {
    tick: 0,
    maxTicks,
    biome,
    depth,
    heat: 0,
    storageUsed: 0,
    storageMax: rigModifiers.storage,
    wasteAccum: 0,
    overclockActive: false,
    purgeCooldown: 0,
    unitsProduced,
    specimensFound: [],
    scrapProduced: 0,
    heatThrottled: false,
    throttleTicks: 0,
    purgesUsed: 0,
    overclockTicks: 0,
    damageFromHeat: 0,
    isComplete: false,
    endedEarly: false,
  };
}

// ============================================
// Calculate Rig Modifiers from Modules
// ============================================
export function calculateRigModifiers(modules: InstalledModule[]): RigModifiers {
  const base: RigModifiers = {
    throughput: 1.0,
    heatGain: 1.0,
    waste: BASE_WASTE_RATE,
    specimenChance: 0,
    highGradeChance: 0,
    scrapToUnits: 0,
    storage: BASE_STORAGE,
    sellBidBonus: 0,
    volatilityImpact: 1.0,
    dailyUpkeep: 0,
    unitYield: 1.0,
    jamChance: 0,
  };
  
  for (const mod of modules) {
    const def = mod.definition;
    base.throughput += def.throughputMod;
    base.heatGain += def.heatGainMod;
    base.waste += def.wasteMod;
    base.specimenChance += def.specimenChanceMod;
    base.highGradeChance += def.highGradeChanceMod;
    base.scrapToUnits += def.scrapToUnitsMod;
    base.storage += def.storageMod;
    base.sellBidBonus += def.sellBidBonusMod;
    base.volatilityImpact -= def.volatilityMod;
    base.dailyUpkeep += def.upkeepCost;
    base.unitYield += def.unitYieldMod;
    base.jamChance += def.jamChanceMod;
  }
  
  // Clamp values
  base.throughput = Math.max(0.1, base.throughput);
  base.heatGain = Math.max(0.1, base.heatGain);
  base.waste = Math.max(0, Math.min(1, base.waste));
  base.storage = Math.max(10, base.storage);
  base.unitYield = Math.max(0.1, base.unitYield);
  
  return base;
}

// ============================================
// Process Single Tick
// ============================================
export function processTick(
  state: ShiftState,
  rigModifiers: RigModifiers,
  rng: SeededRNG
): TickResult {
  const depthMods = DEPTH_MODIFIERS[state.depth];
  const result: TickResult = {
    unitsGenerated: {} as Record<MetalType, number>,
    scrapGenerated: 0,
    heatDelta: 0,
    storageDelta: 0,
    overflow: false,
  };
  
  // Initialize units to 0
  const metalTypes: MetalType[] = ['SOL', 'AES', 'VIR', 'LUN', 'NOC', 'CRN'];
  metalTypes.forEach(m => result.unitsGenerated[m] = 0);
  
  // Check if throttled
  const isThrottled = state.heat >= HEAT_THROTTLE_THRESHOLD;
  if (isThrottled && !state.heatThrottled) {
    state.heatThrottled = true;
    state.damageFromHeat += 1; // +1 damage at end of day
  }
  if (isThrottled) {
    state.throttleTicks++;
  }
  
  // Calculate effective throughput
  let throughputMult = rigModifiers.throughput * depthMods.throughputMult;
  if (isThrottled) {
    throughputMult *= (1 - HEAT_THROTTLE_PENALTY);
  }
  if (state.overclockActive) {
    throughputMult *= (1 + OVERCLOCK_THROUGHPUT_BONUS);
    state.overclockTicks++;
  }
  
  // Apply unit yield modifier
  throughputMult *= rigModifiers.unitYield;
  
  // Generate base units
  const variance = (rng.random() - 0.5) * 2 * UNIT_VARIANCE;
  const rawUnits = BASE_UNITS_PER_TICK * throughputMult * (1 + variance);
  
  // Apply waste
  const effectiveWaste = Math.max(0, Math.min(1, rigModifiers.waste * depthMods.wasteMult));
  const wastedUnits = rawUnits * effectiveWaste;
  const goodUnits = rawUnits - wastedUnits;
  
  state.wasteAccum += wastedUnits;
  
  // Select metal type based on biome weights
  const metalType = selectMetalForBiome(state.biome, rng);
  
  // Check storage capacity
  const storageRemaining = state.storageMax - state.storageUsed;
  let unitsToStore = Math.floor(goodUnits);
  let scrap = 0;
  
  if (unitsToStore > storageRemaining) {
    scrap = unitsToStore - storageRemaining;
    unitsToStore = storageRemaining;
    result.overflow = true;
    
    // Scrap recovery from modules
    const recovered = Math.floor(scrap * rigModifiers.scrapToUnits);
    scrap -= recovered;
    unitsToStore += recovered;
    
    // Cap at storage max
    if (unitsToStore > storageRemaining) {
      scrap += unitsToStore - storageRemaining;
      unitsToStore = storageRemaining;
    }
  }
  
  // Store units
  if (unitsToStore > 0) {
    result.unitsGenerated[metalType] = unitsToStore;
    state.unitsProduced[metalType] += unitsToStore;
    state.storageUsed += unitsToStore;
    result.storageDelta = unitsToStore;
  }
  
  // Track scrap
  if (scrap > 0) {
    result.scrapGenerated = scrap;
    state.scrapProduced += scrap;
  }
  
  // Check for specimen
  const specimenChance = depthMods.specimenChance + rigModifiers.specimenChance;
  if (rng.random() < specimenChance) {
    const specimen = generateSpecimen(
      state.biome,
      state.depth,
      rigModifiers.highGradeChance,
      rng
    );
    result.specimen = specimen;
    state.specimensFound.push(specimen);
  }
  
  // Calculate heat
  let heatGain = BASE_HEAT_GAIN_PER_TICK * rigModifiers.heatGain * depthMods.heatGainMult;
  if (state.overclockActive) {
    heatGain *= (1 + OVERCLOCK_HEAT_PENALTY);
  }
  
  // Natural decay
  const heatDecay = HEAT_DECAY_PER_TICK;
  const netHeat = heatGain - heatDecay;
  
  state.heat = Math.max(0, Math.min(HEAT_MAX, state.heat + netHeat));
  result.heatDelta = netHeat;
  
  // Update purge cooldown
  if (state.purgeCooldown > 0) {
    state.purgeCooldown--;
  }
  
  // Advance tick
  state.tick++;
  
  // Check completion
  if (state.tick >= state.maxTicks) {
    state.isComplete = true;
  }
  
  return result;
}

// ============================================
// Toggle Overclock
// ============================================
export function toggleOverclock(state: ShiftState, active: boolean): void {
  state.overclockActive = active;
}

// ============================================
// Activate Purge Valve
// ============================================
export function activatePurge(state: ShiftState): boolean {
  if (state.purgeCooldown > 0) {
    return false;
  }
  
  // Reduce heat
  state.heat = Math.max(0, state.heat - PURGE_HEAT_REDUCTION);
  
  // Lose some ore (reduce storage)
  const oreLoss = Math.floor(state.storageUsed * PURGE_ORE_LOSS);
  state.storageUsed = Math.max(0, state.storageUsed - oreLoss);
  
  // Set cooldown
  state.purgeCooldown = PURGE_COOLDOWN;
  state.purgesUsed++;
  
  return true;
}

// ============================================
// End Shift Early
// ============================================
export function endShiftEarly(state: ShiftState): void {
  state.isComplete = true;
  state.endedEarly = true;
}

// ============================================
// Generate Shift Summary
// ============================================
export function generateShiftSummary(
  state: ShiftState,
  day: number
): ShiftSummary {
  const totalUnits = Object.values(state.unitsProduced).reduce((a, b) => a + b, 0);
  const wastePercent = totalUnits > 0 
    ? state.wasteAccum / (totalUnits + state.wasteAccum) 
    : 0;
  
  return {
    day,
    biome: state.biome,
    depth: state.depth,
    totalUnitsProduced: { ...state.unitsProduced },
    totalSpecimensFound: [...state.specimensFound],
    totalScrap: state.scrapProduced,
    heatMax: state.heat,
    storageMax: state.storageUsed,
    wastePercent,
    heatThrottled: state.heatThrottled,
    damageFromHeat: state.damageFromHeat,
    purgesUsed: state.purgesUsed,
    overclockTicks: state.overclockTicks,
    ticksRun: state.tick,
    endedEarly: state.endedEarly,
  };
}

// ============================================
// Helper Functions
// ============================================
function selectMetalForBiome(biome: Biome, rng: SeededRNG): MetalType {
  const weights = BIOME_METAL_WEIGHTS[biome];
  const items = Object.entries(weights)
    .filter(([_, weight]) => weight > 0)
    .map(([metal, weight]) => ({
      item: metal as MetalType,
      weight,
    }));
  
  return rng.weightedChoice(items);
}

function selectGradeForDepth(
  depth: Depth,
  highGradeBonus: number,
  rng: SeededRNG
): Grade {
  const distribution = { ...DEPTH_GRADE_DISTRIBUTION[depth] };
  
  // Apply high grade bonus
  if (highGradeBonus > 0) {
    const bonus = highGradeBonus;
    // Shift probability from Low to High and Ultra
    const shiftToHigh = bonus * 0.7;
    const shiftToUltra = bonus * 0.3;
    distribution.Low = Math.max(0, distribution.Low - bonus);
    distribution.High = Math.min(1, distribution.High + shiftToHigh);
    distribution.Ultra = Math.min(1, distribution.Ultra + shiftToUltra);
  }
  
  return rng.weightedChoice([
    { item: 'Low' as Grade, weight: distribution.Low },
    { item: 'High' as Grade, weight: distribution.High },
    { item: 'Ultra' as Grade, weight: distribution.Ultra },
  ]);
}

function generateSpecimen(
  biome: Biome,
  depth: number,
  highGradeBonus: number,
  rng: SeededRNG
): Specimen {
  const metalType = selectMetalForBiome(biome, rng);
  const form = rng.choice([...SPECIMEN_FORMS]) as SpecimenForm;
  const grade = selectGradeForDepth(depth as Depth, highGradeBonus, rng);
  
  const baseUnits = FORM_BASE_UNITS[form];
  const meltUnits = Math.round(baseUnits * GRADE_MULTIPLIERS[grade]);
  
  return {
    id: `spec_${Date.now()}_${rng.randomInt(1000, 9999)}`,
    metalType,
    form,
    grade,
    biome,
    depth,
    meltUnits,
  };
}

// ============================================
// Run Full Shift (for server-side processing)
// ============================================
export function runFullShift(
  biome: Biome,
  depth: Depth,
  rigModifiers: RigModifiers,
  seed: number,
  maxTicks: number = DEFAULT_SHIFT_DURATION
): { state: ShiftState; tickResults: TickResult[] } {
  const rng = new SeededRNG(seed);
  const state = createShiftState(biome, depth, rigModifiers, maxTicks);
  const tickResults: TickResult[] = [];
  
  while (!state.isComplete) {
    const result = processTick(state, rigModifiers, rng);
    tickResults.push(result);
  }
  
  return { state, tickResults };
}
