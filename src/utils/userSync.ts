// UserSyncManager.ts - Complete implementation with proper persistence

class UserSyncManager {
  private telegramId: string;
  private pendingPoints: number = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncInProgress: boolean = false;
  onSyncSuccess?: (serverPoints: number) => void;
  
  // Sync configuration
  private readonly SYNC_INTERVAL = 2000; // Sync every 2 seconds
  private readonly STORAGE_KEY_PREFIX = 'pending_points_';

  constructor(telegramId: string) {
    this.telegramId = telegramId;
    
    // Load any pending points from previous session
    this.loadPendingPoints();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Setup beforeunload handler to sync before page closes
    this.setupBeforeUnloadHandler();
  }

  private loadPendingPoints(): void {
    const storageKey = this.STORAGE_KEY_PREFIX + this.telegramId;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      this.pendingPoints = parseInt(stored, 10) || 0;
      console.log('📦 Loaded pending points from storage:', this.pendingPoints);
      
      // Immediately try to sync if there are pending points
      if (this.pendingPoints > 0) {
        this.sync();
      }
    }
  }

  private savePendingPoints(): void {
    const storageKey = this.STORAGE_KEY_PREFIX + this.telegramId;
    localStorage.setItem(storageKey, this.pendingPoints.toString());
  }

  private clearPendingPoints(): void {
    const storageKey = this.STORAGE_KEY_PREFIX + this.telegramId;
    localStorage.removeItem(storageKey);
  }

  addPoints(points: number): void {
    this.pendingPoints += points;
    
    // Save pending points immediately to localStorage
    this.savePendingPoints();
    
    console.log('➕ Added points:', points, '| Pending:', this.pendingPoints);
    
    // If we have a lot of pending points, sync immediately
    if (this.pendingPoints >= 50) {
      this.sync();
    }
  }

  private startPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      if (this.pendingPoints > 0 && !this.syncInProgress) {
        this.sync();
      }
    }, this.SYNC_INTERVAL);
  }

  private async sync(): Promise<void> {
    if (this.syncInProgress || this.pendingPoints === 0) {
      return;
    }

    this.syncInProgress = true;
    const pointsToSync = this.pendingPoints;

    try {
      console.log('🔄 Syncing', pointsToSync, 'points to server...');

      const response = await fetch('/api/sync-points', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: this.telegramId,
          pointsToAdd: pointsToSync,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Sync successful! Server points:', data.points);
        
        // Clear the synced points
        this.pendingPoints -= pointsToSync;
        
        if (this.pendingPoints <= 0) {
          this.pendingPoints = 0;
          this.clearPendingPoints();
        } else {
          this.savePendingPoints();
        }
        
        // Notify the app of successful sync
        if (this.onSyncSuccess) {
          this.onSyncSuccess(data.points);
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('userDataUpdate', {
          detail: data.user || { points: data.points }
        }));
      } else {
        throw new Error(data.message || 'Sync failed');
      }

    } catch (error) {
      console.error('❌ Sync failed:', error);
      // Keep points in pending queue for retry
      console.log('🔄 Will retry sync later. Pending:', this.pendingPoints);
    } finally {
      this.syncInProgress = false;
    }
  }

  private setupBeforeUnloadHandler(): void {
    // Use synchronous XHR in beforeunload as last resort
    window.addEventListener('beforeunload', () => {
      if (this.pendingPoints > 0) {
        console.log('⚠️ Page closing with', this.pendingPoints, 'pending points');
        
        // Try to sync synchronously (last resort)
        this.syncBeforeUnload();
      }
    });

    // Better: Use visibilitychange for earlier detection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.pendingPoints > 0) {
        console.log('👁️ Page hidden, forcing sync...');
        this.sync();
      }
    });
  }

  private syncBeforeUnload(): void {
    // Use sendBeacon API if available (better than sync XHR)
    if (navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({
          telegramId: this.telegramId,
          pointsToAdd: this.pendingPoints,
        })],
        { type: 'application/json' }
      );
      
      const sent = navigator.sendBeacon('/api/sync-points', blob);
      console.log('📡 sendBeacon:', sent ? 'sent' : 'failed');
    } else {
      // Fallback to synchronous XHR (blocks page unload)
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/sync-points', false); // false = synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
          telegramId: this.telegramId,
          pointsToAdd: this.pendingPoints,
        }));
        
        if (xhr.status === 200) {
          this.clearPendingPoints();
        }
      } catch (error) {
        console.error('Sync before unload failed:', error);
      }
    }
  }

  hasPendingSync(): boolean {
    return this.pendingPoints > 0;
  }

  // Force immediate sync (useful for testing or manual triggers)
  async forceSync(): Promise<void> {
    if (this.pendingPoints > 0) {
      await this.sync();
    }
  }

  cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Final sync attempt
    if (this.pendingPoints > 0) {
      this.sync();
    }
  }
}

export default UserSyncManager;