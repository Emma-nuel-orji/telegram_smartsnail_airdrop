class UserSyncManager {
  private telegramId: string;
  private pendingPoints: number = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncInProgress: boolean = false;
  private lastSyncedPoints: number = 0; // NEW: track what we already sent
  onSyncSuccess?: (serverPoints: number) => void;

  private readonly SYNC_INTERVAL = 2000; // Increased to 2s — no need for 500ms
  private readonly STORAGE_KEY_PREFIX = 'pending_points_';

  constructor(telegramId: string) {
    this.telegramId = telegramId;
    this.loadPendingPoints();
    this.startPeriodicSync(); // Only sync on interval, not on every click
    this.setupBeforeUnloadHandler();
  }

  getPendingPoints(): number {
    return this.pendingPoints;
  }

  resetPendingPoints(): void {
    this.pendingPoints = 0;
    this.lastSyncedPoints = 0;
    this.clearPendingPoints();
  }

  private loadPendingPoints(): void {
    const storageKey = this.STORAGE_KEY_PREFIX + this.telegramId;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      this.pendingPoints = parseInt(stored, 10) || 0;
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
    this.savePendingPoints();
    // ❌ REMOVED: this.sync() — don't sync on every click!
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

    // ✅ CRITICAL FIX: snapshot and zero-out BEFORE the async call
    // This prevents new clicks from being included in this batch
    // AND prevents double-sending
    const pointsToSync = this.pendingPoints;
    this.pendingPoints = 0;
    this.clearPendingPoints();

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
        if (this.onSyncSuccess) this.onSyncSuccess(data.points);

        window.dispatchEvent(new CustomEvent('userDataUpdate', {
          detail: data.user || { points: data.points }
        }));
      } else {
        // ✅ CRITICAL: if sync fails, restore the points so they aren't lost
        this.pendingPoints += pointsToSync;
        this.savePendingPoints();
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      // ✅ Restore on network error too
      this.pendingPoints += pointsToSync;
      this.savePendingPoints();
    } finally {
      this.syncInProgress = false;
    }
  }

  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      if (this.pendingPoints > 0) this.syncBeforeUnload();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.pendingPoints > 0) this.sync();
    });
  }

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

  hasPendingSync(): boolean {
    return this.pendingPoints > 0;
  }

  cleanup(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.pendingPoints > 0) this.sync();
  }
}

export default UserSyncManager;