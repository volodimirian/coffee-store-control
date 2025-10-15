import { createContext, useContext } from "react";
import type { UserResponse } from "~/shared/api/types";

export type AppContextType = {
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;
  // Add other global fields as needed
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
