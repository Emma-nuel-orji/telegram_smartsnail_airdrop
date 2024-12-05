"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const ReferralSystem_1 = __importDefault(require("@/components/ReferralSystem"));
const react_1 = require("react");
function Home() {
    const [initData, setInitData] = (0, react_1.useState)('');
    const [userId, setUserId] = (0, react_1.useState)('');
    const [startParam, setStartParam] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        const initWebApp = async () => {
            if (typeof window !== 'undefined') {
                const WebApp = (await Promise.resolve().then(() => __importStar(require('@twa-dev/sdk')))).default;
                WebApp.ready();
                setInitData(WebApp.initData);
                setUserId(WebApp.initDataUnsafe.user?.id.toString() || '');
                setStartParam(WebApp.initDataUnsafe.start_param || '');
            }
        };
        initWebApp();
    }, []);
    return (<main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Telegram Referral</h1>
      <ReferralSystem_1.default initData={initData} userId={userId} startParam={startParam}/>
    </main>);
}
