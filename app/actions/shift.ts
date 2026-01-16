'use server';

import { prisma } from '@/lib/db';
import { SeededRNG } from '@/lib/game/rng';
import {
  createShiftState,
  calculateRigModifiers,
  runFullShift,
  generateShiftSummary,
  processPolicy,
  generateDraftOptions,
  getModuleById,
  getStarterModules,
  MODULE_POOL,
  DEFAULT_SHIFT_DURATION,
  DEPTH_MODIFIERS,
  type ShiftState,
  type ShiftSummary,
  type AutomationPolicy,
  type InstalledModule,
  type ModuleDefinition,
} from '@/lib/game/sim';
import { DUE_CURVE, BIOMES, DEPTHS, type Biome, type Depth, type MetalType } from '@/lib/game/constants';

// ============================================
// Get Run State
// ============================================
export async function getRunState(runId: string, userId: string) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
    include: {
      dayStates: true,
      stashItems: true,
      specimens: true,
      modules: {
        include: { module: true }
      },
      shiftLogs: true,
    },
  });
  
  if (!run) {
    throw new Error('Run not found');
  }
  
  return run;
}

// ============================================
// Start New Run (with idle system)
// ============================================
export async function startNewRun(userId: string) {
  // Check for existing active run
  const existing = await prisma.run.findFirst({
    where: { userId, status: 'active' },
  });
  
  if (existing) {
    throw new Error('You already have an active run');
  }
  
  // Generate seed for deterministic RNG
  const seed = Date.now().toString();
  
  // Create run
  const run = await prisma.run.create({
    data: {
      userId,
      status: 'active',
      currentDay: 1,
      rigHP: 10,
      credits: 0,
      seed,
      heat: 0,
      storageUsed: 0,
      storageMax: 20,
      wastePercent: 0.15,
      throughputBase: 1.0,
      policySellUnits: 'only_if_needed',
      policyKeepSpecimens: 'high_plus',
      policyMeltLow: false,
      policyEmergency: true,
      dailyUpkeep: 0,
    },
  });
  
  // Create day 1 state
  await prisma.dayState.create({
    data: {
      runId: run.id,
      day: 1,
      due: DUE_CURVE[0],
    },
  });
  
  // Install starter modules
  const starterModules = getStarterModules();
  
  // Ensure modules exist in DB
  for (const mod of MODULE_POOL) {
    await prisma.module.upsert({
      where: { moduleId: mod.id },
      update: {},
      create: {
        moduleId: mod.id,
        name: mod.name,
        description: mod.description,
        category: mod.category,
        slotCost: mod.slotCost,
        rarity: mod.rarity,
        throughputMod: mod.throughputMod,
        heatGainMod: mod.heatGainMod,
        wasteMod: mod.wasteMod,
        specimenChanceMod: mod.specimenChanceMod,
        highGradeChanceMod: mod.highGradeChanceMod,
        scrapToUnitsMod: mod.scrapToUnitsMod,
        storageMod: mod.storageMod,
        sellBidBonusMod: mod.sellBidBonusMod,
        volatilityMod: mod.volatilityMod,
        upkeepCost: mod.upkeepCost,
        unitYieldMod: mod.unitYieldMod,
        jamChanceMod: mod.jamChanceMod,
        unlockCondition: mod.unlockCondition,
      },
    });
  }
  
  // Get DB module IDs and install starters
  for (let i = 0; i < starterModules.length; i++) {
    const dbModule = await prisma.module.findUnique({
      where: { moduleId: starterModules[i].id },
    });
    
    if (dbModule) {
      await prisma.runModule.create({
        data: {
          runId: run.id,
          moduleId: dbModule.id,
          slotIndex: i,
          installedDay: 1,
        },
      });
    }
  }
  
  return run;
}

// ============================================
// Set Shift Parameters (biome/depth choice)
// ============================================
export async function setShiftParameters(
  runId: string,
  userId: string,
  biome: Biome,
  depth: Depth
) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
    include: { dayStates: true },
  });
  
  if (!run) throw new Error('Run not found');
  
  const dayState = run.dayStates.find(ds => ds.day === run.currentDay);
  if (!dayState) throw new Error('Day state not found');
  
  if (dayState.shiftCompleted) {
    throw new Error('Shift already completed for today');
  }
  
  await prisma.run.update({
    where: { id: runId },
    data: {
      currentBiome: biome,
      currentDepth: depth,
    },
  });
  
  await prisma.dayState.update({
    where: { id: dayState.id },
    data: {
      biomeChosen: biome,
      depthChosen: depth,
    },
  });
  
  return { biome, depth };
}

