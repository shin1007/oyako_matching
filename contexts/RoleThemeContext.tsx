"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'parent' | 'child' | null;

interface RoleThemeContextProps {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
}

const RoleThemeContext = createContext<RoleThemeContextProps | undefined>(undefined);

export const RoleThemeProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  return (
    <RoleThemeContext.Provider value={{ userRole, setUserRole }}>
      {children}
    </RoleThemeContext.Provider>
  );
};

export const useRoleTheme = () => {
  const ctx = useContext(RoleThemeContext);
  if (!ctx) throw new Error('useRoleTheme must be used within RoleThemeProvider');
  return ctx;
};
