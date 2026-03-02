"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mutate } from "swr";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DealNotesTabProps {
  deal: any;
}

export function DealNotesTab({ deal }: DealNotesTabProps) {
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function addNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await fetch(`/api/deals/${deal.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText }),
      });
      setNoteText("");
      mutate(`/api/deals/${deal.id}`);
    } catch {
      /* silent */
    } finally {
      setSavingNote(false);
    }
  }

  const notes = deal.notes || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          className="flex-1 border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={2}
          placeholder="Add a note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <Button
          size="sm"
          loading={savingNote}
          onClick={addNote}
          disabled={!noteText.trim()}
        >
          Add Note
        </Button>
      </div>
      {notes.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {(notes as any[]).map((n: any) => (
            <div key={n.id} className="py-3">
              <div className="flex items-center gap-2 mb-1">
                {n.author && (
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                    {n.author.initials || n.author.name?.charAt(0) || "?"}
                  </span>
                )}
                <span className="text-xs font-medium text-gray-700">
                  {n.author?.name || "System"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(n.createdAt).toLocaleDateString()}{" "}
                  {new Date(n.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap ml-8">
                {n.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">
          No notes yet.
        </div>
      )}
    </div>
  );
}
