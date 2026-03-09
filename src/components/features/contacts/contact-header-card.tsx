"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RELATIONSHIP_TAGS } from "@/lib/constants";
import { useFirm } from "@/components/providers/firm-provider";
import { formatDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ContactHeaderCardProps {
  contact: any;
}

const CONTACT_TYPE_COLORS: Record<string, string> = {
  INTERNAL: "blue",
  EXTERNAL: "gray",
};

const CONTACT_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  EXTERNAL: "External",
};

export function ContactHeaderCard({ contact }: ContactHeaderCardProps) {
  const toast = useToast();
  const { firmId } = useFirm();
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [removingTag, setRemovingTag] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = `${contact.firstName?.[0] || ""}${contact.lastName?.[0] || ""}`.toUpperCase();
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const appliedTags = (contact.tags || []).map((t: any) => t.tag);
  const availableTags = RELATIONSHIP_TAGS.filter((t) => !appliedTags.includes(t));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function addTag(tag: string) {
    if (!tag.trim()) return;
    setAddingTag(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/tags?firmId=${firmId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: tag.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to add tag";
        toast.error(msg);
      } else {
        toast.success(`Tag "${tag}" added`);
        mutate(`/api/contacts/${contact.id}?firmId=${firmId}`);
      }
    } catch {
      toast.error("Failed to add tag");
    } finally {
      setAddingTag(false);
      setShowTagDropdown(false);
      setCustomTagInput("");
    }
  }

  async function removeTag(tag: string) {
    setRemovingTag(tag);
    try {
      await fetch(`/api/contacts/${contact.id}/tags?firmId=${firmId}&tag=${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      toast.success(`Tag "${tag}" removed`);
      mutate(`/api/contacts/${contact.id}?firmId=${firmId}`);
    } catch {
      toast.error("Failed to remove tag");
    } finally {
      setRemovingTag(null);
    }
  }

  const stats = contact.stats || {};

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xl font-bold flex items-center justify-center flex-shrink-0">
          {initials}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{fullName}</h1>
            <Badge color={CONTACT_TYPE_COLORS[contact.type] || "gray"}>
              {CONTACT_TYPE_LABELS[contact.type] || contact.type}
            </Badge>
          </div>

          {/* Title + Company */}
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {contact.title && <span>{contact.title}</span>}
            {contact.title && contact.company && <span> · </span>}
            {contact.company && (
              <Link
                href={`/companies/${contact.company.id}`}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {contact.company.name}
              </Link>
            )}
          </div>

          {/* Contact info */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                {contact.email}
              </a>
            )}
            {contact.phone && <span>{contact.phone}</span>}
          </div>

          {/* Relationship Tags */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {(contact.tags || []).map((t: any) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-700"
              >
                {t.tag}
                <button
                  onClick={() => removeTag(t.tag)}
                  disabled={removingTag === t.tag}
                  className="ml-0.5 text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-100 leading-none"
                >
                  ×
                </button>
              </span>
            ))}

            {/* Add Tag button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-full hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                + Add Tag
              </button>

              {showTagDropdown && (
                <div className="absolute left-0 top-7 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-52 py-1">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      disabled={addingTag}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-700"
                    >
                      {tag}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1 px-3 pb-2">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTag(customTagInput);
                        if (e.key === "Escape") setShowTagDropdown(false);
                      }}
                      placeholder="Custom tag..."
                      className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400"
                    />
                    <Button
                      size="sm"
                      onClick={() => addTag(customTagInput)}
                      disabled={!customTagInput.trim() || addingTag}
                      loading={addingTag}
                      className="mt-1 w-full text-xs"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex sm:flex-col gap-4 sm:gap-2 sm:items-end text-right">
          <div className="text-center sm:text-right">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.dealCount ?? 0}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Deals</div>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.assetCount ?? 0}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assets</div>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {(contact.interactions || []).length}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Interactions</div>
          </div>
          {stats.lastInteractionDate && (
            <div className="text-center sm:text-right">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {formatDate(stats.lastInteractionDate)}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Contact</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
