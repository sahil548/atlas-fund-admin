"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

/**
 * Lightweight user context for internal use.
 * Reads a userId from localStorage (default: "user-jk") and provides
 * a useUser() hook so components can reference the current user.
 *
 * When real auth is added (Clerk, Auth0, etc.) replace this provider
 * with the real auth context and keep the same hook signature.
 */

interface UserInfo {
  id: string;
  name: string;
  initials: string;
  role: string;
}

interface UserContextType {
  userId: string;
  user: UserInfo;
  setUserId: (id: string) => void;
}

// Pre-seeded user lookup — matches prisma/seed.ts
const USERS: Record<string, UserInfo> = {
  "user-jk": { id: "user-jk", name: "James Kim", initials: "JK", role: "GP_ADMIN" },
  "user-sm": { id: "user-sm", name: "Sarah Mitchell", initials: "SM", role: "GP_TEAM" },
  "user-al": { id: "user-al", name: "Alex Lee", initials: "AL", role: "GP_TEAM" },
};

const DEFAULT_USER_ID = "user-jk";

const UserContext = createContext<UserContextType>({
  userId: DEFAULT_USER_ID,
  user: USERS[DEFAULT_USER_ID],
  setUserId: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("atlas_userId") || DEFAULT_USER_ID;
    }
    return DEFAULT_USER_ID;
  });

  function setUserId(id: string) {
    setUserIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("atlas_userId", id);
    }
  }

  const user = USERS[userId] || USERS[DEFAULT_USER_ID];

  return (
    <UserContext.Provider value={{ userId, user, setUserId }}>
      {children}
    </UserContext.Provider>
  );
}
