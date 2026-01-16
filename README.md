# Mine Trade

An **idle roguelike optimizer** where you run an automated mining rig, optimize throughput and heat management, draft upgrade modules, and survive 12 days of escalating payments.

## How to Play

### The Goal
Survive 12 days of mining by paying your daily due. Miss a single payment and your run ends immediately with nothing saved to Vault. Win and deposit your specimens to the Journal for permanent collection progress.

### The Idle Loop

Each day follows this pattern:

1. **Choose Biome & Depth** - Pick where to mine
   - **Biomes**: Desert, Rift, Glacier (each favors different metals)
   - **Depth 1**: Safe, lower yields
   - **Depth 2**: Balanced risk/reward
   - **Depth 3**: High risk, high reward (more heat, more specimens)

2. **Run the Shift** (~75 seconds auto-simulation)
   - Watch your rig mine automatically
   - **Four Core Meters** always visible:
     - **Throughput**: Units produced per tick
     - **Heat**: 0-100% (throttles at 100%, adds rig damage)
     - **Storage**: Current/max capacity (overflow becomes scrap at 25% value)
     - **Waste**: Percentage of ore lost to inefficiency

3. **Interactive Controls** during the shift:
   - **Overclock (toggle)**: +20% throughput, +35% heat gain
   - **Purge Valve (20s cooldown)**: -25 heat, but loses 5% of current ore

4. **Shift Complete** - Review your production:
   - Units produced by metal type
   - Specimens found (collectibles!)
   - Heat/waste statistics

5. **Module Draft** - Choose 1 of 3 upgrade modules (roguelike choice)
   - Modules have tradeoffs (e.g., +throughput but +heat)
   - 6 total module slots on your rig

6. **Repair (Optional)** - Fix rig damage (180 credits per HP)

7. **Pay Due** - The hardcore moment
   - Upkeep costs from modules are paid first
   - Then pay your daily due
   - **Cannot pay = Run Over** (no Vault deposit)

8. **Repeat** for 12 days!

### Automation Policy

Set-and-forget rules for end-of-shift processing:

- **Sell Units**: Always / Only If Needed for Due / Never
- **Keep Specimens**: High+ Only / Keep All / Keep None
- **Melt Low Specimens**: Auto-convert low-grade specimens to units
- **Emergency Mode**: Auto-sell to cover due if short

### Modules

Your rig has **6 slots** for upgrade modules. Each module has tradeoffs:

| Category | Example Module | Upside | Downside |
|----------|---------------|--------|----------|
| Extraction | High Torque Drill | +25% throughput | +15% heat gain |
| Extraction | Gentle Bit | -15% heat | -10% throughput |
| Cooling | Cryo Loop | -30% heat gain | +50 credits/day upkeep |
| Sorting | Precision Sieve | -20% waste | -10% throughput |
| Refining | Smelter | +25% scrap recovery | +15% heat |
| Storage | Vacuum Vault | +15 storage | +80 credits/day upkeep |
| Market | Fee Reducer | +2% sell price | -3 storage |

### Specimens

Collectible items found during mining:
- **Forms**: Ore, Nugget, Coin, Bar (increasing base units)
- **Grades**: Low, High, Ultra (1.0x, 1.5x, 2.3x multiplier)
- **Melt Value**: Form base units × Grade multiplier

Ultra specimens have a sparkle animation and are the most valuable for Journal completion.

### The Journal

Your persistent collection across all runs:
- 6 Metal pages (one per fictional metal)
- 3 Biome pages
- 3 Form/Grade pages

Fill journal pages to unlock additional modules for future runs.

### The Vault

Persistent storage from winning runs:
- Credits
- Units by metal type
- Specimens (for market listing or Journal)

---

## Technical Details

### Tech Stack
- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** for styling
- **Prisma ORM** with Postgres
- **Custom Auth** with bcrypt

### Local Development

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Database setup
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Start dev server
pnpm dev
```

### Running Tests

```bash
pnpm test
```

### Project Structure

```
mine-trade/
├── app/
│   ├── actions/shift.ts    # Shift simulation server actions
│   ├── run/page.tsx        # Main gameplay UI
│   └── ...
├── lib/game/
│   ├── sim/                # NEW: Simulation engine
│   │   ├── engine.ts       # Tick-based simulation
│   │   ├── modules.ts      # 20 module definitions
│   │   ├── policy.ts       # Automation policy processing
│   │   └── types.ts        # TypeScript interfaces
│   ├── constants.ts        # Game constants (metals, prices, due curve)
│   └── ...
├── components/
│   ├── RunHUD.tsx          # HUD with meters
│   └── ResourceIcon.tsx    # Icon component with overlays
└── prisma/
    └── schema.prisma       # Database schema
```

### Key Files for Gameplay Logic

- `lib/game/sim/engine.ts` - Core tick simulation (deterministic RNG)
- `lib/game/sim/modules.ts` - All module definitions with modifiers
- `lib/game/sim/policy.ts` - End-of-day automation processing
- `app/actions/shift.ts` - Server actions for shift execution

---

## Game Constants

### Daily Due Curve
```
Day 1:  250    Day 5:  730    Day 9:  2120
Day 2:  330    Day 6:  950    Day 10: 2770
Day 3:  430    Day 7:  1240   Day 11: 3620
Day 4:  560    Day 8:  1620   Day 12: 4740
```

### Metals
| Metal | Base Price | Best Biome |
|-------|------------|------------|
| Solvium | 20 | Desert, Glacier |
| Aethersteel | 28 | Rift |
| Virelith | 26 | Rift |
| Lunargent | 32 | Desert, Glacier |
| Noctyrium | 55 | Rift |
| Crownlite | 180 | Glacier (rare) |

### Depth Modifiers
| Depth | Throughput | Specimen Chance | Heat | Waste |
|-------|------------|-----------------|------|-------|
| 1 | 1.0x | 8% | 1.0x | 1.0x |
| 2 | 1.35x | 14% | 1.25x | 1.15x |
| 3 | 1.8x | 22% | 1.6x | 1.35x |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `pnpm test` and `pnpm lint`
4. Submit a pull request

## License

MIT
