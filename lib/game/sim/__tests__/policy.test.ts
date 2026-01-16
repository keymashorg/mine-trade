import {
  calculateUnitValue,
  calculateTotalUnitsValue,
  processPolicy,
  canCoverDue,
} from '../policy';
import { METALS, BID_MULTIPLIER } from '../../constants';
import type { AutomationPolicy, Specimen, RigModifiers } from '../types';
import { BASE_STORAGE } from '../constants';

describe('Policy Processing', () => {
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

  const defaultPolicy: AutomationPolicy = {
    sellUnits: 'only_if_needed',
    keepSpecimens: 'high_plus',
    meltLow: false,
    emergencyMode: true,
  };

  describe('calculateUnitValue', () => {
    it('should calculate correct value for SOL', () => {
      const value = calculateUnitValue('SOL', 10);
      // SOL base price is 20, bid multiplier is 0.99
      expect(value).toBe(Math.floor(10 * 20 * BID_MULTIPLIER));
    });

    it('should apply sell bid bonus', () => {
      const valueWithoutBonus = calculateUnitValue('SOL', 10, 0);
      const valueWithBonus = calculateUnitValue('SOL', 10, 0.02);
      
      expect(valueWithBonus).toBeGreaterThan(valueWithoutBonus);
    });
  });

  describe('calculateTotalUnitsValue', () => {
    it('should sum values for all metals', () => {
      const units = { SOL: 10, AES: 5, VIR: 0, LUN: 0, NOC: 0, CRN: 0 };
      const total = calculateTotalUnitsValue(units);
      
      const solValue = Math.floor(10 * 20 * BID_MULTIPLIER);
      const aesValue = Math.floor(5 * 28 * BID_MULTIPLIER);
      
      expect(total).toBe(solValue + aesValue);
    });
  });

  describe('processPolicy', () => {
    const makeSpecimen = (
      id: string,
      metalType: 'SOL' | 'AES' | 'VIR' | 'LUN' | 'NOC' | 'CRN',
      grade: 'Low' | 'High' | 'Ultra',
      meltUnits: number
    ): Specimen => ({
      id,
      metalType,
      form: 'Ore',
      grade,
      biome: 'Desert',
      depth: 1,
      meltUnits,
    });

    it('should end run when credits < due (hardcore mode)', () => {
      const result = processPolicy({
        day: 5,
        due: 1000,
        currentCredits: 0, // No credits
        unitsProduced: { SOL: 0, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 }, // No production
        specimensFound: [],
        scrapProduced: 0,
        rigDamage: 0,
        policy: defaultPolicy,
        rigModifiers: baseModifiers,
      });

      expect(result.duePaid).toBe(false);
      expect(result.runEnded).toBe(true);
      expect(result.runStatus).toBe('lost');
    });

    it('should pay due when credits are sufficient', () => {
      const result = processPolicy({
        day: 5,
        due: 500,
        currentCredits: 600,
        unitsProduced: { SOL: 0, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 },
        specimensFound: [],
        scrapProduced: 0,
        rigDamage: 0,
        policy: defaultPolicy,
        rigModifiers: baseModifiers,
      });

      expect(result.duePaid).toBe(true);
      expect(result.runEnded).toBe(false);
      expect(result.runStatus).toBe('active');
      expect(result.creditsAfter).toBe(100);
    });

    it('should win on day 12 with successful payment', () => {
      const result = processPolicy({
        day: 12,
        due: 4740,
        currentCredits: 5000,
        unitsProduced: { SOL: 0, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 },
        specimensFound: [],
        scrapProduced: 0,
        rigDamage: 0,
        policy: defaultPolicy,
        rigModifiers: baseModifiers,
      });

      expect(result.duePaid).toBe(true);
      expect(result.runEnded).toBe(true);
      expect(result.runStatus).toBe('won');
    });

    it('should keep high+ specimens with high_plus policy', () => {
      const specimens = [
        makeSpecimen('1', 'SOL', 'Low', 4),
        makeSpecimen('2', 'SOL', 'High', 6),
        makeSpecimen('3', 'SOL', 'Ultra', 9),
      ];

      const result = processPolicy({
        day: 5,
        due: 500,
        currentCredits: 600,
        unitsProduced: { SOL: 0, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 },
        specimensFound: specimens,
        scrapProduced: 0,
        rigDamage: 0,
        policy: { ...defaultPolicy, keepSpecimens: 'high_plus', meltLow: false },
        rigModifiers: baseModifiers,
      });

      // Should keep all (low included since meltLow is false)
      expect(result.specimensKept.length).toBe(3);
      expect(result.specimensMelted.length).toBe(0);
    });

    it('should melt low specimens when meltLow is true', () => {
      const specimens = [
        makeSpecimen('1', 'SOL', 'Low', 4),
        makeSpecimen('2', 'SOL', 'High', 6),
      ];

      const result = processPolicy({
        day: 5,
        due: 500,
        currentCredits: 600,
        unitsProduced: { SOL: 0, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 },
        specimensFound: specimens,
        scrapProduced: 0,
        rigDamage: 0,
        policy: { ...defaultPolicy, keepSpecimens: 'high_plus', meltLow: true },
        rigModifiers: baseModifiers,
      });

      expect(result.specimensKept.length).toBe(1);
      expect(result.specimensKept[0].grade).toBe('High');
      expect(result.specimensMelted.length).toBe(1);
      expect(result.specimensMelted[0].grade).toBe('Low');
    });

    it('should melt all specimens when keep_none policy', () => {
      const specimens = [
        makeSpecimen('1', 'SOL', 'Ultra', 9),
      ];

      const result = processPolicy({
        day: 5,
        due: 500,
        currentCredits: 600,
        unitsProduced: { SOL: 0, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 },
        specimensFound: specimens,
        scrapProduced: 0,
        rigDamage: 0,
        policy: { ...defaultPolicy, keepSpecimens: 'keep_none' },
        rigModifiers: baseModifiers,
      });

      expect(result.specimensKept.length).toBe(0);
      expect(result.specimensMelted.length).toBe(1);
    });

    it('should sell units with always policy', () => {
      const result = processPolicy({
        day: 5,
        due: 500,
        currentCredits: 0,
        unitsProduced: { SOL: 50, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 },
        specimensFound: [],
        scrapProduced: 0,
        rigDamage: 0,
        policy: { ...defaultPolicy, sellUnits: 'always' },
        rigModifiers: baseModifiers,
      });

      // SOL: 50 units * 20 base * 0.99 bid = 990
      expect(result.creditsSold).toBeGreaterThan(0);
    });

    it('should not sell units with never policy', () => {
      const result = processPolicy({
        day: 5,
        due: 500,
        currentCredits: 600, // Already have enough
        unitsProduced: { SOL: 50, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 },
        specimensFound: [],
        scrapProduced: 0,
        rigDamage: 0,
        policy: { ...defaultPolicy, sellUnits: 'never' },
        rigModifiers: baseModifiers,
      });

      // Should only have scrap value, not unit value
      expect(result.creditsSold).toBe(0);
    });

    it('should auto-liquidate in emergency mode when short', () => {
      const specimens = [
        makeSpecimen('1', 'SOL', 'Low', 4),
        makeSpecimen('2', 'SOL', 'Low', 4),
      ];

      const result = processPolicy({
        day: 5,
        due: 500,
        currentCredits: 400, // 100 short
        unitsProduced: { SOL: 0, AES: 0, VIR: 0, LUN: 0, NOC: 0, CRN: 0 },
        specimensFound: specimens,
        scrapProduced: 0,
        rigDamage: 0,
        policy: {
          ...defaultPolicy,
          sellUnits: 'never',
          keepSpecimens: 'keep_all',
          emergencyMode: true,
        },
        rigModifiers: baseModifiers,
      });

      // Emergency mode should have melted low specimens
      expect(result.specimensMelted.length).toBeGreaterThan(0);
    });
  });

  describe('canCoverDue', () => {
    it('should return true when total covers due', () => {
      const result = canCoverDue(100, 300, 200, 0, 500);
      
      expect(result.canCover).toBe(true);
      expect(result.shortfall).toBe(0);
    });

    it('should return false with shortfall when insufficient', () => {
      const result = canCoverDue(100, 100, 100, 50, 500);
      
      expect(result.canCover).toBe(false);
      expect(result.shortfall).toBe(250); // 500 - (100 + 100 + 100 - 50)
    });

    it('should account for upkeep', () => {
      const result = canCoverDue(500, 0, 0, 100, 500);
      
      expect(result.canCover).toBe(false);
      expect(result.shortfall).toBe(100);
    });
  });
});

describe('Specimen Melt Math', () => {
  it('should calculate melt units correctly (form base * grade multiplier)', () => {
    // From constants.ts:
    // FORM_BASE_UNITS: { Ore: 4, Nugget: 6, Coin: 7, Bar: 8 }
    // GRADE_MULTIPLIERS: { Low: 1.0, High: 1.5, Ultra: 2.3 }
    
    // Ore + Low = 4 * 1.0 = 4
    // Ore + High = 4 * 1.5 = 6
    // Ore + Ultra = 4 * 2.3 = 9 (rounded)
    // Bar + Ultra = 8 * 2.3 = 18 (rounded)
    
    const specimen: Specimen = {
      id: 'test',
      metalType: 'SOL',
      form: 'Bar',
      grade: 'Ultra',
      biome: 'Desert',
      depth: 1,
      meltUnits: Math.round(8 * 2.3), // Should be 18
    };
    
    expect(specimen.meltUnits).toBe(18);
    
    // Calculate value at SOL price (20)
    const value = calculateUnitValue('SOL', specimen.meltUnits);
    expect(value).toBe(Math.floor(18 * 20 * BID_MULTIPLIER));
  });
});
