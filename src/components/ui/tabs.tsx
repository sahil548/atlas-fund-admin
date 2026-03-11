"use client";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
            active === t
              ? "bg-indigo-600 dark:bg-indigo-500 text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
