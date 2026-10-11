'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'admin' | 'officer';

export type Permission =
  | 'manage_quarries'
  | 'manage_rates'
  | 'view_blocks'
  | 'create_block'
  | 'edit_block'
  | 'delete_block'
  | 'run_analysis'
  | 'view_measurements'
  | 'create_cutting_plan'
  | 'assess_seigniorage'
  | 'approve_dispatch'
  | 'view_reports'
  | 'manage_system';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'manage_quarries',
    'manage_rates',
    'view_blocks',
    'create_block',
    'edit_block',
    'delete_block',
    'run_analysis',
    'view_measurements',
    'create_cutting_plan',
    'assess_seigniorage',
    'approve_dispatch',
    'view_reports',
    'manage_system',
  ],
  officer: [
    'view_blocks',
    'create_block',
    'edit_block',
    'run_analysis',
    'view_measurements',
    'create_cutting_plan',
    'assess_seigniorage',
    'approve_dispatch',
    'view_reports',
  ],
};

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  hasPermission: (permission: Permission) => void | boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  roleDisplayName: {
    en: string;
    te: string;
  };
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = 'granite_measure_role';

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('admin');

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      if (storedRole === 'admin' || storedRole === 'officer') {
        setRoleState(storedRole);
      }
    } catch (e) {
      console.warn('Unable to retrieve role from localStorage', e);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } catch (e) {
      console.warn('Unable to store role in localStorage', e);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    return ROLE_PERMISSIONS[role].includes(permission);
  };

  const roleDisplayName = {
    admin: {
      en: 'Administration',
      te: 'పరిపాలన',
    },
    officer: {
      en: 'Mining Officer',
      te: 'గనుల అధికారి',
    },
  }[role];

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        hasPermission,
        isAdmin: role === 'admin',
        isOfficer: role === 'officer',
        roleDisplayName,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
