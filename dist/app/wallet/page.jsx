"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const react_1 = require("react");
const ui_react_1 = require("@tonconnect/ui-react");
const core_1 = require("@ton/core");
const link_1 = __importDefault(require("next/link"));
function Home() {
    const [tonConnectUI] = (0, ui_react_1.useTonConnectUI)();
    const [tonWalletAddress, setTonWalletAddress] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const handleWalletConnection = (0, react_1.useCallback)((address) => {
        setTonWalletAddress(address);
        console.log("Wallet connected successfully!");
        setIsLoading(false);
    }, []);
    const handleWalletDisconnection = (0, react_1.useCallback)(() => {
        setTonWalletAddress(null);
        console.log("Wallet disconnected successfully!");
        setIsLoading(false);
    }, []);
    (0, react_1.useEffect)(() => {
        const checkWalletConnection = async () => {
            if (tonConnectUI.account?.address) {
                handleWalletConnection(tonConnectUI.account?.address);
            }
            else {
                handleWalletDisconnection();
            }
        };
        checkWalletConnection();
        const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
            if (wallet) {
                handleWalletConnection(wallet.account.address);
            }
            else {
                handleWalletDisconnection();
            }
        });
        return () => {
            unsubscribe();
        };
    }, [tonConnectUI, handleWalletConnection, handleWalletDisconnection]);
    const handleWalletAction = async () => {
        if (tonConnectUI.connected) {
            setIsLoading(true);
            await tonConnectUI.disconnect();
        }
        else {
            await tonConnectUI.openModal();
        }
    };
    const formatAddress = (address) => {
        const tempAddress = core_1.Address.parse(address).toString();
        return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
    };
    if (isLoading) {
        return (<main className="flex min-h-screen flex-col items-center justify-center">
        <div className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded">
          Loading...
        </div>
      </main>);
    }
    return (<main className="flex min-h-screen flex-col items-center justify-center">
      <div className="back-button">
      <link_1.default href="/">
        <img src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back"/>
      </link_1.default>
    </div>
      {/* <h1 className="text-4xl font-bold mb-8">TON Connect Demo</h1> */}
      {tonWalletAddress ? (<div className="flex flex-col items-center">
          <p className="mb-4">Connected: {formatAddress(tonWalletAddress)}</p>
          <button onClick={handleWalletAction} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Disconnect Wallet
          </button>
        </div>) : (<button onClick={handleWalletAction} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Connect TON Wallet
        </button>)}
    </main>);
}
