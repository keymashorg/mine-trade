// Module definitions for the rig system

import type { ModuleDefinition } from './types';

// ============================================
// Module Pool (18 modules + 2 starters)
// ============================================

export const MODULE_POOL: ModuleDefinition[] = [
  // ==========================================
  // STARTER MODULES (come with every run)
  // ==========================================
  {
    id: 'basic_drill',
    name: 'Basic Drill',
    description: 'Standard extraction equipment. Does the job.',
    category: 'extraction',
    slotCost: 1,
    rarity: 'common',
    throughputMod: 0,
    heatGainMod: 0,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 0,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'basic_cooler',
    name: 'Basic Cooler',
    description: 'Standard cooling unit. Keeps things running.',
    category: 'cooling',
    slotCost: 1,
    rarity: 'common',
    throughputMod: 0,
    heatGainMod: -0.10,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 0,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  
  // ==========================================
  // EXTRACTION MODULES
  // ==========================================
  {
    id: 'high_torque_drill',
    name: 'High Torque Drill',
    description: 'Powerful drill for faster extraction. Runs hot.',
    category: 'extraction',
    slotCost: 1,
    rarity: 'common',
    throughputMod: 0.25,
    heatGainMod: 0.15,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 0,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'gentle_bit',
    name: 'Gentle Bit',
    description: 'Precision drilling with less heat. Slower pace.',
    category: 'extraction',
    slotCost: 1,
    rarity: 'common',
    throughputMod: -0.10,
    heatGainMod: -0.15,
    wasteMod: -0.05,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 0,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'deep_tap',
    name: 'Deep Tap',
    description: 'Reaches rare veins. Prone to jams.',
    category: 'extraction',
    slotCost: 1,
    rarity: 'uncommon',
    throughputMod: 0,
    heatGainMod: 0.05,
    wasteMod: 0.03,
    specimenChanceMod: 0.05,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 25,
    unitYieldMod: 0,
    jamChanceMod: 0.03,
  },
  {
    id: 'turbo_bore',
    name: 'Turbo Bore',
    description: 'Maximum speed extraction. Heavy maintenance.',
    category: 'extraction',
    slotCost: 2,
    rarity: 'rare',
    throughputMod: 0.45,
    heatGainMod: 0.30,
    wasteMod: 0.05,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 75,
    unitYieldMod: 0,
    jamChanceMod: 0.02,
  },
  
  // ==========================================
  // COOLING MODULES
  // ==========================================
  {
    id: 'cryo_loop',
    name: 'Cryo Loop',
    description: 'Advanced cooling system. Expensive to run.',
    category: 'cooling',
    slotCost: 1,
    rarity: 'uncommon',
    throughputMod: 0,
    heatGainMod: -0.30,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 50,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'heat_sink',
    name: 'Heat Sink',
    description: 'Passive cooling. Slight throughput drag.',
    category: 'cooling',
    slotCost: 1,
    rarity: 'common',
    throughputMod: -0.05,
    heatGainMod: -0.20,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 0,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'thermal_dump',
    name: 'Thermal Dump',
    description: 'Emergency heat venting. Wastes some material.',
    category: 'cooling',
    slotCost: 1,
    rarity: 'common',
    throughputMod: 0,
    heatGainMod: -0.25,
    wasteMod: 0.08,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 0,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  
  // ==========================================
  // SORTING MODULES
  // ==========================================
  {
    id: 'precision_sieve',
    name: 'Precision Sieve',
    description: 'Reduces waste through careful sorting. Slower.',
    category: 'sorting',
    slotCost: 1,
    rarity: 'common',
    throughputMod: -0.10,
    heatGainMod: 0,
    wasteMod: -0.20,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 0,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'magnet_array',
    name: 'Magnet Array',
    description: 'Recovers ore from scrap. Runs warm.',
    category: 'sorting',
    slotCost: 1,
    rarity: 'uncommon',
    throughputMod: 0,
    heatGainMod: 0.05,
    wasteMod: -0.05,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0.15,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 20,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'auto_sorter',
    name: 'Auto Sorter',
    description: 'Automated sorting reduces waste significantly.',
    category: 'sorting',
    slotCost: 2,
    rarity: 'rare',
    throughputMod: 0,
    heatGainMod: 0.10,
    wasteMod: -0.35,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0.10,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 60,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  
  // ==========================================
  // REFINING MODULES
  // ==========================================
  {
    id: 'smelter',
    name: 'Smelter',
    description: 'Converts scrap to usable units. Very hot.',
    category: 'refining',
    slotCost: 1,
    rarity: 'common',
    throughputMod: 0,
    heatGainMod: 0.15,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0.25,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 15,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'assayer',
    name: 'Assayer',
    description: 'Better grade detection. Slightly lower yield.',
    category: 'refining',
    slotCost: 1,
    rarity: 'uncommon',
    throughputMod: 0,
    heatGainMod: 0,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0.10,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 30,
    unitYieldMod: -0.05,
    jamChanceMod: 0,
  },
  {
    id: 'refinery',
    name: 'Refinery',
    description: 'Full-scale processing. High upkeep, big gains.',
    category: 'refining',
    slotCost: 2,
    rarity: 'rare',
    throughputMod: 0.15,
    heatGainMod: 0.20,
    wasteMod: -0.15,
    specimenChanceMod: 0,
    highGradeChanceMod: 0.05,
    scrapToUnitsMod: 0.30,
    storageMod: 0,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 100,
    unitYieldMod: 0.10,
    jamChanceMod: 0,
  },
  
  // ==========================================
  // STORAGE MODULES
  // ==========================================
  {
    id: 'crate_rack',
    name: 'Crate Rack',
    description: 'Extra storage. Slows operations slightly.',
    category: 'storage',
    slotCost: 1,
    rarity: 'common',
    throughputMod: -0.05,
    heatGainMod: 0,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 8,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 0,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'vacuum_vault',
    name: 'Vacuum Vault',
    description: 'Premium storage. Expensive maintenance.',
    category: 'storage',
    slotCost: 1,
    rarity: 'uncommon',
    throughputMod: 0,
    heatGainMod: 0,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 15,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 80,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'cargo_bay',
    name: 'Cargo Bay',
    description: 'Massive storage expansion. Takes two slots.',
    category: 'storage',
    slotCost: 2,
    rarity: 'rare',
    throughputMod: -0.10,
    heatGainMod: 0,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 30,
    sellBidBonusMod: 0,
    volatilityMod: 0,
    upkeepCost: 40,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  
  // ==========================================
  // MARKET MODULES
  // ==========================================
  {
    id: 'fee_reducer',
    name: 'Fee Reducer',
    description: 'Better sell prices. Uses storage space.',
    category: 'market',
    slotCost: 1,
    rarity: 'uncommon',
    throughputMod: 0,
    heatGainMod: 0,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: -3,
    sellBidBonusMod: 0.02,
    volatilityMod: 0,
    upkeepCost: 25,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
  {
    id: 'stabilizer',
    name: 'Stabilizer',
    description: 'Reduces market volatility impact.',
    category: 'market',
    slotCost: 2,
    rarity: 'rare',
    throughputMod: 0,
    heatGainMod: 0,
    wasteMod: 0,
    specimenChanceMod: 0,
    highGradeChanceMod: 0,
    scrapToUnitsMod: 0,
    storageMod: 0,
    sellBidBonusMod: 0.01,
    volatilityMod: 0.30,
    upkeepCost: 50,
    unitYieldMod: 0,
    jamChanceMod: 0,
  },
];

// ============================================
// Helper Functions
// ============================================

export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULE_POOL.find(m => m.id === id);
}

export function getStarterModules(): ModuleDefinition[] {
  return MODULE_POOL.filter(m => m.id === 'basic_drill' || m.id === 'basic_cooler');
}

export function getDraftableModules(
  excludeIds: string[] = [],
  unlockedModules: string[] = []
): ModuleDefinition[] {
  return MODULE_POOL.filter(m => {
    // Exclude starters from draft
    if (m.id === 'basic_drill' || m.id === 'basic_cooler') return false;
    // Exclude already installed
    if (excludeIds.includes(m.id)) return false;
    // Check unlock condition
    if (m.unlockCondition && !unlockedModules.includes(m.unlockCondition)) return false;
    return true;
  });
}

export function getModulesByCategory(
  category: ModuleDefinition['category']
): ModuleDefinition[] {
  return MODULE_POOL.filter(m => m.category === category);
}

export function getModulesByRarity(
  rarity: ModuleDefinition['rarity']
): ModuleDefinition[] {
  return MODULE_POOL.filter(m => m.rarity === rarity);
}

// ============================================
// Draft Generation
// ============================================

import { SeededRNG } from '../rng';

export function generateDraftOptions(
  installedModuleIds: string[],
  unlockedModules: string[],
  rng: SeededRNG,
  count: number = 3
): ModuleDefinition[] {
  const available = getDraftableModules(installedModuleIds, unlockedModules);
  
  if (available.length <= count) {
    return available;
  }
  
  // Weight by rarity
  const weighted = available.map(m => ({
    item: m,
    weight: m.rarity === 'common' ? 50 : m.rarity === 'uncommon' ? 35 : 15,
  }));
  
  const selected: ModuleDefinition[] = [];
  const usedIds = new Set<string>();
  
  while (selected.length < count && weighted.length > 0) {
    const choice = rng.weightedChoice(weighted);
    if (!usedIds.has(choice.id)) {
      selected.push(choice);
      usedIds.add(choice.id);
      // Remove from pool
      const idx = weighted.findIndex(w => w.item.id === choice.id);
      if (idx > -1) weighted.splice(idx, 1);
    }
  }
  
  return selected;
}
