// src/utils/userSync.ts or app/utils/userSync.ts
interface User {
    telegramId: string;
    points: number;
    tappingRate: number;
    hasClaimedWelcome: boolean;
    lastSyncedAt: number;
  }
  
  export class UserSyncManager {
    private static SYNC_INTERVAL = 30 * 1000; // Sync every 30 seconds
    private static BATCH_SIZE = 10; // Number of points to accumulate before forcing sync
    private pendingPoints = 0;
    private lastSyncTime = 0;
    private syncTimeout: NodeJS.Timeout | null = null;
    private telegramId: string;
  
    constructor(telegramId: string) {
      this.telegramId = telegramId;
    }
  
    async initialize(): Promise<User> {
      try {
        const response = await fetch(`/api/user/${this.telegramId}`);
        const serverUser = await response.json();
        this.updateLocalStorage(serverUser);
        return serverUser;
      } catch (error) {
        console.error('Failed to initialize user:', error);
        const cachedUser = this.getFromLocalStorage();
        if (cachedUser) return cachedUser;
        throw error;
      }
    }
  
    private getFromLocalStorage(): User | null {
      const data = localStorage.getItem(`user_${this.telegramId}`);
      return data ? JSON.parse(data) : null;
    }
  
    private updateLocalStorage(user: User) {
      user.lastSyncedAt = Date.now();
      localStorage.setItem(`user_${this.telegramId}`, JSON.stringify(user));
    }
  
    async syncPoints(points: number): Promise<void> {
      this.pendingPoints += points;
  
      if (this.pendingPoints >= UserSyncManager.BATCH_SIZE || 
          Date.now() - this.lastSyncTime >= UserSyncManager.SYNC_INTERVAL) {
        await this.forceSync();
      } else {
        if (!this.syncTimeout) {
          this.syncTimeout = setTimeout(() => this.forceSync(), UserSyncManager.SYNC_INTERVAL);
        }
      }
    }
  
    private async forceSync(): Promise<void> {
      if (this.pendingPoints === 0) return;
  
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
  
        if (!response.ok) throw new Error('Failed to sync points');
  
        const updatedUser = await response.json();
        this.updateLocalStorage(updatedUser);
        this.pendingPoints = 0;
        this.lastSyncTime = Date.now();
  
        if (this.syncTimeout) {
          clearTimeout(this.syncTimeout);
          this.syncTimeout = null;
        }
  
      } catch (error) {
        console.error('Failed to sync points:', error);
      }
    }
  
    cleanup() {
      if (this.syncTimeout) {
        clearTimeout(this.syncTimeout);
      }
      this.forceSync();
    }
  }