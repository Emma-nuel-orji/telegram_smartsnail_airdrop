'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Define the shape of the stock limit and user state
interface StockLimit {
  fxckedUpBagsLimit: number;
  humanRelationsLimit: number;
  fxckedUpBagsUsed: number;
  humanRelationsUsed: number;
}

interface UserState {
  telegramId: string | null;
  // email: string;
  // purchaseEmail: string;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
}

interface BoostContextProps {
  stockLimit: StockLimit;
  user: UserState;
  setStockLimit: (limit: StockLimit) => void;
  setUser: (userData: Partial<UserState>) => void;
}

interface BoostProviderProps {
  children: ReactNode;
}

const initialStockLimit: StockLimit = {
  fxckedUpBagsLimit: 10000,
  humanRelationsLimit: 15000,
  fxckedUpBagsUsed: 0,
  humanRelationsUsed: 0,
};

const initialUser: UserState = {
  telegramId: null,
  // email: '',
  // purchaseEmail: '',
  fxckedUpBagsQty: 0,
  humanRelationsQty: 0,
};

// Create Context
const BoostContext = createContext<BoostContextProps | undefined>(undefined);

// Reducer for state management
const reducer = (state: any, action: any) => {
  switch (action.type) {
    case 'SET_STOCK_LIMIT':
      return { ...state, stockLimit: action.payload };
    case 'SET_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

// Context Provider Component
export const BoostProvider: React.FC<BoostProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, {
    stockLimit: initialStockLimit,
    user: initialUser,
  });

  const setStockLimit = (limit: StockLimit) => {
    dispatch({ type: 'SET_STOCK_LIMIT', payload: limit });
  };

  const setUser = (userData: Partial<UserState>) => {
    dispatch({ type: 'SET_USER', payload: userData });
  };

  return (
    <BoostContext.Provider value={{ stockLimit: state.stockLimit, user: state.user, setStockLimit, setUser }}>
      {children}
    </BoostContext.Provider>
  );
};

// Custom hook for accessing BoostContext
export const useBoostContext = () => {
  const context = useContext(BoostContext);
  if (!context) {
    throw new Error('useBoostContext must be used within a BoostProvider');
  }
  return context;
};
