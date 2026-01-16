// Simulation constants for the idle loop

// ============================================
// Shift Configuration
// ============================================
export const DEFAULT_SHIFT_DURATION = 75; // seconds/ticks
export const MIN_SHIFT_DURATION = 60;
export const MAX_SHIFT_DURATION = 90;

// ============================================
// Heat System
// ============================================
export const HEAT_MAX = 100;
export const HEAT_THROTTLE_THRESHOLD = 100;
export const HEAT_THROTTLE_PENALTY = 0.30; // -30% output when throttled
export const HEAT_DECAY_PER_TICK = 0.5; // Natural cooling per tick
export const BASE_HEAT_GAIN_PER_TICK = 1.5;

// Overclock modifiers
export const OVERCLOCK_THROUGHPUT_BONUS = 0.20; // +20% throughput
export const OVERCLOCK_HEAT_PENALTY = 0.35; // +35% heat gain

// Purge valve
export const PURGE_COOLDOWN = 20; // ticks
export const PURGE_HEAT_REDUCTION = 25; // Reduce heat by 25 points
export const PURGE_ORE_LOSS = 0.05; // Lose 5% of unprocessed ore

// ============================================
// Storage System
// ============================================
export const BASE_STORAGE = 20;
export const SCRAP_VALUE_MULTIPLIER = 0.25; // Scrap sells at 25% value

// ============================================
// Waste System
// ============================================
export const BASE_WASTE_RATE = 0.15; // 15% base waste rate

// ============================================
// Depth Modifiers
// ============================================
export const DEPTH_MODIFIERS = {
  1: {
    throughputMult: 1.0,
    specimenChance: 0.08,
    heatGainMult: 1.0,
    wasteMult: 1.0,
    description: 'Surface - Safe, lower yields',
  },
  2: {
    throughputMult: 1.35,
    specimenChance: 0.14,
    heatGainMult: 1.25,
    wasteMult: 1.15,
    description: 'Mid-level - Balanced risk/reward',
  },
  3: {
    throughputMult: 1.80,
    specimenChance: 0.22,
    heatGainMult: 1.60,
    wasteMult: 1.35,
    description: 'Deep - High risk, high reward',
  },
} as const;

// ============================================
// Production
// ============================================
export const BASE_UNITS_PER_TICK = 2.0; // Average units per tick
export const UNIT_VARIANCE = 0.4; // ±40% variance

// ============================================
// Rig Configuration
// ============================================
export const RIG_TOTAL_SLOTS = 6;
export const STARTING_MODULES = ['basic_drill', 'basic_cooler'];

// ============================================
// Jam Events
// ============================================
export const BASE_JAM_CHANCE = 0.02; // 2% per tick base
export const JAM_HEAT_SPIKE = 15; // Heat spike on jam
export const JAM_THROUGHPUT_LOSS_TICKS = 3; // Ticks of zero output

// ============================================
// Repair
// ============================================
export const REPAIR_COST_PER_HP = 180;
export const MAX_RIG_HP = 10;

// ============================================
// Heat damage at end of shift
// ============================================
export const HEAT_DAMAGE_THRESHOLD = 100; // If heat ever hit 100%
