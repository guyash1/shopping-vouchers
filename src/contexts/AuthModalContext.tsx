import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AuthActionType = 'add-item' | 'add-voucher' | 'stats' | 'optimize' | 'edit' | 'delete' | 'default' | null;

interface AuthModalContextType {
  isOpen: boolean;
  actionType: AuthActionType;
  openAuthModal: (actionType: AuthActionType) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState<AuthActionType>(null);

  const openAuthModal = (type: AuthActionType) => {
    setActionType(type);
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
    setActionType(null);
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, actionType, openAuthModal, closeAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}

