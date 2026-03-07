"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import useSWR from "swr";
import { useUser } from "./user-provider";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Firm {
  id: string;
  name: string;
  legalName: string | null;
}

interface FirmContextType {
  firmId: string;
  firmName: string;
  firms: Firm[];
  setFirmId: (id: string) => void;
  isLoading: boolean;
}

const FirmContext = createContext<FirmContextType>({
  firmId: "",
  firmName: "Atlas",
  firms: [],
  setFirmId: () => {},
  isLoading: true,
});

export function useFirm() {
  return useContext(FirmContext);
}

export function FirmProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();

  // Derive firmId from auth user — no hardcoded fallback
  const [firmId, setFirmIdState] = useState<string>(() => {
    if (user.firmId) return user.firmId;
    return "";
  });

  // Sync firmId when user changes (e.g., Clerk auth loads)
  useEffect(() => {
    if (user.firmId && user.firmId !== firmId) {
      setFirmIdState(user.firmId);
    }
  }, [user.firmId, firmId]);

  function setFirmId(id: string) {
    setFirmIdState(id);
  }

  // Only fetch firms once we have a firmId from auth
  const { data: firms, isLoading } = useSWR<Firm[]>(
    firmId ? "/api/firms" : null,
    fetcher
  );

  // If firmId doesn't exist in loaded firms, reset to first firm
  useEffect(() => {
    if (firms && firms.length > 0 && firmId && !firms.find((f) => f.id === firmId)) {
      setFirmId(firms[0].id);
    }
  }, [firms, firmId]);

  const currentFirm = firms?.find((f) => f.id === firmId);

  return (
    <FirmContext.Provider
      value={{
        firmId,
        firmName: currentFirm?.name || "Atlas",
        firms: firms || [],
        setFirmId,
        isLoading,
      }}
    >
      {children}
    </FirmContext.Provider>
  );
}