// ============================================
// Run Complete Shift (server-side simulation)
// ============================================
export async function executeShift(runId: string, userId: string) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
    include: {
      dayStates: true,
      modules: { include: { module: true } },
      stashItems: true,
      specimens: true,
    },
  });
  
  if (!run) throw new Error('Run not found');
  if (!run.currentBiome) throw new Error('Select a biome first');
  
  const dayState = run.dayStates.find(ds => ds.day === run.currentDay);
  if (!dayState) throw new Error('Day state not found');
  
  if (dayState.shiftCompleted) {
    throw new Error('Shift already completed');
  }
  
  // Build installed modules
  const installedModules: InstalledModule[] = run.modules.map(rm => {
    const def = getModuleById(rm.module.moduleId);
    return {
      definition: def || MODULE_POOL[0], // Fallback to basic_drill
      slotIndex: rm.slotIndex,
      installedDay: rm.installedDay,
    };
  });
  
  // Calculate rig modifiers
  const rigModifiers = calculateRigModifiers(installedModules);
  
  // Generate seed for this day's shift
  const daySeed = parseInt(run.seed) + run.currentDay * 1000;
  
  // Run the full shift simulation
  const { state: shiftState, tickResults } = runFullShift(
    run.currentBiome as Biome,
    run.currentDepth as Depth,
    rigModifiers,
    daySeed,
    DEFAULT_SHIFT_DURATION
  );
  
  // Generate summary
  const summary = generateShiftSummary(shiftState, run.currentDay);
  
  // Store units in stash
  for (const [metal, units] of Object.entries(shiftState.unitsProduced)) {
    if (units > 0) {
      // Find existing stash item or create new
      const existing = run.stashItems.find(si => si.metalType === metal);
      if (existing) {
        await prisma.stashItem.update({
          where: { id: existing.id },
          data: { units: existing.units + units },
        });
      } else {
        await prisma.stashItem.create({
          data: {
            runId: run.id,
            metalType: metal,
            units,
          },
        });
      }
    }
  }
  
  // Store specimens
  for (const spec of shiftState.specimensFound) {
    await prisma.specimen.create({
      data: {
        runId: run.id,
        metalType: spec.metalType,
        form: spec.form,
        grade: spec.grade,
        biome: spec.biome,
        depth: spec.depth,
        meltUnits: spec.meltUnits,
      },
    });
  }
  
  // Update run state
  await prisma.run.update({
    where: { id: runId },
    data: {
      heat: shiftState.heat,
      storageUsed: shiftState.storageUsed,
      rigDamage: run.rigDamage + shiftState.damageFromHeat,
    },
  });
  
  // Create shift log
  await prisma.shiftLog.create({
    data: {
      runId: run.id,
      day: run.currentDay,
      biome: run.currentBiome,
      depth: run.currentDepth,
      unitsProduced: shiftState.unitsProduced,
      specimensFound: shiftState.specimensFound.length,
      scrapProduced: shiftState.scrapProduced,
      heatMax: shiftState.heat,
      storageMax: shiftState.storageUsed,
      wasteTotal: shiftState.wasteAccum,
      heatThrottled: shiftState.heatThrottled,
      damageFromHeat: shiftState.damageFromHeat,
      purgesUsed: shiftState.purgesUsed,
      overclockTicks: shiftState.overclockTicks,
    },
  });
  
  // Mark shift as completed
  await prisma.dayState.update({
    where: { id: dayState.id },
    data: { shiftCompleted: true },
  });
  
  // Generate module draft options
  const rng = new SeededRNG(daySeed + 5000);
  const installedIds = installedModules.map(m => m.definition.id);
  const draftOptions = generateDraftOptions(installedIds, [], rng, 3);
  
  await prisma.dayState.update({
    where: { id: dayState.id },
    data: {
      draftOffered: draftOptions.map(m => m.id),
    },
  });
  
  return {
    summary,
    draftOptions,
    rigDamage: run.rigDamage + shiftState.damageFromHeat,
  };
}

