import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, ShieldCheck, Trash2, ClipboardList } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useWallet } from '../context/WalletContext';
import { sorobanService } from '../services/sorobanService';
import dbService from '../services/supabaseService';

export default function AIAssistant() {
  const { stellarAddress } = useWallet();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello 👋 I am your DecentraCare AI assistant. You can ask me to book appointments or view prescriptions...'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [verifiedRecord, setVerifiedRecord] = useState(null);
  const [showBookingConfirm, setShowBookingConfirm] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessageToAI = async (message, history) => {
    const res = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, history })
    });

    const data = await res.json();
    return data.reply;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // 🚩 BUG FIX: If wallet is not connected, respond with a connection request and stop.
    if (!stellarAddress) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: "To book appointments or view medical records, you need to connect your wallet first. Please use the 'Connect Wallet' button in the header." }]);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      // Filter out system_action and messages where content is not a string (e.g. success cards)
      const chatHistory = messages.filter(m => m.role !== 'system_action' && typeof m.content === 'string');
      const reply = await sendMessageToAI(userMessage, chatHistory);

      // 1. Detect Prescription ID in request or reply
      const hashRegex = /[0-9a-f]{16,}/i;
      const foundHash = userMessage.match(hashRegex) || reply.match(hashRegex);

      if (foundHash) {
        const record = await dbService.verifyPrescription(foundHash[0]);
        if (record) {
          setMessages(prev => [...prev, {
            role: 'system_action',
            content: "VERIFIED_RECORD_CARD",
            meta: record
          }]);
          setLoading(false);
          return; // Skip adding the textual reply
        }
      }

      // If no special card to show, show the normal reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // 2. Detect History Requests
      if (reply.toLowerCase().includes("fetching your medical history") || reply.toLowerCase().includes("view prescriptions")) {
        setMessages(prev => [...prev, { role: 'system_action', content: "FETCHING_PRESCRIPTIONS" }]);
        const data = await dbService.getConsultationsByPatient(stellarAddress);
        setPrescriptions(data || []);
      }

      // 3. Detect Booking Requests — Robust Parsing
      if (reply.includes("STATION_BOOKING_INITIALIZED")) {
        try {
          // Flexible regex to capture Date, Time, and Reason regardless of spacing/delimiters
          const dateMatch = reply.match(/Booking for (.*?) at/i);
          const timeMatch = reply.match(/at (.*?) for/i);
          const reasonMatch = reply.match(/for (.*)/i);

          const dateStr = dateMatch?.[1]?.trim();
          const timeStr = timeMatch?.[1]?.trim();
          let reasonStr = reasonMatch?.[1]?.trim();

          // Clean up reason Str if it contains trailing dots/spaces
          if (reasonStr) {
            reasonStr = reasonStr.replace(/[.]*$/, '').trim();
          }

          // Safety check: NO brackets allowed (indicates AI placeholders)
          const isRealData = dateStr && !dateStr.includes("[") && timeStr && !timeStr.includes("[");

          if (isRealData) {
            setMessages(prev => [...prev, {
              role: 'system_action',
              content: "BOOKING_WIDGET",
              meta: {
                date: dateStr,
                time: timeStr,
                reason: reasonStr || "Medical Checkup",
                doctor: "DR_VIJAY_GHF"
              }
            }]);
          }
        } catch (e) {
          console.error("Booking parsing failed:", e);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: AI not responding. Make sure Ollama and backend are running." }]);
    }
    setLoading(false);
  };

  const handleBookLive = async (date, time, reason) => {
    if (!stellarAddress) return alert("Connect wallet first!");
    setLoading(true);
    try {
      // For this demo assistant, we can use an authorized doctor address
      const DOCTOR_ADDR = "GDK7TWNN3H57JWZBBC4V3BQNI3NTHSUDEVDZB5DGPPCULFJRIP3APG42";

      // 1. Commit to Blockchain
      const txResult = await sorobanService.bookAppointment(stellarAddress, DOCTOR_ADDR);
      const txHash = txResult.hash || "latest";

      // 2. Sync with Database so it shows in Doctor Dashboard
      await dbService.insertAppointment({
        patient_wallet: stellarAddress,
        doctor_wallet: DOCTOR_ADDR,
        date: date,
        reason: reason || "Automated AI Assistant Booking",
        is_simulated: false
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (
          <div className="space-y-4">
            <div className="text-emerald-400 font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Appointment Booked Successfully!
            </div>
            <p>Your appointment for {date} at {time} has been confirmed on the Stellar Blockchain.</p>
            <div className="flex flex-wrap gap-3 mt-4">
              <a
                href={txHash ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : `https://stellar.expert/explorer/public/account/${DOCTOR_ADDR}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-cyan-400 hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                View Transaction on Stellar Expert
              </a>
            </div>
          </div>
        )
      }]);
    } catch (e) {
      alert("Booking failed: " + e.message);
    }
    setLoading(false);
  };

  const clearChat = () => {
    if (window.confirm("Clear all messages?")) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hello 👋 I am your DecentraCare AI assistant. You can ask me to book appointments, view prescriptions, or verify medicines.'
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-6xl mx-auto w-full animate-in fade-in duration-700">
      {/* 🚀 HEADER SECTION */}
      <div className="text-center space-y-2 mb-4 shrink-0 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-1">
          <Sparkles className="w-3 h-3" /> Virtual Health AI
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">AI Healthcare Assistant</h1>
        <p className="text-slate-400 text-sm font-medium">Book appointments, view prescriptions, or verify medicines using AI.</p>
      </div>

      {/* 🧾 CHAT HISTORY AREA */}
      <Card className="flex-1 flex flex-col bg-slate-900/40 border-slate-800 shadow-2xl relative overflow-hidden p-0 rounded-3xl">
        <div className="absolute top-0 right-0 p-4 z-10">
          <button
            onClick={clearChat}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-400 transition-all border border-transparent hover:border-rose-400/20"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar pb-36">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${msg.role === 'user'
                ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 border-slate-700 shadow-lg shadow-slate-950/50'
                }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-cyan-400" />}
              </div>

              <div className={`max-w-[85%] p-5 rounded-3xl text-[15px] leading-relaxed shadow-xl ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : msg.role === 'system_action'
                  ? 'bg-transparent border-none p-0 w-full'
                  : 'bg-slate-800/90 text-slate-100 border border-slate-700 rounded-tl-none backdrop-blur-sm'
                }`}>
                {msg.role === 'system_action' ? (
                  <div className="space-y-4 animate-in zoom-in duration-500">
                    {msg.content === "FETCHING_PRESCRIPTIONS" && prescriptions.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {prescriptions.map((p, i) => (
                          <div key={i} className="p-4 bg-slate-900 border border-cyan-500/20 rounded-2xl flex items-center justify-between">
                            <div>
                              <div className="text-[10px] text-cyan-400 font-black uppercase mb-1">Prescription</div>
                              <div className="text-white font-bold">{p.doctor_name || "Doctor"} — {p.specialization || "MD"}</div>
                            </div>
                            <div className="text-[9px] text-slate-500 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.content === "VERIFIED_RECORD_CARD" && (
                      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                        {/* Green Accent Bar */}
                        <div className="h-1.5 w-full bg-emerald-500" />

                        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
                          {/* Icon Block */}
                          <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center p-3 shadow-inner">
                            <ClipboardList className="w-full h-full text-emerald-400" />
                          </div>

                          {/* Main Info */}
                          <div className="flex-1 space-y-4">
                            <div>
                              <h3 className="text-xl font-black text-white tracking-tight">Verified Medical Record</h3>
                              <p className="text-[10px] text-slate-500 font-mono break-all mt-1">{msg.meta?.prescription_id}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                              <div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Medication</div>
                                <div className="text-slate-100 font-bold italic antialiased">{msg.meta?.medication}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Diagnosis / Instructions</div>
                                <div className="text-slate-100 font-bold italic antialiased">{msg.meta?.diagnosis}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.content === "BOOKING_WIDGET" && (
                      <div className="p-6 bg-cyan-950/20 border border-cyan-500/30 rounded-3xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <div className="text-white font-bold text-lg">Blockchain Checkup Request</div>
                            <div className="text-cyan-400/70 text-xs font-mono uppercase">Date: {msg.meta?.date} • Time: {msg.meta?.time}</div>
                          </div>
                        </div>
                        <Button variant="primary" onClick={() => handleBookLive(msg.meta?.date, msg.meta?.time, msg.meta?.reason)} className="rounded-xl px-8">Confirm on Stellar</Button>
                      </div>
                    )}
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-4 animate-in fade-in duration-300">
              <div className="w-11 h-11 rounded-2xl bg-slate-800 border-slate-700 flex items-center justify-center shrink-0 shadow-lg shadow-slate-950/50">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="bg-slate-800/50 text-slate-400 p-5 rounded-3xl rounded-tl-none border border-slate-800 flex items-center gap-3 italic text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Assistant is typing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ⌨️ MESSAGE INPUT AREA */}
        <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-slate-900 via-slate-950/90 to-transparent border-t border-slate-800/20">
          <form
            onSubmit={handleSendMessage}
            className="relative flex items-center group"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything (e.g. I want to book an appointment)"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-5 pr-16 py-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium placeholder:text-slate-600"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40"
            >
              {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </form>
          <div className="flex justify-center mt-3 gap-6">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
              <AlertCircle className="w-3 h-3 text-amber-500/50" /> Experimental Prototype
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
              <ShieldCheck className="w-3 h-3 text-emerald-500/50" /> Privacy Protected
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
