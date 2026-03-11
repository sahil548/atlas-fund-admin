"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

// Check at module level whether Clerk is configured
const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface UserInfo {
  id: string;
  name: string;
  initials: string;
  role: string;
  firmId?: string;
}

interface UserContextType {
  userId: string;
  user: UserInfo;
  setUserId: (id: string) => void;
  allUsers: Record<string, UserInfo>;
  isLoading: boolean;
}

// Pre-seeded fallback users for development without Clerk
const MOCK_USERS: Record<string, UserInfo> = {
  "user-jk": { id: "user-jk", name: "James Kim", initials: "JK", role: "GP_ADMIN", firmId: "firm-1" },
  "user-sm": { id: "user-sm", name: "Sarah Mitchell", initials: "SM", role: "GP_TEAM", firmId: "firm-1" },
  "user-al": { id: "user-al", name: "Alex Lee", initials: "AL", role: "GP_TEAM", firmId: "firm-1" },
  "user-lp-calpers": { id: "user-lp-calpers", name: "Michael Chen", initials: "MC", role: "LP_INVESTOR", firmId: "firm-1" },
  "user-lp-calpers2": { id: "user-lp-calpers2", name: "Sarah Wang", initials: "SW", role: "LP_INVESTOR", firmId: "firm-1" },
  "user-lp-harvard": { id: "user-lp-harvard", name: "David Morrison", initials: "DM", role: "LP_INVESTOR", firmId: "firm-1" },
  "user-lp-wellington": { id: "user-lp-wellington", name: "Tom Wellington", initials: "TW", role: "LP_INVESTOR", firmId: "firm-1" },
  "user-lp-consultant": { id: "user-lp-consultant", name: "Rachel Adams", initials: "RA", role: "LP_INVESTOR", firmId: "firm-1" },
};

const PLACEHOLDER_USER: UserInfo = {
  id: "",
  name: "Loading...",
  initials: "...",
  role: "GP_TEAM",
};

const DEFAULT_MOCK_ID = "user-jk";

const UserContext = createContext<UserContextType>({
  userId: "",
  user: PLACEHOLDER_USER,
  setUserId: () => {},
  allUsers: {},
  isLoading: true,
});

export function useUser() {
  return useContext(UserContext);
}

// ── Mock provider for dev without Clerk ──
function MockUserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>(DEFAULT_MOCK_ID);

  useEffect(() => {
    const stored = localStorage.getItem("atlas_userId");
    if (stored && stored !== DEFAULT_MOCK_ID) setUserIdState(stored);
  }, []);

  function setUserId(id: string) {
    setUserIdState(id);
    localStorage.setItem("atlas_userId", id);
    window.location.reload();
  }

  const user = MOCK_USERS[userId] || MOCK_USERS[DEFAULT_MOCK_ID];

  return (
    <UserContext.Provider value={{ userId, user, setUserId, allUsers: MOCK_USERS, isLoading: false }}>
      {children}
    </UserContext.Provider>
  );
}

// ── Clerk-backed provider ──
function ClerkUserProviderInner({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkUser();

  // Fetch the DB user record for the signed-in Clerk user
  const { data: dbUser, isLoading: meLoading } = useSWR(
    clerkLoaded && isSignedIn ? "/api/auth/me" : null,
    fetcher
  );

  // Fetch all users in the same firm for the user-switcher (GP_ADMIN impersonation)
  const { data: allUsersArray } = useSWR(
    dbUser?.firmId ? `/api/users?firmId=${dbUser.firmId}` : null,
    fetcher
  );

  // Impersonation: GP_ADMIN can view as another user
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null);

  // Build allUsers record from API array
  const allUsersRecord: Record<string, UserInfo> = {};
  if (allUsersArray && Array.isArray(allUsersArray)) {
    for (const u of allUsersArray) {
      allUsersRecord[u.id] = {
        id: u.id,
        name: u.name || u.email || "Unknown User",
        initials: u.initials || (u.name || "").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
        role: u.role,
        firmId: u.firmId,
      };
    }
  }

  const realUser: UserInfo = dbUser
    ? {
        id: dbUser.id,
        name: dbUser.name || dbUser.email || "Unknown User",
        initials: dbUser.initials || (dbUser.name || "").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
        role: dbUser.role,
        firmId: dbUser.firmId,
      }
    : PLACEHOLDER_USER;

  const effectiveUser = impersonatedId && allUsersRecord[impersonatedId]
    ? allUsersRecord[impersonatedId]
    : realUser;

  const setUserId = useCallback((id: string) => {
    if (id === dbUser?.id) {
      setImpersonatedId(null);
    } else {
      setImpersonatedId(id);
    }
    window.location.reload();
  }, [dbUser?.id]);

  // Persist impersonation across reloads
  useEffect(() => {
    if (impersonatedId) {
      localStorage.setItem("atlas_impersonateId", impersonatedId);
    } else {
      localStorage.removeItem("atlas_impersonateId");
    }
  }, [impersonatedId]);

  // Restore impersonation on mount
  useEffect(() => {
    const stored = localStorage.getItem("atlas_impersonateId");
    if (stored && dbUser?.role === "GP_ADMIN") {
      setImpersonatedId(stored);
    }
  }, [dbUser?.role]);

  const isLoading = !clerkLoaded || (isSignedIn && meLoading);

  return (
    <UserContext.Provider
      value={{
        userId: effectiveUser.id,
        user: effectiveUser,
        setUserId,
        allUsers: allUsersRecord,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function UserProvider({ children }: { children: ReactNode }) {
  if (CLERK_ENABLED) {
    return <ClerkUserProviderInner>{children}</ClerkUserProviderInner>;
  }
  return <MockUserProvider>{children}</MockUserProvider>;
}