// ============================================
// Choose Draft Module
// ============================================
export async function chooseDraftModule(
  runId: string,
  userId: string,
  moduleId: string
) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
    include: {
      dayStates: true,
      modules: true,
    },
  });
  
  if (!run) throw new Error('Run not found');
  
  const dayState = run.dayStates.find(ds => ds.day === run.currentDay);
  if (!dayState) throw new Error('Day state not found');
  
  if (!dayState.draftOffered) {
    throw new Error('No draft offered');
  }
  
  const offered = dayState.draftOffered as string[];
  if (!offered.includes(moduleId)) {
    throw new Error('Module not in draft options');
  }
  
  // Get the module from DB
  const dbModule = await prisma.module.findUnique({
    where: { moduleId },
  });
  
  if (!dbModule) throw new Error('Module not found');
  
  // Find next available slot
  const usedSlots = run.modules.reduce((acc, rm) => {
    const mod = getModuleById(rm.module?.moduleId || '');
    return acc + (mod?.slotCost || 1);
  }, 0);
  
  const modDef = getModuleById(moduleId);
  if (!modDef) throw new Error('Module definition not found');
  
  if (usedSlots + modDef.slotCost > 6) {
    throw new Error('Not enough slots');
  }
  
  // Install module
  await prisma.runModule.create({
    data: {
      runId: run.id,
      moduleId: dbModule.id,
      slotIndex: usedSlots,
      installedDay: run.currentDay,
    },
  });
  
  // Update upkeep
  const newUpkeep = run.dailyUpkeep + modDef.upkeepCost;
  await prisma.run.update({
    where: { id: runId },
    data: { dailyUpkeep: newUpkeep },
  });
  
  // Mark draft as chosen
  await prisma.dayState.update({
    where: { id: dayState.id },
    data: { draftChosen: moduleId },
  });
  
  return { moduleId, newUpkeep };
}

// ============================================
// Update Automation Policy
// ============================================
export async function updatePolicy(
  runId: string,
  userId: string,
  policy: Partial<AutomationPolicy>
) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
  });
  
  if (!run) throw new Error('Run not found');
  
  const updateData: any = {};
  
  if (policy.sellUnits !== undefined) {
    updateData.policySellUnits = policy.sellUnits;
  }
  if (policy.keepSpecimens !== undefined) {
    updateData.policyKeepSpecimens = policy.keepSpecimens;
  }
  if (policy.meltLow !== undefined) {
    updateData.policyMeltLow = policy.meltLow;
  }
  if (policy.emergencyMode !== undefined) {
    updateData.policyEmergency = policy.emergencyMode;
  }
  
  await prisma.run.update({
    where: { id: runId },
    data: updateData,
  });
  
  return updateData;
}

// ============================================
// Pay Day Due
// ============================================
export async function payDue(runId: string, userId: string) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
    include: {
      dayStates: true,
      stashItems: true,
      modules: { include: { module: true } },
    },
  });
  
  if (!run) throw new Error('Run not found');
  
  const dayState = run.dayStates.find(ds => ds.day === run.currentDay);
  if (!dayState) throw new Error('Day state not found');
  
  if (dayState.paid) {
    throw new Error('Already paid');
  }
  
  // Calculate upkeep
  const upkeep = run.dailyUpkeep;
  
  // Check if can pay upkeep first
  if (run.credits < upkeep) {
    // Sell units to cover upkeep
    // For now, just fail if can't pay upkeep
    throw new Error('Cannot afford upkeep');
  }
  
  const creditsAfterUpkeep = run.credits - upkeep;
  
  // Check if can pay due
  if (creditsAfterUpkeep < dayState.due) {
    // Run ends - cannot pay due
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'lost' },
    });
    
    return {
      paid: false,
      runEnded: true,
      status: 'lost',
      creditsHad: creditsAfterUpkeep,
      dueAmount: dayState.due,
    };
  }
  
  // Pay due
  const creditsAfter = creditsAfterUpkeep - dayState.due;
  
  await prisma.run.update({
    where: { id: runId },
    data: { credits: creditsAfter },
  });
  
  await prisma.dayState.update({
    where: { id: dayState.id },
    data: {
      paid: true,
      upkeepPaid: upkeep,
    },
  });
  
  // Check for win condition
  if (run.currentDay >= 12) {
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'won' },
    });
    
    return {
      paid: true,
      runEnded: true,
      status: 'won',
      creditsAfter,
    };
  }
  
  return {
    paid: true,
    runEnded: false,
    status: 'active',
    creditsAfter,
  };
}

