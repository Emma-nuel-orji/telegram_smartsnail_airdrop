"use client";
import WebApp from "@twa-dev/sdk";
import React, { useState, useEffect } from "react";
import "./task.css";
import Link from "next/link";
import dynamic from 'next/dynamic';
import type { Task } from '@/types';
import confetti from 'canvas-confetti';
import { useWallet } from '../context/walletContext';

interface ShowStoryOptions {
  media: string;
  mediaType: 'photo' | 'video';
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

// Update the WebApp type definition
declare global {
  interface TelegramWebApp extends Omit<typeof WebApp, 'showStory'> {
    showStory(options: ShowStoryOptions): Promise<void>;
  }
}



// Main TaskPageContent Component
const TaskPageContent: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, description: "Main Task 1", completed: false, reward: 5000, section: "main", type: "permanent", image: "/images/tasks/smartsnail telegram.png", link: "https://t.me/smartsnails", completedTime: null },
    { id: 2, description: 'Main Task 2', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/daily/join discord.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 3, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail instagram.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 4, description: 'Main Task 4', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail thread.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 5, description: 'Main Task 5', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail tiktok.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 6, description: 'Main Task 6', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail twitter.png', link: 'https://x.com/SmartSnail_NFT?t=YXkXoCWpGUBKQ9u_zqfC4g&s=09', completedTime: null },
    { id: 7, description: 'Main Task 7', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail youtube.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 8, description: 'Main Task 8', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail medium.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 9, description: 'Main Task 9', completed: false, reward: 5000, section: 'main', type: 'permanent', image: '/images/tasks/invite friend.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 10, description: 'Main Task 10', completed: false, reward: 70000, section: 'main', type: 'permanent', image: '/images/daily/human relations.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 11, description: 'Main Task 11', completed: false, reward: 100000, section: 'main', type: 'permanent', image: '/images/tasks/fuckedupbags.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 12, description: 'Main Task 12', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino facebook.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 13, description: 'Main Task 13', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino instagram.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 14, description: 'Main Task 14', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino thread.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 15, description: 'Main Task 15', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino tiktok.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 16, description: 'Main Task 16', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino twitter.png', link: 'https://x.com/Nonsoweb3?t=sS-KKVwkz3C_stZqs8syzA&s=09', completedTime: null },
    { id: 17, description: 'Main Task 17', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino youtube.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 18, description: 'Main Task 18', completed: false, reward: 10000, section: 'main', type: 'flexible', image: '/images/tasks/connect wallet.png', link: '', completedTime: null },
    { id: 19, description: 'Main Task 19', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/Alex Telegam.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 20, description: 'Main Task 20', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/alex twitter.png', link: 'https://x.com/CaptainSage_?t=EZ0s5eeh1igkYDym_M_U-Q&s=09', completedTime: null },
    { id: 21, description: 'Main Task 21', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/alex youtube.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 22, description: 'Daily Task 1', completed: false, section: 'daily', type: 'daily', image: '/images/daily/join twitter everyday.png', link: 'https://socialmedia.com/profile1', batchId: 'batch_2024_001', completedTime: null },
    { id: 23, description: 'Daily Task 2', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/LCR thread.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 24, description: 'Daily Task 3', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/LCS facebook.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 25, description: 'Daily Task 4', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/LCS instagram.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 26, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/LCS Tiktok.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 27, description: 'Daily Task 6', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/RCT Twitter.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 28, description: 'Daily Task 7', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/read Fxckedupbags.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 29, description: 'Daily Task 8', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/RR Medium.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 30, description: 'Daily Task 9', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/share on telegram story.png', link: 'https://socialmedia.com/profile1',  mediaUrl: '/videos/speedsnail.mp4', // Replace with your video URL
      mediaType: 'video' , isStoryTask: true, completedTime: null },
    { id: 31, description: 'Daily Task 10', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/watch youtube.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 32, description: 'Partner Task 1', completed: false, reward: 3000, section: 'partners', type: 'permanent', image: '/images/tasks/partners1.png', link: 'https://socialmedia.com/profile1', completedTime: null},
  
    


  ]);
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
  
 


  useEffect(() => {
    WebApp.ready();
    const userId = WebApp.initDataUnsafe?.user?.id;
    setTelegramId(userId || null);
  }, []);

  // const taskData: Task[] = [
  //   {
  //     id: 22,
  //     description: "Join X(Twitter) Space",
  //     image: "/images/daily/join twitter everyday.png",
  //     batchId: "batch_2024_001",
  //     completed: false,
  //     section: "daily",
  //     type: "daily",
  //     link: "https://x.com/some_space",
  //     completedTime: null,
  //   },
  // ];

  // Filter tasks based on the selected section

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
  if (selectedTask?.id === 18) {
    // Use a specific localStorage key for wallet rewards
    const hasBeenRewardedBefore = localStorage.getItem('wallet_connect_rewarded') === 'true';
    setHasBeenRewarded(hasBeenRewardedBefore);
  }
}, [selectedTask]);

  const handleTaskCompleted = (taskId: number, reward: number) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { 
              ...task, 
              completed: ![18, 22].includes(taskId),
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
        const newPoints = prevPoints + reward;
        localStorage.setItem("totalPoints", newPoints.toString());
        return newPoints;
      });
    }
  };
  
  
  
  // Modified handleWalletAction function
  const handleWalletAction = async () => {
    if (!selectedTask) return;
  
    try {
      setLoading(true);
  
      if (isConnected) {
        await disconnect();
        setWalletStatus(false); 
        localStorage.removeItem("wallet_connected"); // Remove stored status
  
        setTaskCompleted(false);
        if (selectedTask.id === 18) {
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === 18 ? { ...task, completed: false, completedTime: null } : task
            )
          );
        }
        return;
      }
  
      await connect();
      setWalletStatus(true); 
      localStorage.setItem("wallet_connected", "true"); // Persist connection status
  
      if (selectedTask.id === 18) {
        setTaskCompleted(true);
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === 18
              ? { ...task, completed: true, completedTime: new Date().toISOString() }
              : task
          )
        );
  
  
        const walletRewardKey = 'wallet_connect_rewarded';
        const hasBeenRewardedBefore = localStorage.getItem(walletRewardKey) === 'true';
  
        if (!hasBeenRewardedBefore) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          localStorage.setItem(walletRewardKey, 'true');
  
          try {
            const response = await fetch("/api/tasks/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskId: selectedTask.id,
                reward: selectedTask.reward ?? 0,
                telegramId: WebApp.initDataUnsafe?.user?.id,
              }),
            });
  
            if (!response.ok) throw new Error('Failed to record reward on server');
  
            handleTaskCompleted(18, selectedTask.reward ?? 0);
          } catch (error) {
            console.error("Failed to record wallet connection reward:", error);
            localStorage.removeItem(walletRewardKey);
            setMessage("Failed to record reward. Please try again.");
          }
        }
      }
    } catch (error) {
      console.error("Wallet interaction error:", error);
      setMessage("Failed to connect wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

// Modified useEffect for checking initial reward status
useEffect(() => {
  if (selectedTask?.id === 18) {
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
    if (!task.completed) {
      setSelectedTask(task);
      setValidationAttempt(0);
      setMessage("");
    }
  };

  const handleShareToStory = async () => {
    if (!selectedTask || !telegramId) {
      WebApp.showAlert("Something went wrong. Please try again.");
      return;
    }
  
    // Type guard for mediaUrl at the beginning
    if (!selectedTask.mediaUrl) {
      WebApp.showAlert("Invalid media URL. Please try again.");
      return;
    }
  
    setSharing(true);
    try {
      if (WebApp.isVersionAtLeast('6.9')) {
        // Generate a unique tracking ID for this share
        const trackingId = `${telegramId}-${Date.now()}`;
        
        // Create the story with referral link
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const referralLink = `${appUrl}?ref=${telegramId}&track=${trackingId}`;
        
        // Create story with both media and sticker
        await (WebApp as unknown as TelegramWebApp).showStory({
          media: selectedTask.mediaUrl, // Now we know this is defined
          mediaType: 'video',
          sticker: {
            url: referralLink,
            width: 100,
            height: 100,
            position: { x: 0.5, y: 0.9 }
          }
        });
        
        // Store response in a let variable so we can check it later
        let storyResponse;
        try {
          storyResponse = await fetch("/api/share-telegram-story/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: selectedTask.id,
              telegramId: telegramId,
              reward: selectedTask.reward,
              trackingId: trackingId
            }),
          });
        } catch (error) {
          throw new Error("Failed to send story share data to server");
        }
  
        if (storyResponse.ok) {
          const updatedTasks = tasks.map((task) =>
            task.id === selectedTask.id
              ? { ...task, completed: true, completedTime: new Date().toISOString() }
              : task
          );
          setTasks(updatedTasks);
  
          setTotalPoints((prev) => {
            const reward = selectedTask.reward ?? 0; 
            const newPoints = prev + reward;
            localStorage.setItem("totalPoints", newPoints.toString());
            return newPoints;
          });
  
          const completedTaskIds = updatedTasks
            .filter((task) => task.completed)
            .map((task) => task.id);
          localStorage.setItem("completedTasks", JSON.stringify(completedTaskIds));
  
          triggerConfetti();

          setTaskCompleted(true);
          setSelectedTask(null);
  
          WebApp.showPopup({
            title: "Success!",
            message: `Congratulations! You earned ${selectedTask.reward} shells!`,
            buttons: [{ type: "ok" }]
          });
        } else {
          throw new Error("Failed to complete task");
        }
      } else {
        WebApp.showAlert("Please update your Telegram app to use this feature.");
      }
    } catch (error) {
      console.error("Error sharing to story:", error);
      WebApp.showAlert("Failed to share story. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  // Existing validation handler
  
  const handleValidateClick = async () => {
    // Increment validation attempt
    setValidationAttempt((prevAttempt) => prevAttempt + 1);
  
    if (!selectedTask) {
      alert("No task selected.");
      return;
    }
  
    // Check if the task has already been completed
    if (selectedTask.completed) {
      alert("Task has already been completed.");
      return;
    }
  
    // Warn on first two attempts
    if (validationAttempt < 4) {
      alert("Please complete the task before validating.");
      return;
    }

    
  
    // Get Telegram user ID from WebApp
    const telegramId = WebApp.initDataUnsafe?.user?.id;
    if (!telegramId) {
      alert("Could not verify Telegram user. Please try again.");
      return;
    }
  
    try {
      const taskId = String(selectedTask.id);
  
      console.log('Attempting to complete task:', selectedTask);
  
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
  
        throw new Error(errorMessage);
      }
  
      const data = await response.json();
  
      // Update local state and points
      const updatedTasks = tasks.map((task) =>
        task.id === selectedTask.id
          ? {
              ...task,
              completed: true,
              completedTime: new Date().toISOString(),
            }
          : task
      );
      setTasks(updatedTasks);
  
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
  
      // Trigger confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000); // Show confetti for 5 seconds
  
      // Reset UI state
      setTaskCompleted(true);
      setSelectedTask(null);
      setValidationAttempt(0);
  
    } catch (error: unknown) {
      console.error("Error completing task:", error);
  
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
  
      alert(
        errorMessage.includes("Invalid task ID")
          ? "There was a problem with the task data. Please try again or refresh the page."
          : `Failed to complete task: ${errorMessage}`
      );
    }
  };
  

  // Existing code redemption handler
  const handleRedeemCode = async () => {
    if (!inputCode) {
      setMessage("Please enter a valid code.");
      return;
    }
  
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        const response = await fetch("/api/redeemCodeTask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: inputCode,
            telegramId,
            batchId: selectedTask?.batchId,
          }),
        });
  
        const data = await response.json();
        
        triggerConfetti();

        if (response.ok) {
          setReward(data.reward);
          setUserPoints((prevPoints) => prevPoints + data.reward);
          setMessage(data.message || `You received ${data.reward} coins!`);
        } else {
          setMessage(data.error || "Redemption failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error redeeming code:", error);
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
      setInputCode("");
    }
  };


  return (
    <div className="task-container">
      <div className="task-header">
        <Link href="/">
          <img
            src="/images/info/left-arrow.png" 
            width={40}
            height={40}
            alt="back"
          />
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

      <div className="tasks-grid">
        {filteredTasks.map((task) => (
         <div
         key={task.id}
         className={`task-card ${task.completed && task.type !== 'flexible' ? 'completed' : ''}`}
         onClick={() => (task.type === 'flexible' || !task.completed) && handleTaskClick(task)}
       >
       
            <div>
              <img src={task.image} alt={task.description} className="task-image" />
              {task.completed && (
                <div className="checkmark-overlay">
                  <span className="checkmark">✓</span>
                </div>
              )}
            </div>
            <div className="task-info">
              <p className="task-description">{task.description}</p>
              <p className="task-reward">Reward: {task.reward} shells</p>
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <div className="popup-overlay">
          <div className="task-popup">
            <button 
              className="popup-close" 
              onClick={() => setSelectedTask(null)}
            >
              ×
            </button>
            
            <p className="popup-description">{selectedTask.description}</p>

            {selectedTask.id === 22 ? (
              <>
                <input
                  className="popup-input"
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Insert unique code"
                  disabled={loading}
                />
                <button 
                  className="popup-button"
                  onClick={handleRedeemCode} 
                  disabled={loading || (selectedTask.completed && selectedTask.id !== 22)}
                >
                  {loading ? "Redeeming..." : "Redeem Code"}
                </button>
                {message && (
                  <p className={`popup-message ${reward > 0 ? 'success' : ''}`}>
                    {message}
                  </p>
                )}
                {reward > 0 && (
                  <p className="popup-message reward">
                    🎉 You earned: {reward} shells!
                  </p>
                )}
              </>
            ) : selectedTask.id === 18 ? (
              <>
                <button 
                  className="popup-button"
                  onClick={handleWalletAction}
                  disabled={loading || (selectedTask.completed && selectedTask.id !== 18)}
                >
                  {loading ? "Processing..." : walletStatus ? "Disconnect Wallet" : "Connect Wallet"}
                </button>
                {message && (
                  <p className={`popup-message ${reward > 0 ? 'success' : ''}`}>
                    {message}
                  </p>
                )}
              </>
            ) : selectedTask.isStoryTask ? (
              <button 
                className="popup-button"
                onClick={handleShareToStory}
                disabled={sharing}
              >
                {sharing ? "Sharing..." : "Share to Story"}
              </button>
            ) : (
              <>
                <button 
                  className="popup-button"
                  onClick={() => window.open(selectedTask.link, "_blank")}
                >
                  Perform Task
                </button>
                <button 
                  className="popup-button"
                  onClick={handleValidateClick}
                >
                  Validate and Reward
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPageContent;

function setShowConfetti(arg0: boolean) {
  throw new Error("Function not implemented.");
}
