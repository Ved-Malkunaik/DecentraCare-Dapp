import TelegramBot from "node-telegram-bot-api";
import { createPendingBooking } from "./services/bookingStore.js";

const token = "8576736347:AAHpy4gaU91jT8bpmgszSGRvNn0DZ8R7cRQ";
export const bot = new TelegramBot(token, { polling: true });

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.toLowerCase().trim();

  if (!text) return;

  // 1. Handle Greetings
  if (text === "hi" || text === "hello" || text === "/start") {
    return bot.sendMessage(chatId, 
      "<b>Welcome to DecentraCare</b> 👋\n\nHow can I help you today?",
      { parse_mode: "HTML" }
    );
  }

  // 2. Handle Booking Intent
  if (text.includes("book an appointment") || text.includes("book appointment")) {
    return bot.sendMessage(chatId,
      "Please use the format to book an appointment:\n\n" +
      "<code>Date, Time, Reason</code>\n\n" +
      "Example: <code>15/05, 4 PM, Medical consultation</code>",
      { parse_mode: "HTML" }
    );
  }

  // 3. Handle Booking Data (Parts split by comma)
  const parts = msg.text.split(",");
  
  if (parts.length >= 3) {
    const rawDate = parts[0].replace(/[()]/g, "").trim();
    const rawTime = parts[1].trim();
    const rawReason = parts[2].replace(/[()]/g, "").trim();

    const booking = createPendingBooking({
      name: "Stellar Patient",
      date: rawDate,
      time: rawTime,
      reason: rawReason,
      chatId: chatId 
    });

    const frontendURL = process.env.FRONTEND_URL || "https://decentra-care-dapp.vercel.app";
    const dappURL = `${frontendURL}/confirm-booking?bookingId=${booking.id}`;

    // We send as HTML first, and if Telegram 400s (due to localhost button restriction), 
    // we fallback to plain text which allows localhost links.
    const response = `<b>✅ Details Received!</b>\n\n` +
                     `<b>📅 Date:</b> ${rawDate}\n` +
                     `<b>⏰ Time:</b> ${rawTime}\n` +
                     `<b>📝 Reason:</b> ${rawReason}\n\n` +
                     `Click below to securely confirm this on the Stellar blockchain:`;

    return bot.sendMessage(chatId, response, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "Confirm Appointment & Sign", url: dappURL }
        ]]
      }
    }).catch(err => {
        // This is the common path for localhost testing
        bot.sendMessage(chatId, 
            `<b>✅ Details Received!</b>\n\n` +
            `Your appointment is ready. Click the link below to sign on the ledger:\n\n` +
            `${dappURL}`,
            { parse_mode: "HTML" }
        );
    });
  } else {
    // 4. Handle unrecognized input (only if it doesn't look like a command or greeting)
    const greetings = ["hi", "hello", "hey", "start"];
    if (!greetings.includes(text) && !text.includes("book")) {
        // Optional: you could just ignore random talk, but let's give a friendly tip
        return bot.sendMessage(chatId, "I'm here to help. To book a checkup, just say 'book appointment' or 'book an appointment'.");
    }
  }
});

console.log("Telegram Bot (DecentraCare_Bot) is running with Intent-Based Flow...");