// ============================================
// Advance to Next Day
// ============================================
export async function advanceDay(runId: string, userId: string) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
    include: { dayStates: true },
  });
  
  if (!run) throw new Error('Run not found');
  
  const dayState = run.dayStates.find(ds => ds.day === run.currentDay);
  if (!dayState) throw new Error('Day state not found');
  
  if (!dayState.paid) {
    throw new Error('Must pay due first');
  }
  
  if (run.currentDay >= 12) {
    throw new Error('Run complete');
  }
  
  const nextDay = run.currentDay + 1;
  
  // Create next day state
  await prisma.dayState.create({
    data: {
      runId: run.id,
      day: nextDay,
      due: DUE_CURVE[nextDay - 1],
    },
  });
  
  // Reset rig damage, heat
  await prisma.run.update({
    where: { id: runId },
    data: {
      currentDay: nextDay,
      heat: 0,
      rigDamage: 0,
      storageUsed: 0,
      currentBiome: null,
      shiftInProgress: false,
      shiftTick: 0,
    },
  });
  
  return { day: nextDay, due: DUE_CURVE[nextDay - 1] };
}

// ============================================
// Sell Units for Credits
// ============================================
export async function sellUnitsForCredits(
  runId: string,
  userId: string,
  metalType: MetalType,
  units: number
) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
    include: { stashItems: true },
  });
  
  if (!run) throw new Error('Run not found');
  
  const stashItem = run.stashItems.find(si => si.metalType === metalType);
  if (!stashItem || stashItem.units < units) {
    throw new Error('Not enough units');
  }
  
  // Calculate value
  const { METALS, BID_MULTIPLIER } = await import('@/lib/game/constants');
  const basePrice = METALS[metalType].basePrice;
  const value = Math.floor(units * basePrice * BID_MULTIPLIER);
  
  // Update stash
  if (stashItem.units === units) {
    await prisma.stashItem.delete({ where: { id: stashItem.id } });
  } else {
    await prisma.stashItem.update({
      where: { id: stashItem.id },
      data: { units: stashItem.units - units },
    });
  }
  
  // Add credits
  await prisma.run.update({
    where: { id: runId },
    data: { credits: run.credits + value },
  });
  
  return { creditsSold: value, newCredits: run.credits + value };
}

// ============================================
// Melt Specimen
// ============================================
export async function meltSpecimenForUnits(
  runId: string,
  userId: string,
  specimenId: string
) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
    include: { specimens: true, stashItems: true },
  });
  
  if (!run) throw new Error('Run not found');
  
  const specimen = run.specimens.find(s => s.id === specimenId);
  if (!specimen) throw new Error('Specimen not found');
  
  // Add units to stash
  const existing = run.stashItems.find(si => si.metalType === specimen.metalType);
  if (existing) {
    await prisma.stashItem.update({
      where: { id: existing.id },
      data: { units: existing.units + specimen.meltUnits },
    });
  } else {
    await prisma.stashItem.create({
      data: {
        runId: run.id,
        metalType: specimen.metalType,
        units: specimen.meltUnits,
      },
    });
  }
  
  // Delete specimen
  await prisma.specimen.delete({ where: { id: specimenId } });
  
  return { metalType: specimen.metalType, unitsGained: specimen.meltUnits };
}

// ============================================
// Repair Rig
// ============================================
export async function repairRig(runId: string, userId: string, hpToRepair: number) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId, status: 'active' },
  });
  
  if (!run) throw new Error('Run not found');
  
  const maxRepair = 10 - run.rigHP;
  const actualRepair = Math.min(hpToRepair, maxRepair);
  const cost = actualRepair * 180;
  
  if (run.credits < cost) {
    throw new Error('Not enough credits');
  }
  
  await prisma.run.update({
    where: { id: runId },
    data: {
      rigHP: run.rigHP + actualRepair,
      credits: run.credits - cost,
    },
  });
  
  return { hpRepaired: actualRepair, cost, newHP: run.rigHP + actualRepair };
}
