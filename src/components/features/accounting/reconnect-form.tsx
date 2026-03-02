"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props { open: boolean; onClose: () => void; entityId: string; entityName: string }

export function ReconnectForm({ open, onClose, entityId, entityName }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation("/api/accounting/connections", { method: "PATCH", revalidateKeys: ["/api/accounting/connections"] });

  async function handleConfirm() {
    try {
      await trigger({ entityId, syncStatus: "CONNECTED", lastSyncAt: new Date().toISOString() });
      toast.success(`${entityName} reconnected`);
      onClose();
    } catch { toast.error("Failed to reconnect"); }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Reconnect Entity"
      message={`Reconnect ${entityName} to its accounting provider? This will reset the connection status and update the sync timestamp.`}
      confirmLabel="Reconnect"
      loading={isLoading}
    />
  );
}
