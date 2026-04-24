"use client";
// import WebApp from "@twa-dev/sdk";
import React, { useState, useEffect } from "react";
import "./task.css";
import Link from "next/link";
import dynamic from 'next/dynamic';
import type { Task } from '@/types';
import confetti from 'canvas-confetti';
import { useWallet } from '../context/walletContext';
// import { useSignal, useInitData } from "@telegram-apps/sdk-react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Twitter, 
  Instagram, 
  Send, 
  Youtube, 
  Globe, 
  Wallet,
  Lock,
  CheckCircle2 
} from 'lucide-react';

interface ShowStoryOptions {
  media: string;
  mediaType: 'photo' | 'video';
  text?: string;
  sticker?: {
    url: string;
    width: number;
    height: number;
    position: {
      x: number;
      y: number;
    };
  };
}

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface ShareOptions {
  text?: string;
  widget_link?: {
    url: string;
    name: string;
  };
  sticker?: {
    url: string;
    width: number;
    height: number;
    position: {
      x: number;
      y: number;
    };
  };
}

interface ShareToStoryParams {
  media: string;   // Changed from media to media_url
  media_type: "photo" | "video";
  text?: string;
  sticker?: {
    url: string;
    width: number;
    height: number;
    position: { x: number; y: number };
  };
}

interface TelegramWebAppBasic {
  showAlert: (message: string) => void;
  openLink: (url: string) => void;
  shareToStory?: (params: ShareToStoryParams) => void;
}

// Update the WebApp type definition
// declare global {
//   interface TelegramWebApp extends Omit<typeof WebApp, 'showStory'> {
//     showStory(options: ShowStoryOptions): Promise<void>;
//   }
// }

const getTelegramWebApp = (): TelegramWebApp => {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp as TelegramWebApp;
  }
  throw new Error("Telegram WebApp is not available");
};

