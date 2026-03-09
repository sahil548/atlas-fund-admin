interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 py-2.5">
              <div
                className={`h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse ${
                  j === 0 ? "w-32" : j === columns - 1 ? "w-12" : "w-20"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
