import crypto from "crypto";
import axios from "axios";
import TonWeb from "tonweb";
import dotenv from "dotenv"; 


// Load environment variables
dotenv.config();

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const TON_WALLET_ADDRESS = process.env.NEXT_PUBLIC_TON_WALLET_ADDRESS ?? "";

const secretKey = process.env.SECRET_KEY!;
const TON_TESTNET_API_URL = process.env.TON_TESTNET_API_URL;
const TON_API_URL = process.env.TON_API_URL;
const TON_API_KEY = process.env.TON_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.BOT_API;
const TELEGRAM_API_URL = process.env.TELEGRAM_API_URL;

// Check environment variables
if (!TON_TESTNET_API_URL || !TON_API_KEY || !TON_WALLET_ADDRESS) {
  throw new Error("❌ Missing required environment variables for TON API");
}

/**
 * Computes the SHA256 transaction hash from a BOC.
 * @param boc - The base64-encoded BOC transaction.
 * @returns The computed transaction hash.
 */
const computeTransactionHash = (boc: string): string => {
  const bocBuffer = Buffer.from(boc, "base64");
  return crypto.createHash("sha256").update(bocBuffer).digest("hex");
};

/**
 * Fetches the raw BOC from the TON API and computes the correct hash.
 * @param transactionId - The transaction ID (not the hash).
 * @returns The correct transaction hash or null if it fails.
 */
const getTransactionHash = async (transactionId: string): Promise<string | null> => {
  try {
    const response = await axios.get(`${TON_TESTNET_API_URL}/getTransactionBOC`, {
      params: { id: transactionId, api_key: TON_API_KEY },
    });

    if (response.status !== 200 || !response.data.result) {
      console.error("🚨 Transaction BOC not found.");
      return null;
    }

    const boc = response.data.result.boc;
    return computeTransactionHash(boc);
  } catch (error) {
    console.error("❌ Error fetching transaction BOC:", error);
    return null;
  }
};

/**
 * Verifies a TON transaction using the correct hash.
 * @param transactionId - Transaction ID.
 * @param expectedAmount - Expected amount to be paid.
 * @returns Verification result.
 */
const verifyTonPayment = async (transactionId: string, expectedAmount: number) => {
  try {
    console.log("🔵 Fetching correct transaction hash...");
    const correctHash = await getTransactionHash(transactionId);
    if (!correctHash) {
      return { success: false, error: "Could not retrieve correct transaction hash." };
    }

    console.log("✅ Correct Transaction Hash:", correctHash);

    // Fetch transaction details using the computed hash
    const response = await axios.get(`${TON_TESTNET_API_URL}/getTransaction`, {
      params: { hash: correctHash, api_key: TON_API_KEY },
    });

    if (response.status !== 200 || !response.data.result) {
      return { success: false, error: "Transaction not found" };
    }

    const transaction = response.data.result;
    const receivedAmount = parseInt(transaction.amount, 10);

    const details = {
      expectedAmount,
      receivedAmount,
      expectedDestination: TON_WALLET_ADDRESS,
      actualDestination: transaction.destination,
    };

    if (transaction.destination !== TON_WALLET_ADDRESS) {
      return { success: false, error: "Destination address mismatch", details };
    }

    if (receivedAmount !== expectedAmount) {
      return { success: false, error: "Amount mismatch", details };
    }

    console.log("✅ Transaction verified:", details);
    return { success: true, details };

  } catch (error) {
    console.error("❌ Error verifying transaction:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
};



/**
 * Initiates a Flutterwave payment.
 * @param email - User's email for payment.
 * @returns Returns the Flutterwave payment link details.
 */
const initiateFlutterwavePayment = async (email: string, redirectUrl: string, paymentReference: string ): Promise<any> => {
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
  } catch (error: unknown) { 
    console.error("Error initiating Flutterwave payment:", error instanceof Error ? error.message : 'Unknown error');
    throw error; 
  }
};

/**
 * Verifies Flutterwave payment using its reference.
 * @param paymentReference - Transaction reference from Flutterwave.
 * @returns Returns true if the payment is verified.
 */
const verifyFlutterwavePayment = async (paymentReference: string): Promise<boolean> => {
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
    console.error("Error verifying Flutterwave payment:", error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};



/**
 * Initiates a Stars payment.
 * @param email - User's email for payment.
 * @param redirectUrl - URL to redirect to after payment.
 * @param amount - Payment amount (adjust as necessary).
 * @param label - Description of the item or service being purchased.
 * @returns Returns the Stars payment link details.
 */
const initiateStarsPayment = async (
  email: string,
  redirectUrl: string,
  amount: number,
  label: string
): Promise<any> => {
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
    console.error("Error initiating Stars payment:", error instanceof Error ? error.message : 'Unknown error');
    throw error; // Propagate the error for further handling
  }
};

/**
 * Verifies Stars payment using the provided reference and amount.
 * @param paymentReference - Transaction reference from Stars payment.
 * @param expectedAmount - Expected amount to be paid.
 * @returns Returns true if the payment is valid.
 */
const verifyStarsPayment = async (paymentReference: string, expectedAmount: number): Promise<boolean> => {
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
    console.error("Error verifying Stars payment:", error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

/**
 * Generates HMAC signature for payload validation.
 * @param data - The data to sign.
 * @param secretKey - The secret key used to sign the data.
 * @returns The HMAC signature.
 */
const generateHMACSignature = (data: string, secretKey: string): string => {
  return crypto.createHmac("sha256", secretKey).update(data).digest("hex");
};

/**
 * Validates a transaction using HMAC signature.
 * @param transactionData - The transaction data to validate.
 * @param receivedSignature - The HMAC signature sent by the client.
 * @param secretKey - The secret key used for validation.
 * @returns Returns true if the signature is valid.
 */
const validateTransaction = (
  transactionData: string,
  receivedSignature: string,
  secretKey: string
): boolean => {
  const expectedSignature = generateHMACSignature(transactionData, secretKey);
  return expectedSignature === receivedSignature;
};

/**
 * Verifies payment details.
 * @param paymentDetails - Payment details including wallet address, amount, signature, and reference.
 * @returns Returns true if the payment is valid.
 * @throws Throws an error if validation fails.
 */
const verifyPayment = (paymentDetails: {
  walletAddress: string;
  amount: number;
  signature: string;
  transactionReference: string;
}): boolean => {
  const { walletAddress, amount, signature, transactionReference } = paymentDetails;

  // Validate wallet address
  if (walletAddress !== TON_WALLET_ADDRESS) {
    throw new Error("Invalid wallet address.");
  }

  // Check if the payment amount is valid
  if (amount <= 0) {
    throw new Error("Invalid payment amount.");
  }

  // Validate the signature
  const dataToVerify = `${walletAddress ?? ''}:${amount}:${transactionReference}`;
  if (!validateTransaction(dataToVerify, signature, secretKey || '')) {

    throw new Error("Invalid signature.");
  }

  return true;
};

export {
  verifyTonPayment,
  initiateFlutterwavePayment,
  verifyFlutterwavePayment,
  verifyPayment,
  verifyStarsPayment,
  initiateStarsPayment,
};