// Main TaskPageContent Component
const TaskPageContent: React.FC = () => {
 const getWebApp = () => window?.Telegram?.WebApp ?? null;
const WebApp = getWebApp();
  const [tasks, setTasks] = useState<Task[]>([
  // --- MAIN TASKS SECTION ---
  { id: "1", description: "Join Telegram Group", completed: false, reward: 5000, section: "main", type: "permanent", image: "/images/tasks/smartsnail telegram.png", link: "https://t.me/smartsnails", completedTime: null },
  { id: "2", description: 'Join SmartSnail Discord', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/daily/join discord.png', link: 'https://discord.gg/AswRvzwv', completedTime: null },
  { id: "3", description: 'Follow SmartSnail Instagram', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail instagram.png', link: 'https://www.instagram.com/smartsnail_nft', completedTime: null },
  { id: "4", description: 'Follow SmartSnail Threads', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail thread.png', link: 'https://www.threads.net/@smartsnail_nft', completedTime: null },
  { id: "5", description: 'Follow SmartSnail TikTok', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail tiktok.png', link: 'https://www.tiktok.com/@smartsnail', completedTime: null },
  { id: "6", description: 'Follow SmartSnail X', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail twitter.png', link: 'https://x.com/SmartSnail_NFT', completedTime: null },
  { id: "7", description: 'Subscribe to YouTube', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail youtube.png', link: 'https://youtube.com/@smartsnailnft', completedTime: null },
  { id: "8", description: 'Follow on Medium', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail medium.png', link: 'https://medium.com/@web3chinonsolutions', completedTime: null },
  { id: "9", description: 'Invite 3 Friends', completed: false, reward: 5000, section: 'main', type: 'permanent', image: '/images/tasks/invite friend.png', link: '', completedTime: null, active: true },
  { id: "10", description: 'Purchase Human Relations', completed: false, reward: 70000, section: 'main', type: 'permanent', image: '/images/daily/human relations.png', link: 'https://t.me/SmartSnails_Bot?start=purchase_humanRelations', completedTime: null },
  { id: "11", description: 'Purchase FxckedUpBags', completed: false, reward: 100000, section: 'main', type: 'permanent', image: '/images/tasks/fuckedupbags.png', link: 'https://t.me/SmartSnails_Bot?start=purchase_fxckedupbags', completedTime: null },
  { id: "12", description: 'Follow Web3Chinonsolutions Facebook', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino facebook.png', link: 'https://www.facebook.com/Web3chinonsolutions', completedTime: null },
  { id: "13", description: 'Follow Web3Chinonsolutions Instagram', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino instagram.png', link: 'https://www.instagram.com/web3chinonsolutions', completedTime: null },
  { id: "14", description: 'Follow Web3Chinonsolutions Threads', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino thread.png', link: 'https://www.threads.net/@smartsnail_nft', completedTime: null },
  { id: "15", description: 'Follow Web3Chinonsolutions TikTok', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino tiktok.png', link: 'https://tiktok.com/@web3chino', completedTime: null, active: true },
  { id: "16", description: 'Follow Web3Chinonsolutions X', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino twitter.png', link: 'https://x.com/Nonsoweb3', completedTime: null },
  { id: "17", description: 'Subscribe Web3Chinonsolutions YouTube', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino youtube.png', link: 'https://youtube.com/@web3chinonsolutions', completedTime: null },
  { id: "18", description: 'Connect TON Wallet', completed: false, reward: 10000, section: 'main', type: 'flexible', image: '/images/tasks/connect wallet.png', link: '', completedTime: null },
  { id: "19", description: 'Join Telegram Group', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/Alex Telegam.png', link: 'https://t.me/Alexanderthesage', completedTime: null },
  { id: "20", description: 'Follow on X', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/alex twitter.png', link: 'https://x.com/CaptainSage_', completedTime: null },
  { id: "21", description: 'Subscribe to YouTube Page', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/alex youtube.png', link: 'https://youtube.com/@alexanderthesage', completedTime: null },

  // --- DAILY TASKS SECTION ---
  { id: "22", description: 'Check-in on our X space', completed: false, section: 'daily', type: 'daily', image: '/images/daily/join twitter everyday.png', link: 'https://x.com/SmartSnail_NFT', batchId: 'Batch 10', completedTime: null },
  { id: "23", description: 'React on Threads', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/LCR thread.png', link: 'https://www.threads.net/@smartsnail_nft', completedTime: null },
  { id: "24", description: 'React on Facebook', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/LCS facebook.png', link: 'https://www.facebook.com/Web3chinonsolutions', completedTime: null },
  { id: "25", description: 'React on Instagram', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/LCS instagram.png', link: 'https://www.instagram.com/smartsnail_nft', completedTime: null },
  { id: "26", description: 'React on TikTok', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/LCS Tiktok.png', link: 'https://www.tiktok.com/@alexanderthesage', completedTime: null },
  { id: "27", description: 'Engage on X', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/RCT Twitter.png', link: 'https://x.com/SmartSnail_NFT', completedTime: null },
  { id: "28", description: 'Read FxckedUpBags', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/read Fxckedupbags.png', link: 'https://medium.com/@web3chinonsolutions', completedTime: null },
  { id: "29", description: 'Read Latest Medium', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/RR Medium.png', link: 'https://medium.com/@web3chinonsolutions', completedTime: null },
  { id: "30", description: 'Share Snail Story', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/share on telegram story.png', link: '', mediaUrl: '/videos/speedsnail.mp4', mediaType: 'video', isStoryTask: true, completedTime: null },
  { id: "31", description: 'Watch Snail YouTube', completed: false, reward: 2000, section: 'daily', type: 'daily', image: '/images/daily/watch youtube.png', link: 'https://youtu.be/PQyosdfnCYg', completedTime: null },
  
  // --- PARTNERS SECTION ---
  { id: "32", description: 'Follow PolyCombat', completed: false, reward: 3000, section: 'partners', type: 'permanent', image: '/images/tasks/partners1.png', link: 'https://www.instagram.com/polycombat', completedTime: null },
  
]);

 
  const [showConfetti, setShowConfetti] = useState(false);
  const [  selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [totalPoints, setTotalPoints] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('totalPoints')) || 0;
    }
    return 0;
  });
  
  const [selectedSection, setSelectedSection] = useState<"main" | "daily" | "partners">("main");
  const { connect, disconnect } = useWallet();
  const { isConnected } = useWallet();
  // const [isConnected, setIsConnected] = useState(false); 
  const [walletStatus, setWalletStatus] = useState(isConnected);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [message, setMessage] = useState<string>("");
  const [reward, setReward] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [hasBeenRewarded, setHasBeenRewarded] = useState(false);
 const initDataState = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData ?? {} : {};
  const userReferralLink = `https://t.me/smartsnailbot?start=${telegramId}`;

  const getSocialIcon = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes("twitter") || d.includes(" x ")) return <Twitter size={20} className="text-blue-400" />;
    if (d.includes("telegram")) return <Send size={20} className="text-sky-400" />;
    if (d.includes("instagram")) return <Instagram size={20} className="text-pink-500" />;
    if (d.includes("youtube")) return <Youtube size={20} className="text-red-500" />;
    if (d.includes("wallet")) return <Wallet size={20} className="text-purple-400" />;
    return <Globe size={20} className="text-emerald-400" />;
  };
  const telegramVersion = typeof window !== "undefined" ? window.Telegram?.WebApp?.version || "unknown" : "unknown";

  const triggerConfetti = () => {
    const duration = 2 * 1000; // 2 seconds
    const end = Date.now() + duration;
  
    // Create a canvas to ensure confetti is on top
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none"; // Ensures clicks go through
    canvas.style.zIndex = "9999"; // Ensures it's above everything
    document.body.appendChild(canvas);
  
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        document.body.removeChild(canvas); // Remove canvas after animation
        return;
      }
  
      confetti({
        particleCount: 50,
        startVelocity: 30,
        spread: 360,
        origin: { x: 0.5, y: 0.3 }, // Centered near the top
        zIndex: 9999, // Ensure it appears above popups
      });
  
    }, 250); // Fire confetti every 250ms for the duration
  };
  
  // DELETE these lines inside handleWalletAction:
useEffect(() => {
  const stored = localStorage.getItem("wallet_connected") === "true";
  if (stored) setWalletStatus(true);
}, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const version = window.Telegram.WebApp.version || "unknown";
      console.log("📢 Telegram WebApp Version:", version);
      
      // ✅ Update the <p> element dynamically
      const versionElement = document.getElementById("tg-version");
      if (versionElement) {
        versionElement.textContent = `📢 Telegram WebApp Version: ${version}`;
      }
    }
  }, []);


  useEffect(() => {
    WebApp?.ready();
    const userId = WebApp?.initDataUnsafe?.user?.id;
    setTelegramId(userId || null);
  }, []);



  const filteredTasks = tasks.filter((task) => task.section === selectedSection);
  
  // Modified initial loading effect
useEffect(() => {
  const storedCompletedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
  const storedPoints = parseInt(localStorage.getItem("totalPoints") || "0", 10);
  
  // Only mark non-flexible tasks as completed
  const updatedTasks = tasks.map((task) =>
    storedCompletedTasks.includes(task.id) && task.type !== "flexible"
      ? { ...task, completed: true }
      : task
  );
  
  setTasks(updatedTasks);
  setTotalPoints(storedPoints);
}, []);

// Modified wallet reward check effect
useEffect(() => {
  if (selectedTask?.id === "18") {
    // Use a specific localStorage key for wallet rewards
    const hasBeenRewardedBefore = localStorage.getItem('wallet_connect_rewarded') === 'true';
    setHasBeenRewarded(hasBeenRewardedBefore);
  }
}, [selectedTask]);

const handleTaskCompleted = (taskId: string, reward: number) => {
  setTasks((prevTasks) =>
    prevTasks.map((task) =>
      task.id === taskId
        ? { 
            ...task, 
            completed: !["18", "22"].includes(taskId), // Compare strings with strings
            completedTime: new Date().toISOString()
          }
        : task
    )
  );
  
    // Only store non-flexible tasks in localStorage
    const taskToComplete = tasks.find(task => task.id === taskId);
    if (taskToComplete && taskToComplete.type !== "flexible") {
      const completedTasks = new Set(JSON.parse(localStorage.getItem("completedTasks") || "[]"));
      completedTasks.add(taskId);
      localStorage.setItem("completedTasks", JSON.stringify([...completedTasks]));
    }
  
    // Reward the user
    if (reward) {
      setTotalPoints((prevPoints) => {
        const newPoints = prevPoints + (reward ?? 0);
        localStorage.setItem("totalPoints", newPoints.toString());
        return newPoints;
      });
    }
  };
  
  
  
  // Modified handleWalletAction function
const handleWalletAction = async (taskOverride?: Task) => {
  const walletTask = taskOverride ?? tasks.find(t => t.id === "18");
  if (!walletTask) return;

  try {
    setLoading(true);

    if (isConnected) {
      await disconnect();
      setWalletStatus(false);
      localStorage.removeItem("wallet_connected");
      setTaskCompleted(false);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === "18" ? { ...task, completed: false, completedTime: null } : task
        )
      );
      return;
    }

    // Open wallet — no modal shown at this point
    await connect();

    // Only reach here if connect() succeeded
    setWalletStatus(true);
    setTaskCompleted(true);
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === "18"
          ? { ...task, completed: true, completedTime: new Date().toISOString() }
          : task
      )
    );

    const walletRewardKey = 'wallet_connect_rewarded';
    const hasBeenRewardedBefore = localStorage.getItem(walletRewardKey) === 'true';

    if (!hasBeenRewardedBefore) {
      // Only confetti here, after confirmed connection
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      localStorage.setItem(walletRewardKey, 'true');

      try {
        const response = await fetch("/api/tasks/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: "18",
            reward: walletTask.reward ?? 0,
            telegramId: WebApp?.initDataUnsafe?.user?.id,
          }),
        });

        if (!response.ok) throw new Error('Failed to record reward on server');

        handleTaskCompleted("18", walletTask.reward ?? 0);
      } catch (error) {
        console.error("Failed to record wallet connection reward:", error);
        localStorage.removeItem(walletRewardKey);
        // Show error without a modal — use Telegram's native alert
        WebApp?.showAlert("Failed to record reward. Please try again.");
      }
    }

  } catch (error) {
    // connect() was cancelled or failed — no confetti, no reward
    console.error("Wallet interaction error:", error);
    WebApp?.showAlert("Failed to connect wallet. Please try again.");
  } finally {
    setLoading(false);
  }
};

// Modified useEffect for checking initial reward status
useEffect(() => {
  if (selectedTask?.id === "18") {  // Compare with string "18" instead of number 18
    const walletRewardKey = 'wallet_connect_rewarded';
    const hasBeenRewardedBefore = localStorage.getItem(walletRewardKey) === 'true';
    setHasBeenRewarded(hasBeenRewardedBefore);
  }
}, [selectedTask]);
  


  
  useEffect(() => {
    const updateDailyTasks = () => {
      const currentTime = Date.now();
  
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.map((task) => {
          // Only process daily tasks
          if (task.type !== "daily" && task.type !== "flexible") return task;


  
          // If task is completed, check if it needs to be reset
          if (task.completed && task.completedTime) {
            const completionTime = new Date(task.completedTime).getTime();
            const hoursSinceCompletion = (currentTime - completionTime) / (1000 * 60 * 60);
  
            // Reset if more than 20 hours have passed
            if (hoursSinceCompletion > 20) {
              return {
                ...task,
                completed: false,
                completedTime: null,
              };
            }
          }
  
          return task;
        });
  
        // Update localStorage to reflect changes
        const completedTasks = updatedTasks.filter((task) => task.completed);
        localStorage.setItem("completedTasks", JSON.stringify(completedTasks.map((task) => task.id)));
  
        return updatedTasks; // Return the updated tasks for setTasks
      });
    };
  
    // Run immediately and then every hour
    updateDailyTasks();
    const intervalId = setInterval(updateDailyTasks, 60 * 60 * 1000);
  
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []); 


  const handleTaskClick = (task: Task) => {
  if (task.active === false) return;

  if (task.id === "18") {
    handleWalletAction(task); // Pass task directly, no modal
    return;
  }

  if (!task.completed) {
    setSelectedTask(task);
    setValidationAttempt(0);
    setMessage("");
  }
};
 

const handleShareToStory = async () => {
  if (typeof window === "undefined" || !window.Telegram?.WebApp) {
    WebApp?.showAlert("Telegram WebApp is not supported on this device.");
    return;
  }

  if (!selectedTask || !telegramId) {
    WebApp?.showAlert("⚠️ Something went wrong. Please try again.");
    return;
  }

  try {
    console.log("🟢 Telegram Version:", window.Telegram?.WebApp?.version);
    console.log("🟢 shareToStory Available:", !!window.Telegram?.WebApp?.shareToStory);
    console.log("🟢 Share attempt:", { telegramId });

    if (!window.Telegram.WebApp.shareToStory) {
      WebApp?.showAlert("Telegram Story sharing is not supported.");
      return;
    }

    // Get media URL from the selected task
    let mediaUrl = selectedTask.mediaUrl;
    
    // Validate mediaUrl
    console.log("🟢 mediaUrl Type:", typeof mediaUrl);
    console.log("🟢 mediaUrl Value:", mediaUrl);

    if (!mediaUrl || typeof mediaUrl !== "string") {
      console.error("🚨 Invalid media URL:", mediaUrl);
      WebApp?.showAlert("Invalid media URL. Please try again.");
      return;
    }

    // Construct full URL properly
    const baseUrl = "https://telegram-smartsnail-airdrop.vercel.app";
    
    // Handle relative or absolute URLs - clean the path
    const cleanPath = mediaUrl.startsWith("/") ? mediaUrl.substring(1) : mediaUrl;
    const fullMediaUrl = `${baseUrl}/${cleanPath}`;

    console.log("📢 Final Media URL:", fullMediaUrl);
    
    // Important: Force string type and ensure it's not an object
    const mediaUrlString = String(fullMediaUrl).toString();
    
    // Determine media type
    const isVideo = mediaUrlString.toLowerCase().endsWith('.mp4');
    const mediaType = isVideo ? "video" : "photo";
    
    // Create sticker object
    const stickerUrl = `${baseUrl}/stickers/snail.png`;
    
    console.log("📢 Calling Telegram shareToStory with parameters:");
    
    // CRITICAL FIX: Direct parameter passing without creating an object variable first
    // This bypasses the issue where an object gets stringified incorrectly
    console.log({
      media: mediaUrlString,
      media_type: mediaType,
      text: "Join SmartSnail Airdrop!\nEarn Shells",
      sticker: {
        url: stickerUrl,
        width: 150,
        height: 150,
        position: {
          x: 0.5,
          y: 0.5
        }
      }
    });
    
    // CRITICAL FIX: Use the direct method call with arguments, not through a wrapper function
    // @ts-ignore - Bypass TypeScript interface constraints
    window.Telegram.WebApp.shareToStory(
      mediaUrlString,
      mediaType,
      "Join SmartSnail Airdrop!\nEarn Shells",
      {
        url: stickerUrl,
        width: 150,
        height: 150,
        position: {
          x: 0.5,
          y: 0.5
        }
      }
    );

    // Record share attempt in database/backend
    try {
      // Optional: Send share attempt to backend for tracking
      await fetch(`${baseUrl}/api/record-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, taskId: selectedTask.id })
      });
    } catch (trackingError) {
      console.error("Failed to record share attempt:", trackingError);
      // Continue execution - we don't want to block the success message due to tracking failure
    }

    // WebApp.showAlert("✅ Shared successfully! It may take up to 24 hours to verify your task.");

    // Success callback after delay (for demo/testing, set to 5 seconds; in production use longer time)
    const reward = selectedTask.reward || 0;
    // ✅ REPLACE WITH THIS
setTimeout(() => {
  // 1. Update the UI state for points
  setTotalPoints((prev) => {
    const newPoints = prev + reward;
    localStorage.setItem("totalPoints", newPoints.toString());
    return newPoints;
  });

  // 2. Show the success message
  WebApp?.showAlert(`🎉 You earned ${reward} Shells! Your balance has been updated.`);
  
  // 3. Close the popup and trigger effects
  setSelectedTask(null);
  triggerConfetti();
}, 5000); 
    
  } catch (error) {
    console.error("❌ Share failed:", error);
    WebApp?.showAlert("Failed to share story. Please try again.");
  }
};

  
  const handleValidateClick = async () => {
  if (!selectedTask) {
    alert("No task selected.");
    return;
  }

  if (selectedTask.completed) {
    alert("Task has already been completed.");
    return;
  }

  // Use functional update and check the NEW value synchronously
  const currentAttempt = validationAttempt + 1;
  setValidationAttempt(currentAttempt);

  // Warn on first 3 attempts (using currentAttempt, not stale state)
  if (currentAttempt === 1) {
    alert("Please perform the task before validating.");
    return;
  } else if (currentAttempt === 2) {
    alert("Bruhh, you haven't performed the task yet!");
    return;
  } else if (currentAttempt === 3) {
    alert("Go back and check again!");
    return;
  }

  // 4th click onwards — actually validate
  const telegramId = WebApp?.initDataUnsafe?.user?.id;
  if (!telegramId) {
    alert("Could not verify Telegram user. Please try again.");
    return;
  }

  // Show loading state immediately
  setLoading(true);
  setMessage("⏳ Validating your task, please wait...");

  try {
    const taskId = String(selectedTask.id);

    const response = await fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        reward: selectedTask.reward ?? 0,
        telegramId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Update tasks
    const updatedTasks = tasks.map((task) =>
      task.id === selectedTask.id
        ? { ...task, completed: true, completedTime: new Date().toISOString() }
        : task
    );
    setTasks(updatedTasks);

    // Update points
    if (data.userPoints !== undefined) {
      setTotalPoints(data.userPoints);
      localStorage.setItem("totalPoints", data.userPoints.toString());
    } else {
      setTotalPoints((prev) => {
        const reward = selectedTask.reward ?? 0;
        const newPoints = prev + reward;
        localStorage.setItem("totalPoints", newPoints.toString());
        return newPoints;
      });
    }

    const completedTaskIds = updatedTasks
      .filter((task) => task.completed)
      .map((task) => task.id);
    localStorage.setItem("completedTasks", JSON.stringify(completedTaskIds));

    // Success feedback before closing
    setMessage(`🎉 Task complete! +${(selectedTask.reward ?? 0).toLocaleString()} SHELLS earned!`);
    triggerConfetti();

    setTimeout(() => {
      setTaskCompleted(true);
      setSelectedTask(null);
      setValidationAttempt(0);
      setMessage("");
    }, 1500); // Let user see the success message briefly

  } catch (error) {
    console.error("Error completing task:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    setMessage(
      `❌ ${errorMessage.includes("Invalid task ID")
        ? "Problem with task data. Please refresh and try again."
        : `Failed: ${errorMessage}`}`
    );
  } finally {
    setLoading(false);
  }
};
  

  // Existing code redemption handler
  const handleRedeemCode = async () => {
    if (!inputCode) {
      setMessage("Please enter a valid code.");
      return;
    }
  
    if (!selectedTask?.batchId) {
      setMessage("No task selected or batch ID missing.");
      return;
    }
  
    setLoading(true);
    try {
      const response = await fetch("/api/redeemCodeTask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: inputCode,
          telegramId,
          batchId: selectedTask.batchId, // Ensure batchId is correctly passed
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setReward(data.reward);
        setUserPoints((prevPoints) => prevPoints + data.reward);
        setMessage(data.message || `You received ${data.reward} Shells!`);
        triggerConfetti(); // Trigger confetti only on success
      } else {
        setMessage(data.error || "Redemption failed. Please try again.");
      }
    } catch (error) {
      console.error("Error redeeming code:", error);
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
      setInputCode("");
    }
  };

  const getDynamicDescription = (task: Task) => {
  const url = task.link?.toLowerCase() || "";
  const isPermanent = task.type === "permanent";
  const isDaily = task.type === "daily";
  
  let platform = "Social Media";
  if (url.includes("t.me") || url.includes("telegram")) platform = "Telegram";
  else if (url.includes("x.com") || url.includes("twitter")) platform = "X (Twitter)";
  else if (url.includes("instagram")) platform = "Instagram";
  else if (url.includes("youtube")) platform = "YouTube";
  else if (url.includes("facebook")) platform = "Facebook";
  else if (url.includes("threads.net")) platform = "Threads";
  else if (url.includes("tiktok")) platform = "TikTok";
  else if (url.includes("medium.com")) platform = "Medium";
  else if (url.includes("discord")) platform = "Discord";

  // Logic for Permanent (Join/Follow) vs Daily (React/Engage)
  if (isPermanent) {
    const action = platform === "Telegram" || platform === "Discord" ? "Join" : "Follow";
    return `${action} ${platform}`;
  }
  
  if (isDaily) {
    if (task.isStoryTask) return "Share to Telegram Story";
    return `React on ${platform} Content`;
  }

  // Fallback to original description if logic doesn't match
  return task.description;
};

  return (
    <div className="task-container">

  
      <div className="task-header">
        <Link href="/" className="back-button-web3">
          <ChevronLeft size={32} color="#00ffa3" />
        </Link>
        <h2>Perform tasks to earn more Shells!</h2>
      </div>

      <div className="task-buttons">
        <button 
          className={selectedSection === "main" ? "active" : ""}
          onClick={() => setSelectedSection("main")}
        >
          🎯 Main Tasks
        </button>
        <button 
          className={selectedSection === "daily" ? "active" : ""}
          onClick={() => setSelectedSection("daily")}
        >
          🌟 Daily
        </button>
        <button 
          className={selectedSection === "partners" ? "active" : ""}
          onClick={() => setSelectedSection("partners")}
        >
          🤝 Partners
        </button>
      </div>

     <div className="tasks-list">
        {filteredTasks.map((task) => {
          const isCompleted = task.completed && task.type !== 'flexible';
          const isLocked = task.active === false;

          return (
            <div
              key={task.id}
              className={`task-row-web3 ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => !isLocked && (task.type === 'flexible' || !task.completed) && handleTaskClick(task)}
            >
              <div className="task-row-content">
                <div className="brand-icon-wrapper">
                  {/* Performance Fix: Use Lucide icons instead of 143KB images where possible */}
                  {getSocialIcon(task.description)}
                </div>
                
                <div className="task-details">
                      {/* 🔥 Change this line */}
                      <span className="task-title-web3">
                        {getDynamicDescription(task)}
                      </span>
                      
                      <div className="reward-container-web3">
                        <span className="reward-amount">+{(task.reward || 0).toLocaleString()}</span>
                        <span className="reward-unit">SHELLS</span>
                      </div>
                    </div>
              </div>

              <div className="task-action-area">
                {isCompleted ? (
                  <CheckCircle2 size={20} color="#00ffa3" />
                ) : isLocked ? (
                  <Lock size={18} color="rgba(255,255,255,0.3)" />
                ) : (
                  <div className="web3-action-arrow">
                    {/* Fix: Replaced broken PNG arrow with Lucide Chevron */}
                    <ChevronRight size={20} color="#00ffa3" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* POPUP: CSS fix below ensures this is centered, not at the bottom */}
      {selectedTask && (
  <div className="popup-overlay" onClick={() => setSelectedTask(null)}>
    <div className="web3-modal animate__animated animate__zoomIn" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedTask(null)}>
              ×
            </button>

            <div className="modal-header">
               <div className="modal-icon-glow">
                  {getSocialIcon(selectedTask.description)}
               </div>
               <h3 className="modal-title">{selectedTask.description}</h3>
            </div>
      <div className="modal-body">
        {/* Task 28: Book Reading Instructions */}
        {selectedTask.id === "28" && (
          <div className="instruction-card">
            <p>📖 Make content of you reading <strong>Fxckedupbags</strong>.</p>
            <p className="hashtag-row">#Fxckedupbags #SmartSnailNFT</p>
            <p style={{ fontSize: '12px', marginTop: '8px', color: 'rgba(255,255,255,0.6)' }}>
              Need a copy? Go to <strong>Main Task 11</strong>.
            </p>
          </div>
        )}

        {/* Task 22: Secret Code Input */}
        {selectedTask.id === "22" ? (
          <>
            <input
              className="web3-input"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Insert unique code"
              disabled={loading}
            />
            <button className="web3-primary-btn" onClick={handleRedeemCode} disabled={loading}>
              {loading ? "Redeeming..." : "Redeem Code"}
            </button>
          </>
        ) : selectedTask.id === "18" ? (
              /* Task 18: Wallet Connection */
              <button 
                className="web3-primary-btn" 
                onClick={() => handleWalletAction(selectedTask)} 
                disabled={loading}
              >
                {loading ? "Processing..." : walletStatus ? "Disconnect Wallet" : "Connect Wallet"}
              </button>
        ) : selectedTask.isStoryTask ? (
          /* Story Sharing Task */
          <>
            <p className="web3-helper-text">
              Copy and paste the text below into your caption to verify your share.
            </p>
            <div className="web3-text-box">
              <p>Join the farm, pick $Shells, and Stake in Polycombat! #smartsnail #polycombat #manchies  {userReferralLink}</p>
              <button 
                className="web3-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(`Join the SmartSnail farm, pick shells, and earn SmartSnailNFT! ${userReferralLink}`);
                  // You can replace alert with a cleaner toast notification later
                  alert("✅ Copied!");
                }}
              >
                📋 Copy
              </button>
            </div>
            <button className="web3-primary-btn" onClick={handleShareToStory} disabled={sharing}>
              {sharing ? "📤 Sharing..." : "📤 Share to Story"}
            </button>
          </>
        ) : selectedTask.id !== "28" && (
          /* Standard Tasks */
          <>
            <button className="web3-secondary-btn" onClick={() => window.open(selectedTask.link, "_blank")}>
              🎯 Perform Task
            </button>
                          <button
                className="web3-primary-btn"
                onClick={handleValidateClick}
                disabled={loading}
                style={{ marginTop: '10px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "⏳ Validating..." : "✅ Validate and Reward"}
              </button>
          </>
        )}

        {/* Feedback Messages */}
        {message && (
          <div className={`status-msg ${reward > 0 ? 'success' : ''}`}>
            {message}
          </div>
        )}
        
        {reward > 0 && (
          <div className="web3-reward-banner">
            🎉 +{reward} SHELLS EARNED
          </div>
        )}
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default TaskPageContent;
