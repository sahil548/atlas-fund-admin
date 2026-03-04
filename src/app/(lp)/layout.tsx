"use client";

import { InvestorProvider, useInvestor } from "@/components/providers/investor-provider";

function InvestorGate({ children }: { children: React.ReactNode }) {
  const { investors, investorId, setInvestorId, isLoading } = useInvestor();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center text-gray-500">
          <div className="animate-pulse text-lg mb-2">Loading investor data...</div>
        </div>
      </div>
    );
  }

  if (investors.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700 mb-2">No Investor Profile</div>
          <p className="text-sm text-gray-500">
            Your account is not linked to any investor profiles.
            <br />
            Contact your fund administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Investor picker — only shown when user has access to multiple investors */}
      {investors.length > 1 && (
        <div className="mb-4 flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-xs text-gray-500 font-medium">Viewing as:</span>
          <select
            value={investorId || ""}
            onChange={(e) => setInvestorId(e.target.value)}
            className="text-sm font-semibold bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer text-gray-900"
          >
            {investors.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name} ({inv.investorType})
              </option>
            ))}
          </select>
          <span className="text-[10px] text-gray-400">
            {investors.length} investor{investors.length > 1 ? "s" : ""}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <InvestorProvider>
      <InvestorGate>{children}</InvestorGate>
    </InvestorProvider>
  );
}
