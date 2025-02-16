// userSync.ts

// Types
interface QueueItem {
  points: number;
  timestamp: number;
  attempts: number;
}

interface UserData {
  points: number;
  telegramId?: string;
  tappingRate?: number;
  hasClaimedWelcome?: boolean;
  [key: string]: any;
}

// PointsQueue class
export class PointsQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private userId: string;
  private retryTimeout: number = 1000;
  private maxRetryTimeout: number = 32000;
  private batchSize: number = 10;
  private queueStorageKey: string;

  constructor(userId: string) {
    this.userId = userId;
    this.queueStorageKey = `points_queue_${userId}`;
    this.loadQueue();
  }

  private loadQueue(): void {
    const saved = localStorage.getItem(this.queueStorageKey);
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  }

  private saveQueue(): void {
    localStorage.setItem(this.queueStorageKey, JSON.stringify(this.queue));
  }

  public async addPoints(points: number): Promise<void> {
    this.queue.push({
      points,
      timestamp: Date.now(),
      attempts: 0
    });
    
    this.saveQueue();
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.queue.slice(0, this.batchSize);
    
    try {
      const response = await fetch('/api/increase-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.userId
        },
        body: JSON.stringify({
          points: batch.reduce((sum, item) => sum + item.points, 0),
          userId: this.userId,
          batch: batch
        }),
      });

      if (!response.ok) throw new Error('Server error');
      
      const result = await response.json();
      
      if (result.success) {
        this.queue.splice(0, batch.length);
        this.saveQueue();
        this.retryTimeout = 1000;
        
        if (this.queue.length > 0) {
          setTimeout(() => this.processQueue(), 100);
        }
      } else {
        throw new Error(result.message || 'Processing failed');
      }
    } catch (error) {
      console.error('Queue processing error:', error);
      await this.handleError(batch);
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleError(batch: QueueItem[]): Promise<void> {
    const maxAttempts = 5;
    this.queue = [
      ...batch.filter(item => (item.attempts || 0) < maxAttempts).map(item => ({
        ...item,
        attempts: (item.attempts || 0) + 1
      })),
      ...this.queue.slice(batch.length)
    ];
    
    this.saveQueue();
    this.retryTimeout = Math.min(this.retryTimeout * 2, this.maxRetryTimeout);
    
    setTimeout(() => this.processQueue(), this.retryTimeout);
  }
}

// UserSyncManager class
export class UserSyncManager {
  private userId: string;
  private pointsQueue: PointsQueue;
  private syncInterval: number = 1000;
  private syncTimer: NodeJS.Timeout | null = null;
  private localStorageKey: string;

  constructor(userId: string) {
    this.userId = userId;
    this.localStorageKey = `user_${userId}`;
    this.pointsQueue = new PointsQueue(userId);
    this.initialize();
  }

  private initialize(): UserData | null {
    const savedData = localStorage.getItem(this.localStorageKey);
    const initialState = savedData ? JSON.parse(savedData) : null;

    this.startSync();
    return initialState;
  }

  private startSync(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    
    this.syncTimer = setInterval(() => {
      this.syncWithServer();
    }, this.syncInterval);
  }

  public async syncWithServer(): Promise<void> {  // Change from private to public
    try {
      const response = await fetch(`/api/user/${this.userId}`);
      if (!response.ok) throw new Error("Failed to sync with server");
  
      const serverData = await response.json();
      const localData = JSON.parse(localStorage.getItem(this.localStorageKey) || "{}");
  
      // Merge points safely
      const mergedPoints = Math.max(serverData.points || 0, localData.points || 0);
      
      const mergedData = {
        ...serverData,
        points: mergedPoints,
      };
  
      localStorage.setItem(this.localStorageKey, JSON.stringify(mergedData));
      this.broadcastUpdate(mergedData);
  
      console.log("Sync complete:", { localPoints: localData.points, serverPoints: serverData.points, mergedPoints });
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }
  
  

  private broadcastUpdate(data: UserData): void {
    const event = new CustomEvent('userDataUpdate', { detail: data });
    window.dispatchEvent(event);
  }

  public async addPoints(points: number): Promise<void> {
    try {
      const currentData = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
      const updatedData = {
        ...currentData,
        points: (currentData.points || 0) + points
      };
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(updatedData));
      await this.pointsQueue.addPoints(points);
      this.broadcastUpdate(updatedData);
    } catch (error) {
      console.error('Failed to add points:', error);
    }
  }

  public cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}