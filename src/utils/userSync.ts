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

// Correct API URL
const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://telegram-smartsnail-airdrop.vercel.app/api/increase-points"
    : "/api/increase-points";

export class PointsQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private retryTimeout = 1000;
  private maxRetryTimeout = 32000;
  private batchSize = 10;
  private queueStorageKey: string;

  constructor(private userId: string) {
    this.queueStorageKey = `points_queue_${userId}`;
    this.loadQueue();
  }

  private loadQueue() {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(this.queueStorageKey);
      this.queue = saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error("🔥 Failed to load queue:", err);
      this.queue = [];
    }
  }

  private saveQueue() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.queueStorageKey, JSON.stringify(this.queue));
    } catch (err) {
      console.error("🔥 Failed to save queue:", err);
    }
  }

  async addPoints(points: number) {
    this.queue.push({
      points,
      timestamp: Date.now(),
      attempts: 0,
    });

    this.saveQueue();
    await this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const batch = this.queue.slice(0, this.batchSize);

    try {
      const totalPoints = batch.reduce((sum, i) => sum + i.points, 0);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: totalPoints,
          userId: this.userId,
          batch,
        }),
      });

      if (!response.ok) {
        console.error("🔥 API returned:", response.status);
        throw new Error(await response.text());
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Success → remove processed items
      this.queue.splice(0, batch.length);
      this.saveQueue();

      this.retryTimeout = 1000;

      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    } catch (err) {
      console.error("🔥 Queue processing error:", err);
      this.handleError(batch);
    } finally {
      this.isProcessing = false;
    }
  }

  private handleError(batch: QueueItem[]) {
    const maxAttempts = 5;

    this.queue = [
      ...batch
        .filter(i => i.attempts < maxAttempts)
        .map(i => ({ ...i, attempts: i.attempts + 1 })),
      ...this.queue.slice(batch.length),
    ];

    this.saveQueue();

    this.retryTimeout = Math.min(this.retryTimeout * 2, this.maxRetryTimeout);

    setTimeout(() => this.processQueue(), this.retryTimeout);
  }

  getQueueLength() {
    return this.queue.length;
  }
}

export class UserSyncManager {
  private telegramId: string;
  private queue: number = 0;
  private isSyncing = false;
  private interval: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(telegramId: string) {
    this.telegramId = telegramId;

    // Auto-sync every 2 seconds
    this.interval = setInterval(() => this.flushQueue(), 2000);
  }

  async addPoints(amount: number) {
    this.queue += amount;
    this.flushQueue();
  }

  private async flushQueue() {
    if (this.isSyncing || this.queue === 0) return;

    const amount = this.queue;
    this.queue = 0;
    this.isSyncing = true;

    try {
      this.abortController = new AbortController();

      const res = await fetch("/api/increase-points", {
        method: "POST",
        body: JSON.stringify({
          telegramId: this.telegramId,
          points: amount,
        }),
        headers: { "Content-Type": "application/json" },
        signal: this.abortController.signal,
      });

      const data = await res.json();

      // Broadcast update to window
      window.dispatchEvent(new CustomEvent("userDataUpdate", { detail: data }));
    } catch (err) {
      console.error("Sync error →", err);
      this.queue += amount; // requeue
    }

    this.isSyncing = false;
  }

  cleanup() {
    if (this.interval) clearInterval(this.interval);
    if (this.abortController) this.abortController.abort();
  }
}

