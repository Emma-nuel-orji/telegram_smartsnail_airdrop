// userSync.ts

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
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(this.queueStorageKey);
    if (saved) {
      try {
        this.queue = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load queue:', error);
        this.queue = [];
      }
    }
  }

  private saveQueue(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.queueStorageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
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
      const totalPoints = batch.reduce((sum, item) => sum + item.points, 0);
      
      const response = await fetch('/api/increase-point', { // ← Changed from increase-points
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points: totalPoints,
          userId: this.userId,
          batch: batch
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.queue.splice(0, batch.length);
        this.saveQueue();
        this.retryTimeout = 1000;
        
        if (this.queue.length > 0) {
          setTimeout(() => this.processQueue(), 100);
        }
      } else {
        throw new Error(result.error || 'Processing failed');
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
    
    // Increment attempts for failed items
    this.queue = [
      ...batch
        .filter(item => (item.attempts || 0) < maxAttempts)
        .map(item => ({
          ...item,
          attempts: (item.attempts || 0) + 1
        })),
      ...this.queue.slice(batch.length)
    ];
    
    this.saveQueue();
    this.retryTimeout = Math.min(this.retryTimeout * 2, this.maxRetryTimeout);
    
    // Retry after timeout
    setTimeout(() => this.processQueue(), this.retryTimeout);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

export class UserSyncManager {
  private userId: string;
  private pointsQueue: PointsQueue;
  private syncInterval: number = 5000; // Reduced frequency
  private syncTimer: NodeJS.Timeout | null = null;
  private localStorageKey: string;

  constructor(userId: string) {
    this.userId = userId;
    this.localStorageKey = `user_${userId}`;
    this.pointsQueue = new PointsQueue(userId);
  }

  public async syncWithServer(): Promise<void> {
    try {
      const response = await fetch(`/api/user/${this.userId}`);
      if (!response.ok) throw new Error('Failed to sync with server');
  
      const serverData = await response.json();
      
      // Only sync if queue is empty (no pending updates)
      if (this.pointsQueue.getQueueLength() === 0) {
        const localData = JSON.parse(
          localStorage.getItem(this.localStorageKey) || '{}'
        );
  
        // Keep higher points value
        const updatedData = {
          ...serverData,
          points: Math.max(serverData.points, localData.points || 0),
        };
  
        localStorage.setItem(this.localStorageKey, JSON.stringify(updatedData));
        this.broadcastUpdate(updatedData);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private broadcastUpdate(data: UserData): void {
    const event = new CustomEvent('userDataUpdate', { detail: data });
    window.dispatchEvent(event);
  }

  public async addPoints(points: number): Promise<void> {
    try {
      // Update local storage immediately
      const currentData = JSON.parse(
        localStorage.getItem(this.localStorageKey) || '{}'
      );
      
      const updatedData = {
        ...currentData,
        points: (currentData.points || 0) + points
      };
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(updatedData));
      
      // Queue for server sync
      await this.pointsQueue.addPoints(points);
      
      // Broadcast update
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