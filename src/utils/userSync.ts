// lib/userSync.ts

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

export class UserSyncManager {
  private telegramId: string;
  private queue: number = 0;
  private isSyncing = false;
  private interval: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private localStorageKey: string;

  constructor(telegramId: string) {
    this.telegramId = telegramId;
    this.localStorageKey = `user_${telegramId}`;

    // Auto-sync every 3 seconds (reduced frequency)
    this.interval = setInterval(() => this.flushQueue(), 3000);
  }

  async addPoints(amount: number) {
    this.queue += amount;
    
    // Update localStorage immediately
    try {
      const current = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
      current.points = (current.points || 0) + amount;
      localStorage.setItem(this.localStorageKey, JSON.stringify(current));
    } catch (err) {
      console.error('Failed to update localStorage:', err);
    }
    
    // Don't wait for sync - fire and forget
    this.flushQueue();
  }

  private async flushQueue() {
    if (this.isSyncing || this.queue === 0) return;

    const amount = this.queue;
    this.queue = 0;
    this.isSyncing = true;

    try {
      this.abortController = new AbortController();

      const res = await fetch("/api/increase-point", {
        method: "POST",
        body: JSON.stringify({
          telegramId: this.telegramId,
          points: amount,
        }),
        headers: { "Content-Type": "application/json" },
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const serverData = await res.json();

      // ✅ CRITICAL: Only update if server points are HIGHER
      // This prevents overwriting local optimistic updates
      const localData = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
      const serverPoints = parseInt(serverData.points) || 0;
      const localPoints = localData.points || 0;

      if (serverPoints > localPoints) {
        // Server has more points (maybe from another device)
        localData.points = serverPoints;
        localStorage.setItem(this.localStorageKey, JSON.stringify(localData));
        
        // Broadcast update
        window.dispatchEvent(
          new CustomEvent("userDataUpdate", { 
            detail: { ...localData, points: serverPoints } 
          })
        );
      }
      // Otherwise keep local value (it's ahead of server due to queued taps)

    } catch (err: any) {
      console.error("Sync error:", err);
      
      // Only requeue if not aborted
      if (err.name !== 'AbortError') {
        this.queue += amount;
      }
    } finally {
      this.isSyncing = false;
    }
  }

  cleanup() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}