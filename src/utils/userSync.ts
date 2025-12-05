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

// 👇 Auto-select correct API URL
const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://telegram-smartsnail-airdrop.vercel.app/api/increase-points"
    : "/api/increase-points";

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
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(this.queueStorageKey);
    if (saved) {
      try {
        this.queue = JSON.parse(saved);
      } catch (error) {
        console.error("🔥 Failed to load queue:", error);
        this.queue = [];
      }
    }
  }

  private saveQueue(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(this.queueStorageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error("🔥 Failed to save queue:", error);
    }
  }

  public async addPoints(points: number): Promise<void> {
    this.queue.push({
      points,
      timestamp: Date.now(),
      attempts: 0,
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

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points: totalPoints,
          userId: this.userId,
          batch: batch,
        }),
      }).catch((err) => {
        console.error("🔥 Network error calling API:", err);
        throw err;
      });

      // Handle non-OK responses
      if (!response.ok) {
        console.error("🔥 Server returned error status:", response.status);

        let errorText = "";
        try {
          errorText = await response.text();
        } catch {}

        console.error("🔥 Response body:", errorText);

        throw new Error(
          `Server Error ${response.status}: ${errorText || "Unknown error"}`
        );
      }

      let result: any = {};
      try {
        result = await response.json();
      } catch (err) {
        console.error("🔥 Failed to parse JSON:", err);
        throw new Error("Invalid JSON response from server");
      }

      if (result.success) {
        // Remove processed items
        this.queue.splice(0, batch.length);
        this.saveQueue();
        this.retryTimeout = 1000;

        // Process next batch
        if (this.queue.length > 0) {
          setTimeout(() => this.processQueue(), 100);
        }
      } else {
        throw new Error(result.error || "Processing failed");
      }
    } catch (error) {
      console.error("🔥 Queue processing error:", error);
      await this.handleError(batch);
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleError(batch: QueueItem[]): Promise<void> {
    const maxAttempts = 5;

    // Increase attempts
    this.queue = [
      ...batch
        .filter((item) => (item.attempts || 0) < maxAttempts)
        .map((item) => ({
          ...item,
          attempts: (item.attempts || 0) + 1,
        })),
      ...this.queue.slice(batch.length),
    ];

    this.saveQueue();
    this.retryTimeout = Math.min(this.retryTimeout * 2, this.maxRetryTimeout);

    console.warn(
      `⚠ Retrying in ${this.retryTimeout}ms (attempts: ${
        batch[0]?.attempts || 1
      })`
    );

    setTimeout(() => this.processQueue(), this.retryTimeout);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

export class UserSyncManager {
  private userId: string;
  private pointsQueue: PointsQueue;
  private syncInterval: number = 5000;
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

      if (!response.ok) {
        throw new Error(`Failed to sync with server: ${response.status}`);
      }

      const serverData = await response.json();

      if (this.pointsQueue.getQueueLength() === 0) {
        const localData = JSON.parse(
          localStorage.getItem(this.localStorageKey) || "{}"
        );

        const updatedData = {
          ...serverData,
          points: Math.max(serverData.points, localData.points || 0),
        };

        localStorage.setItem(
          this.localStorageKey,
          JSON.stringify(updatedData)
        );

        this.broadcastUpdate(updatedData);
      }
    } catch (error) {
      console.error("🔥 Sync failed:", error);
    }
  }

  private broadcastUpdate(data: UserData): void {
    const event = new CustomEvent("userDataUpdate", { detail: data });
    window.dispatchEvent(event);
  }

  public async addPoints(points: number): Promise<void> {
    try {
      const currentData = JSON.parse(
        localStorage.getItem(this.localStorageKey) || "{}"
      );

      const updatedData = {
        ...currentData,
        points: (currentData.points || 0) + points,
      };

      localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(updatedData)
      );

      await this.pointsQueue.addPoints(points);

      this.broadcastUpdate(updatedData);
    } catch (error) {
      console.error("🔥 Failed to add points:", error);
    }
  }

  public cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
