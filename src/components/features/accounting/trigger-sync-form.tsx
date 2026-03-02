"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props { open: boolean; onClose: () => void; entityId: string; entityName: string }

export function TriggerSyncForm({ open, onClose, entityId, entityName }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation("/api/accounting/connections", { method: "PATCH", revalidateKeys: ["/api/accounting/connections"] });

  async function handleConfirm() {
    try {
      await trigger({ entityId, syncStatus: "CONNECTED", lastSyncAt: new Date().toISOString() });
      toast.success(`Sync triggered for ${entityName}`);
      onClose();
    } catch { toast.error("Failed to trigger sync"); }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Trigger Sync"
      message={`Trigger a manual sync for ${entityName}? This will update the last sync timestamp to now.`}
      confirmLabel="Sync Now"
      loading={isLoading}
    />
  );
}
