import Link from "next/link";
import { cn } from "@/lib/utils";

interface AssetOriginatedFromProps {
  dealId: string;
  dealName: string;
}

export function AssetOriginatedFrom({ dealId, dealName }: AssetOriginatedFromProps) {
  return (
    <div
      className={cn(
        "bg-indigo-50 dark:bg-indigo-900/20",
        "border border-indigo-200 dark:border-indigo-800",
        "rounded-lg px-4 py-2.5 flex items-center gap-2"
      )}
    >
      <span className="text-indigo-500 text-sm">&#9670;</span>
      <span className="text-xs text-indigo-700 dark:text-indigo-300">
        Originated from:{" "}
        <Link
          href={`/deals/${dealId}`}
          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {dealName}
        </Link>
      </span>
      <Link
        href={`/deals/${dealId}`}
        className="ml-auto text-indigo-500 hover:text-indigo-700 text-xs"
      >
        View Deal &rarr;
      </Link>
    </div>
  );
}
