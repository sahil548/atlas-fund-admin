"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const activityTypeColors: Record<string, string> = {
  STAGE_CHANGE: "blue",
  MEETING: "green",
  CALL: "yellow",
  SCREENING_RUN: "purple",
  DOCUMENT_UPLOADED: "gray",
  NOTE_ADDED: "gray",
  IC_DECISION: "indigo",
  TASK_COMPLETED: "green",
  WORKSTREAM_COMPLETE: "green",
  EVENT: "orange",
};

const activityTypeLabels: Record<string, string> = {
  STAGE_CHANGE: "Stage Change",
  MEETING: "Meeting",
  CALL: "Call",
  SCREENING_RUN: "AI Screening",
  DOCUMENT_UPLOADED: "Document",
  NOTE_ADDED: "Note",
  IC_DECISION: "IC Decision",
  TASK_COMPLETED: "Task",
  WORKSTREAM_COMPLETE: "Workstream",
  EVENT: "Event",
};

interface DealActivityTabProps {
  deal: any;
}

export function DealActivityTab({ deal }: DealActivityTabProps) {
  const toast = useToast();
  const { data: activitiesData } = useSWR(
    `/api/deals/${deal.id}/activities`,
    fetcher
  );
  const activities = Array.isArray(activitiesData)
    ? activitiesData
    : activitiesData?.activities || [];

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    date: "",
    meetingType: "",
    summary: "",
  });
  const [savingMeeting, setSavingMeeting] = useState(false);

  const [showCallForm, setShowCallForm] = useState(false);
  const [callForm, setCallForm] = useState({ description: "", date: "" });
  const [savingCall, setSavingCall] = useState(false);

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    activityType: "EVENT",
    description: "",
    date: "",
  });
  const [savingEvent, setSavingEvent] = useState(false);

  async function logMeeting() {
    if (!meetingForm.title.trim()) return;
    setSavingMeeting(true);
    try {
      await fetch(`/api/deals/${deal.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "MEETING",
          description: meetingForm.title,
          metadata: {
            date: meetingForm.date,
            meetingType: meetingForm.meetingType,
            summary: meetingForm.summary,
          },
        }),
      });
      toast.success("Meeting logged");
      mutate(`/api/deals/${deal.id}/activities`);
      setMeetingForm({ title: "", date: "", meetingType: "", summary: "" });
      setShowMeetingModal(false);
    } catch {
      toast.error("Failed to log meeting");
    } finally {
      setSavingMeeting(false);
    }
  }

  async function logCall() {
    if (!callForm.description.trim()) return;
    setSavingCall(true);
    try {
      await fetch(`/api/deals/${deal.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "CALL",
          description: callForm.description,
          metadata: { date: callForm.date },
        }),
      });
      toast.success("Call logged");
      mutate(`/api/deals/${deal.id}/activities`);
      setCallForm({ description: "", date: "" });
      setShowCallForm(false);
    } catch {
      toast.error("Failed to log call");
    } finally {
      setSavingCall(false);
    }
  }

  async function logEvent() {
    if (!eventForm.description.trim()) return;
    setSavingEvent(true);
    try {
      await fetch(`/api/deals/${deal.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: eventForm.activityType,
          description: eventForm.description,
          metadata: { date: eventForm.date },
        }),
      });
      toast.success("Event logged");
      mutate(`/api/deals/${deal.id}/activities`);
      setEventForm({ activityType: "EVENT", description: "", date: "" });
      setShowEventForm(false);
    } catch {
      toast.error("Failed to log event");
    } finally {
      setSavingEvent(false);
    }
  }

  const sortedActivities = [...activities].sort(
    (a: any, b: any) =>
      new Date(b.createdAt || b.date || 0).getTime() -
      new Date(a.createdAt || a.date || 0).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShowMeetingModal(true)}>
          Log Meeting
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowCallForm(!showCallForm)}
        >
          Log Call
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowEventForm(!showEventForm)}
        >
          Log Event
        </Button>
      </div>

      {/* Inline call form */}
      {showCallForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700">Log a Call</div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={callForm.description}
              onChange={(e) =>
                setCallForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Call description..."
              className="text-xs"
            />
            <Input
              type="date"
              value={callForm.date}
              onChange={(e) =>
                setCallForm((p) => ({ ...p, date: e.target.value }))
              }
              className="text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={savingCall}
              onClick={logCall}
              disabled={!callForm.description.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowCallForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Inline event form */}
      {showEventForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700">
            Log an Event
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={eventForm.activityType}
              onChange={(e) =>
                setEventForm((p) => ({ ...p, activityType: e.target.value }))
              }
              options={[
                { value: "EVENT", label: "General Event" },
                { value: "MEETING", label: "Meeting" },
                { value: "CALL", label: "Call" },
                { value: "STAGE_CHANGE", label: "Stage Change" },
              ]}
              className="text-xs"
            />
            <Input
              value={eventForm.description}
              onChange={(e) =>
                setEventForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Description..."
              className="text-xs"
            />
            <Input
              type="date"
              value={eventForm.date}
              onChange={(e) =>
                setEventForm((p) => ({ ...p, date: e.target.value }))
              }
              className="text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={savingEvent}
              onClick={logEvent}
              disabled={!eventForm.description.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowEventForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {sortedActivities.length > 0 ? (
        <div className="space-y-0">
          {sortedActivities.map((activity: any, idx: number) => {
            const dateStr =
              activity.createdAt || activity.date || activity.metadata?.date;
            const actType =
              activity.activityType || activity.type || "EVENT";
            return (
              <div key={activity.id || idx} className="flex gap-3 py-3">
                {/* Timeline line and dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 ${
                      activityTypeColors[actType]
                        ? `bg-${
                            actType === "MEETING"
                              ? "emerald"
                              : actType === "CALL"
                              ? "amber"
                              : actType === "SCREENING_RUN"
                              ? "purple"
                              : actType === "STAGE_CHANGE"
                              ? "blue"
                              : actType === "IC_DECISION"
                              ? "indigo"
                              : "gray"
                          }-400`
                        : "bg-gray-300"
                    }`}
                  />
                  {idx < sortedActivities.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge color={activityTypeColors[actType] || "gray"}>
                      {activityTypeLabels[actType] || actType}
                    </Badge>
                    {dateStr && (
                      <span className="text-[10px] text-gray-400">
                        {formatDate(dateStr)}{" "}
                        {new Date(dateStr).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {activity.description}
                  </p>
                  {activity.metadata?.summary && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activity.metadata.summary}
                    </p>
                  )}
                  {activity.metadata?.meetingType && (
                    <span className="text-[10px] text-gray-400">
                      Type: {activity.metadata.meetingType}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">
          No activity yet. Log a meeting, call, or event to get started.
        </div>
      )}

      {/* Meeting Modal */}
      <Modal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        title="Log Meeting"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowMeetingModal(false)}
            >
              Cancel
            </Button>
            <Button
              loading={savingMeeting}
              onClick={logMeeting}
              disabled={!meetingForm.title.trim()}
            >
              Save Meeting
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Title" required>
            <Input
              value={meetingForm.title}
              onChange={(e) =>
                setMeetingForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Meeting title..."
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date">
              <Input
                type="date"
                value={meetingForm.date}
                onChange={(e) =>
                  setMeetingForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Meeting Type">
              <Input
                value={meetingForm.meetingType}
                onChange={(e) =>
                  setMeetingForm((p) => ({
                    ...p,
                    meetingType: e.target.value,
                  }))
                }
                placeholder="e.g. IC Meeting, Site Visit"
              />
            </FormField>
          </div>
          <FormField label="Summary">
            <Textarea
              value={meetingForm.summary}
              onChange={(e) =>
                setMeetingForm((p) => ({ ...p, summary: e.target.value }))
              }
              placeholder="Meeting notes and key takeaways..."
              rows={3}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
