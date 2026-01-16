// Automation policy processing for end-of-day

import { METALS, BID_MULTIPLIER, type MetalType } from '../constants';
import { SCRAP_VALUE_MULTIPLIER } from './constants';
import type {
  AutomationPolicy,
  Specimen,
  EndOfDayResult,
  RigModifiers,
} from './types';

export interface DayEndInput {
  day: number;
  due: number;
  currentCredits: number;
  unitsProduced: Record<MetalType, number>;
  specimensFound: Specimen[];
  scrapProduced: number;
  rigDamage: number;
  policy: AutomationPolicy;
  rigModifiers: RigModifiers;
}

// ============================================
// Calculate Unit Value
// ============================================
export function calculateUnitValue(
  metalType: MetalType,
  units: number,
  sellBidBonus: number = 0
): number {
  const basePrice = METALS[metalType].basePrice;
  const bidPrice = basePrice * (BID_MULTIPLIER + sellBidBonus);
  return Math.floor(units * bidPrice);
}

// ============================================
// Calculate Total Units Value
// ============================================
export function calculateTotalUnitsValue(
  unitsMap: Record<MetalType, number>,
  sellBidBonus: number = 0
): number {
  let total = 0;
  for (const [metal, units] of Object.entries(unitsMap)) {
    if (units > 0) {
      total += calculateUnitValue(metal as MetalType, units, sellBidBonus);
    }
  }
  return total;
}

// ============================================
// Calculate Scrap Value
// ============================================
export function calculateScrapValue(
  scrap: number,
  averageMetalPrice: number = 30
): number {
  return Math.floor(scrap * averageMetalPrice * SCRAP_VALUE_MULTIPLIER);
}

// ============================================
// Process Automation Policy
// ============================================
export function processPolicy(input: DayEndInput): EndOfDayResult {
  const {
    day,
    due,
    currentCredits,
    unitsProduced,
    specimensFound,
    scrapProduced,
    rigDamage,
    policy,
    rigModifiers,
  } = input;
  
  const sellBidBonus = rigModifiers.sellBidBonus;
  
  // Calculate raw values
  const rawUnitsValue = calculateTotalUnitsValue(unitsProduced, sellBidBonus);
  const scrapValue = calculateScrapValue(scrapProduced);
  const rawCredits = rawUnitsValue + scrapValue;
  
  // Track what we sell/keep
  let creditsSold = 0;
  const specimensKept: Specimen[] = [];
  const specimensMelted: Specimen[] = [];
  
  // Process specimens based on policy
  for (const specimen of specimensFound) {
    let keepThisOne = false;
    let meltThisOne = false;
    
    switch (policy.keepSpecimens) {
      case 'keep_all':
        keepThisOne = true;
        break;
      case 'keep_none':
        meltThisOne = true;
        break;
      case 'high_plus':
        if (specimen.grade === 'High' || specimen.grade === 'Ultra') {
          keepThisOne = true;
        } else if (policy.meltLow) {
          meltThisOne = true;
        } else {
          keepThisOne = true; // Keep low if not melting
        }
        break;
    }
    
    if (meltThisOne) {
      specimensMelted.push(specimen);
      creditsSold += calculateUnitValue(
        specimen.metalType,
        specimen.meltUnits,
        sellBidBonus
      );
    } else {
      specimensKept.push(specimen);
    }
  }
  
  // Process units based on policy
  let unitsToSell = 0;
  switch (policy.sellUnits) {
    case 'always':
      unitsToSell = rawUnitsValue;
      break;
    case 'never':
      unitsToSell = 0;
      break;
    case 'only_if_needed':
      // Sell only enough to cover due + upkeep
      const needed = due + rigModifiers.dailyUpkeep - currentCredits;
      if (needed > 0) {
        unitsToSell = Math.min(rawUnitsValue, needed);
      }
      break;
  }
  
  creditsSold += unitsToSell + scrapValue;
  
  // Calculate costs
  const upkeepPaid = rigModifiers.dailyUpkeep;
  const repairCost = rigDamage * 180; // REPAIR_COST_PER_HP
  
  // Project credits
  let projectedCredits = currentCredits + creditsSold;
  
  // Emergency mode: if short on due, liquidate more
  if (policy.emergencyMode && projectedCredits - upkeepPaid < due) {
    const shortfall = due + upkeepPaid - projectedCredits;
    
    // Sell remaining units
    const remainingUnitsValue = rawUnitsValue - unitsToSell;
    if (remainingUnitsValue > 0) {
      const additionalSell = Math.min(remainingUnitsValue, shortfall);
      creditsSold += additionalSell;
      projectedCredits += additionalSell;
    }
    
    // Melt kept low specimens if still short
    if (projectedCredits - upkeepPaid < due) {
      const stillShort = due + upkeepPaid - projectedCredits;
      const lowSpecimens = specimensKept.filter(s => s.grade === 'Low');
      let recovered = 0;
      
      for (const spec of lowSpecimens) {
        if (recovered >= stillShort) break;
        
        // Move from kept to melted
        const idx = specimensKept.indexOf(spec);
        if (idx > -1) {
          specimensKept.splice(idx, 1);
          specimensMelted.push(spec);
          const value = calculateUnitValue(spec.metalType, spec.meltUnits, sellBidBonus);
          recovered += value;
          creditsSold += value;
          projectedCredits += value;
        }
      }
    }
  }
  
  // Pay upkeep first
  const creditsAfterUpkeep = projectedCredits - upkeepPaid;
  
  // Pay repair (optional - player can skip)
  const repairPaid = false; // Player chooses this
  
  // Check if can pay due
  const canPayDue = creditsAfterUpkeep >= due;
  const duePaid = canPayDue;
  
  const creditsAfter = duePaid 
    ? creditsAfterUpkeep - due 
    : creditsAfterUpkeep;
  
  // Determine run status
  let runEnded = false;
  let runStatus: 'active' | 'won' | 'lost' = 'active';
  
  if (!duePaid) {
    runEnded = true;
    runStatus = 'lost';
  } else if (day >= 12 && duePaid) {
    runEnded = true;
    runStatus = 'won';
  }
  
  return {
    rawCredits,
    rawSpecimens: specimensFound,
    creditsSold,
    specimensKept,
    specimensMelted,
    upkeepPaid,
    repairCost,
    repairPaid,
    due,
    creditsBefore: currentCredits,
    creditsAfter,
    duePaid,
    runEnded,
    runStatus,
  };
}

// ============================================
// Calculate Projected Due Coverage
// ============================================
export function canCoverDue(
  currentCredits: number,
  unitsValue: number,
  specimensValue: number,
  upkeep: number,
  due: number
): { canCover: boolean; shortfall: number } {
  const total = currentCredits + unitsValue + specimensValue - upkeep;
  const shortfall = Math.max(0, due - total);
  return {
    canCover: shortfall === 0,
    shortfall,
  };
}
