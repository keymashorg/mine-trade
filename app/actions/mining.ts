'use server';

import { prisma } from '@/lib/db';
import { mineShift, type VeinDrop } from '@/lib/game/mining';
import { SHIFTS_PER_DAY } from '@/lib/game/constants';
import { selectRandomRelics } from '@/lib/game/relics';
import { BID_MULTIPLIER } from '@/lib/game/constants';
import { METALS } from '@/lib/game/constants';

export async function executeMiningShift(
  runId: string,
  userId: string,
  biome: string,
  depth: number,
  mode: 'Drill' | 'Blast'
) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
  });

  if (!run || run.userId !== userId) {
    throw new Error('Run not found');
  }

  if (run.status !== 'active') {
    throw new Error('Run is not active');
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

  if (dayState.shiftsUsed >= SHIFTS_PER_DAY) {
    throw new Error('All shifts used for this day');
  }

  // Execute mining
  const result = mineShift(biome as any, depth as any, mode);

  // Apply damage
  const newHP = Math.max(0, run.rigHP - result.damage);
  await prisma.run.update({
    where: { id: runId },
    data: { rigHP: newHP },
  });

  // Store drops
  const stashItems: Array<{ metalType: string; units: number }> = [];
  const specimens: Array<{
    metalType: string;
    form: string;
    grade: string;
    biome: string;
    depth: number;
    meltUnits: number;
  }> = [];

  for (const drop of result.drops) {
    if (drop.type === 'units') {
      stashItems.push({
        metalType: drop.metalType,
        units: drop.units,
      });
    } else {
      specimens.push({
        metalType: drop.metalType,
        form: drop.form,
        grade: drop.grade,
        biome: drop.biome,
        depth: drop.depth,
        meltUnits: drop.meltUnits,
      });
    }
  }

  // Create stash items
  for (const item of stashItems) {
    await prisma.stashItem.create({
      data: {
        runId,
        metalType: item.metalType,
        units: item.units,
      },
    });
  }

  // Create specimens
  for (const spec of specimens) {
    await prisma.specimen.create({
      data: {
        runId,
        metalType: spec.metalType,
        form: spec.form,
        grade: spec.grade,
        biome: spec.biome,
        depth: spec.depth,
        meltUnits: spec.meltUnits,
      },
    });
  }

  // Handle relic cache
  let relicOptions: Array<{ id: string; name: string; description: string }> | null = null;
  if (result.relicCache) {
    const relics = selectRandomRelics(2);
    // Store relic options temporarily (client will pick one)
    // For MVP, we'll create both and let client choose which to keep
    relicOptions = relics.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }));
  }

  // Update shifts used
  await prisma.dayState.update({
    where: { id: dayState.id },
    data: { shiftsUsed: dayState.shiftsUsed + 1 },
  });

  return {
    damage: result.damage,
    newHP,
    drops: result.drops,
    relicCache: result.relicCache,
    relicOptions,
  };
}

export async function claimRelic(
  runId: string,
  userId: string,
  relicId: string
) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
  });

  if (!run || run.userId !== userId) {
    throw new Error('Run not found');
  }

  // Find relic definition
  const { RELIC_DEFINITIONS } = await import('@/lib/game/relics');
  const relicDef = RELIC_DEFINITIONS.find((r) => r.id === relicId);

  if (!relicDef) {
    throw new Error('Relic not found');
  }

  // Get or create relic in DB
  let relic = await prisma.relic.findUnique({
    where: { name: relicDef.name },
  });

  if (!relic) {
    relic = await prisma.relic.create({
      data: {
        name: relicDef.name,
        description: relicDef.description,
        rarity: relicDef.rarity,
      },
    });
  }

  // Create owned relic
  await prisma.ownedRelic.create({
    data: {
      runId,
      relicId: relic.id,
      used: false,
    },
  });

  return { success: true };
}

export async function meltSpecimen(specimenId: string, runId: string, userId: string) {
  const specimen = await prisma.specimen.findUnique({
    where: { id: specimenId },
  });

  if (!specimen || specimen.runId !== runId) {
    throw new Error('Specimen not found');
  }

  const run = await prisma.run.findUnique({
    where: { id: runId },
  });

  if (!run || run.userId !== userId) {
    throw new Error('Run not found');
  }

  // Convert specimen to units
  await prisma.stashItem.create({
    data: {
      runId,
      metalType: specimen.metalType,
      units: specimen.meltUnits,
    },
  });

  // Delete specimen
  await prisma.specimen.delete({
    where: { id: specimenId },
  });

  return { success: true, units: specimen.meltUnits };
}

export async function sellUnits(
  runId: string,
  userId: string,
  metalType: string,
  units: number
) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
  });

  if (!run || run.userId !== userId) {
    throw new Error('Run not found');
  }

  // Find stash items
  const stashItems = await prisma.stashItem.findMany({
    where: {
      runId,
      metalType,
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalUnits = stashItems.reduce((sum, item) => sum + item.units, 0);
  if (totalUnits < units) {
    throw new Error('Not enough units');
  }

  // Calculate sale value (bid price = 99% of base)
  const basePrice = METALS[metalType as keyof typeof METALS]?.basePrice || 0;
  const bidPrice = basePrice * BID_MULTIPLIER;
  const credits = Math.floor(units * bidPrice);

  // Remove units from stash
  let remaining = units;
  for (const item of stashItems) {
    if (remaining <= 0) break;
    if (item.units <= remaining) {
      await prisma.stashItem.delete({ where: { id: item.id } });
      remaining -= item.units;
    } else {
      await prisma.stashItem.update({
        where: { id: item.id },
        data: { units: item.units - remaining },
      });
      remaining = 0;
    }
  }

  // Add credits to run
  await prisma.run.update({
    where: { id: runId },
    data: { credits: run.credits + credits },
  });

  return { success: true, credits };
}

