'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface StockLimit {
  fxckedUpBagsLimit: number;
  humanRelationsLimit: number;
  fxckedUpBagsUsed: number;
  humanRelationsUsed: number;
  fxckedUpBags: number;
  humanRelations: number;
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

interface BoostProviderProps {
  children: ReactNode;
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

export const BoostProvider: React.FC<BoostProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, {
    stockLimit: initialStockLimit,
    user: initialUser,
  });

  const setStockLimit = (update: StockLimit | ((prev: StockLimit) => StockLimit)) => {
    if (typeof update === 'function') {
      dispatch({ type: 'SET_STOCK_LIMIT', payload: update(state.stockLimit) });
    } else {
      dispatch({ type: 'SET_STOCK_LIMIT', payload: update });
    }
  };

  const setUser = (userData: Partial<UserState>) => {
    dispatch({ type: 'SET_USER', payload: userData });
  };

  const syncStock = async () => {
    try {
      const response = await fetch('/api/stock');
      const data = await response.json();
      setStockLimit(data);
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