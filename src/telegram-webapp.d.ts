// src/telegram-webapp.d.ts

declare namespace Telegram {
    interface WebAppUser {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
    }

    interface WebApp {
        ready(): unknown;
        initDataUnsafe: {
            user?: WebAppUser;
        };
        close: () => void;
        // Add other WebApp methods here as needed
    }

    const WebApp: WebApp;
}
