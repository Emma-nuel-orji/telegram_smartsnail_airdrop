const crypto = require("crypto");
const axios = require("axios");
const TonWeb = require("tonweb");
require("dotenv").config(); // Load environment variables

// Retrieve environment variables
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const TON_WALLET_ADDRESS = process.env.TON_WALLET_ADDRESS;
const SECRET_KEY = process.env.SECRET_KEY;
const TON_TESTNET_API_URL = process.env.TON_TESTNET_API_URL;
const TON_API_KEY = process.env.TON_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.BOT_API; 

// Initialize TonWeb with the endpoint
const tonweb = new TonWeb(
  new TonWeb.HttpProvider(TON_TESTNET_API_URL, {
    apiKey: TON_API_KEY, // Pass your API key here
  })
);

/**
 * Verifies Ton payment using the provided reference and amount.
 * @param {string} paymentReference - Transaction reference from Ton payment.
 * @param {number} expectedAmount - Expected amount to be paid.
 * @returns {Promise<boolean>} - Returns true if the payment is valid.
 */
const verifyTonPayment = async (paymentReference, expectedAmount) => {
  try {
    const response = await axios.get(`${TON_TESTNET_API_URL}/getTransaction`, {
      params: { hash: paymentReference, api_key: TON_API_KEY },
    });

    const transaction = response.data.result;

    if (!transaction) {
      throw new Error("Transaction not found.");
    }

    // Validate the transaction details
    const { amount, destination } = transaction;

    if (destination !== TON_WALLET_ADDRESS) {
      console.error("Transaction destination does not match the expected wallet address.");
      return false;
    }

    if (parseInt(amount, 10) !== expectedAmount) {
      console.error("Transaction amount does not match the expected amount.");
      return false;
    }

    console.log("Transaction verified successfully:", transaction);
    return true;
  } catch (error) {
    console.error("Error verifying Ton payment:", error.message);
    return false;
  }
};

/**
 * Initiates a Flutterwave payment.
 * @param {string} email - User's email for payment.
 * @param {string} redirectUrl - URL to redirect to after payment.
 * @returns {Promise<Object>} - Returns the Flutterwave payment link details.
 */
const initiateFlutterwavePayment = async (email, redirectUrl) => {
  try {
    const payload = {
      tx_ref: `TX-${Date.now()}`,
      amount: 3, // Payment amount in USD
      currency: "USD",
      redirect_url: redirectUrl,
      customer: {
        email,
        phonenumber: "",
        name: "Flutterwave User",
      },
      customizations: {
        title: "SMARTSNAIL BOOST",
        description: "SmartSnail marketplace book purchase",
        logo: "https://your-logo-url.com/logo.png", // Replace with your logo
      },
    };

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    if (response.status === 200 && response.data.status === "success") {
      console.log("Flutterwave payment link created successfully:", response.data.data);
      return response.data.data; // Contains the payment link
    } else {
      throw new Error("Failed to create Flutterwave payment link.");
    }
  } catch (error) {
    console.error("Error initiating Flutterwave payment:", error.message);
    throw error;
  }
};

/**
 * Verifies Flutterwave payment using its reference.
 * @param {string} paymentReference - Transaction reference from Flutterwave.
 * @returns {Promise<boolean>} - Returns true if the payment is verified.
 */
const verifyFlutterwavePayment = async (paymentReference) => {
  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${paymentReference}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    if (
      response.status === 200 &&
      response.data &&
      response.data.status === "success"
    ) {
      console.log("Flutterwave payment verified successfully:", response.data.data);
      return true;
    } else {
      throw new Error("Flutterwave payment verification failed.");
    }
  } catch (error) {
    console.error("Error verifying Flutterwave payment:", error.message);
    return false;
  }
};

/**
 * Verifies Stars payment using the provided reference and amount.
 * @param {string} paymentReference - Transaction reference from Stars payment.
 * @param {number} expectedAmount - Expected amount to be paid.
 * @returns {Promise<boolean>} - Returns true if the payment is valid.
 */
