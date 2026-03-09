export function StatCard({
  label,
  value,
  sub,
  trend,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  small?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${
        small ? "p-3" : "p-5"
      }`}
    >
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className={`font-semibold text-gray-900 dark:text-gray-100 ${
          small ? "text-lg" : "text-2xl"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</div>}
      {trend !== undefined && (
        <div
          className={`text-xs mt-1 font-medium ${
            trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {trend > 0 ? "\u2191" : "\u2193"} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}
