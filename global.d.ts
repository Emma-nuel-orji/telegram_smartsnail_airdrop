// global.d.ts
interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
      user?: {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
      };
      auth_date?: number;
      hash?: string;
    };
    ready: () => void;
    close: () => void;
    sendData: (data: string) => void;
    expand: () => void;
    isExpanded: boolean;
    platform: string;
    themeParams: {
      bg_color?: string;
      text_color?: string;
      hint_color?: string;
      link_color?: string;
      button_color?: string;
      button_text_color?: string;
    };
  }
  
 
declare global {
    interface Window {
      Telegram?: {
        WebApp: TelegramWebApp; // Ensure this matches the correct type
      };
    }
  }