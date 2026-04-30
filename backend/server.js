import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { GoogleGenerativeAI } from "@google/generative-ai";
import { bot } from "./telegram.js";
import { getBooking, markBookingConfirmed } from "./services/bookingStore.js";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    const systemPrompt = `You are the DecentraCare AI Healthcare Assistant on the Stellar blockchain.
    
    ABOUT DECENTRACARE:
    - DecentraCare is a privacy-first, decentralized healthcare dApp built on the Stellar Soroban network.
    - It empowers patients to fully own their medical data and book appointments without central intermediaries.
    - Key Features:
      • Self-Sovereign Identity: Health records stay in your wallet, not a central database.
      • Direct Booking: P2P scheduling with physicians via Soroban smart contracts.
      • Immutable Records: Prescriptions are signed on-chain, making them tamper-proof.
      • Granular Privacy: You control who can access your history and for how long.
 
    WHY CHOOSE DECENTRACARE (Advantages):
    - Absolute Data Privacy: Your medical history is encrypted and accessible only by you and your chosen providers.
    - Cryptographic Trust: Trust is enforced by the Stellar ledger, not by corporate promises.
    - Cost Efficient: Using Stellar means transactions cost near-zero fees.
    - No Single Point of Failure: Being decentralized means your records are always available and secure from hacking.
 
    TECHNICAL FAQ:
    - Wallet: We use the Freighter Wallet. You must be on the "Stellar Testnet".
    - Soroban: This is Stellar's smart contract platform. It ensures our healthcare logic is secure and transparent.
    - Costs: For this demo on Testnet, all operations are free. However, in production, they cost fractions of a cent ($XLM).
    - AI Assistant: I can help you book appointments. Just tell me the date, time, and reason!
 
    CORE GOAL: Book appointments and view records for the user.
    
    BOOKING WORKFLOW:
    1. If Date, Time, or Reason is missing, ask for them.
    2. THE INSTANT you have Date, Time, and Reason (from the current message or history), you MUST respond with the EXACT trigger phrase below.
    3. TRIGGER PHRASE: "STATION_BOOKING_INITIALIZED: Booking for [Date] at [Time] for [Reason]"
    4. Replace [Date], [Time], and [Reason] with the actual values you captured.
    5. DO NOT ask for confirmation. DO NOT say anything else if you have the info. ONLY provide the trigger phrase.
    
    STRICT RULES:
    - If asked about "DecentraCare" or "Why choose us", answer based on the sections above using concise, professional, point-wise formatting.
    - Never invent prescription names. Say "Verifying hash..."
    - Be professional and helpful.`;

    // Map history to Gemini format
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    console.log(`[AI Request]: ${message}`);

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "Context: " + systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I am the DecentraCare AI Healthcare Assistant on Stellar. I will help users book appointments and view records following your strict rules." }] },
        ...formattedHistory
      ]
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    console.log(`[AI Response]: ${reply}`);
    res.json({ reply });

  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "AI Assistant temporarily unavailable" });
  }
});

// Booking Store Routes
app.get("/booking/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`[API] Fetching booking details for: ${id}`);
  
  try {
    const booking = await getBooking(id);
    if (!booking) {
      console.warn(`[API] Booking ${id} not found.`);
      return res.status(404).json({ error: "Booking record not found in database." });
    }
    res.json(booking);
  } catch (err) {
    console.error(`[API] Error fetching booking ${id}:`, err.message);
    res.status(500).json({ error: "Server error while retrieving booking." });
  }
});

app.post("/confirm/:id", async (req, res) => {
  const { wallet, txHash } = req.body;
  await markBookingConfirmed(req.params.id, wallet, txHash);

  const booking = await getBooking(req.params.id);
  if (booking && booking.chat_id) {
    const explorerLink = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
    bot.sendMessage(booking.chat_id,
      `🎉 <b>Your appointment is successfully booked!</b>\n\n` +
      `Your transaction has been recorded on the Stellar Testnet.\n\n` +
      `🔗 <a href="${explorerLink}">View Transaction on Stellar Expert</a>`,
      { parse_mode: "HTML" }
    ).catch(err => console.error("Notification Error:", err.message));
  }

  res.sendStatus(200);
});

// --- Global Fallbacks ---
app.use((req, res) => {
  res.status(404).json({ error: "API path not found", path: req.url });
});

app.use((err, req, res, next) => {
  console.error("[Backend Error]", err.stack);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`
  🚀 DecentraCare AI Backend Running on port ${PORT}
  📡 API URL: http://localhost:${PORT}
  `);

  // --- Supabase Realtime listener for cross-device support ---
  const { supabase } = await import("./services/supabase.js");
  
  supabase
    .channel('telegram_confirmations')
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'telegram_bookings',
      filter: 'status=eq.confirmed_onchain'
    }, (payload) => {
      const booking = payload.new;
      if (booking && booking.chat_id && booking.tx_hash) {
        console.log(`[Realtime] Sending auto-confirmation to Chat ID: ${booking.chat_id}`);
        const explorerLink = `https://stellar.expert/explorer/testnet/tx/${booking.tx_hash}`;
        bot.sendMessage(booking.chat_id,
          `🎉 <b>Your appointment is successfully booked!</b>\n\n` +
          `Your transaction has been recorded on the Stellar Testnet.\n\n` +
          `🔗 <a href="${explorerLink}">View Transaction on Stellar Expert</a>`,
          { parse_mode: "HTML" }
        ).catch(err => console.error("Notification Error:", err.message));
      }
    })
    .subscribe();

  // Health Check for API Keys
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is missing! AI Chat will not work.");
  }
});



