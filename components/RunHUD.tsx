'use client';

import ResourceIcon from './ResourceIcon';

interface RunHUDProps {
  day: number;
  due: number;
  credits: number;
  hp: number;
  maxHp: number;
  stashSlotsUsed: number;
  stashSlotsMax: number;
  // New idle loop meters
  heat?: number; // 0-100
  storageUsed?: number;
  storageMax?: number;
  wastePercent?: number; // 0-1
  throughput?: number; // units/tick
  dailyUpkeep?: number;
  activeSurge?: {
    metalType: string;
    timeLeft: number;
  };
}

export default function RunHUD({
  day,
  due,
  credits,
  hp,
  maxHp,
  stashSlotsUsed,
  stashSlotsMax,
  heat = 0,
  storageUsed = 0,
  storageMax = 20,
  wastePercent = 0,
  throughput = 1,
  dailyUpkeep = 0,
  activeSurge,
}: RunHUDProps) {
  const hpPercentage = (hp / maxHp) * 100;
  const slotsPercentage = (stashSlotsUsed / stashSlotsMax) * 100;
  const storagePercentage = storageMax > 0 ? (storageUsed / storageMax) * 100 : 0;

  return (
    <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Day / Due */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-400">Day</div>
              <div className="text-xl font-bold">{day}/12</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Due</div>
              <div className={`text-xl font-bold ${credits >= due ? 'text-green-400' : 'text-red-400'}`}>
                {due}
              </div>
            </div>
            {dailyUpkeep > 0 && (
              <div className="text-center">
                <div className="text-xs text-gray-400">Upkeep</div>
                <div className="text-sm text-yellow-400">-{dailyUpkeep}/day</div>
              </div>
            )}
          </div>

          {/* Credits */}
          <div className="text-center">
            <div className="text-xs text-gray-400">Credits</div>
            <div className="text-xl font-bold text-yellow-400">{credits.toLocaleString()}</div>
          </div>

          {/* HP Hearts */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400">HP</div>
            <div className="flex gap-0.5">
              {Array.from({ length: maxHp }).map((_, i) => (
                <span
                  key={i}
                  className={`text-lg ${
                    i < hp ? 'text-red-500' : 'text-gray-700'
                  }`}
                >
                  ♥
                </span>
              ))}
            </div>
          </div>

          {/* Storage Meter */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400">Storage</div>
            <div className="w-20 bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  storagePercentage >= 100
                    ? 'bg-red-500'
                    : storagePercentage >= 80
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, storagePercentage)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">
              {storageUsed}/{storageMax}
            </div>
          </div>

          {/* Active Surge Timer */}
          {activeSurge && (
            <div className="bg-green-600/20 border border-green-500 rounded px-3 py-1">
              <div className="text-xs text-green-400">SURGE</div>
              <div className="text-sm font-bold text-green-300">
                {activeSurge.metalType} +25%
              </div>
              <div className="text-xs text-green-400">
                {Math.ceil(activeSurge.timeLeft)}s
              </div>
            </div>
          )}
        </div>

        {/* Second row: Heat, Waste, Throughput (only shown during shift or when relevant) */}
        {(heat > 0 || wastePercent > 0) && (
          <div className="flex items-center justify-center gap-8 mt-2 pt-2 border-t border-gray-700/50">
            {/* Heat Meter */}
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <div className="text-xs text-gray-400">Heat</div>
              <div className="w-24 bg-gray-800 rounded-full h-3 relative overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${
                    heat >= 100
                      ? 'bg-red-500 animate-pulse'
                      : heat >= 75
                      ? 'bg-orange-500'
                      : heat >= 50
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, heat)}%` }}
                />
                {heat >= 100 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">THROTTLED</span>
                  </div>
                )}
              </div>
              <div className={`text-sm font-mono ${heat >= 75 ? 'text-orange-400' : 'text-gray-300'}`}>
                {Math.round(heat)}%
              </div>
            </div>

            {/* Waste Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-lg">🗑️</span>
              <div className="text-xs text-gray-400">Waste</div>
              <div className={`text-sm font-mono ${wastePercent > 0.25 ? 'text-red-400' : 'text-gray-300'}`}>
                {Math.round(wastePercent * 100)}%
              </div>
            </div>

            {/* Throughput */}
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div className="text-xs text-gray-400">Output</div>
              <div className="text-sm font-mono text-blue-400">
                {throughput.toFixed(1)}/s
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact meter component for use elsewhere
export function MeterBar({
  value,
  max,
  label,
  icon,
  colorThresholds = { danger: 90, warning: 70 },
  showValue = true,
}: {
  value: number;
  max: number;
  label: string;
  icon?: string;
  colorThresholds?: { danger: number; warning: number };
  showValue?: boolean;
}) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  
  let barColor = 'bg-green-500';
  if (percent >= colorThresholds.danger) {
    barColor = 'bg-red-500';
  } else if (percent >= colorThresholds.warning) {
    barColor = 'bg-yellow-500';
  }
  
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-sm">{icon}</span>}
      <span className="text-xs text-gray-400 w-12">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2 min-w-[60px]">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      {showValue && (
        <span className="text-xs text-gray-300 w-12 text-right">
          {Math.round(value)}/{max}
        </span>
      )}
    </div>
  );
}

// Four core meters panel for shift view
export function ShiftMetersPanel({
  heat,
  storageUsed,
  storageMax,
  wastePercent,
  throughput,
  overclockActive,
  purgeCooldown,
  onToggleOverclock,
  onPurge,
}: {
  heat: number;
  storageUsed: number;
  storageMax: number;
  wastePercent: number;
  throughput: number;
  overclockActive: boolean;
  purgeCooldown: number;
  onToggleOverclock: () => void;
  onPurge: () => void;
}) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Throughput */}
        <div className="bg-gray-700 p-3 rounded text-center">
          <div className="text-xs text-gray-400 mb-1">Throughput</div>
          <div className="text-2xl font-bold text-blue-400">
            {throughput.toFixed(1)}
            <span className="text-sm text-gray-400">/s</span>
          </div>
        </div>

        {/* Heat */}
        <div className={`p-3 rounded text-center ${heat >= 100 ? 'bg-red-900/50 animate-pulse' : 'bg-gray-700'}`}>
          <div className="text-xs text-gray-400 mb-1">Heat</div>
          <div className={`text-2xl font-bold ${
            heat >= 100 ? 'text-red-400' :
            heat >= 75 ? 'text-orange-400' :
            heat >= 50 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {Math.round(heat)}%
          </div>
          {heat >= 100 && (
            <div className="text-xs text-red-400 font-bold">THROTTLED!</div>
          )}
        </div>

        {/* Storage */}
        <div className="bg-gray-700 p-3 rounded text-center">
          <div className="text-xs text-gray-400 mb-1">Storage</div>
          <div className="text-2xl font-bold">
            <span className={storageUsed >= storageMax ? 'text-red-400' : 'text-white'}>
              {storageUsed}
            </span>
            <span className="text-gray-500">/{storageMax}</span>
          </div>
          {storageUsed >= storageMax && (
            <div className="text-xs text-red-400">OVERFLOW!</div>
          )}
        </div>

        {/* Waste */}
        <div className="bg-gray-700 p-3 rounded text-center">
          <div className="text-xs text-gray-400 mb-1">Waste</div>
          <div className={`text-2xl font-bold ${wastePercent > 0.25 ? 'text-red-400' : 'text-gray-300'}`}>
            {Math.round(wastePercent * 100)}%
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={onToggleOverclock}
          className={`flex-1 py-2 rounded font-bold transition-colors ${
            overclockActive
              ? 'bg-orange-600 text-white'
              : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
          }`}
        >
          {overclockActive ? '⚡ OVERCLOCK ON' : '⚡ Overclock'}
        </button>
        <button
          onClick={onPurge}
          disabled={purgeCooldown > 0}
          className={`flex-1 py-2 rounded font-bold transition-colors ${
            purgeCooldown > 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {purgeCooldown > 0 ? `❄️ Purge (${purgeCooldown}s)` : '❄️ Purge Valve'}
        </button>
      </div>
    </div>
  );
}
