"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  document: {
    name: string;
    fileUrl?: string | null;
    mimeType?: string | null;
  } | null;
}

export function DocumentPreviewModal({ open, onClose, document }: Props) {
  if (!document || !document.fileUrl) return null;

  const previewUrl = `${document.fileUrl}?preview=true`;
  const isPdf =
    document.mimeType?.includes("pdf") ||
    document.name.toLowerCase().endsWith(".pdf");
  const isImage =
    document.mimeType?.startsWith("image/") ||
    /\.(png|jpg|jpeg|gif|webp)$/i.test(document.name);

  return (
    <Modal open={open} onClose={onClose} title={document.name} size="full">
      <div className="min-h-[60vh]">
        {isPdf ? (
          <iframe
            src={previewUrl}
            className="w-full h-[80vh] rounded-lg border"
          />
        ) : isImage ? (
          <div className="flex justify-center">
            <img
              src={previewUrl}
              alt={document.name}
              className="max-w-full max-h-[80vh] rounded-lg"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-sm mb-4">
              Preview not available for this file type.
            </p>
            <a href={document.fileUrl} download>
              <Button>Download File</Button>
            </a>
          </div>
        )}
      </div>
      <div className="flex justify-end mt-4 gap-2">
        <a href={document.fileUrl} download>
          <Button variant="secondary">Download</Button>
        </a>
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
