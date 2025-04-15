'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface StockLimit {
  fxckedUpBagsLimit: number;
  humanRelationsLimit: number;
  fxckedUpBagsUsed: number;
  humanRelationsUsed: number;
  fxckedUpBags: number;
  humanRelations: number;
  timestamp?: string;  // Optional if your API returns this
}

interface UserState {
  telegramId: string | null;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
}

interface BoostContextProps {
  stockLimit: StockLimit;
  user: UserState;
  setStockLimit: (limit: StockLimit | ((prev: StockLimit) => StockLimit)) => void;
  setUser: (userData: Partial<UserState>) => void;
  syncStock: () => Promise<void>;
}

const initialStockLimit: StockLimit = {
  fxckedUpBagsLimit: 10000,
  humanRelationsLimit: 10000,
  fxckedUpBagsUsed: 0,
  humanRelationsUsed: 0,
  fxckedUpBags: 0,
  humanRelations: 0
};

const initialUser: UserState = {
  telegramId: null,
  fxckedUpBagsQty: 0,
  humanRelationsQty: 0,
};

const BoostContext = createContext<BoostContextProps | undefined>(undefined);

export const BoostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(
    (state: { stockLimit: StockLimit; user: UserState }, action: any) => {
      switch (action.type) {
        case 'SET_STOCK_LIMIT':
          return { ...state, stockLimit: action.payload };
        case 'SET_USER':
          return { ...state, user: { ...state.user, ...action.payload } };
        default:
          return state;
      }
    },
    {
      stockLimit: initialStockLimit,
      user: initialUser
    }
  );

  const setStockLimit = (update: StockLimit | ((prev: StockLimit) => StockLimit)) => {
    const newValue = typeof update === 'function' 
      ? update(state.stockLimit) 
      : update;
    dispatch({ type: 'SET_STOCK_LIMIT', payload: newValue });
  };

  const setUser = (userData: Partial<UserState>) => {
    dispatch({ type: 'SET_USER', payload: userData });
  };

  const syncStock = async () => {
    try {
      const response = await fetch('/api/stock');
      const data = await response.json();
      
      // Ensure all required fields are present
      setStockLimit({
        fxckedUpBagsLimit: data.fxckedUpBagsLimit || initialStockLimit.fxckedUpBagsLimit,
        fxckedUpBagsUsed: data.fxckedUpBagsUsed || 0,
        fxckedUpBags: data.fxckedUpBags || 0,
        humanRelationsLimit: data.humanRelationsLimit || initialStockLimit.humanRelationsLimit,
        humanRelationsUsed: data.humanRelationsUsed || 0,
        humanRelations: data.humanRelations || 0,
        ...(data.timestamp && { timestamp: data.timestamp })
      });
    } catch (error) {
      console.error('Failed to sync stock:', error);
      throw error;
    }
  };

  return (
    <BoostContext.Provider
      value={{
        stockLimit: state.stockLimit,
        user: state.user,
        setStockLimit,
        setUser,
        syncStock
      }}
    >
      {children}
    </BoostContext.Provider>
  );
};

export const useBoostContext = () => {
  const context = useContext(BoostContext);
  if (!context) {
    throw new Error('useBoostContext must be used within a BoostProvider');
  }
  return context;
};