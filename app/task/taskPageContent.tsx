"use client";
import WebApp from "@twa-dev/sdk";
import React, { useState, useEffect, useMemo } from "react";
import "./task.css";
import Link from "next/link";
import confetti from 'canvas-confetti';
import { useWallet } from '../context/walletContext';
import type { Task } from '@/types';

const TASK_IDS = {
  WALLET: "18",
  CODE_REDEEM: "22",
  BOOK_TASK: "28"
};

const TaskPageContent: React.FC = () => {
  // --- State ---
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", description: "Join Telegram Channel", completed: false, reward: 5000, section: "main", type: "permanent", image: "/images/tasks/smartsnail telegram.png", link: "https://t.me/smartsnails", completedTime: null },
    { id: "18", description: 'Connect Web3 Wallet', completed: false, reward: 10000, section: 'main', type: 'flexible', image: '/images/tasks/connect wallet.png', link: '', completedTime: null },
    { id: "22", description: 'Daily Code Redemption', completed: false, reward: 2500, section: 'daily', type: 'daily', image: '/images/daily/join twitter everyday.png', link: '', batchId: 'Batch 10', completedTime: null },
    { id: "30", description: 'Share Snail to Story', completed: false, reward: 5000, section: 'daily', type: 'daily', image: '/images/daily/share on telegram story.png', link: '', mediaUrl: '/videos/speedsnail.mp4', isStoryTask: true, completedTime: null },
  ]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedSection, setSelectedSection] = useState<"main" | "daily" | "partners">("main");
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [inputCode, setInputCode] = useState("");
  const { connect, disconnect, isConnected } = useWallet();

  // FIX FOR ERROR: Argument of type 'number | undefined' is not assignable to 'number'
  const telegramId = WebApp.initDataUnsafe?.user?.id;
  const userReferralLink = telegramId ? `https://t.me/smartsnailbot?start=${telegramId}` : `https://t.me/smartsnailbot`;

  // --- Logic: Initialization ---
  useEffect(() => {
    WebApp.ready();
    const storedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
    const storedPoints = Number(localStorage.getItem("totalPoints")) || 0;

    setTasks(prev => prev.map(t => 
      storedTasks.includes(t.id) && t.type !== 'flexible' ? { ...t, completed: true } : t
    ));
    setTotalPoints(storedPoints);
  }, []);

  const filteredTasks = useMemo(() => 
    tasks.filter(t => t.section === selectedSection), 
    [tasks, selectedSection]
  );

  const updatePoints = (reward: number) => {
    setTotalPoints(prev => {
      const next = prev + reward;
      localStorage.setItem("totalPoints", next.toString());
      return next;
    });
  };

  const handleTaskClick = (task: Task) => {
    if (task.active === false) return;
    setSelectedTask(task);
    setValidationAttempt(0);
    setInputCode("");
  };

  const handleValidate = async () => {
    if (!selectedTask || validationAttempt < 2) {
      setValidationAttempt(prev => prev + 1);
      WebApp.showAlert(validationAttempt === 0 ? "Perform the task first!" : "We can't verify this yet. Try again in a moment.");
      return;
    }

    setLoading(true);
    try {
      const success = true; 
      if (success) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, completed: true } : t));
        updatePoints(selectedTask.reward || 0);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
        setSelectedTask(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStoryShare = () => {
    // FIX FOR ERROR: All declarations of 'Telegram' must have identical modifiers
    // We cast to 'any' here locally to bypass the conflicting global.d.ts definition
    const tgWindow = (window as any).Telegram?.WebApp;
    
    if (!tgWindow?.shareToStory || !selectedTask?.mediaUrl) {
      WebApp.showAlert("Story sharing not supported on this version.");
      return;
    }

    const fullUrl = `${window.location.origin}${selectedTask.mediaUrl}`;
    
    tgWindow.shareToStory(
      fullUrl,
      "video",
      `Join SmartSnail! ${userReferralLink}`,
      { 
        url: `${window.location.origin}/stickers/snail.png`, 
        width: 150, 
        height: 150, 
        position: { x: 0.5, y: 0.5 } 
      }
    );
    
    WebApp.showAlert("Verify your story in 15 minutes to claim shells!");
  };

  return (
    <div className="task-container">
      {/* Header */}
      <div className="task-header-premium">
        <Link href="/"><img src="/images/info/left-arrow.png" alt="back" className="back-btn" /></Link>
        <div className="balance-display">
          <span>{totalPoints.toLocaleString()}</span>
          <small>SHELLS</small>
        </div>
      </div>

      <h2 className="section-title">Earn Shells</h2>

      {/* Tabs */}
      <div className="task-tabs">
        {(['main', 'daily', 'partners'] as const).map(tab => (
          <button 
            key={tab}
            className={selectedSection === tab ? "active" : ""} 
            onClick={() => setSelectedSection(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid/List */}
      <div className="tasks-list">
        {filteredTasks.map(task => (
          <div 
            key={task.id} 
            className={`task-card-new ${task.completed && task.type !== 'flexible' ? 'done' : ''}`}
            onClick={() => handleTaskClick(task)}
          >
            <img src={task.image} alt="" className="task-thumb" />
            <div className="task-body">
              <p className="task-name">{task.description}</p>
              <p className="task-prize">+{task.reward} shells</p>
            </div>
            {task.completed && <span className="status-icon">✓</span>}
          </div>
        ))}
      </div>

      {/* Universal Popup */}
      {selectedTask && (
        <div className="popup-overlay" onClick={() => setSelectedTask(null)}>
          <div className="task-popup" onClick={e => e.stopPropagation()}>
            <button className="close-x" onClick={() => setSelectedTask(null)}>×</button>
            <h3>{selectedTask.description}</h3>
            
            <div className="popup-content">
              {selectedTask.id === TASK_IDS.CODE_REDEEM ? (
                <input 
                  type="text" 
                  placeholder="Enter secret code" 
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  className="premium-input"
                />
              ) : selectedTask.isStoryTask ? (
                <p className="caption-hint">Copy: Join the farm! {userReferralLink}</p>
              ) : (
                <button className="action-btn main" onClick={() => window.open(selectedTask.link, '_blank')}>
                  Perform Task
                </button>
              )}

              <button 
                className="action-btn secondary" 
                onClick={selectedTask.isStoryTask ? handleStoryShare : handleValidate}
                disabled={loading}
              >
                {loading ? "Checking..." : "Verify & Claim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPageContent;