import {
  BIOME_METAL_WEIGHTS,
  DEPTH_EV,
  DEPTH_SPECIMEN_CHANCES,
  DEPTH_GRADE_DISTRIBUTION,
  FORM_BASE_UNITS,
  GRADE_MULTIPLIERS,
  SPECIMEN_FORMS,
  DRILL_DAMAGE_CHANCE,
  BLAST_DAMAGE_CHANCE,
  RELIC_CACHE_CHANCE,
  type Biome,
  type Depth,
  type MiningMode,
  type MetalType,
  type SpecimenForm,
  type Grade,
} from './constants';
import { random, weightedChoice } from './rng';

export interface MiningResult {
  damage: number;
  drops: Array<VeinDrop>;
  relicCache?: boolean;
}

export type VeinDrop =
  | { type: 'units'; metalType: MetalType; units: number }
  | { type: 'specimen'; metalType: MetalType; form: SpecimenForm; grade: Grade; biome: Biome; depth: number; meltUnits: number };

export function mineVein(
  biome: Biome,
  depth: Depth,
  mode: MiningMode
): { damage: number; drop: VeinDrop } {
  // Calculate damage
  let damage = 0;
  if (mode === 'Drill') {
    if (random() < DRILL_DAMAGE_CHANCE[depth]) {
      damage = 1;
    }
  } else {
    // Blast mode
    if (random() < BLAST_DAMAGE_CHANCE.first) {
      damage = 1;
      if (random() < BLAST_DAMAGE_CHANCE.second) {
        damage = 2;
      }
    }
  }

  // Check for relic cache (replaces one vein)
  if (random() < RELIC_CACHE_CHANCE) {
    // This will be handled at the shift level
  }

  // Determine if specimen or units
  const isSpecimen = random() < DEPTH_SPECIMEN_CHANCES[depth];

  let drop: VeinDrop;

  if (isSpecimen) {
    // Generate specimen
    const metalType = selectMetalForBiome(biome);
    const form = weightedChoice(
      SPECIMEN_FORMS.map((f) => ({
        item: f,
        weight: 1, // Equal chance for MVP
      }))
    );
    const grade = selectGradeForDepth(depth);
    const baseUnits = FORM_BASE_UNITS[form];
    const meltUnits = Math.round(baseUnits * GRADE_MULTIPLIERS[grade]);

    drop = {
      type: 'specimen',
      metalType,
      form,
      grade,
      biome,
      depth,
      meltUnits,
    };
  } else {
    // Generate units bundle
    const metalType = selectMetalForBiome(biome);
    const ev = DEPTH_EV[depth][mode.toLowerCase() as 'drill' | 'blast'];
    // Generate value around EV (normal-ish distribution, clamped)
    const variance = ev * 0.3; // 30% variance
    const value = Math.max(0, ev + (random() - 0.5) * 2 * variance);
    const basePrice = getMetalBasePrice(metalType);
    const units = Math.max(1, Math.round(value / basePrice));

    drop = {
      type: 'units',
      metalType,
      units,
    };
  }

  return { damage, drop };
}

function selectMetalForBiome(biome: Biome): MetalType {
  const weights = BIOME_METAL_WEIGHTS[biome];
  const items = Object.entries(weights)
    .filter(([_, weight]) => weight > 0)
    .map(([metal, weight]) => ({
      item: metal as MetalType,
      weight,
    }));

  return weightedChoice(items);
}

function selectGradeForDepth(depth: Depth): Grade {
  const distribution = DEPTH_GRADE_DISTRIBUTION[depth];
  return weightedChoice([
    { item: 'Low' as Grade, weight: distribution.Low },
    { item: 'High' as Grade, weight: distribution.High },
    { item: 'Ultra' as Grade, weight: distribution.Ultra },
  ]);
}

function getMetalBasePrice(metalType: MetalType): number {
  const prices: Record<MetalType, number> = {
    SOL: 20,
    AES: 28,
    VIR: 26,
    LUN: 32,
    NOC: 55,
    CRN: 180,
  };
  return prices[metalType];
}

export function mineShift(
  biome: Biome,
  depth: Depth,
  mode: MiningMode
): MiningResult {
  const drops: VeinDrop[] = [];
  let totalDamage = 0;
  let relicCache = false;

  // Check for relic cache (10% chance, replaces one vein)
  if (random() < RELIC_CACHE_CHANCE) {
    relicCache = true;
    // Mine 2 veins instead of 3
    for (let i = 0; i < 2; i++) {
      const { damage, drop } = mineVein(biome, depth, mode);
      totalDamage += damage;
      drops.push(drop);
    }
  } else {
    // Mine 3 veins
    for (let i = 0; i < 3; i++) {
      const { damage, drop } = mineVein(biome, depth, mode);
      totalDamage += damage;
      drops.push(drop);
    }
  }

  return {
    damage: totalDamage,
    drops,
    relicCache,
  };
}

