 export interface Task {
    id: number;
    description: string;
    completed: boolean;
    section: "main" | "daily" | "partners";
    type: "daily" | "permanent";
    image: string;
    link: string;
    completedTime?: string | null;
    batchId?: string;
    mediaUrl?: string;
    isStoryTask?: boolean;
    mediaType?: string;
    reward?: number;
  }