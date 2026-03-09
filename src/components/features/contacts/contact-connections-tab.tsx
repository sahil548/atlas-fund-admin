"use client";

import { formatDate } from "@/lib/utils";
import { INTERACTION_TYPE_LABELS } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ContactConnectionsTabProps {
  contact: any;
}

export function ContactConnectionsTab({ contact }: ContactConnectionsTabProps) {
  const interactions: any[] = contact.interactions || [];

  if (interactions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        No team connections recorded yet.
      </div>
    );
  }

  // Aggregate by authorId
  const byAuthor: Record<string, { author: any; count: number; lastDate: string; types: string[] }> = {};

  for (const interaction of interactions) {
    const authorId = interaction.author?.id || "unknown";
    if (!byAuthor[authorId]) {
      byAuthor[authorId] = {
        author: interaction.author,
        count: 0,
        lastDate: interaction.date,
        types: [],
      };
    }
    byAuthor[authorId].count++;
    if (new Date(interaction.date) > new Date(byAuthor[authorId].lastDate)) {
      byAuthor[authorId].lastDate = interaction.date;
    }
    if (!byAuthor[authorId].types.includes(interaction.type)) {
      byAuthor[authorId].types.push(interaction.type);
    }
  }

  // Sort by count descending
  const sorted = Object.values(byAuthor).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Team members who have logged interactions with this contact.
      </div>

      {sorted.map(({ author, count, lastDate, types }) => {
        const initials = author?.initials ||
          (author?.name || "").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) ||
          "?";
        const name = author?.name || "Unknown";

        return (
          <div
            key={author?.id || "unknown"}
            className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-sm font-bold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 flex gap-2 mt-0.5 flex-wrap">
                <span>Last: {formatDate(lastDate)}</span>
                <span>Types: {types.map((t) => INTERACTION_TYPE_LABELS[t] || t).join(", ")}</span>
              </div>
            </div>

            {/* Interaction count */}
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{count}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {count === 1 ? "Interaction" : "Interactions"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
