"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
const google_1 = require("next/font/google");
const script_1 = __importDefault(require("next/script"));
const inter = (0, google_1.Inter)({ subsets: ['latin'] });
exports.metadata = {
    title: 'Telegram Mini App',
    description: 'A simple Telegram mini app using Next.js and Prisma',
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <body className={inter.className}>
        <script_1.default src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive"/>
        {children}
      </body>
    </html>);
}
