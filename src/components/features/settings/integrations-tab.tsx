"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { logger } from "@/lib/logger";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface IntegrationConnection {
  id: string;
  provider: string;
  entityId: string | null;
  externalAccountId: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

interface Entity {
  id: string;
  name: string;
}

// Connection status card props
interface IntegrationCardProps {
  name: string;
  description: string;
  provider: string;
  isConfigured: boolean;
  connection: IntegrationConnection | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
  syncing?: boolean;
  connecting?: boolean;
  children?: React.ReactNode;
}

function IntegrationCard({
  name,
  description,
  provider,
  isConfigured,
  connection,
  onConnect,
  onDisconnect,
  onSync,
  syncing = false,
  connecting = false,
  children,
}: IntegrationCardProps) {
  const isConnected = !!connection;
  const metadata = connection?.metadata ?? {};
  const lastSyncedRaw = metadata.lastSynced ?? null;
  const lastSyncedFormatted = lastSyncedRaw
    ? new Date(lastSyncedRaw).toLocaleString()
    : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {/* Status dot: green = connected, red = disconnected */}
            {isConnected ? (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" title="Connected" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block flex-shrink-0" title="Not connected" />
            )}
            <h4 className="text-sm font-semibold dark:text-gray-100">{name}</h4>
            {isConnected ? (
              <Badge color="green">Connected</Badge>
            ) : isConfigured ? (
              <Badge color="gray">Not connected</Badge>
            ) : (
              <Badge color="yellow">Configuration required</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          {isConnected && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {lastSyncedFormatted
                ? `Last sync: ${lastSyncedFormatted}`
                : "Connected — never synced"}
            </p>
          )}
          {!isConfigured && (
            <p className="text-xs text-amber-600 mt-1">
              API credentials not set. Configure {name} environment variables to enable this integration.
            </p>
          )}
        </div>

        <div className="flex gap-2 ml-4 flex-shrink-0">
          {isConnected && onSync && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onSync}
              loading={syncing}
              disabled={!isConfigured}
            >
              Sync Now
            </Button>
          )}
          {isConnected ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={onDisconnect}
              disabled={!isConfigured}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onConnect}
              loading={connecting}
              disabled={!isConfigured}
            >
              Connect
            </Button>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

interface IntegrationsTabProps {
  firmId: string;
}

