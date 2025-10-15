import { useState, type ReactNode } from "react";
import { AppContext, type AppContextType } from "~/shared/context/AppContext";

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppContextType["user"]>(null);

  return (
    <AppContext.Provider value={{ user, setUser }}>
      {children}
    </AppContext.Provider>
  );
}
