"use client";

export function TopBar({ title }: { title: string }) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3 flex justify-between items-center sticky top-0 z-10">
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-500">QBO synced 15m ago</span>
        <span className="w-2 h-2 bg-emerald-400 rounded-full" />
      </div>
    </div>
  );
}