const verifyStarsPayment = async (paymentReference, expectedAmount) => {
  try {
    const response = await axios.get(`${TELEGRAM_API_URL}/getUpdates`);
  

    const payment = response.data;

    if (!payment || payment.amount !== expectedAmount) {
      console.error("Stars payment verification failed.");
      return false;
    }

    console.log("Stars payment verified successfully:", payment);
    return true;
  } catch (error) {
    console.error("Error verifying Stars payment:", error.message);
    return false;
  }
};
/**
 * Initiates a Stars payment.
 * @param {string} email - User's email for payment.
 * @param {string} redirectUrl - URL to redirect to after payment.
 * @param {number} amount - Payment amount (adjust as necessary).
 * @param {string} label - Description of the item or service being purchased.
 * @returns {Promise<Object>} - Returns the Stars payment link details.
 */
const initiateStarsPayment = async (email, redirectUrl, amount, label) => {
  try {
    // Construct the payload with payment details
    const payload = {
      amount: amount, // Payment amount
      currency: "USD", // Currency code
      email: email, // User's email
      redirect_url: redirectUrl, // URL for redirection after payment
    };

    // Make a request to the appropriate API to initiate payment (e.g., Telegram's createInvoiceLink)
    const response = await axios.post(`${TELEGRAM_API_URL}/createInvoiceLink`, {
      title: label, // Payment title (adjust as needed)
      description: "SMARTSNAIL BOOK PURCHASE", // Payment description
      payload: JSON.stringify(payload), // Custom payload data
      provider_token: process.env.PAYMENT_PROVIDER_TOKEN, // Telegram payment provider token
      currency: "USD", // Currency for the payment
      prices: [{ amount: Number(amount), label: label }], // Payment price details
    });

    if (response.status === 200 && response.data.result) {
      console.log("Stars payment link created successfully:", response.data.result);
      return response.data.result; // Contains the payment link or details
    } else {
      throw new Error("Failed to create Stars payment link.");
    }
  } catch (error) {
    console.error("Error initiating Stars payment:", error.message);
    throw error; // Propagate the error for further handling
  }
};

/**
 * Generates HMAC signature for payload validation.
 * @param {string} data - The data to sign.
 * @param {string} secretKey - The secret key used to sign the data.
 * @returns {string} - The HMAC signature.
 */
const generateHMACSignature = (data, secretKey) => {
  return crypto.createHmac("sha256", secretKey).update(data).digest("hex");
};

/**
 * Validates a transaction using HMAC signature.
 * @param {string} transactionData - The transaction data to validate.
 * @param {string} receivedSignature - The HMAC signature sent by the client.
 * @param {string} secretKey - The secret key used for validation.
 * @returns {boolean} - Returns true if the signature is valid.
 */
const validateTransaction = (transactionData, receivedSignature, secretKey) => {
  const expectedSignature = generateHMACSignature(transactionData, secretKey);
  return expectedSignature === receivedSignature;
};

/**
 * Verifies payment details.
 * @param {Object} paymentDetails - Payment details including wallet address, amount, signature, and reference.
 * @returns {boolean} - Returns true if the payment is valid.
 * @throws {Error} - Throws an error if validation fails.
 */
const verifyPayment = (paymentDetails) => {
  const { walletAddress, amount, signature, transactionReference } =
    paymentDetails;

  // Validate wallet address
  if (walletAddress !== TON_WALLET_ADDRESS) {
    throw new Error("Invalid wallet address.");
  }

  // Check if the payment amount is valid
  if (amount <= 0) {
    throw new Error("Invalid payment amount.");
  }

  // Validate the signature
  const dataToVerify = `${walletAddress}:${amount}:${transactionReference}`;
  if (!validateTransaction(dataToVerify, signature, SECRET_KEY)) {
    throw new Error("Invalid signature.");
  }

  return true;
};

module.exports = {
  verifyTonPayment,
  initiateFlutterwavePayment,
  verifyFlutterwavePayment,
  generateHMACSignature,
  validateTransaction,
  verifyPayment,
  verifyStarsPayment,
  initiateStarsPayment,
};
