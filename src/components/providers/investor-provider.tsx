"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import useSWR from "swr";
import { useUser } from "./user-provider";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface InvestorAccess {
  id: string;
  name: string;
  investorType: string;
  totalCommitted: number;
  accessRole: string;
  company?: { id: string; name: string } | null;
  commitments?: Array<{ entityId: string; entity: { id: string; name: string }; amount: number }>;
}

interface InvestorContextType {
  investorId: string | null;
  investor: InvestorAccess | null;
  investors: InvestorAccess[];
  setInvestorId: (id: string) => void;
  isLoading: boolean;
}

const InvestorContext = createContext<InvestorContextType>({
  investorId: null,
  investor: null,
  investors: [],
  setInvestorId: () => {},
  isLoading: true,
});

export function useInvestor() {
  return useContext(InvestorContext);
}

export function InvestorProvider({ children }: { children: ReactNode }) {
  const { userId } = useUser();
  const { data: investors, isLoading } = useSWR<InvestorAccess[]>(
    userId ? `/api/lp/my-investors?userId=${userId}` : null,
    fetcher
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first investor when data loads, or clear when user changes
  useEffect(() => {
    if (investors && investors.length > 0) {
      // If current selection is not in the list, reset to first
      const validSelection = selectedId && investors.some((i) => i.id === selectedId);
      if (!validSelection) {
        setSelectedId(investors[0].id);
      }
    } else if (investors && investors.length === 0) {
      setSelectedId(null);
    }
  }, [investors, selectedId, userId]);

  const investorList = investors || [];
  const currentInvestor = investorList.find((i) => i.id === selectedId) || null;

  return (
    <InvestorContext.Provider
      value={{
        investorId: selectedId,
        investor: currentInvestor,
        investors: investorList,
        setInvestorId: setSelectedId,
        isLoading,
      }}
    >
      {children}
    </InvestorContext.Provider>
  );
}
