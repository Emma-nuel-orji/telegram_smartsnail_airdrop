

const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const boostRoutes = require("./app/api/purchase/boostRoutes");

dotenv.config(); // Load environment variables from .env file

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Middleware to parse JSON
app.use(express.json());
app.use('/api/purchase', bookPurchaseRoutes);
// Example route
app.get('/api/stock', (req, res) => {
  res.json({ stockDetails: "Sample Data" });
});


// Routes
app.use("/api/boost", boostRoutes);

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).send("Server is running.");
});

app.use((err, req, res, next) => {
  console.error(err.stack); // Log the full error for debugging
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ error: message });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
