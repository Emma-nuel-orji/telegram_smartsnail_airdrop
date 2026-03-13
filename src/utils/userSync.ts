

// UserSyncManager.ts
class UserSyncManager {
  private telegramId: string;
  private pendingPoints: number = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncInProgress: boolean = false;
  onSyncSuccess?: (serverPoints: number) => void;

  // Sync configuration
  private readonly SYNC_INTERVAL = 2000; 
  private readonly STORAGE_KEY_PREFIX = 'pending_points_';

  constructor(telegramId: string) {
    this.telegramId = telegramId;
    this.loadPendingPoints();
    this.startPeriodicSync();
    // this.setupBeforeUnloadHandler();
  }

  // --- NEW HELPER FOR HOME PAGE ---
  getPendingPoints(): number {
    return this.pendingPoints;
  }

  private loadPendingPoints(): void {
    const storageKey = this.STORAGE_KEY_PREFIX + this.telegramId;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      this.pendingPoints = parseInt(stored, 10) || 0;
      // if (this.pendingPoints > 0) this.sync();
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

  // --- UPDATED LOGIC FOR HIGH TAPPING RATES ---
  addPoints(points: number): void {
    this.pendingPoints += points;
    this.savePendingPoints();

    /** * If the tap rate is 1000, we don't want to sync every click.
     * We only force an immediate sync if the user has accumulated 
     * a massive amount of points (e.g., 50,000).
     * Otherwise, the 2-second timer handles it smoothly.
     */
    if (this.pendingPoints >= 50000) { 
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
    if (this.syncInProgress || this.pendingPoints === 0) return;

    this.syncInProgress = true;
    const pointsToSync = this.pendingPoints;

    try {
      const response = await fetch('/api/sync-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: this.telegramId,
          pointsToAdd: pointsToSync,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Subtract only what we successfully sent
        this.pendingPoints -= pointsToSync;
        
        if (this.pendingPoints <= 0) {
          this.pendingPoints = 0;
          this.clearPendingPoints();
        } else {
          this.savePendingPoints();
        }
        
        if (this.onSyncSuccess) this.onSyncSuccess(data.points);
        
        window.dispatchEvent(new CustomEvent('userDataUpdate', {
          detail: data.user || { points: data.points }
        }));
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // private setupBeforeUnloadHandler(): void {
  //   window.addEventListener('beforeunload', () => {
  //     if (this.pendingPoints > 0) this.syncBeforeUnload();
  //   });
  //   document.addEventListener('visibilitychange', () => {
  //     if (document.hidden && this.pendingPoints > 0) this.sync();
  //   });
  // }

  private syncBeforeUnload(): void {
    const payload = JSON.stringify({
      telegramId: this.telegramId,
      pointsToAdd: this.pendingPoints,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/sync-points', new Blob([payload], { type: 'application/json' }));
    } else {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/sync-points', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(payload);
      } catch (e) {}
    }
  }

  resetPendingPoints(): void {
  this.pendingPoints = 0;
  this.clearPendingPoints();
}

hasPendingSync(): boolean {
  return this.pendingPoints > 0;
}
  cleanup(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.pendingPoints > 0) this.sync();
  }
}

export default UserSyncManager;