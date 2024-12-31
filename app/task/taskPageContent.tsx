"use client";
import WebApp from "@twa-dev/sdk";
import React, { useState, useEffect } from "react";
import "./task.css";
import Link from "next/link";
import dynamic from 'next/dynamic';

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

// Updated Task interface with story sharing properties
interface Task {
  id: number;
  description: string;
  completed: boolean;
  section: "main" | "daily" | "partners";
  type: "daily" | "permanent";
  image: string;
  link: string;
  completedTime?: string | null;
  batchId?: string;
  mediaUrl?: string;
  isStoryTask?: boolean;
  mediaType?: string;
  reward?: number;
}

// FallingShellsEffect Component (unchanged)
const FallingShellsEffect: React.FC<{ trigger: boolean; onComplete: () => void }> = ({
  trigger,
  onComplete,
}) => {
  type Shell = {
    id: number;
    left: number;
    duration: number;
  };

  const [shells, setShells] = useState<Shell[]>([]);

  useEffect(() => {
    if (trigger) {
      const newShells: Shell[] = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        duration: 2 + Math.random() * 2
      }));

      setShells(newShells);

      const timeout = setTimeout(() => {
        setShells([]);
        onComplete();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [trigger, onComplete]);

  return (
    <div className="falling-shells-container">
      {shells.map((shell) => (
        <div
          key={shell.id}
          className="shell"
          style={{
            left: `${shell.left}%`,
            animationDuration: `${shell.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

// Main TaskPageContent Component
const TaskPageContent: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, description: "Main Task 1", completed: false, reward: 5000, section: "main", type: "permanent", image: "/images/tasks/smartsnail telegram.png", link: "https://t.me/smartsnails", completedTime: null },
    { id: 2, description: 'Main Task 2', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/daily/join discord.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 3, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail instagram.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 4, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail thread.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 5, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail tiktok.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 6, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail twitter.png', link: 'https://x.com/SmartSnail_NFT?t=YXkXoCWpGUBKQ9u_zqfC4g&s=09', completedTime: null },
    { id: 7, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail youtube.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 8, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/smartsnail medium.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 9, description: 'Main Task 3', completed: false, reward: 5000, section: 'main', type: 'permanent', image: '/images/tasks/invite friend.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 10, description: 'Main Task 2', completed: false, reward: 70000, section: 'main', type: 'permanent', image: '/images/daily/human relations.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 11, description: 'Main Task 3', completed: false, reward: 100000, section: 'main', type: 'permanent', image: '/images/tasks/fuckedupbags.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 12, description: 'Main Task 2', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino facebook.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 13, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino instagram.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 14, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino thread.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 15, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino tiktok.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 16, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino twitter.png', link: 'https://x.com/Nonsoweb3?t=sS-KKVwkz3C_stZqs8syzA&s=09', completedTime: null },
    { id: 17, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/web3chino youtube.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 18, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/connect wallet.png', link: '/wallet', completedTime: null },
    { id: 19, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/Alex Telegam.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 20, description: 'Main Task 2', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/alex twitter.png', link: 'https://x.com/CaptainSage_?t=EZ0s5eeh1igkYDym_M_U-Q&s=09', completedTime: null },
    { id: 21, description: 'Main Task 3', completed: false, reward: 10000, section: 'main', type: 'permanent', image: '/images/tasks/alex youtube.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 22, description: 'Daily Task 3', completed: false, section: 'daily', type: 'daily', image: '/images/daily/join twitter everyday.png', link: 'https://socialmedia.com/profile1', batchId: 'batch_2024_001', completedTime: null },
    { id: 23, description: 'Daily Task 4', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/LCR thread.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 24, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/LCS facebook.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 25, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/LCS instagram.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 26, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/LCS Tiktok.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 27, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/RCT Twitter.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 28, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/read Fxckedupbags.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 29, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/RR Medium.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 30, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/share on telegram story.png', link: 'https://socialmedia.com/profile1',  mediaUrl: 'https://your-video-url.mp4', // Replace with your video URL
      mediaType: 'video' , isStoryTask: true, completedTime: null },
    { id: 31, description: 'Daily Task 5', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/watch youtube.png', link: 'https://socialmedia.com/profile1', completedTime: null },
    { id: 32, description: 'Partner Task 1', completed: false, reward: 3000, section: 'partners', type: 'permanent', image: '/images/tasks/partners1.png', link: 'https://socialmedia.com/profile1', completedTime: null},
  

  ]);  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [selectedSection, setSelectedSection] = useState<"main" | "daily" | "partners">("main");
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [message, setMessage] = useState<string>("");
  const [reward, setReward] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    WebApp.ready();
    const userId = WebApp.initDataUnsafe?.user?.id;
    setTelegramId(userId || null);
  }, []);

  const taskData: Task[] = [
    {
      id: 22,
      description: "Join X(Twitter) Space",
      image: "/images/daily/join twitter everyday.png",
      batchId: "batch_2024_001",
      completed: false,
      section: "daily",
      type: "daily",
      link: "https://x.com/some_space",
      completedTime: null,
    },
  ];

  // Filter tasks based on the selected section
  
  const filteredTasks = tasks.filter((task) => task.section === selectedSection);
  useEffect(() => {
    const storedCompletedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
    const storedPoints = parseInt(localStorage.getItem("totalPoints") || "0", 10);
    const updatedTasks = tasks.map((task) =>
      storedCompletedTasks.includes(task.id) ? { ...task, completed: true } : task
    );
    setTasks(updatedTasks);
    setTotalPoints(storedPoints);
  }, []);

  useEffect(() => {
    const updateDailyTasks = () => {
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.type === "daily" && task.completed && task.completedTime) {
            const taskCompletionTime = new Date(task.completedTime).getTime();
            const currentTime = Date.now();
            const timeDifference = currentTime - taskCompletionTime;
  
            if (timeDifference > 20 * 60 * 60 * 1000) {
              return { ...task, completed: false, completedTime: null };
            }
          }
          return task;
        })
      );
    };
  
    updateDailyTasks();
    const intervalId = setInterval(updateDailyTasks, 60 * 60 * 1000);
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
    setValidationAttempt((prevAttempt) => prevAttempt + 1);
  
    if (validationAttempt === 0) {
      alert("Please complete the task before validating.");
      return;
    }
  
    if (validationAttempt === 1) {
      alert("Bruuh!!, you haven't performed the task yet.");
    } else if (validationAttempt >= 2 && selectedTask) {
      try {
        const response = await fetch("/api/tasks/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: selectedTask.id,
            reward: selectedTask.reward,
          }),
        });
  
        if (response.ok) {
          const updatedTasks = tasks.map((task) =>
            task.id === selectedTask.id
              ? { ...task, completed: true, completedTime: new Date().toISOString() }
              : task
          );
          setTasks(updatedTasks);
  
          setTotalPoints((prev) => {
            const reward = selectedTask.reward ?? 0; // Use 0 if reward is undefined
            const newPoints = prev + reward;
            localStorage.setItem("totalPoints", newPoints.toString());
            return newPoints;
          });
          
  
          const completedTaskIds = updatedTasks
            .filter((task) => task.completed)
            .map((task) => task.id);
          localStorage.setItem("completedTasks", JSON.stringify(completedTaskIds));
  
          setTaskCompleted(true);
          setSelectedTask(null);
          setValidationAttempt(0);
        } else {
          const errorData = await response.json();
          alert(errorData.message || "Something went wrong. Please try again.");
        }
      } catch (error) {
        console.error("Error completing task:", error);
        alert("Failed to connect to the server. Please try again.");
      }
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
            src="/images/info/output-onlinepngtools (6).png"
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
            className={`task-card ${task.completed ? 'completed' : ''}`}
            onClick={() => !task.completed && handleTaskClick(task)}
          >
            <div className="task-image-container">
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
                  disabled={loading}
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
                    🎉 You earned: {reward} coins!
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

      <FallingShellsEffect
        trigger={taskCompleted}
        onComplete={() => setTaskCompleted(false)}
      />
    </div>
  );
};

export default TaskPageContent;