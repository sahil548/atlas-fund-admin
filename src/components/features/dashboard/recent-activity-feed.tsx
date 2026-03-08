"use client";

import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ActivityItem {
  id: string;
  type: "DEAL_ACTIVITY" | "CAPITAL_CALL" | "DISTRIBUTION";
  description: string;
  entityName: string | null;
  linkId: string;
  linkType: "deal" | "entity";
  date: string;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const ACTIVITY_TYPE_CONFIG: Record<
  ActivityItem["type"],
  { icon: string; label: string; color: string }
> = {
  DEAL_ACTIVITY: {
    icon: "D",
    label: "Deal",
    color: "bg-blue-100 text-blue-700",
  },
  CAPITAL_CALL: {
    icon: "$",
    label: "Capital Call",
    color: "bg-indigo-100 text-indigo-700",
  },
  DISTRIBUTION: {
    icon: "→",
    label: "Distribution",
    color: "bg-emerald-100 text-emerald-700",
  },
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
        <div className="text-xs text-gray-400 text-center py-6">No recent activity</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-[10px] text-gray-500 mt-0.5">Firm-wide actions in the last 30 days</p>
      </div>

      <div className="divide-y divide-gray-50">
        {activities.map((activity) => {
          const config = ACTIVITY_TYPE_CONFIG[activity.type];
          const href =
            activity.linkType === "deal"
              ? `/deals/${activity.linkId}`
              : `/entities/${activity.linkId}`;

          return (
            <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${config.color}`}
              >
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{activity.description}</p>
                {activity.entityName && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {activity.entityName}
                  </p>
                )}
              </div>

              {/* Time + link */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <span className="text-[10px] text-gray-400">{timeAgo(activity.date)}</span>
                <Link
                  href={href}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800"
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