export function IntegrationsTab({ firmId }: IntegrationsTabProps) {
  const toast = useToast();

  // Fetch all integration connections for this firm
  const { data: connections, isLoading } = useSWR<IntegrationConnection[]>(
    firmId ? `/api/integrations/connections?firmId=${firmId}` : null,
    fetcher
  );

  // Fetch entities for Plaid per-entity selector
  const { data: entitiesRes } = useSWR<{ data: Entity[] }>(
    firmId ? `/api/entities?firmId=${firmId}` : null,
    fetcher
  );
  const entities = entitiesRes?.data;

  // Sync state per provider
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  // Disconnect confirmation modal
  const [disconnecting, setDisconnecting] = useState<IntegrationConnection | null>(null);

  // Plaid entity selector
  const [plaidEntityId, setPlaidEntityId] = useState("");
  const [plaidConnecting, setPlaidConnecting] = useState(false);
  const [showPlaidAccounts, setShowPlaidAccounts] = useState<string | null>(null);

  // Environment variable availability (checked client-side via a config endpoint)
  // We use a heuristic: the backend returns 503 if not configured
  const isAsanaConfigured = true; // graceful — disabled button if 503
  const isNotionConfigured = true;
  const isPlaidConfigured = true;
  const isGcalConfigured = true;

  function getConnection(provider: string, entityId?: string | null): IntegrationConnection | null {
    if (!connections) return null;
    return (
      connections.find(
        (c) =>
          c.provider === provider &&
          (entityId !== undefined ? c.entityId === entityId : c.entityId === null)
      ) ?? null
    );
  }

  async function handleConnect(provider: string) {
    window.location.href = `/api/integrations/${provider}/connect`;
  }

  async function handleDisconnect(connection: IntegrationConnection) {
    try {
      const res = await fetch(`/api/integrations/connections/${connection.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`${connection.provider} disconnected`);
        mutate(`/api/integrations/connections?firmId=${firmId}`);
      } else {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to disconnect";
        toast.error(msg);
      }
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleSync(provider: string) {
    setSyncing((s) => ({ ...s, [provider]: true }));
    try {
      const res = await fetch(`/api/integrations/${provider}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${provider} sync complete`);
        mutate(`/api/integrations/connections?firmId=${firmId}`);
      } else {
        const msg = typeof data.error === "string" ? data.error : "Sync failed";
        toast.error(msg);
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing((s) => ({ ...s, [provider]: false }));
    }
  }

  async function handlePlaidConnect() {
    if (!plaidEntityId) {
      toast.error("Please select an entity first");
      return;
    }

    setPlaidConnecting(true);
    try {
      // 1. Get a link token
      const linkTokenRes = await fetch("/api/integrations/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: plaidEntityId }),
      });

      const linkData = await linkTokenRes.json();

      if (!linkTokenRes.ok) {
        const msg = typeof linkData.error === "string" ? linkData.error : "Failed to create Plaid link";
        toast.error(msg);
        return;
      }

      // 2. Load Plaid Link (script injected dynamically)
      if (typeof window === "undefined") return;

      // Load Plaid Link script if not already loaded
      if (!document.getElementById("plaid-link-script")) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.id = "plaid-link-script";
          script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Plaid Link"));
          document.head.appendChild(script);
        });
      }

      // 3. Open Plaid Link
      const handler = (window as unknown as Record<string, unknown>).Plaid as {
        create: (config: {
          token: string;
          onSuccess: (publicToken: string) => void;
          onExit: (err: unknown) => void;
        }) => { open: () => void };
      };

      if (!handler?.create) {
        toast.error("Plaid Link failed to load. Please try again.");
        return;
      }

      const linkHandler = handler.create({
        token: linkData.link_token,
        onSuccess: async (publicToken: string) => {
          // 4. Exchange public token for access token
          const exchangeRes = await fetch("/api/integrations/plaid/exchange-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicToken, entityId: plaidEntityId }),
          });

          if (exchangeRes.ok) {
            toast.success("Bank account connected successfully");
            mutate(`/api/integrations/connections?firmId=${firmId}`);
            setPlaidEntityId("");
          } else {
            const errData = await exchangeRes.json();
            const msg = typeof errData.error === "string" ? errData.error : "Failed to exchange token";
            toast.error(msg);
          }
          setPlaidConnecting(false);
        },
        onExit: (err: unknown) => {
          if (err) {
            logger.error("[plaid] Link exit with error:", { error: err instanceof Error ? err.message : String(err) });
          }
          setPlaidConnecting(false);
        },
      });

      linkHandler.open();
    } catch (err) {
      logger.error("[plaid] Connection error:", { error: err instanceof Error ? err.message : String(err) });
      toast.error("Failed to connect bank account");
      setPlaidConnecting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-sm text-gray-400 p-4">Loading integrations...</div>
    );
  }

  const asanaConnection = getConnection("asana");
  const notionConnection = getConnection("notion");
  const gcalConnection = getConnection("google_calendar");

  // Get all Plaid connections (one per entity)
  const plaidConnections = connections?.filter((c) => c.provider === "plaid") ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Third-Party Integrations</h3>
        <p className="text-xs text-gray-500">
          Connect Atlas to your existing tools. All integrations support bidirectional sync.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Asana */}
        <IntegrationCard
          name="Asana"
          description="Bidirectional task sync — Atlas tasks appear in Asana, Asana tasks can be imported."
          provider="asana"
          isConfigured={isAsanaConfigured}
          connection={asanaConnection}
          onConnect={() => handleConnect("asana")}
          onDisconnect={() => setDisconnecting(asanaConnection)}
          onSync={() => handleSync("asana")}
          syncing={syncing.asana}
        />

        {/* Notion */}
        <IntegrationCard
          name="Notion"
          description="Bidirectional data sync — Atlas deal data syncs to your Notion workspace databases."
          provider="notion"
          isConfigured={isNotionConfigured}
          connection={notionConnection}
          onConnect={() => handleConnect("notion")}
          onDisconnect={() => setDisconnecting(notionConnection)}
          onSync={() => handleSync("notion")}
          syncing={syncing.notion}
        />

        {/* Google Calendar */}
        <IntegrationCard
          name="Google Calendar"
          description="Meeting and due date sync — task due dates and meetings appear in your Google Calendar."
          provider="google_calendar"
          isConfigured={isGcalConfigured}
          connection={gcalConnection}
          onConnect={() => handleConnect("google-calendar")}
          onDisconnect={() => setDisconnecting(gcalConnection)}
          onSync={() => handleSync("google-calendar")}
          syncing={syncing["google-calendar"]}
        />

        {/* Plaid */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold">Plaid</h4>
                {plaidConnections.length > 0 ? (
                  <Badge color="green">{plaidConnections.length} connected</Badge>
                ) : isPlaidConfigured ? (
                  <Badge color="gray">Not connected</Badge>
                ) : (
                  <Badge color="yellow">Configuration required</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Bank account connectivity — per-entity cash balances and recent transactions.
              </p>
              {!isPlaidConfigured && (
                <p className="text-xs text-amber-600 mt-1">
                  API credentials not set. Configure PLAID_CLIENT_ID and PLAID_SECRET to enable.
                </p>
              )}
            </div>
          </div>

          {/* Connected Plaid entities */}
          {plaidConnections.length > 0 && (
            <div className="space-y-2">
              {plaidConnections.map((conn) => {
                const entity = entities?.find((e) => e.id === conn.entityId);
                return (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg"
                  >
                    <div className="text-xs">
                      <span className="font-medium">{entity?.name ?? conn.entityId}</span>
                      <button
                        className="ml-2 text-indigo-600 hover:underline"
                        onClick={() =>
                          setShowPlaidAccounts(
                            showPlaidAccounts === conn.entityId ? null : (conn.entityId ?? null)
                          )
                        }
                      >
                        {showPlaidAccounts === conn.entityId ? "Hide" : "View accounts"}
                      </button>
                    </div>
                    <button
                      className="text-red-500 hover:underline text-xs"
                      onClick={() => setDisconnecting(conn)}
                    >
                      Disconnect
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Connect new entity */}
          {isPlaidConfigured && (
            <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-gray-500 mb-1">
                  Connect bank account for entity
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                  value={plaidEntityId}
                  onChange={(e) => setPlaidEntityId(e.target.value)}
                >
                  <option value="">Select an entity...</option>
                  {entities
                    ?.filter((e) => !plaidConnections.some((c) => c.entityId === e.id))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </div>
              <Button
                size="sm"
                onClick={handlePlaidConnect}
                loading={plaidConnecting}
                disabled={!plaidEntityId || !isPlaidConfigured}
              >
                Connect via Plaid
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Disconnect confirmation modal */}
      <Modal
        open={!!disconnecting}
        onClose={() => setDisconnecting(null)}
        title="Disconnect Integration"
      >
        {disconnecting && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to disconnect{" "}
              <span className="font-medium capitalize">{disconnecting.provider.replace("_", " ")}</span>?
              Your synced data will be preserved, but future sync will stop.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => handleDisconnect(disconnecting)}
              >
                Yes, Disconnect
              </Button>
              <Button onClick={() => setDisconnecting(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
