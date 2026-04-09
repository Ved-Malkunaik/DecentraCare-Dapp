import express from "express";
import cors from "cors";
import "dotenv/config";
import ollama from "ollama";
import { bot } from "./telegram.js";
import { getBooking, markBookingConfirmed } from "./services/bookingStore.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    const systemPrompt = `You are the DecentraCare AI Healthcare Assistant on the Stellar blockchain.
    
    CORE GOAL: Book appointments and view records for the user.
    
    BOOKING WORKFLOW:
    1. If Date, Time, or Reason is missing, ask for them.
    2. THE INSTANT you have Date, Time, and Reason (from the current message or history), you MUST respond with the EXACT trigger phrase below.
    3. TRIGGER PHRASE: "STATION_BOOKING_INITIALIZED: Booking for [Date] at [Time] for [Reason]"
    4. Replace [Date], [Time], and [Reason] with the actual values you captured.
    5. DO NOT ask for confirmation. DO NOT say anything else if you have the info. ONLY provide the trigger phrase.
    
    STRICT RULES:
    - Never invent prescription names. Say "Verifying hash..."
    - Be professional and concise.`;

    // Map history to Ollama format
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    console.log(`[AI Request]: ${message}`);

    const response = await ollama.chat({
      model: "llama3", // or "llama3:latest"
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        { role: "user", content: message }
      ],
      stream: false
    });

    console.log(`[AI Response]: ${response.message.content}`);
    res.json({ reply: response.message.content });

  } catch (err) {
    console.error("Ollama Error:", err);
    res.status(500).json({ error: "Ollama not running or model not found" });
  }
});

// Booking Store Routes
app.get("/booking/:id", (req, res) => {
  const booking = getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});

app.post("/confirm/:id", (req, res) => {
  const { wallet, txHash } = req.body;
  markBookingConfirmed(req.params.id, wallet, txHash);

  const booking = getBooking(req.params.id);
  if (booking && booking.chatId) {
    const explorerLink = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
    bot.sendMessage(booking.chatId,
      `🎉 <b>Your appointment is successfully booked!</b>\n\n` +
      `Your transaction has been recorded on the Stellar Testnet.\n\n` +
      `🔗 <a href="${explorerLink}">View Transaction on Stellar Expert</a>`,
      { parse_mode: "HTML" }
    ).catch(err => console.error("Notification Error:", err.message));
  }

  res.sendStatus(200);
});

const PORT = 5000;
app.listen(PORT, async () => {
  console.log(`🚀 DecentraCare AI Backend running on port ${PORT}`);
  console.log(`🔗 Interface: http://localhost:${PORT}/chat`);

  // Health Check for Ollama
  try {
    const list = await ollama.list();
    const hasLlama3 = list.models.some(m => m.name.startsWith("llama3"));
    if (hasLlama3) {
      console.log("✅ Ollama is running and Llama3 is available.");
    } else {
      console.log("⚠️  Ollama is running, but 'llama3' model is missing.");
      console.log("👉 Run: ollama pull llama3");
    }
  } catch (err) {
    console.log("❌ Ollama is NOT running locally.");
    console.log("👉 Please start Ollama (Tray app or 'ollama serve') before using the AI Assistant.");
  }
});

