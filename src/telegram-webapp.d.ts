declare namespace Telegram {
  interface WebAppUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }

  interface WebApp {
    initData: any;
    ready(): void;
    initDataUnsafe: {
      user?: WebAppUser;
    };
    close: () => void;

    // ✅ Add the showStory method
    showStory?: (params: {
      media: string;
      mediaType: "photo" | "video";
      sticker?: {
        url: string;
        width: number;
        height: number;
        position: { x: number; y: number };
      };
    }) => Promise<void>;
  }

  const WebApp: WebApp;
}

interface TelegramWebApp {
  WebApp: {
    initDataUnsafe: {
      user?: {
        id: number;
        first_name?: string;
        last_name?: string;
        username?: string;
        language_code?: string;
      };
    };
    ready: () => void;
    close: () => void;
    showStory?: (params: {
      media: string;
      mediaType: "photo" | "video";
      sticker?: {
        url: string;
        width: number;
        height: number;
        position: { x: number; y: number };
      };
    }) => Promise<void>;
  };
}

declare global {
  interface Window {
    Telegram?: TelegramWebApp;
    pointsQueue?: PointsQueue;
  }
}

export {}; // ✅ Ensure this file is treated as a module
