"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Task = {
  id: number;
  description: string;
  completed: boolean;
  reward: number;
  section: 'main' | 'daily' | 'partners';
  image: string;
  link: string;
};

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, description: 'Main Task 1', completed: false, reward: 1000000, section: 'main', image: '/images/tasks/smartsnail telegram.png', link: 'https://socialmedia.com/profile1' },
    { id: 2, description: 'Main Task 2', completed: false, reward: 500000, section: 'main', image: '/images/daily/join discord.png', link: 'https://socialmedia.com/profile1' },
    { id: 3, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/smartsnail instagram.png' , link: 'https://socialmedia.com/profile1'},
    { id: 4, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/smartsnail thread.png', link: 'https://socialmedia.com/profile1' },
    { id: 5, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/smartsnail tiktok.png', link: 'https://socialmedia.com/profile1' },
    { id: 6, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/smartsnail twitter.png', link: 'https://socialmedia.com/profile1' },
    { id: 7, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/smartsnail youtube.png', link: 'https://socialmedia.com/profile1' },
    { id: 8, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/smartsnail medium.png' , link: 'https://socialmedia.com/profile1'},
    { id: 9, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/invite friend.png' , link: 'https://socialmedia.com/profile1'},
    { id: 10, description: 'Main Task 2', completed: false, reward: 300000, section: 'main', image: '/images/daily/human relations.png', link: 'https://socialmedia.com/profile1' },
    { id: 11, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/fuckedupbags.png' , link: 'https://socialmedia.com/profile1'},

    { id: 12, description: 'Main Task 2', completed: false, reward: 300000, section: 'main', image: '/images/tasks/web3chino facebook.png', link: 'https://socialmedia.com/profile1' },
    { id: 13, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/web3chino instagram.png', link: 'https://socialmedia.com/profile1' },
    { id: 14, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/web3chino thread.png', link: 'https://socialmedia.com/profile1' },
    { id: 15, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/web3chino tiktok.png' , link: 'https://socialmedia.com/profile1'},
    { id: 16, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/web3chino twitter.png', link: 'https://socialmedia.com/profile1' },
    { id: 17, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/web3chino youtube.png' , link: 'https://socialmedia.com/profile1'},
    { id: 18, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/connect wallet.png' , link: '/wallet'},
    { id: 19, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/Alex Telegam.png', link: 'https://socialmedia.com/profile1' },

    { id: 20, description: 'Main Task 2', completed: false, reward: 300000, section: 'main', image: '/images/tasks/alex twitter.png', link: 'https://socialmedia.com/profile1' },
    { id: 21, description: 'Main Task 3', completed: false, reward: 200000, section: 'main', image: '/images/tasks/alex youtube.png', link: 'https://socialmedia.com/profile1' },

    
    { id: 22, description: 'Daily Task 3', completed: false, reward: 300000, section: 'daily', image: '/images/daily/join twitter everyday.png', link: 'https://socialmedia.com/profile1' },
    { id: 23, description: 'Daily Task 4', completed: false, reward: 300000, section: 'daily', image: '/images/daily/LCR thread.png', link: 'https://socialmedia.com/profile1' },
    { id: 24, description: 'Daily Task 5', completed: false, reward: 300000, section: 'daily', image: '/images/daily/LCS facebook.png', link: 'https://socialmedia.com/profile1' },
    { id: 25, description: 'Daily Task 5', completed: false, reward: 300000, section: 'daily', image: '/images/daily/LCS instagram.png', link: 'https://socialmedia.com/profile1' },
    { id: 26, description: 'Daily Task 5', completed: false, reward: 300000, section: 'daily', image: '/images/daily/LCS Tiktok.png' , link: 'https://socialmedia.com/profile1'},
    { id: 27, description: 'Daily Task 5', completed: false, reward: 300000, section: 'daily', image: '/images/daily/RCT Twitter.png', link: 'https://socialmedia.com/profile1' },
    { id: 28, description: 'Daily Task 5', completed: false, reward: 300000, section: 'daily', image: '/images/daily/read Fxckedupbags.png', link: 'https://socialmedia.com/profile1' },
    { id: 29, description: 'Daily Task 5', completed: false, reward: 300000, section: 'daily', image: '/images/daily/RR Medium.png' , link: 'https://socialmedia.com/profile1'},
    { id: 30, description: 'Daily Task 5', completed: false, reward: 300000, section: 'daily', image: '/images/daily/share on telegram story.png', link: 'https://socialmedia.com/profile1' },
    { id: 31, description: 'Daily Task 5', completed: false, reward: 300000, section: 'daily', image: '/images/daily/watch youtube.png', link: 'https://socialmedia.com/profile1' },

    { id: 32, description: 'Partner Task 1', completed: false, reward: 300000, section: 'partners', image: '/images/tasks/partners1.png', link: 'https://socialmedia.com/profile1' },
    
    
    
    // Add more tasks as needed
  ]);

  // const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  // const [validationAttempt, setValidationAttempt] = useState(0);
  
  // const [selectedSection, setSelectedSection] = useState<'main' | 'daily' | 'partners'>('main');
  // // const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // const handleValidateClick = () => {
  //   if (validationAttempt === 0) {
  //     alert("Error while validating. Make sure to perform your task before validating.");
  //     setValidationAttempt(1);
  //   } else if (validationAttempt === 1) {
  //     setTasks(tasks.map(task => 
  //       task.id === selectedTask?.id ? { ...task, completed: true } : task
  //     ));
  //     alert("Task validated successfully! Reward has been added.");
  //     setSelectedTask(null); // Close the popup
  //   }
  // };

  // const handleTaskClick = (task: Task) => {
  //   setSelectedTask(task);
  // };

  // const filteredTasks = tasks.filter((task) => task.section === selectedSection);



  // Load completed tasks from localStorage on mount
  useEffect(() => {
    const storedCompletedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    const updatedTasks = tasks.map(task =>
      storedCompletedTasks.includes(task.id) ? { ...task, completed: true } : task
    );
    setTasks(updatedTasks);
  }, []);


  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [selectedSection, setSelectedSection] = useState<'main' | 'daily' | 'partners'>('main');

  // const handleValidateClick = () => {
  //   if (validationAttempt === 0) {
  //     alert("Error while validating. Make sure to perform your task before validating.");
  //     setValidationAttempt(1);
  //   } else if (validationAttempt === 1) {
  //     setTasks(tasks.map(task => 
  //       task.id === selectedTask?.id ? { ...task, completed: true } : task
  //     ));
  //     alert("Task validated successfully! Reward has been added.");
  //     setSelectedTask(null); // Close the popup
  //     setValidationAttempt(0); // Reset validation for future tasks
  //   }
  // };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setValidationAttempt(0); // Reset for each task click
  };

  const filteredTasks = tasks.filter((task) => task.section === selectedSection);


  // main task here 


  // Load completed tasks from localStorage on mount
  useEffect(() => {
    const storedCompletedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    const updatedTasks = tasks.map(task =>
      storedCompletedTasks.includes(task.id) ? { ...task, completed: true } : task
    );
    setTasks(updatedTasks);
  }, []);

  const handleValidateClick = () => {
    if (validationAttempt === 0) {
      alert("Error while validating. Make sure to perform your task before validating.");
      setValidationAttempt(1);
    } else if (validationAttempt === 1 && selectedTask) {
      const updatedTasks = tasks.map(task =>
        task.id === selectedTask.id ? { ...task, completed: true } : task
      );

      // Update tasks in state and store completed task IDs in localStorage
      setTasks(updatedTasks);
      const completedTaskIds = updatedTasks
        .filter(task => task.completed)
        .map(task => task.id);
      localStorage.setItem('completedTasks', JSON.stringify(completedTaskIds));
      
      alert("Task validated successfully! Reward has been added.");
      setSelectedTask(null);
      setValidationAttempt(0);
    }
  };

  const completedTasks = tasks.filter(task => task.completed);


  return (
    <div className="task-container" style={{ width: '100%' }}>
      <Link href="/"><img src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back" /></Link>

      {/* <Link href="/">
      
        <a className="back-arrow">&#8592;</a>
      </Link> */}
      <h2>Complete Tasks to Earn Rewards!</h2>
      

      <div className="task-buttons">
        <button onClick={() => setSelectedSection('main')} className={`task-button ${selectedSection === 'main' ? 'active' : ''}`}>Main Tasks</button>
        <button onClick={() => setSelectedSection('daily')} className={`task-button ${selectedSection === 'daily' ? 'active' : ''}`}>Daily</button>
        <button onClick={() => setSelectedSection('partners')} className={`task-button ${selectedSection === 'partners' ? 'active' : ''}`}>Partners</button>
      </div>

      <div className="tasks-display">
        {filteredTasks.map((task) => (
          <div key={task.id} className="task-containers" style={{ width: '100%' }}>
            <div className="referral-invite-boxs" onClick={() => handleTaskClick(task)}>
              <img src={task.image} width="100%" alt={task.description} />
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <div className="task-popup">
        <button className="close-button" onClick={() => setSelectedTask(null)}>X</button>
        <img src={selectedTask.image} width="100%" alt={selectedTask.description} />
        <p>{selectedTask.description}</p>
        <div className="popup-buttons">
          <button onClick={() => window.open(selectedTask.link, '_blank')}>Perform Task</button>
          <button onClick={handleValidateClick}>Validate and Reward</button>
        </div>
      </div>
      )}

<div className="tasks-display">
      <h3>Completed Tasks</h3>
      {completedTasks.map(task => (
        <div key={task.id} className="task-containers" style={{ width: '100%' }}>
        
          <div className="referral-invite-boxs">
          <img src={task.image} width="100%" alt={task.description} />
          </div>
        </div>
      ))}
    </div>
    </div>
  );
};

export default Tasks;








// 'use client';

// import { useState } from 'react';
// import Link from 'next/link';
// // import './task.css';

// type Task = {
//   id: number;
//   description: string;
//   completed: boolean;
//   reward: number;
// };

// const Tasks: React.FC = () => {
//   const [tasks, setTasks] = useState<Task[]>([
//     { id: 1, description: 'Invite 3 friends', completed: false, reward: 1000000 },
//     { id: 2, description: 'Play the game for 10 minutes', completed: false, reward: 500000 },
//     { id: 3, description: 'Share on social media', completed: false, reward: 200000 },
//   ]);

//   const [totalCoins, setTotalCoins] = useState(0);
//   const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
//   const [openDropdowns, setOpenDropdowns] = useState<number[]>([]);

//   const handleComplete = (taskId: number) => {
//     const completedTask = tasks.find((task) => task.id === taskId);
//     if (completedTask) {
//       setTotalCoins((prevTotal) => prevTotal + completedTask.reward);
//       setCompletedTasks((prevCompleted) => [...prevCompleted, completedTask]);
//       setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
//     }
//   };

//   const toggleDropdown = (taskId: number) => {
//     if (openDropdowns.includes(taskId)) {
//       setOpenDropdowns(openDropdowns.filter((id) => id !== taskId));
//     } else {
//       setOpenDropdowns([...openDropdowns, taskId]);
//     }
//   };

//   const isDropdownOpen = (taskId: number) => openDropdowns.includes(taskId);

//   return (
//     <div className="task-container">
//       <h2>Complete Tasks to Earn Rewards!</h2>
//       <Link href="/">
//         <a className="back-arrow">&#8592;</a>
//       </Link>

//       <h3>Season One</h3>

//       {tasks.map((task) => (
//         <div key={task.id} className="task-containers">
//           <div className="referral-invite-boxs" onClick={() => toggleDropdown(task.id)}>
//             <img src="/images/daily.png" width={44} height={44} alt="Daily task icon" />
//             <div>
//               <p>{task.description}</p>
//               <div className="coin flex">
//                 <img src="/images/coin.png" width={24} height={24} alt="Coin icon" />
//                 <span className="ml-1">+{task.reward.toLocaleString()}</span>
//               </div>
//             </div>
//             <span className="dropdown-arrow">{isDropdownOpen(task.id) ? '▲' : '▼'}</span>
//           </div>

//           {isDropdownOpen(task.id) && (
//             <div className="dropdown-content">
//               <p>Details: {task.description} and earn {task.reward.toLocaleString()} coins!</p>
//               <button onClick={() => handleComplete(task.id)}>Complete Task</button>
//             </div>
//           )}
//         </div>
//       ))}

//       <h3>Completed Tasks</h3>
//       {completedTasks.map((task) => (
//         <div key={task.id} className="referral-invite-box">
//           <img src="/images/daily.png" width={44} height={44} alt="Completed task icon" />
//           <div>
//             <p>{task.description}</p>
//             <div className="coin flex">
//               <img src="/images/coin.png" width={24} height={24} alt="Coin icon" />
//               <span className="ml-1">+{task.reward.toLocaleString()}</span>
//             </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default Tasks;



// import { useState } from 'react';
// import Link from 'next/link';
// import './task.css';
 
// // Import your images appropriately

// type Task = {
//   id: number;
//   description: string;
//   completed: boolean;
//   reward: number;
// };

// const Tasks: React.FC = () => {
//   const [tasks, setTasks] = useState<Task[]>([
//     { id: 1, description: 'Invite 3 friends', completed: false, reward: 1000000 },
//     { id: 2, description: 'Play the game for 10 minutes', completed: false, reward: 500000 },
//     { id: 3, description: 'Share on social media', completed: false, reward: 200000 },
//   ]);

//   const [totalCoins, setTotalCoins] = useState(0);
//   const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
//   const [openDropdowns, setOpenDropdowns] = useState<number[]>([]);

//   const handleComplete = (taskId: number) => {
//     const completedTask = tasks.find((task) => task.id === taskId);
//     if (completedTask) {
//       setTotalCoins((prevTotal) => prevTotal + completedTask.reward);
//       setCompletedTasks((prevCompleted) => [...prevCompleted, completedTask]);
//       setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
//     }
//   };

//   const toggleDropdown = (taskId: number) => {
//     if (openDropdowns.includes(taskId)) {
//       setOpenDropdowns(openDropdowns.filter((id) => id !== taskId));
//     } else {
//       setOpenDropdowns([...openDropdowns, taskId]);
//     }
//   };

//   const isDropdownOpen = (taskId: number) => openDropdowns.includes(taskId);

//   return (
//     <div className="task-container">
//       <h2>Complete Tasks to Earn Rewards!</h2>
//       <Link href="/" className="back-arrow">
//         &#8592;
//       </Link>

//       <h3>Season One</h3>

//       {tasks.map((task) => (
//         <div key={task.id} className="task-containers">
//           <div className="referral-invite-boxs" onClick={() => toggleDropdown(task.id)}>
//             <img src="/images/daily.png" width={44} height={44} />
//             <div>
//               <p>{task.description}</p>
//               <div className="coin flex">
//                 <img src="/images/coin.png" width={24} height={24} />
//                 <span className="ml-1">+{task.reward.toLocaleString()}</span>
//               </div>
//             </div>
//             <span className="dropdown-arrow">{isDropdownOpen(task.id) ? '▲' : '▼'}</span>
//           </div>

//           {isDropdownOpen(task.id) && (
//             <div className="dropdown-content">
//               <p>Details: {task.description} and earn {task.reward.toLocaleString()} coins!</p>
//               <button onClick={() => handleComplete(task.id)}>Complete Task</button>
//             </div>
//           )}
//         </div>
//       ))}

//       <h3>Completed Tasks</h3>
//       {completedTasks.map((task) => (
//         <div key={task.id} className="referral-invite-box">
//           <img src="/images/daily.png" width={44} height={44} />
//           <div>
//             <p>{task.description}</p>
//             <div className="coin flex">
//               <img src="/images/coin.png" width={24} height={24} />
//               <span className="ml-1">+{task.reward.toLocaleString()}</span>
//             </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default Tasks;

