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

    // Auto-sync every 3 seconds
    this.interval = setInterval(() => this.flushQueue(), 3000);
  }

  async addPoints(amount: number) {
    this.queue += amount;
    
    // Update localStorage immediately
    try {
      const current = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
      current.points = (current.points || 0) + amount;
      localStorage.setItem(this.localStorageKey, JSON.stringify(current));
      
      // Broadcast update immediately
      window.dispatchEvent(
        new CustomEvent("userDataUpdate", { detail: current })
      );
    } catch (err) {
      console.error('Failed to update localStorage:', err);
    }
    
    // Trigger sync
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
        headers: { 
          "Content-Type": "application/json"
        },
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errorText}`);
      }

      const serverData = await res.json();

      if (!serverData.success) {
        throw new Error(serverData.error || 'Sync failed');
      }

      // ✅ CRITICAL: Don't overwrite local points
      const localData = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
      const serverPoints = parseInt(serverData.points) || 0;
      const localPoints = localData.points || 0;

      // Only update if server has MORE points (e.g., from another device)
      if (serverPoints > localPoints) {
        localData.points = serverPoints;
        localStorage.setItem(this.localStorageKey, JSON.stringify(localData));
        
        window.dispatchEvent(
          new CustomEvent("userDataUpdate", { 
            detail: { ...localData, points: serverPoints } 
          })
        );
      }

      console.log('✅ Synced:', amount, 'points. Server:', serverPoints, 'Local:', localPoints);

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