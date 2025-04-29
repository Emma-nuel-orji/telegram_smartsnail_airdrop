'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';

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
  // New method to properly handle stock updates
  updateStockAfterOrder: (fxckedUpQty: number, humanQty: number) => void;
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

// Define action types for better type safety
type Action = 
  | { type: 'SET_STOCK_LIMIT'; payload: StockLimit }
  | { type: 'SET_USER'; payload: Partial<UserState> }
  | { type: 'UPDATE_STOCK'; payload: { fxckedUp: number; human: number } };

const BoostContext = createContext<BoostContextProps | undefined>(undefined);

export const BoostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(
    (state: { stockLimit: StockLimit; user: UserState }, action: Action) => {
      switch (action.type) {
        case 'SET_STOCK_LIMIT':
          return { ...state, stockLimit: action.payload };
        case 'SET_USER':
          return { ...state, user: { ...state.user, ...action.payload } };
        case 'UPDATE_STOCK':
          return {
            ...state,
            stockLimit: {
              ...state.stockLimit,
              fxckedUpBagsUsed: state.stockLimit.fxckedUpBagsUsed + action.payload.fxckedUp,
              humanRelationsUsed: state.stockLimit.humanRelationsUsed + action.payload.human,
              timestamp: new Date().toISOString()
            }
          };
        default:
          return state;
      }
    },
    {
      stockLimit: initialStockLimit,
      user: initialUser
    }
  );

  // Add a throttled sync function to prevent rapid API calls
  const throttledSyncRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const setStockLimit = useCallback((update: StockLimit | ((prev: StockLimit) => StockLimit)) => {
    const newValue = typeof update === 'function'
      ? update(state.stockLimit)
      : update;
    
    // Add validation to prevent negative values
    const validatedValue = {
      ...newValue,
      fxckedUpBagsUsed: Math.max(0, newValue.fxckedUpBagsUsed),
      humanRelationsUsed: Math.max(0, newValue.humanRelationsUsed)
    };
    
    dispatch({ type: 'SET_STOCK_LIMIT', payload: validatedValue });
  }, [state.stockLimit]);

  const setUser = useCallback((userData: Partial<UserState>) => {
    dispatch({ type: 'SET_USER', payload: userData });
  }, []);

  // Improve syncStock to handle errors and add retry
  const syncStock = useCallback(async () => {
    try {
      // Cancel any pending sync
      if (throttledSyncRef.current) {
        clearTimeout(throttledSyncRef.current);
      }
      
      console.log("Syncing stock from API...");
      const response = await fetch('/api/stock');
      
      if (!response.ok) {
        throw new Error(`Stock API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid stock data format');
      }
      
      console.log("Stock data received:", data);
      
      // Ensure all required fields are present
      setStockLimit({
        fxckedUpBagsLimit: data.fxckedUpBagsLimit || initialStockLimit.fxckedUpBagsLimit,
        fxckedUpBagsUsed: data.fxckedUpBagsUsed || 0,
        fxckedUpBags: data.fxckedUpBagsAvailable || 0, // Note: Changed from fxckedUpBags to fxckedUpBagsAvailable
        humanRelationsLimit: data.humanRelationsLimit || initialStockLimit.humanRelationsLimit,
        humanRelationsUsed: data.humanRelationsUsed || 0,
        humanRelations: data.humanRelationsAvailable || 0, // Note: Changed from humanRelations to humanRelationsAvailable
        timestamp: data.timestamp || new Date().toISOString()
      });
      
      console.log("Stock updated from API:", {
        fxckedUp: `${data.fxckedUpBagsUsed}/${data.fxckedUpBagsLimit}`,
        human: `${data.humanRelationsUsed}/${data.humanRelationsLimit}`
      });
    } catch (error) {
      console.error('Failed to sync stock:', error);
      // Instead of throwing the error, we'll retry once after a delay
      throttledSyncRef.current = setTimeout(() => {
        console.log("Retrying stock sync...");
        syncStock().catch(e => console.error("Retry failed:", e));
      }, 2000);
    }
  }, [setStockLimit]);

  // New method to handle stock updates after an order
  const updateStockAfterOrder = useCallback((fxckedUpQty: number, humanQty: number) => {
    // Log the current stock before updating
    console.log("Stock before order:", {
      fxckedUp: `${state.stockLimit.fxckedUpBagsUsed}/${state.stockLimit.fxckedUpBagsLimit}`,
      human: `${state.stockLimit.humanRelationsUsed}/${state.stockLimit.humanRelationsLimit}`
    });
    
    // Update the stock in the context
    dispatch({
      type: 'UPDATE_STOCK',
      payload: { fxckedUp: fxckedUpQty, human: humanQty }
    });
    
    // After updating locally, sync with the server after a short delay
    // This ensures our local state matches the server state
    throttledSyncRef.current = setTimeout(() => {
      syncStock().catch(e => console.error("Post-order sync failed:", e));
    }, 1000);
    
    // Log the updated stock
    console.log("Stock after order (local update):", {
      fxckedUp: `${state.stockLimit.fxckedUpBagsUsed + fxckedUpQty}/${state.stockLimit.fxckedUpBagsLimit}`,
      human: `${state.stockLimit.humanRelationsUsed + humanQty}/${state.stockLimit.humanRelationsLimit}`
    });
  }, [state.stockLimit, syncStock]);

  // Sync stock on component mount
  useEffect(() => {
    syncStock().catch(e => console.error("Initial sync failed:", e));
    
    // Set up periodic sync every 30 seconds
    const intervalId = setInterval(() => {
      syncStock().catch(e => console.error("Periodic sync failed:", e));
    }, 30000);
    
    return () => {
      clearInterval(intervalId);
      if (throttledSyncRef.current) {
        clearTimeout(throttledSyncRef.current);
      }
    };
  }, [syncStock]);

  return (
    <BoostContext.Provider
      value={{
        stockLimit: state.stockLimit,
        user: state.user,
        setStockLimit,
        setUser,
        syncStock,
        updateStockAfterOrder
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