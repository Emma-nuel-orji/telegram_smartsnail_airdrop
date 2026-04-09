// global.d.ts

export {}; // This ensures the file is treated as a module

declare global {
  interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }

  interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
      user?: TelegramUser;
      auth_date?: number;
      hash?: string;
    };
    version: string;
    platform: string;
    isExpanded: boolean;
    themeParams: {
      bg_color?: string;
      text_color?: string;
      hint_color?: string;
      link_color?: string;
      button_color?: string;
      button_text_color?: string;
    };
    
    // --- CORE METHODS ---
    ready: () => void;
    close: () => void;
    expand: () => void;
    sendData: (data: string) => void;
    showAlert: (message: string) => void;
    showConfirm: (message: string, callback: (ok: boolean) => void) => void;
    
    // FIX FOR BOOST PAGE ERROR
    showPopup: (
        params: { title?: string; message: string; buttons?: { id?: string; type?: string; text: string }[] }, 
        callback?: (buttonId: string) => void
    ) => void;

    // --- GYM & UTILITY METHODS ---
    openInvoice: (url: string, callback: (status: string) => void) => void;
    openTelegramLink: (url: string) => void;
    openLink: (url: string) => void;
    
    // --- HAPTICS ---
    HapticFeedback: {
      impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
      notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
      selectionChanged: () => void;
    };

    // --- TASK METHODS ---
    shareToStory: (
      media: string,
      mediaType: "photo" | "video",
      text?: string,
      sticker?: {
        url: string;
        width?: number;
        height?: number;
        position?: { x: number; y: number };
      }
    ) => void;
  }

  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}