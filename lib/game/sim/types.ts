// Simulation types for the idle loop

import type { MetalType, Biome, Depth, SpecimenForm, Grade } from '../constants';

// ============================================
// Automation Policy
// ============================================
export type SellUnitsPolicy = 'always' | 'only_if_needed' | 'never';
export type KeepSpecimensPolicy = 'high_plus' | 'keep_all' | 'keep_none';

export interface AutomationPolicy {
  sellUnits: SellUnitsPolicy;
  keepSpecimens: KeepSpecimensPolicy;
  meltLow: boolean;
  emergencyMode: boolean;
}

// ============================================
// Module System
// ============================================
export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: 'extraction' | 'cooling' | 'sorting' | 'refining' | 'storage' | 'market';
  slotCost: 1 | 2;
  rarity: 'common' | 'uncommon' | 'rare';
  
  // Modifiers (all additive)
  throughputMod: number;      // +0.25 = +25%
  heatGainMod: number;        // +0.15 = +15% heat gain
  wasteMod: number;           // -0.20 = -20% waste
  specimenChanceMod: number;  // +0.03 = +3% specimen chance
  highGradeChanceMod: number; // +0.10 = +10% high grade chance
  scrapToUnitsMod: number;    // +0.10 = 10% scrap -> units
  storageMod: number;         // +6 = +6 storage
  sellBidBonusMod: number;    // +0.01 = +1% sell price
  volatilityMod: number;      // -0.30 = -30% volatility impact
  upkeepCost: number;         // Credits/day
  unitYieldMod: number;       // -0.05 = -5% unit yield
  jamChanceMod: number;       // +0.03 = +3% jam chance
  
  unlockCondition?: string;   // Journal unlock requirement
}

export interface InstalledModule {
  definition: ModuleDefinition;
  slotIndex: number;
  installedDay: number;
}

// ============================================
// Rig State
// ============================================
export interface RigModifiers {
  throughput: number;      // Final multiplier
  heatGain: number;        // Final multiplier
  waste: number;           // Final waste rate (0-1)
  specimenChance: number;  // Added chance
  highGradeChance: number; // Added chance
  scrapToUnits: number;    // Scrap recovery rate
  storage: number;         // Total storage
  sellBidBonus: number;    // Sell price bonus
  volatilityImpact: number;// Volatility reduction
  dailyUpkeep: number;     // Total upkeep cost
  unitYield: number;       // Unit yield multiplier
  jamChance: number;       // Jam chance
}

// ============================================
// Shift State
// ============================================
export interface ShiftState {
  tick: number;
  maxTicks: number;
  biome: Biome;
  depth: Depth;
  
  // Core meters
  heat: number;           // 0-100
  storageUsed: number;    // Current storage
  storageMax: number;     // Max storage
  wasteAccum: number;     // Total waste this shift
  
  // Player controls
  overclockActive: boolean;
  purgeCooldown: number;  // Ticks until purge available
  
  // Production tracking
  unitsProduced: Record<MetalType, number>;
  specimensFound: Specimen[];
  scrapProduced: number;
  
  // Events
  heatThrottled: boolean;
  throttleTicks: number;
  purgesUsed: number;
  overclockTicks: number;
  damageFromHeat: number;
  
  // State flags
  isComplete: boolean;
  endedEarly: boolean;
}

export interface Specimen {
  id: string;
  metalType: MetalType;
  form: SpecimenForm;
  grade: Grade;
  biome: Biome;
  depth: number;
  meltUnits: number;
}

// ============================================
// Tick Output
// ============================================
export interface TickResult {
  unitsGenerated: Record<MetalType, number>;
  specimen?: Specimen;
  scrapGenerated: number;
  heatDelta: number;
  storageDelta: number;
  eventMessage?: string;
  overflow: boolean;
}

// ============================================
// Shift Summary
// ============================================
export interface ShiftSummary {
  day: number;
  biome: Biome;
  depth: Depth;
  
  // Production
  totalUnitsProduced: Record<MetalType, number>;
  totalSpecimensFound: Specimen[];
  totalScrap: number;
  
  // Meters
  heatMax: number;
  storageMax: number;
  wastePercent: number;
  
  // Events
  heatThrottled: boolean;
  damageFromHeat: number;
  purgesUsed: number;
  overclockTicks: number;
  
  // Duration
  ticksRun: number;
  endedEarly: boolean;
}

// ============================================
// End of Day
// ============================================
export interface EndOfDayResult {
  // Before policy
  rawCredits: number;
  rawSpecimens: Specimen[];
  
  // After policy
  creditsSold: number;
  specimensKept: Specimen[];
  specimensMelted: Specimen[];
  
  // Costs
  upkeepPaid: number;
  repairCost: number;
  repairPaid: boolean;
  
  // Due payment
  due: number;
  creditsBefore: number;
  creditsAfter: number;
  duePaid: boolean;
  
  // Run status
  runEnded: boolean;
  runStatus: 'active' | 'won' | 'lost';
}

// ============================================
// Module Draft
// ============================================
export interface ModuleDraft {
  options: ModuleDefinition[];
  chosen?: ModuleDefinition;
}
