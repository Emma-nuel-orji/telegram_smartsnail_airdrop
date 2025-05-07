'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from 'react';

interface StockLimit {
  fxckedUpBagsLimit: number;
  humanRelationsLimit: number;
  fxckedUpBagsUsed: number;
  humanRelationsUsed: number;
  fxckedUpBags: number;
  humanRelations: number;
  timestamp?: string;
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
  syncStock: () => Promise<boolean>;
  updateStockAfterOrder: (fxckedUpQty: number, humanQty: number) => void;
  performOptimisticUpdate: (fxckedUpQty: number, humanQty: number) => void;
  handlePurchaseError: (error: any) => Promise<void>;
  updateStockDisplay: (newStockData: StockLimit, isOptimistic?: boolean) => void;
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

  // Add a throttled sync reference to prevent rapid API calls
  const throttledSyncRef = useRef<NodeJS.Timeout | null>(null);
  
  // Previous stock values for tracking changes
  const prevStockRef = useRef<StockLimit>(state.stockLimit);
  const optimisticRef = useRef<{ fxckedUp: number; human: number } | null>(null);

  
  
  // Enhanced function to update stock with UI animations
  const updateStockDisplay = useCallback((newStockData: StockLimit, isOptimistic = false) => {
    // Validate stock data to prevent negative values
    const validatedData = {
      ...newStockData,
      fxckedUpBagsUsed: Math.max(0, newStockData.fxckedUpBagsUsed),
      humanRelationsUsed: Math.max(0, newStockData.humanRelationsUsed)
    };
    
    // Update state with new stock data
    dispatch({ type: 'SET_STOCK_LIMIT', payload: validatedData });
    
    // Handle UI animations based on whether this is an optimistic update
    const fubCounter = document.getElementById('fub-counter');
    const hrCounter = document.getElementById('hr-counter');
    
    if (isOptimistic) {
      // Add updating class to show animation
      fubCounter?.classList.add('updating');
      hrCounter?.classList.add('updating');
    } else {
      // Remove updating class when we have real data
      fubCounter?.classList.remove('updating');
      hrCounter?.classList.remove('updating');
    }
    
    console.log(`Stock updated (${isOptimistic ? 'optimistic' : 'verified'})`, {
      fxckedUp: `${validatedData.fxckedUpBagsUsed}/${validatedData.fxckedUpBagsLimit}`,
      human: `${validatedData.humanRelationsUsed}/${validatedData.humanRelationsLimit}`,
      timestamp: validatedData.timestamp || new Date().toISOString()
    });
  }, []);

  // Standard stock limit setter (without animations)
  const setStockLimit = useCallback((update: StockLimit | ((prev: StockLimit) => StockLimit)) => {
    const newValue = typeof update === 'function'
      ? update(state.stockLimit)
      : update;
    
  // const updateStockContextManually = (fxckedUp: number, human: number) => {
  //       dispatch({
  //         type: 'UPDATE_STOCK',
  //         payload: { fxckedUp, human }
  //       });
  //     };
      

    // Add validation to prevent negative values
    const validatedValue = {
      ...newValue,
      fxckedUpBagsUsed: Math.max(0, newValue.fxckedUpBagsUsed),
      humanRelationsUsed: Math.max(0, newValue.humanRelationsUsed)
    };
    
    updateStockDisplay(validatedValue, false);

  }, [state.stockLimit]);

  const setUser = useCallback((userData: Partial<UserState>) => {
    dispatch({ type: 'SET_USER', payload: userData });
  }, []);

  // Optimistic update helper for immediate UI feedback
  const performOptimisticUpdate = useCallback((fxckedUpQty: number, humanQty: number) => {
    const newStock = {
      ...state.stockLimit,
      fxckedUpBagsUsed: state.stockLimit.fxckedUpBagsUsed + fxckedUpQty,
      humanRelationsUsed: state.stockLimit.humanRelationsUsed + humanQty,
      timestamp: new Date().toISOString()
    };
  
    optimisticRef.current = {
      fxckedUp: newStock.fxckedUpBagsUsed,
      human: newStock.humanRelationsUsed
    };
  
    updateStockDisplay(newStock, true);
    return newStock;
  }, [state.stockLimit, updateStockDisplay]);
  

