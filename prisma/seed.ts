import { PrismaClient } from '@prisma/client';
import { METALS } from '../lib/game/constants';
import { RELIC_DEFINITIONS } from '../lib/game/relics';
import { MODULE_POOL } from '../lib/game/sim/modules';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sectors
  for (const sectorId of ['A', 'B', 'C']) {
    await prisma.sector.upsert({
      where: { id: sectorId },
      update: {},
      create: { id: sectorId },
    });
  }

  // Create initial market prices for each sector
  for (const sectorId of ['A', 'B', 'C']) {
    for (const [metalType, metal] of Object.entries(METALS)) {
      // Check if price already exists for today
      const existingPrice = await prisma.marketPriceSnapshot.findFirst({
        where: {
          sector: sectorId,
          metalType,
        },
        orderBy: { timestamp: 'desc' },
      });
      
      if (!existingPrice) {
        await prisma.marketPriceSnapshot.create({
          data: {
            sector: sectorId,
            metalType,
            price: metal.basePrice,
          },
        });
      }
    }
  }

  // Create relics
  for (const relicDef of RELIC_DEFINITIONS) {
    await prisma.relic.upsert({
      where: { name: relicDef.name },
      update: {
        description: relicDef.description,
        rarity: relicDef.rarity,
      },
      create: {
        name: relicDef.name,
        description: relicDef.description,
        rarity: relicDef.rarity,
      },
    });
  }

  // Seed modules
  console.log('Seeding modules...');
  for (const mod of MODULE_POOL) {
    await prisma.module.upsert({
      where: { moduleId: mod.id },
      update: {
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
  console.log(`Seeded ${MODULE_POOL.length} modules`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

