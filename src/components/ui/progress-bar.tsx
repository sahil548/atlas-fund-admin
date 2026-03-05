export function ProgressBar({
  percent,
  colorClass = "bg-emerald-500",
}: {
  percent: number;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${
            percent === 100 ? "bg-emerald-500" : colorClass
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500">{percent}%</span>
    </div>
  );
}