  // Enhanced syncStock with improved error handling
  const syncStock = useCallback(async (): Promise<boolean> => {
    try {
      // Cancel any pending sync
      if (throttledSyncRef.current) {
        clearTimeout(throttledSyncRef.current);
        throttledSyncRef.current = null;
      }
      
      console.log("Syncing stock from API...");
      const response = await fetch('/api/stock', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Stock API returned ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        const error = e as Error;
        throw new Error(`Invalid JSON response: ${error.message}`);
      }
      
      console.log("Stock data received:", data);
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid stock data format');
      }
      
      // Check if there's an error in the API response
      if (data.error) {
        throw new Error(`API error: ${data.error} - ${data.details || ''}`);
      }
      
      // Create new stock data object with fallbacks
      const newStockData = {
        fxckedUpBagsLimit: data.fxckedUpBagsLimit || initialStockLimit.fxckedUpBagsLimit,
        fxckedUpBagsUsed: data.fxckedUpBagsUsed || 0,
        fxckedUpBags: data.fxckedUpBagsAvailable || 0,
        humanRelationsLimit: data.humanRelationsLimit || initialStockLimit.humanRelationsLimit,
        humanRelationsUsed: data.humanRelationsUsed || 0,
        humanRelations: data.humanRelationsAvailable || 0,
        timestamp: data.timestamp || new Date().toISOString()
      };
      
      // Use the enhanced update function with UI animations
      updateStockDisplay(newStockData, false);
      
      return true; // Indicate successful sync
    } catch (error) {
      const err = error as Error;
      console.error('Failed to sync stock:', err.message);
      
      // Instead of throwing the error, we'll retry once after a delay
      throttledSyncRef.current = setTimeout(() => {
        console.log("Retrying stock sync...");
        syncStock().catch(e => {
          const retryErr = e as Error;
          console.error("Retry failed:", retryErr.message);
        });
      }, 2000);
      
      return false; // Indicate failed sync
    }
  }, [updateStockDisplay]);

  // Enhanced error handling for purchase functions
  const handlePurchaseError = useCallback(async (error: any) => {
    const fubCounter = document.getElementById('fub-counter');
    const hrCounter = document.getElementById('hr-counter');
    
    // Show error animation
    fubCounter?.classList.add('error');
    hrCounter?.classList.add('error');
    
    // Remove error class after animation
    setTimeout(() => {
      fubCounter?.classList.remove('error');
      hrCounter?.classList.remove('error');
    }, 1000);
    
    // Fetch real stock data to correct any optimistic updates
    await syncStock();
    
    // Determine the error message
    let errorMessage = "Payment failed. Please try again.";
    
    if (error && typeof error === 'object') {
      if ('isAxiosError' in error && error.isAxiosError) {
        errorMessage = `Error: ${error.response?.data?.error || error.message}`;
      } else if ('message' in error) {
        errorMessage = `Error: ${error.message}`;
      }
    }
    
    // Show error message
    alert(errorMessage);
  }, [syncStock]);



  // Improved method to handle stock updates after an order
  // Improved method to handle stock updates after an order
const updateStockAfterOrder = useCallback((fxckedUpQty: number, humanQty: number) => {
  // Apply an optimistic update first for immediate UI feedback
  performOptimisticUpdate(fxckedUpQty, humanQty);

  // After updating locally, sync with the server after a short delay
  throttledSyncRef.current = setTimeout(async () => {
    try {
      // Send update to the backend to persist used stock
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fxckedUpBagsUsed: state.stockLimit.fxckedUpBagsUsed,
          humanRelationsUsed: state.stockLimit.humanRelationsUsed
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Sync failed: ${res.status} - ${errText}`);
      }

      console.log("✅ Stock usage successfully synced with backend");

      // Then fetch fresh stock data to confirm
      await syncStock();
    } catch (err) {
      console.error("❌ Failed to sync stock usage to backend:", err);
      // Optionally retry or show UI feedback here
    }
  }, 1000);
}, [performOptimisticUpdate, syncStock, state.stockLimit]);



  // Log stock changes for debugging
  useEffect(() => {
    // Basic snapshot
    console.log('Current Stock:', {
      fxckedUp: `${state.stockLimit.fxckedUpBagsUsed}/${state.stockLimit.fxckedUpBagsLimit}`,
      human: `${state.stockLimit.humanRelationsUsed}/${state.stockLimit.humanRelationsLimit}`,
      timestamp: state.stockLimit.timestamp || new Date().toISOString()
    });
  
    // Change analysis
    const prevStock = prevStockRef.current;
    const changes = {
      fxckedUp: state.stockLimit.fxckedUpBagsUsed - prevStock.fxckedUpBagsUsed,
      human: state.stockLimit.humanRelationsUsed - prevStock.humanRelationsUsed
    };
  
    if (changes.fxckedUp !== 0 || changes.human !== 0) {
      console.log('Stock Changes Detected:', {
        previous: {
          fxckedUp: `${prevStock.fxckedUpBagsUsed}/${prevStock.fxckedUpBagsLimit}`,
          human: `${prevStock.humanRelationsUsed}/${prevStock.humanRelationsLimit}`
        },
        changes,
        timestamp: new Date().toISOString()
      });
    }
  
    prevStockRef.current = state.stockLimit;
  }, [state.stockLimit]);

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

  useEffect(() => {
    if (
      optimisticRef.current &&
      state.stockLimit.fxckedUpBagsUsed >= optimisticRef.current.fxckedUp &&
      state.stockLimit.humanRelationsUsed >= optimisticRef.current.human
    ) {
      const fubCounter = document.getElementById('fub-counter');
      const hrCounter = document.getElementById('hr-counter');
      fubCounter?.classList.remove('updating');
      hrCounter?.classList.remove('updating');
      optimisticRef.current = null;
  
      console.log("✅ Optimistic update matched real data.");
    }
  }, [state.stockLimit]);
  

  return (
    <BoostContext.Provider
      value={{
        stockLimit: state.stockLimit,
        user: state.user,
        setStockLimit,
        setUser,
        syncStock,
        updateStockAfterOrder,
        performOptimisticUpdate,
        handlePurchaseError,
        updateStockDisplay
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