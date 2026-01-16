'use server';

import { prisma } from '@/lib/db';
import { DUE_CURVE, MAX_DAYS, MAX_HP } from '@/lib/game/constants';
import { getDueForDay } from '@/lib/game/run';
import { MODULE_POOL, getStarterModules } from '@/lib/game/sim/modules';

export async function createRun(userId: string) {
  const due = DUE_CURVE[0]; // Day 1 due

  // Check for existing active run
  const existing = await prisma.run.findFirst({
    where: { userId, status: 'active' },
  });
  
  if (existing) {
    throw new Error('You already have an active run');
  }

  // Generate seed for deterministic RNG
  const seed = Date.now().toString();

  const run = await prisma.run.create({
    data: {
      userId,
      status: 'active',
      currentDay: 1,
      rigHP: MAX_HP,
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

  // Create day state
  await prisma.dayState.create({
    data: {
      runId: run.id,
      day: 1,
      due,
      paid: false,
      shiftsUsed: 0,
    },
  });

  // Ensure modules exist in DB and install starters
  const starterModules = getStarterModules();
  
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
  
  // Install starter modules
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

export async function getActiveRun(userId: string) {
  return prisma.run.findFirst({
    where: {
      userId,
      status: 'active',
    },
    include: {
      dayStates: {
        orderBy: { day: 'asc' },
      },
      stashItems: true,
      specimens: true,
      modules: {
        include: {
          module: true,
        },
      },
      relics: {
        include: {
          relic: true,
        },
      },
    },
  });
}

export async function getRunDayState(runId: string, day: number) {
  return prisma.dayState.findUnique({
    where: {
      runId_day: {
        runId,
        day,
      },
    },
  });
}

export async function updateRunHP(runId: string, newHP: number) {
  return prisma.run.update({
    where: { id: runId },
    data: { rigHP: Math.max(0, Math.min(MAX_HP, newHP)) },
  });
}

export async function repairRig(runId: string, userId: string, damage: number) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
  });

  if (!run || run.userId !== userId) {
    throw new Error('Run not found');
  }

  const repairCost = damage * 180; // REPAIR_COST_PER_HP
  if (run.credits < repairCost) {
    throw new Error('Not enough credits to repair');
  }

  const newHP = Math.min(MAX_HP, run.rigHP + damage);
  const newCredits = run.credits - repairCost;

  return prisma.run.update({
    where: { id: runId },
    data: {
      rigHP: newHP,
      credits: newCredits,
    },
  });
}

export async function payDayDue(runId: string, userId: string, useLoanVoucher: boolean = false) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
  });

  if (!run || run.userId !== userId) {
    throw new Error('Run not found');
  }

  const dayState = await prisma.dayState.findUnique({
    where: {
      runId_day: {
        runId,
        day: run.currentDay,
      },
    },
  });
  if (!dayState) {
    throw new Error('Day state not found');
  }

  if (dayState.paid) {
    throw new Error('Day already paid');
  }

  const due = dayState.due;
  let newCredits = run.credits;

  // Check if can pay or use loan voucher
  if (run.credits < due) {
    if (useLoanVoucher) {
      // Check if user has unused loan voucher
      const loanVoucher = await prisma.ownedRelic.findFirst({
        where: {
          runId,
          relic: {
            name: 'Loan Voucher',
          },
          used: false,
        },
        include: {
          relic: true,
        },
      });

      if (!loanVoucher) {
        throw new Error('No unused loan voucher available');
      }

      // Mark voucher as used
      await prisma.ownedRelic.update({
        where: { id: loanVoucher.id },
        data: { used: true, usedAt: new Date() },
      });
    } else {
      // Hardcore: run ends, everything confiscated
      await prisma.run.update({
        where: { id: runId },
        data: { status: 'lost' },
      });
      throw new Error('Cannot pay due - run ended');
    }
  } else {
    newCredits = run.credits - due;
  }

  // Mark day as paid
  await prisma.dayState.update({
    where: { id: dayState.id },
    data: { paid: true },
  });

  // Update run credits
  const updatedRun = await prisma.run.update({
    where: { id: runId },
    data: { credits: newCredits },
  });

  // Check if won (day 12 paid)
  if (run.currentDay === MAX_DAYS) {
    await completeRunWin(runId, userId);
  } else {
    // Advance to next day
    // If loan voucher was used THIS day, next day's due increases by 35%
    const nextDay = run.currentDay + 1;
    const nextDue = useLoanVoucher 
      ? Math.floor(getDueForDay(nextDay, false) * 1.35)
      : getDueForDay(nextDay, false);

    await prisma.dayState.create({
      data: {
        runId,
        day: nextDay,
        due: nextDue,
        paid: false,
        shiftsUsed: 0,
      },
    });

    await prisma.run.update({
      where: { id: runId },
      data: { currentDay: nextDay },
    });
  }

  return updatedRun;
}

async function completeRunWin(runId: string, userId: string) {
  // Deposit all remaining stash and specimens to vault
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      stashItems: true,
      specimens: true,
    },
  });

  if (!run) return;

  // Get vault balances
  let vaultBalances = await prisma.vaultBalances.findUnique({
    where: { userId },
  });

  if (!vaultBalances) {
    vaultBalances = await prisma.vaultBalances.create({
      data: { userId },
    });
  }

  // Convert stash items to units and add to vault
  const unitUpdates: {
    solUnits?: number;
    aesUnits?: number;
    virUnits?: number;
    lunUnits?: number;
    nocUnits?: number;
    crnUnits?: number;
  } = {};

  for (const item of run.stashItems) {
    const fieldMap: Record<string, 'solUnits' | 'aesUnits' | 'virUnits' | 'lunUnits' | 'nocUnits' | 'crnUnits'> = {
      sol: 'solUnits',
      aes: 'aesUnits',
      vir: 'virUnits',
      lun: 'lunUnits',
      noc: 'nocUnits',
      crn: 'crnUnits',
    };
    const field = fieldMap[item.metalType.toLowerCase()];
    if (field) {
      unitUpdates[field] = (unitUpdates[field] ?? 0) + item.units;
    }
  }

  // Deposit specimens to vault
  for (const specimen of run.specimens) {
    await prisma.vaultSpecimen.create({
      data: {
        userId,
        metalType: specimen.metalType,
        form: specimen.form,
        grade: specimen.grade,
        biome: specimen.biome,
        depth: specimen.depth,
        meltUnits: specimen.meltUnits,
      },
    });
  }

  // Update vault balances
  await prisma.vaultBalances.update({
    where: { userId },
    data: {
      credits: vaultBalances.credits + run.credits,
      solUnits: (vaultBalances.solUnits || 0) + (unitUpdates.solUnits || 0),
      aesUnits: (vaultBalances.aesUnits || 0) + (unitUpdates.aesUnits || 0),
      virUnits: (vaultBalances.virUnits || 0) + (unitUpdates.virUnits || 0),
      lunUnits: (vaultBalances.lunUnits || 0) + (unitUpdates.lunUnits || 0),
      nocUnits: (vaultBalances.nocUnits || 0) + (unitUpdates.nocUnits || 0),
      crnUnits: (vaultBalances.crnUnits || 0) + (unitUpdates.crnUnits || 0),
    },
  });

  // Mark run as won
  await prisma.run.update({
    where: { id: runId },
    data: { status: 'won' },
  });
}

