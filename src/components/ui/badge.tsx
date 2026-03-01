"use client";

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
};

export function Badge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${
        colorMap[color] || colorMap.gray
      }`}
    >
      {children}
    </span>
  );
}
