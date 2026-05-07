"use client";
import React, { useState, useEffect } from "react";
import "./task.css";
import Link from "next/link";
import type { Task } from '@/types';
import confetti from 'canvas-confetti';
import { useWallet } from '../context/walletContext';
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
  CheckCircle2, 
  MessageSquare, 
   Terminal,
  Copy
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

// ─────────────────────────────────────────────
// 🔑 KEY FIX: Get Telegram ID synchronously
//    so it's available before ANY state runs
// ─────────────────────────────────────────────

const getTelegramId = (): number | null => {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
};

const TaskPageContent: React.FC = () => {
  const getWebApp = () => window?.Telegram?.WebApp ?? null;
  const WebApp = getWebApp();

  // ─────────────────────────────────────────────
  // 🔑 KEY FIX: telegramId is a plain constant,
  //    NOT useState — so it's always ready
  // ─────────────────────────────────────────────
  const telegramId = getTelegramId();

  // Helper: builds a localStorage key namespaced to this user
  // e.g. "totalPoints_123456789"
  const sk = (key: string) =>
    telegramId ? `${key}_${telegramId}` : key;

  // ─────────────────────────────────────────────
  // STATE — totalPoints now reads the correct key
  //         from the very first render
  // ─────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1",  description: "Join Telegram Group",                  completed: false, reward: 5000,   section: "main",     type: "permanent", image: "/images/tasks/smartsnail telegram.png",  link: "https://t.me/smartsnails",                                           completedTime: null },
    { id: "2",  description: "Join SmartSnail Discord",              completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/daily/join discord.png",          link: "https://discord.gg/AswRvzwv",                                        completedTime: null },
    { id: "3",  description: "Follow SmartSnail Instagram",          completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/smartsnail instagram.png",  link: "https://www.instagram.com/smartsnail_nft",                           completedTime: null },
    { id: "4",  description: "Follow SmartSnail Threads",            completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/smartsnail thread.png",     link: "https://www.threads.net/@smartsnail_nft",                            completedTime: null },
    { id: "5",  description: "Follow SmartSnail TikTok",             completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/smartsnail tiktok.png",     link: "https://www.tiktok.com/@smartsnail",                                 completedTime: null },
    { id: "6",  description: "Follow SmartSnail X",                  completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/smartsnail twitter.png",    link: "https://x.com/SmartSnail_NFT",                                       completedTime: null },
    { id: "7",  description: "Subscribe to YouTube",                 completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/smartsnail youtube.png",    link: "https://youtube.com/@smartsnailnft",                                 completedTime: null },
    { id: "8",  description: "Follow on Medium",                     completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/smartsnail medium.png",     link: "https://medium.com/@web3chinonsolutions",                            completedTime: null },
    { id: "9",  description: "Invite 3 Friends",                     completed: false, reward: 5000,   section: "main",     type: "permanent", image: "/images/tasks/invite friend.png",         link: "",                                                                   completedTime: null, active: false },
    { id: "10", description: "Purchase Human Relations",             completed: false, reward: 70000,  section: "main",     type: "permanent", image: "/images/daily/human relations.png",       link: "https://t.me/SmartSnails_Bot?start=purchase_humanRelations",         completedTime: null, active: false },
    { id: "11", description: "Purchase FxckedUpBags",                completed: false, reward: 100000, section: "main",     type: "permanent", image: "/images/tasks/fuckedupbags.png",          link: "https://t.me/SmartSnails_Bot?start=purchase_fxckedupbags",           completedTime: null, active: false },
    { id: "12", description: "Follow Web3Chinonsolutions Facebook",  completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/web3chino facebook.png",    link: "https://www.facebook.com/Web3chinonsolutions",                       completedTime: null },
    { id: "13", description: "Follow Web3Chinonsolutions Instagram", completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/web3chino instagram.png",   link: "https://www.instagram.com/web3chinonsolutions",                      completedTime: null },
    { id: "14", description: "Follow Web3Chinonsolutions Threads",   completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/web3chino thread.png",      link: "https://www.threads.net/@smartsnail_nft",                            completedTime: null },
    { id: "15", description: "Follow Web3Chinonsolutions TikTok",    completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/web3chino tiktok.png",      link: "https://tiktok.com/@web3chino",                                      completedTime: null, active: false },
    { id: "16", description: "Follow Web3Chinonsolutions X",         completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/web3chino twitter.png",     link: "https://x.com/Nonsoweb3",                                            completedTime: null },
    { id: "17", description: "Subscribe Web3Chinonsolutions YouTube",completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/web3chino youtube.png",     link: "https://youtube.com/@web3chinonsolutions",                           completedTime: null },
    { id: "18", description: "Connect TON Wallet",                   completed: false, reward: 10000,  section: "main",     type: "flexible",  image: "/images/tasks/connect wallet.png",        link: "",                                                                   completedTime: null },
    { id: "19", description: "Join Telegram Group",                  completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/Alex Telegam.png",          link: "https://t.me/Alexanderthesage",                                      completedTime: null },
    { id: "20", description: "Follow on X",                          completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/alex twitter.png",          link: "https://x.com/CaptainSage_",                                         completedTime: null },
    { id: "21", description: "Subscribe to YouTube Page",            completed: false, reward: 10000,  section: "main",     type: "permanent", image: "/images/tasks/alex youtube.png",          link: "https://youtube.com/@alexanderthesage",                              completedTime: null },
    { id: "22", description: "Check-in on our X space",              completed: false, section: "daily",    type: "daily",     image: "/images/daily/join twitter everyday.png", link: "https://x.com/SmartSnail_NFT",               batchId: "Batch 10",                completedTime: null },
    { id: "23", description: "React on Threads",                     completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/LCR thread.png",            link: "https://www.threads.net/@smartsnail_nft",                            completedTime: null },
    { id: "24", description: "React on Facebook",                    completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/LCS facebook.png",          link: "https://www.facebook.com/Web3chinonsolutions",                       completedTime: null },
    { id: "25", description: "React on Instagram",                   completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/LCS instagram.png",         link: "https://www.instagram.com/smartsnail_nft",                           completedTime: null },
    { id: "26", description: "React on TikTok",                      completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/LCS Tiktok.png",            link: "https://www.tiktok.com/@alexanderthesage",                           completedTime: null },
    { id: "27", description: "Engage on X",                          completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/RCT Twitter.png",           link: "https://x.com/SmartSnail_NFT",                                       completedTime: null },
    { id: "28", description: "Read FxckedUpBags",                    completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/read Fxckedupbags.png",     link: "https://medium.com/@web3chinonsolutions",                            completedTime: null },
    { id: "29", description: "Read Latest Medium",                   completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/RR Medium.png",             link: "https://medium.com/@web3chinonsolutions",                            completedTime: null },
    { id: "30", description: "Share Snail Story",                    completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/share on telegram story.png", link: "", mediaUrl: "/videos/speedsnail.mp4", mediaType: "video", isStoryTask: true, completedTime: null },
    { id: "31", description: "Watch Snail YouTube",                  completed: false, reward: 2000,   section: "daily",    type: "daily",     image: "/images/daily/watch youtube.png",         link: "https://youtu.be/PQyosdfnCYg",                                       completedTime: null },
    { id: "32", description: "Follow PolyCombat",                    completed: false, reward: 3000,   section: "partners", type: "permanent", image: "/images/tasks/partners1.png",             link: "https://www.instagram.com/polycombat",                               completedTime: null },
  ]);

  const [showConfetti, setShowConfetti]       = useState(false);
  const [selectedTask, setSelectedTask]       = useState<Task | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);

  // ─────────────────────────────────────────────
  // 🔑 KEY FIX: reads sk("totalPoints") so each
  //    user starts with their OWN saved value
  // ─────────────────────────────────────────────
  const [totalPoints, setTotalPoints] = useState(() => {
    if (typeof window !== "undefined") {
      const id = getTelegramId();
      const key = id ? `totalPoints_${id}` : "totalPoints";
      return Number(localStorage.getItem(key)) || 0;
    }
    return 0;
  });

  const [selectedSection, setSelectedSection] = useState<"main" | "daily" | "partners">("main");
  const { connect, disconnect, isConnected }  = useWallet();
  const [taskCompleted, setTaskCompleted]     = useState(false);
  const [inputCode, setInputCode]             = useState("");
  const [message, setMessage]                 = useState<string>("");
  const [reward, setReward]                   = useState(0);
  const [userPoints, setUserPoints]           = useState(0);
  const [loading, setLoading]                 = useState(false);
  const [sharing, setSharing]                 = useState(false);
  const [hasBeenRewarded, setHasBeenRewarded] = useState(false);
  const [isStoryVerifying, setIsStoryVerifying] = useState(false);

  const userReferralLink = `https://t.me/SmartSnails_Bot?start=${telegramId}`;

  // ─── Helpers ──────────────────────────────────
  const getSocialIcon = (desc: string) => {
    const d = desc.toLowerCase();
    const iconSize = 28;
    if (d.includes("twitter") || d.includes(" x ")) return <Twitter size={iconSize} color="#1DA1F2" />;
    if (d.includes("telegram"))  return <Send        size={iconSize} color="#229ED9" />;
    if (d.includes("instagram")) return <Instagram   size={iconSize} color="#E1306C" />;
    if (d.includes("youtube"))   return <Youtube     size={iconSize} color="#FF0000" />;
    if (d.includes("discord"))   return <MessageSquare size={iconSize} color="#5865F2" />;
    if (d.includes("threads"))   return <Globe       size={iconSize} color="#ffffff" />;
    if (d.includes("tiktok"))    return <Globe       size={iconSize} color="#ff0050" />;
    if (d.includes("facebook"))  return <Globe       size={iconSize} color="#1877F2" />;
    if (d.includes("medium"))    return <Globe       size={iconSize} color="#f5f5f5" />;
    if (d.includes("wallet"))    return <Wallet      size={iconSize} color="#00ffa3" />;
    return <Globe size={iconSize} color="#00ffa3" />;
  };

  const triggerConfetti = () => {
    const duration = 2 * 1000;
    const end = Date.now() + duration;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;";
    document.body.appendChild(canvas);
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); document.body.removeChild(canvas); return; }
      confetti({ particleCount: 50, startVelocity: 30, spread: 360, origin: { x: 0.5, y: 0.3 }, zIndex: 9999 });
    }, 250);
  };

  // ─── Effects ──────────────────────────────────

  useEffect(() => { WebApp?.ready(); }, []);

  // ─────────────────────────────────────────────
  // 🔑 KEY FIX: Load completed tasks using the
  //    namespaced key so only THIS user's tasks
  //    are restored
  // ─────────────────────────────────────────────
  useEffect(() => {
    const storedCompletedTasks = JSON.parse(
      localStorage.getItem(sk("completedTasks")) || "[]"
    );
    const storedPoints = parseInt(
      localStorage.getItem(sk("totalPoints")) || "0", 10
    );

    const updatedTasks = tasks.map((task) =>
      storedCompletedTasks.includes(task.id) && task.type !== "flexible"
        ? { ...task, completed: true }
        : task
    );

    setTasks(updatedTasks);
    setTotalPoints(storedPoints);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────
  // 🔑 KEY FIX: Wallet reward check uses the
  //    namespaced key — each user's wallet reward
  //    is tracked independently
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isConnected) {
      const alreadyRewarded =
        localStorage.getItem(sk("wallet_connect_rewarded")) === "true";
      if (!alreadyRewarded) {
        const rewardAmount = 10000;
        setTotalPoints((prev) => {
          const newPoints = prev + rewardAmount;
          localStorage.setItem(sk("totalPoints"), newPoints.toString());
          return newPoints;
        });
        localStorage.setItem(sk("wallet_connect_rewarded"), "true");
        setMessage(`✅ Wallet connected! +${rewardAmount.toLocaleString()} SHELLS earned!`);
        confetti({
          particleCount: 150, spread: 70, origin: { y: 0.6 },
          colors: ["#00ffa3", "#8a2be2", "#00d1ff"],
        });
      }
    }
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Daily task reset check
  useEffect(() => {
    const updateDailyTasks = () => {
      const currentTime = Date.now();
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.map((task) => {
          if (task.type !== "daily" && task.type !== "flexible") return task;
          if (task.completed && task.completedTime) {
            const completionTime = new Date(task.completedTime).getTime();
            const hoursSinceCompletion = (currentTime - completionTime) / (1000 * 60 * 60);
            if (hoursSinceCompletion > 20) return { ...task, completed: false, completedTime: null };
          }
          return task;
        });
        const completedTasks = updatedTasks.filter((t) => t.completed);
        localStorage.setItem(
          sk("completedTasks"),
          JSON.stringify(completedTasks.map((t) => t.id))
        );
        return updatedTasks;
      });
    };
    updateDailyTasks();
    const intervalId = setInterval(updateDailyTasks, 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ─────────────────────────────────

  const handleTaskCompleted = (taskId: string, rewardAmt: number) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: !["18", "22"].includes(taskId), completedTime: new Date().toISOString() }
          : task
      )
    );

    const taskToComplete = tasks.find((t) => t.id === taskId);
    if (taskToComplete && taskToComplete.type !== "flexible") {
      const completedTasks = new Set(
        JSON.parse(localStorage.getItem(sk("completedTasks")) || "[]")
      );
      completedTasks.add(taskId);
      localStorage.setItem(sk("completedTasks"), JSON.stringify([...completedTasks]));
    }

    if (rewardAmt) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#00ffa3", "#8a2be2", "#00d1ff", "#ffffff"], zIndex: 20000 });
      setTotalPoints((prevPoints) => {
        const newPoints = prevPoints + rewardAmt;
        localStorage.setItem(sk("totalPoints"), newPoints.toString());
        return newPoints;
      });
    }
  };

  const handleWalletAction = async (task: Task) => {
    setLoading(true);
    try {
      if (!isConnected) { await connect(); }
      else               { await disconnect(); setMessage("Wallet disconnected."); }
    } catch {
      setMessage("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (task.active === false) return;
    if (task.id === "18") { handleWalletAction(task); return; }
    if (!task.completed)  { setSelectedTask(task); setValidationAttempt(0); setMessage(""); }
  };

  const handleShareToStory = async () => {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) {
      WebApp?.showAlert("Telegram WebApp is not supported on this device."); return;
    }
    if (!selectedTask || !telegramId) {
      WebApp?.showAlert("⚠️ Something went wrong. Please try again."); return;
    }
    if (!window.Telegram.WebApp.shareToStory) {
      WebApp?.showAlert("Telegram Story sharing is not supported on this version."); return;
    }

    try {
      const baseUrl   = "https://telegram-smartsnail-airdrop.vercel.app";
      const cleanPath = selectedTask.mediaUrl?.startsWith("/") ? selectedTask.mediaUrl.substring(1) : selectedTask.mediaUrl;
      const fullMediaUrl = `${baseUrl}/${cleanPath}`;
      const stickerUrl   = `${baseUrl}/stickers/snail.png`;
      const isVideo = fullMediaUrl.toLowerCase().endsWith(".mp4");

      // @ts-ignore
      window.Telegram.WebApp.shareToStory(fullMediaUrl, isVideo ? "video" : "photo",
        "Join SmartSnail Airdrop! 🐚\nEarn Shells with me.",
        { url: stickerUrl, width: 150, height: 150, position: { x: 0.5, y: 0.5 } }
      );

      setIsStoryVerifying(true);
      setMessage("🔍 Verifying your story... please wait.");

      setTimeout(async () => {
        try {
          const initData = window.Telegram?.WebApp?.initData;
          const rewardAmt = selectedTask.reward || 0;

          const response = await fetch("/api/tasks/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(initData ? { Authorization: `tma ${initData}` } : {}) },
            body: JSON.stringify({ taskId: String(selectedTask.id) }),
          });
          const data = await response.json();

          if (response.ok) {
            const finalPoints = data.userPoints || (totalPoints + rewardAmt);
            setTotalPoints(finalPoints);
            localStorage.setItem(sk("totalPoints"), finalPoints.toString());

            setTasks((prev) =>
              prev.map((t) => t.id === selectedTask.id ? { ...t, completed: true, completedTime: new Date().toISOString() } : t)
            );
            triggerConfetti();
            WebApp?.showAlert(`🎉 Story Verified! +${rewardAmt.toLocaleString()} SHELLS earned!`);
            setSelectedTask(null);
          } else {
            throw new Error(data.error || "Verification failed");
          }
        } catch (err: any) {
          WebApp?.showAlert(err.message || "Verification failed. Did you finish the story?");
        } finally {
          setIsStoryVerifying(false);
          setMessage("");
        }
      }, 12000);
    } catch (error) {
      WebApp?.showAlert("Failed to share story.");
      setIsStoryVerifying(false);
    }
  };

  const handleValidateClick = async () => {
    if (!selectedTask) { alert("No task selected."); return; }
    if (selectedTask.completed) { alert("Task already completed."); return; }

    const currentAttempt = validationAttempt + 1;
    setValidationAttempt(currentAttempt);

    if (currentAttempt === 1) { alert("Please perform the task before validating."); return; }
    else if (currentAttempt === 2) { alert("Bruhh, you haven't performed the task yet!"); return; }
    else if (currentAttempt === 3) { alert("Go back and check again!"); return; }

    setLoading(true);
    setMessage("⏳ Validating your task, please wait...");

    try {
      const initData = window.Telegram?.WebApp?.initData;
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(initData ? { Authorization: `tma ${initData}` } : {}) },
        body: JSON.stringify({ taskId: String(selectedTask.id) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Validation failed");
      }

      const data = await response.json();

      const updatedTasks = tasks.map((task) =>
        task.id === selectedTask.id
          ? { ...task, completed: true, completedTime: new Date().toISOString() }
          : task
      );
      setTasks(updatedTasks);

      if (data.userPoints !== undefined) {
        setTotalPoints(data.userPoints);
        localStorage.setItem(sk("totalPoints"), data.userPoints.toString());
      }

      const completedTaskIds = updatedTasks.filter((t) => t.completed).map((t) => t.id);
      localStorage.setItem(sk("completedTasks"), JSON.stringify(completedTaskIds));

      setMessage(`🎉 Task complete! +${(selectedTask.reward ?? 0).toLocaleString()} SHELLS earned!`);
      triggerConfetti();

      setTimeout(() => {
        setTaskCompleted(true);
        setSelectedTask(null);
        setValidationAttempt(0);
        setMessage("");
      }, 1500);
    } catch {
      setMessage("❌ Validation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!inputCode)              { setMessage("Please enter a valid code."); return; }
    if (!selectedTask?.batchId)  { setMessage("No task selected or batch ID missing."); return; }

    setLoading(true);
    try {
      const initData = window.Telegram?.WebApp?.initData;
      const response = await fetch("/api/redeemCodeTask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(initData ? { Authorization: `tma ${initData}` } : {}) },
        body: JSON.stringify({ code: inputCode, batchId: selectedTask.batchId }),
      });
      const data = await response.json();

      if (response.ok) {
        setReward(data.reward);
        setUserPoints((prev) => prev + data.reward);
        setMessage(data.message || `You received ${data.reward} Shells!`);
        triggerConfetti();
      } else {
        setMessage(data.error || "Redemption failed. Please try again.");
      }
    } catch {
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
      setInputCode("");
    }
  };

  const getDynamicDescription = (task: Task) => {
    if (task.id === "18") return isConnected ? "Disconnect Wallet" : "Connect TON Wallet";
    if (task.id === "22") return "Check-in on our X space";

    const url = task.link?.toLowerCase() || "";
    const isPermanent = task.type === "permanent";
    const isDaily     = task.type === "daily";

    let platform = "Social Media";
    if      (url.includes("t.me") || url.includes("telegram")) platform = "Telegram";
    else if (url.includes("x.com") || url.includes("twitter")) platform = "X (Twitter)";
    else if (url.includes("instagram"))  platform = "Instagram";
    else if (url.includes("youtube"))    platform = "YouTube";
    else if (url.includes("facebook"))   platform = "Facebook";
    else if (url.includes("threads.net")) platform = "Threads";
    else if (url.includes("tiktok"))     platform = "TikTok";
    else if (url.includes("medium.com")) platform = "Medium";
    else if (url.includes("discord"))    platform = "Discord";

    if (isPermanent) {
      const action = platform === "Telegram" || platform === "Discord" ? "Join" : "Follow";
      return `${action} ${platform}`;
    }
    if (isDaily) {
      if (task.isStoryTask) return "Share to Telegram Story";
      return `React on ${platform} Content`;
    }
    return task.description;
  };

  const filteredTasks = tasks.filter((task) => task.section === selectedSection);

  // ─── Render ───────────────────────────────────
  return (
    <div className="task-container pb-20">
      {/* HEADER */}
      <div className="task-header">
        <Link href="/" className="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-95 transition-transform">
          <ChevronLeft size={24} color="#00ffa3" />
        </Link>
        <h2 className="text-sm font-black uppercase tracking-widest text-white">PERFORM TASKS</h2>
      </div>

      {/* TAB NAVIGATION */}
      <div className="task-buttons">
        {(["main", "daily", "partners"] as const).map((section) => (
          <button
            key={section}
            className={selectedSection === section ? "active" : ""}
            onClick={() => setSelectedSection(section)}
          >
            {section === "main"     && "🎯 Main"}
            {section === "daily"    && "🌟 Daily"}
            {section === "partners" && "🤝 Partners"}
          </button>
        ))}
      </div>

      {/* TASK LIST */}
      <div className="tasks-list">
        {filteredTasks.map((task) => {
          const dynamicTitle = getDynamicDescription(task);
          const isCompleted  = task.completed && task.type !== "flexible";
          const isLocked     = task.active === false;

          return (
            <div
              key={task.id}
              className={`task-row-web3 ${isCompleted ? "completed" : ""} ${isLocked ? "locked" : ""}`}
              onClick={() => !isLocked && (task.type === "flexible" || !task.completed) && handleTaskClick(task)}
            >
              <div className="task-row-content">
                <div className="brand-icon-wrapper">{getSocialIcon(dynamicTitle)}</div>
                <div className="task-details">
                  <span className="task-title-web3">{dynamicTitle}</span>
                  <div className="reward-container-web3">
                    <span className="reward-amount">+{(task.reward || 0).toLocaleString()}</span>
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
                    <ChevronRight size={20} color="#00ffa3" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {selectedTask && (
        <div className="popup-overlay" onClick={() => setSelectedTask(null)}>
          <div className="web3-modal animate__animated animate__zoomIn border-white/10" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedTask(null)}>×</button>

            <div className="modal-header">
              <div className="modal-icon-glow">{getSocialIcon(getDynamicDescription(selectedTask))}</div>
              <h3 className="modal-title italic font-black uppercase">{getDynamicDescription(selectedTask)}</h3>
            </div>

            <div className="modal-body">
              {/* Task 28 */}
              {selectedTask.id === "28" && (
                <div className="instruction-card bg-emerald-500/5 border-emerald-500/20 text-left">
                  <p className="text-sm mb-2 font-bold text-emerald-400">📖 MISSION BRIEF:</p>
                  <p className="text-xs text-gray-300">Film or photograph yourself reading <span className="text-white font-bold italic">"Fxckedupbags"</span>.</p>
                  <div className="bg-black/40 p-2 rounded-lg mt-3 border border-white/5">
                    <p className="text-[10px] text-emerald-500 font-mono tracking-tighter">#Fxckedupbags #SmartSnailNFT</p>
                  </div>
                  <p className="text-[10px] mt-3 text-gray-500 italic text-center w-full">
                    No book? Check <span className="text-emerald-400">Main Task 11</span>.
                  </p>
                </div>
              )}

              {/* Task 22: Secret Code */}
              {selectedTask.id === "22" ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-gray-400 mb-2 uppercase tracking-widest">Enter the X-Space Cipher</p>
                  <input
                    className="web3-input text-center font-mono tracking-[0.3em] uppercase text-blue-400 border-2 border-blue-500/20 focus:border-blue-500/50"
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="CODE_HERE"
                    disabled={loading}
                  />
                  <button className="web3-primary-btn bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]" onClick={handleRedeemCode} disabled={loading}>
                    {loading ? "Redeeming..." : "Verify Cipher"}
                  </button>
                </div>

              ) : selectedTask.id === "18" ? (
                /* Wallet */
                <div className="space-y-4">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">TON Blockchain Link</p>
                  <button
                    className={`web3-primary-btn ${isConnected ? "bg-transparent border-red-500/50 text-red-500" : ""}`}
                    onClick={() => handleWalletAction(selectedTask)}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : isConnected ? "🔌 Disconnect Wallet" : "👛 Connect Wallet"}
                  </button>
                </div>

              ) : selectedTask.isStoryTask ? (
                /* Story Task */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-left">
                    <p className="text-[10px] text-emerald-500 font-black uppercase mb-2">Step 1: Copy Caption</p>
                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 relative group">
                      <p className="text-[11px] text-gray-400 leading-normal pr-10">
                        Join the farm, pick $Shells, and Stake in Polycombat! #smartsnail #polycombat {userReferralLink}
                      </p>
                      <button
                        className="absolute top-2 right-2 p-1.5 bg-emerald-500/20 rounded-md text-emerald-400 active:scale-90"
                        onClick={() => {
                          navigator.clipboard.writeText(`Join the SmartSnail farm, pick shells, and earn SmartSnailNFT! ${userReferralLink}`);
                          alert("✅ Copied!");
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <button
                    className={`web3-primary-btn bg-gradient-to-r transition-all duration-500 ${
                      isStoryVerifying ? "from-zinc-700 to-zinc-600 animate-pulse cursor-not-allowed" : "from-emerald-600 to-emerald-400"
                    }`}
                    onClick={handleShareToStory}
                    disabled={isStoryVerifying}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isStoryVerifying ? (
                        <><span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>🔍 Verifying Post...</>
                      ) : (
                        <>📤 Step 2: Share to Story</>
                      )}
                    </div>
                  </button>
                  {isStoryVerifying && (
                    <p className="text-[10px] text-center text-gray-500 italic animate-fade-in">
                      Verifying... Stay in the app to receive reward.
                    </p>
                  )}
                </div>

              ) : selectedTask.id !== "28" && (
                /* Standard Tasks */
                <div className="space-y-3">
                  <button className="web3-secondary-btn py-4 bg-white/5 border border-white/10 text-white font-bold" onClick={() => window.open(selectedTask.link, "_blank")}>
                    🎯 Perform Mission
                  </button>
                  <button className="web3-primary-btn" onClick={handleValidateClick} disabled={loading}>
                    {loading ? "⏳ Validating..." : "✅ Claim Reward"}
                  </button>
                </div>
              )}

              {/* Feedback */}
              {message && (
                <div className={`status-msg mt-4 p-3 rounded-xl text-[11px] font-bold ${reward > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  {message}
                </div>
              )}
              {reward > 0 && (
                <div className="web3-reward-banner animate__animated animate__pulse animate__infinite">
                  🎉 +{reward.toLocaleString()} SHELLS EARNED
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