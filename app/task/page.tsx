

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Task = {
  id: number;
  description: string;
  completed: boolean;
  reward: number;
};

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, description: 'Invite 3 friends', completed: false, reward: 1000000 },
    { id: 2, description: 'Play the game for 10 minutes', completed: false, reward: 500000 },
    { id: 3, description: 'Share on social media', completed: false, reward: 200000 },
  ]);

  const [totalCoins, setTotalCoins] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [selectedTask]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleComplete = (taskId: number) => {
    const completedTask = tasks.find((task) => task.id === taskId);
    if (completedTask) {
      setTotalCoins((prevTotal) => prevTotal + completedTask.reward);
      setCompletedTasks((prevCompleted) => [...prevCompleted, completedTask]);
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      setSelectedTask(null);
    }
  };

  return (
    <div className="task-container" style={{ width: '100%' }}>
      <h2>Complete Tasks to Earn Rewards!</h2>
      <Link href="/">
        <a className="back-arrow">&#8592;</a>
      </Link>

      <h3>Season One</h3>

      {tasks.map((task) => (
        <div key={task.id} className="task-containers" style={{ width: '100%' }}>
          <div className="referral-invite-boxs" onClick={() => handleTaskClick(task)}>
            <img src="/images/tasks/Alex Telegam.png" width="100%" alt="Task preview" />
          </div>
        </div>
      ))}

      <h3>Completed Tasks</h3>
      {completedTasks.map((task) => (
        <div key={task.id} className="referral-invite-box">
          <img src="/images/daily.png" width={44} height={44} alt="Completed task icon" />
          <div>
            <p>{task.description}</p>
            <div className="coin flex">
              <img src="/images/coin.png" width={24} height={24} alt="Coin icon" />
              <span className="ml-1">+{task.reward.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Animated Pop-up for task details */}
      {selectedTask && (
        <div className={`task-popup ${showPopup ? 'show' : 'hide'}`}>
          <p>{selectedTask.description}</p>
          <button onClick={() => handleComplete(selectedTask.id)}>Complete Task</button>
          <button onClick={() => setSelectedTask(null)}>Close</button>
        </div>
      )}
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

