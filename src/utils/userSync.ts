// UserSyncManager.ts
class UserSyncManager {
  private telegramId: string;
  private pendingPoints: number = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncInProgress: boolean = false;
  onSyncSuccess?: (serverPoints: number) => void;

  private readonly SYNC_INTERVAL = 500; 
  private readonly STORAGE_KEY_PREFIX = 'pending_points_';

  constructor(telegramId: string) {
    this.telegramId = telegramId;
    console.log('🟢 SyncManager created for:', telegramId);
    this.loadPendingPoints();
    this.startPeriodicSync();
    this.setupBeforeUnloadHandler();
  }

  getPendingPoints(): number {
    return this.pendingPoints;
  }

  resetPendingPoints(): void {
    console.log('🔄 resetPendingPoints called. Was:', this.pendingPoints);
    this.pendingPoints = 0;
    this.clearPendingPoints();
  }

  private loadPendingPoints(): void {
    const storageKey = this.STORAGE_KEY_PREFIX + this.telegramId;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      this.pendingPoints = parseInt(stored, 10) || 0;
      console.log('📦 Loaded pending points from localStorage:', this.pendingPoints);
    } else {
      console.log('📦 No pending points in localStorage');
    }
  }

  private savePendingPoints(): void {
    const storageKey = this.STORAGE_KEY_PREFIX + this.telegramId;
    localStorage.setItem(storageKey, this.pendingPoints.toString());
  }

  private clearPendingPoints(): void {
    const storageKey = this.STORAGE_KEY_PREFIX + this.telegramId;
    localStorage.removeItem(storageKey);
    console.log('🗑️ Cleared pending points from localStorage');
  }

  addPoints(points: number): void {
    const before = this.pendingPoints;
    this.pendingPoints += points;
    console.log(`➕ addPoints(${points}) | before: ${before} → after: ${this.pendingPoints}`);
    this.savePendingPoints();
    this.sync();
  }

  private startPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      if (this.pendingPoints > 0 && !this.syncInProgress) {
        console.log('⏱️ Periodic sync triggered. Pending:', this.pendingPoints);
        this.sync();
      }
    }, this.SYNC_INTERVAL);
  }

  private async sync(): Promise<void> {
    if (this.syncInProgress || this.pendingPoints === 0) return;

    this.syncInProgress = true;
    const pointsToSync = this.pendingPoints;
    console.log('📤 Syncing points to server:', pointsToSync);

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
      console.log('📥 Server response:', data);
      
      if (data.success) {
        this.pendingPoints -= pointsToSync;
        console.log('✅ Sync success. Server points:', data.points, '| Remaining pending:', this.pendingPoints);
        
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

  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      console.log('🚪 beforeunload fired. Pending:', this.pendingPoints);
      if (this.pendingPoints > 0) this.syncBeforeUnload();
    });
    document.addEventListener('visibilitychange', () => {
      console.log('👁️ visibilitychange. Hidden:', document.hidden, '| Pending:', this.pendingPoints);
      if (document.hidden && this.pendingPoints > 0) this.sync();
    });
  }

  private syncBeforeUnload(): void {
    const payload = JSON.stringify({
      telegramId: this.telegramId,
      pointsToAdd: this.pendingPoints,
    });

    if (navigator.sendBeacon) {
      console.log('🚀 sendBeacon fired with:', this.pendingPoints);
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
    console.log('🧹 cleanup called. Pending:', this.pendingPoints);
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.pendingPoints > 0) this.sync();
  }
}

export default UserSyncManager;