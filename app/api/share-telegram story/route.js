const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
const PORT = 5000;

app.use(bodyParser.json());


// Your Telegram bot token and endpoint
const TELEGRAM_API_URL = `https://api.telegram.org/bot<YOUR_BOT_TOKEN>`;

// Function to check if a user has shared content (you may need to track user interaction here)
const checkTelegramShare = async (userId) => {
  try {
    // Get updates from the bot
    const response = await axios.get(`${TELEGRAM_API_URL}/getUpdates`);
    const updates = response.data.result;

    // Check if any update matches the user ID and contains a story share
    for (let update of updates) {
      if (update.message && update.message.from.id === userId && update.message.text.includes('Join SmartSnail')) {
        return true; // Return true if the user shared a story
      }
    }

    return false; // Return false if no story share was found
  } catch (error) {
    console.error('Error checking Telegram share:', error);
    return false;
  }
};

// Validate Task 30 (share on Telegram story)
app.post('/api/validate-task', async (req, res) => {
  const { taskId, userId } = req.body;

  if (taskId === 30) {
    // Check if the user has shared the video
    const userShared = await checkTelegramShare(userId);

    // If shared, update task completion
    if (userShared) {
      res.json({ validated: true });
    } else {
      res.json({ validated: false });
    }
  } else {
    res.json({ validated: true });
  }
});

// Update task completion in the database
app.post('/api/update-task', async (req, res) => {
  const { taskId, userId, completed } = req.body;

  try {
    // Update the task status in the database using Prisma
    await prisma.task.update({
      where: { id: taskId },
      data: {
        completed: completed,
        completedTime: completed ? new Date() : null,
      },
    });

    // Return success response
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating task in database:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
