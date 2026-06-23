import { FareEstimate } from '../types';

export default function FareBreakdown({ fare, compact = false }: { fare: FareEstimate; compact?: boolean }) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg">{fmt(fare.totalFare)}</span>
        <span className="text-xs text-brand-600 font-medium bg-brand-50 px-2 py-0.5 rounded">
          Driver gets {fmt(fare.driverEarnings)} (90%)
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase font-semibold text-gray-400 tracking-wide">Fare breakdown</div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Base fare</span><span>{fmt(fare.baseFare)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Distance ({fare.distanceMiles} mi × $1.50)</span>
          <span>{fmt(fare.distanceFare)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Time ({fare.durationMinutes} min × $0.25)</span>
          <span>{fmt(fare.timeFare)}</span>
        </div>
        {fare.surgeMultiplier > 1 && (
          <div className="flex justify-between text-yellow-600 font-medium">
            <span>Surge ({fare.surgeMultiplier}×)</span>
            <span>×{fare.surgeMultiplier}</span>
          </div>
        )}
        <div className="border-t pt-1.5 flex justify-between font-semibold">
          <span>Total fare</span><span>{fmt(fare.totalFare)}</span>
        </div>
      </div>

      {/* Driver earnings highlight */}
      <div className="rounded-lg bg-brand-50 border border-brand-200 p-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-semibold text-brand-700">Driver earns (90%)</span>
          <span className="text-lg font-bold text-brand-600">{fmt(fare.driverEarnings)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Platform fee (10%)</span>
          <span>{fmt(fare.platformFee)}</span>
        </div>
      </div>

      {/* vs Uber comparison */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Driver would earn on Uber (~75%)</span>
          <span className="line-through">{fmt(fare.uberDriverWouldEarn)}</span>
        </div>
        <div className="flex justify-between text-brand-600 font-semibold mt-0.5">
          <span>Driver saves with FairRide</span>
          <span>+{fmt(fare.driverSavings)}</span>
        </div>
      </div>
    </div>
  );
}
