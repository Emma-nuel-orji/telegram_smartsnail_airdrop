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
        ready(): unknown;
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

declare global {
    interface Window {
        Telegram: {
            WebApp: Telegram.WebApp;
        };
    }
}

export {};
