class UserSyncManager {
  private userId: string;
  private pointsQueue: PointsQueue;
  private syncInterval: number = 1000; // 1 second
  private syncTimer: NodeJS.Timeout | null = null;
  private localStorageKey: string;

  constructor(userId: string) {
    this.userId = userId;
    this.localStorageKey = `user_${userId}`;
    this.pointsQueue = new PointsQueue(userId);
    this.initialize();
  }

  private initialize() {
    // Load initial state from localStorage
    const savedData = localStorage.getItem(this.localStorageKey);
    const initialState = savedData ? JSON.parse(savedData) : null;

    // Start periodic sync with server
    this.startSync();

    return initialState;
  }

  private startSync() {
    this.syncTimer = setInterval(() => {
      this.syncWithServer();
    }, this.syncInterval);
  }

  private async syncWithServer() {
    try {
      const response = await fetch(`/api/user/${this.userId}`);
      if (!response.ok) throw new Error('Failed to sync with server');
      
      const serverData = await response.json();
      
      // Update local storage with server data
      localStorage.setItem(this.localStorageKey, JSON.stringify(serverData));
      
      // Broadcast update to all tabs
      this.broadcastUpdate(serverData);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private broadcastUpdate(data: any) {
    const event = new CustomEvent('userDataUpdate', { detail: data });
    window.dispatchEvent(event);
  }

  public async addPoints(points: number): Promise<void> {
    try {
      // Update local state immediately for UI feedback
      const currentData = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
      const updatedData = {
        ...currentData,
        points: (currentData.points || 0) + points
      };
      
      // Update localStorage
      localStorage.setItem(this.localStorageKey, JSON.stringify(updatedData));
      
      // Add points to queue for server sync
      await this.pointsQueue.addPoints(points);
      
      // Broadcast update
      this.broadcastUpdate(updatedData);
    } catch (error) {
      console.error('Failed to add points:', error);
    }
  }

  public cleanup() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }
}