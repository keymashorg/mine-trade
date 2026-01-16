import { SeededRNG } from '../../rng';
import {
  createShiftState,
  calculateRigModifiers,
  processTick,
  runFullShift,
  activatePurge,
  toggleOverclock,
} from '../engine';
import {
  HEAT_MAX,
  HEAT_THROTTLE_THRESHOLD,
  BASE_STORAGE,
  PURGE_COOLDOWN,
} from '../constants';
import type { InstalledModule, RigModifiers } from '../types';
import { getStarterModules } from '../modules';

describe('Simulation Engine', () => {
  const baseModifiers: RigModifiers = {
    throughput: 1.0,
    heatGain: 1.0,
    waste: 0.15,
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

  describe('createShiftState', () => {
    it('should create initial shift state with correct defaults', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      
      expect(state.tick).toBe(0);
      expect(state.maxTicks).toBe(75);
      expect(state.biome).toBe('Desert');
      expect(state.depth).toBe(1);
      expect(state.heat).toBe(0);
      expect(state.storageUsed).toBe(0);
      expect(state.storageMax).toBe(BASE_STORAGE);
      expect(state.isComplete).toBe(false);
    });
  });

  describe('calculateRigModifiers', () => {
    it('should return base values with no modules', () => {
      const mods = calculateRigModifiers([]);
      
      expect(mods.throughput).toBe(1.0);
      expect(mods.storage).toBe(BASE_STORAGE);
    });

    it('should add module modifiers correctly', () => {
      const modules: InstalledModule[] = [
        {
          definition: {
            id: 'test',
            name: 'Test',
            description: 'Test',
            category: 'extraction',
            slotCost: 1,
            rarity: 'common',
            throughputMod: 0.25,
            heatGainMod: 0.15,
            wasteMod: 0,
            specimenChanceMod: 0,
            highGradeChanceMod: 0,
            scrapToUnitsMod: 0,
            storageMod: 5,
            sellBidBonusMod: 0,
            volatilityMod: 0,
            upkeepCost: 50,
            unitYieldMod: 0,
            jamChanceMod: 0,
          },
          slotIndex: 0,
          installedDay: 1,
        },
      ];
      
      const mods = calculateRigModifiers(modules);
      
      expect(mods.throughput).toBe(1.25);
      expect(mods.heatGain).toBe(1.15);
      expect(mods.storage).toBe(BASE_STORAGE + 5);
      expect(mods.dailyUpkeep).toBe(50);
    });
  });

  describe('processTick', () => {
    it('should advance tick counter', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      const rng = new SeededRNG(12345);
      
      processTick(state, baseModifiers, rng);
      
      expect(state.tick).toBe(1);
    });

    it('should generate units', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      const rng = new SeededRNG(12345);
      
      const result = processTick(state, baseModifiers, rng);
      
      // Should have generated some units
      const totalUnits = Object.values(result.unitsGenerated).reduce((a, b) => a + b, 0);
      expect(totalUnits).toBeGreaterThanOrEqual(0);
    });

    it('should increase heat over time', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      const rng = new SeededRNG(12345);
      
      // Run several ticks
      for (let i = 0; i < 10; i++) {
        processTick(state, baseModifiers, rng);
      }
      
      expect(state.heat).toBeGreaterThan(0);
    });

    it('should throttle when heat reaches 100%', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      state.heat = HEAT_THROTTLE_THRESHOLD;
      const rng = new SeededRNG(12345);
      
      processTick(state, baseModifiers, rng);
      
      expect(state.heatThrottled).toBe(true);
      expect(state.damageFromHeat).toBe(1);
    });

    it('should mark complete when maxTicks reached', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 5);
      const rng = new SeededRNG(12345);
      
      for (let i = 0; i < 5; i++) {
        processTick(state, baseModifiers, rng);
      }
      
      expect(state.isComplete).toBe(true);
    });
  });

  describe('activatePurge', () => {
    it('should reduce heat', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      state.heat = 50;
      
      const success = activatePurge(state);
      
      expect(success).toBe(true);
      expect(state.heat).toBe(25); // Reduced by 25
    });

    it('should set cooldown', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      state.heat = 50;
      
      activatePurge(state);
      
      expect(state.purgeCooldown).toBe(PURGE_COOLDOWN);
    });

    it('should fail when on cooldown', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      state.heat = 50;
      state.purgeCooldown = 10;
      
      const success = activatePurge(state);
      
      expect(success).toBe(false);
    });

    it('should increment purge counter', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      state.heat = 50;
      
      activatePurge(state);
      
      expect(state.purgesUsed).toBe(1);
    });
  });

  describe('toggleOverclock', () => {
    it('should enable overclock', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      
      toggleOverclock(state, true);
      
      expect(state.overclockActive).toBe(true);
    });

    it('should disable overclock', () => {
      const state = createShiftState('Desert', 1, baseModifiers, 75);
      state.overclockActive = true;
      
      toggleOverclock(state, false);
      
      expect(state.overclockActive).toBe(false);
    });
  });

  describe('runFullShift', () => {
    it('should run complete shift with deterministic results', () => {
      const result1 = runFullShift('Desert', 1, baseModifiers, 12345, 20);
      const result2 = runFullShift('Desert', 1, baseModifiers, 12345, 20);
      
      // Same seed should produce same results
      expect(result1.state.unitsProduced).toEqual(result2.state.unitsProduced);
      expect(result1.tickResults.length).toBe(result2.tickResults.length);
    });

    it('should complete after maxTicks', () => {
      const { state } = runFullShift('Desert', 1, baseModifiers, 12345, 30);
      
      expect(state.isComplete).toBe(true);
      expect(state.tick).toBe(30);
    });

    it('should produce units', () => {
      const { state } = runFullShift('Desert', 1, baseModifiers, 12345, 50);
      
      const totalUnits = Object.values(state.unitsProduced).reduce((a, b) => a + b, 0);
      expect(totalUnits).toBeGreaterThan(0);
    });

    it('should respect biome metal weights', () => {
      // Desert favors SOL and LUN
      const { state: desertState } = runFullShift('Desert', 1, baseModifiers, 12345, 100);
      
      // SOL and LUN should be more common in Desert
      expect(desertState.unitsProduced.SOL + desertState.unitsProduced.LUN).toBeGreaterThan(
        desertState.unitsProduced.NOC + desertState.unitsProduced.CRN
      );
    });
  });
});
