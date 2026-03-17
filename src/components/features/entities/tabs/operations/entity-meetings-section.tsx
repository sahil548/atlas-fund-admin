"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { CreateMeetingForm } from "@/components/features/meetings/create-meeting-form";
import { mutate } from "swr";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  entity: any;
  entityId: string;
}

export function EntityMeetingsSection({ entity, entityId }: Props) {
  const [showMeeting, setShowMeeting] = useState(false);
  const meetings: any[] = entity.meetings || [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Meetings ({meetings.length})</h3>
        <Button size="sm" onClick={() => setShowMeeting(true)}>+ Log Meeting</Button>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-700">
        {meetings.map((m: any) => (
          <div key={m.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 mr-2">{formatDate(m.meetingDate)}</span>
                {m.meetingType && (
                  <Badge color={m.meetingType === "IC Meeting" ? "amber" : m.meetingType === "DD Session" ? "blue" : "purple"}>
                    {m.meetingType}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                {m.hasTranscript && <Badge color="purple">Transcript</Badge>}
                {m.actionItems > 0 && <Badge color="gray">{m.actionItems} items</Badge>}
              </div>
            </div>
            <div className="text-sm font-medium mt-1">{m.title}</div>
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">No meetings logged.</div>
        )}
      </div>

      <CreateMeetingForm
        open={showMeeting}
        onClose={() => {
          setShowMeeting(false);
          mutate(`/api/entities/${entityId}`);
        }}
      />
    </div>
  );
}
