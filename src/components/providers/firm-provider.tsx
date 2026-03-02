"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  firmId: "firm-1",
  firmName: "Atlas",
  firms: [],
  setFirmId: () => {},
  isLoading: true,
});

export function useFirm() {
  return useContext(FirmContext);
}

export function FirmProvider({ children }: { children: ReactNode }) {
  const { data: firms, isLoading } = useSWR<Firm[]>("/api/firms", fetcher);
  const [firmId, setFirmIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("atlas_firmId") || "firm-1";
    }
    return "firm-1";
  });

  function setFirmId(id: string) {
    setFirmIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("atlas_firmId", id);
    }
  }

  // If stored firmId doesn't exist in loaded firms, reset to first firm
  useEffect(() => {
    if (firms && firms.length > 0 && !firms.find((f) => f.id === firmId)) {
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
