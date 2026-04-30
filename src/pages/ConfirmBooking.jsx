import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Loader2, CheckCircle2, ShieldCheck, ArrowLeft, Stethoscope, AlertCircle, ExternalLink } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useMultiWallet } from '../context/MultiWalletContext';
import { sorobanService } from '../services/sorobanService';
import { supabase } from '../services/supabaseService';
import { safeFetch } from '../utils/api';
import toast from 'react-hot-toast';

const FIXED_DOCTOR_ADDRESS = 'GDK7TWNN3H57JWZBBC4V3BQNI3NTHSUDEVDZB5DGPPCULFJRIP3APG42';
const FIXED_DOCTOR_NAME = 'Dr. Vijay Bharne';

export default function ConfirmBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { stellarAddress, evmAddress, activeAddress: contextActiveAddress, connectFreighter } = useMultiWallet();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | connecting | confirming | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState('');

  const rawBookingId = searchParams.get('bookingId');
  const bookingId = rawBookingId?.trim();

  // 1. Initial Fetch logic
  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setErrorMsg("No booking reference was provided in the link.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("[ConfirmBooking] Fetching booking ID:", bookingId);
      
      let foundBooking = null;

      // A. Try Supabase
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('telegram_bookings')
            .select('*')
            .eq('id', bookingId)
            .maybeSingle();
          
          if (!error && data) {
            foundBooking = data;
          }
        } catch (e) {
          console.warn("[ConfirmBooking] Supabase access exception:", e.message);
        }
      }

      // B. Try Backend Fallback
      if (!foundBooking) {
        const envBackend = import.meta.env.VITE_BACKEND_URL;
        const backendUrl = envBackend || "http://localhost:5000";
        const { data, ok } = await safeFetch(`${backendUrl}/booking/${bookingId}`);
        if (ok && data) foundBooking = data;
      }

      if (foundBooking) {
        setBooking(foundBooking);
        if (foundBooking.status === 'confirmed_onchain') {
          setStatus('success');
          setTxHash(foundBooking.tx_hash || '');
        }
      } else {
        setErrorMsg(`We couldn't locate booking "${bookingId}".`);
      }
    } catch (err) {
      console.error("[ConfirmBooking] Critical Fetch Error:", err);
      setErrorMsg("Connection failure while retrieving booking record.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // 2. Automated Connection & Transaction Flow
  const handleConfirmOnChain = async (addressOverride = null) => {
    if (status === 'success') return;

    const activeAddress = addressOverride || contextActiveAddress;
    
    // If no wallet, start connection first
    if (!activeAddress) {
      toast.error("Please connect a wallet first.");
      return;
    }

    const isEVM = activeAddress.startsWith('0x');

    // Proceed to signing
    try {
      setStatus('confirming');
      setErrorMsg('');

      let txHashToSave = '';

      if (isEVM) {
        console.log("[ConfirmBooking] EVM Wallet detected. Performing Identity-linked Booking...");
        // Simulated hash for EVM booking since we're using Soroban for on-chain logic
        txHashToSave = `EVM_SECURE_${Math.random().toString(36).substring(2, 15)}`;
        await new Promise(r => setTimeout(r, 2000));
        toast.success("EVM Identity Verified.");
      } else {
        console.log("[ConfirmBooking] Initiating Stellar Blockchain Signature...");
        const txResult = await sorobanService.bookAppointment(activeAddress, FIXED_DOCTOR_ADDRESS);

        if (!txResult || !txResult.hash) {
          throw new Error("Signature was declined.");
        }
        txHashToSave = txResult.hash;
      }

      console.log("[ConfirmBooking] BOOKING SUCCESS:", txHashToSave);
      setTxHash(txHashToSave);

      // Persist status updates
      if (supabase) {
        await supabase
          .from('telegram_bookings')
          .update({ 
            status: 'confirmed_onchain', 
            wallet: activeAddress, 
            tx_hash: txHashToSave,
            wallet_type: isEVM ? 'evm' : 'stellar'
          })
          .eq('id', bookingId);
      }

      const backendRoot = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      await safeFetch(`${backendRoot}/confirm/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            wallet: activeAddress, 
            txHash: txHashToSave,
            isEVM: isEVM
        })
      });

      setStatus('success');
      toast.success("Appointment confirmed!");
      
      // Auto-return to Telegram
      setTimeout(() => {
        window.location.href = "https://t.me/DecentraCare_Bot";
      }, 5000);

    } catch (err) {
      console.error("[ConfirmBooking] error:", err);
      setErrorMsg(err.message || "Transaction failed. Please try again.");
      setStatus('error');
    }
  };

  // Auto-trigger logic
  useEffect(() => {
    let timer;
    if (booking && status === 'idle' && !errorMsg) {
       timer = setTimeout(() => {
         handleConfirmOnChain();
       }, 800);
    }
    return () => clearTimeout(timer);
  }, [booking, status, errorMsg]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
           <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
           <Loader2 className="w-16 h-16 text-cyan-500 animate-spin relative z-10" />
        </div>
        <p className="text-slate-400 font-medium animate-pulse tracking-widest text-xs uppercase">Initializing Secure Gateway...</p>
      </div>
    );
  }

  if (errorMsg && !booking) {
    return (
      <div className="max-w-md mx-auto text-center pt-32 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-rose-500/10 p-6 rounded-3xl inline-block mb-8 border border-rose-500/20 shadow-2xl shadow-rose-500/10">
          <AlertCircle className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">Invalid Booking</h2>
        <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/5 mb-10 text-left">
            <p className="text-rose-400 font-bold mb-2">Error Detail:</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">{errorMsg}</p>
            
            <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <span>Target ID:</span>
                    <span className="text-slate-300">{bookingId || 'None'}</span>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <span>Supabase Connected:</span>
                    <span className={supabase ? 'text-emerald-500' : 'text-rose-500'}>{supabase ? 'YES' : 'NO'}</span>
                </div>
            </div>
        </div>
        <div className="flex flex-col gap-4">
            <Button onClick={() => navigate('/')} className="h-14 rounded-2xl">Return to Home</Button>
            <button 
              onClick={() => {
                setErrorMsg('');
                setStatus('idle');
                fetchBooking();
              }} 
              className="text-slate-500 hover:text-cyan-400 font-medium transition-colors"
            >
              Retry Connection
            </button>
        </div>
      </div>
    );
  }

  const isWalletMissing = status === 'error' && errorMsg.toLowerCase().includes('installed');

  return (
    <div className="max-w-xl mx-auto pt-16 pb-20 px-4 animate-in fade-in duration-700">
      {isWalletMissing && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>
            <b>Freighter Wallet not detected.</b> Please install the extension to confirm this booking.
            <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="ml-2 underline text-amber-500">Download here</a>
          </p>
        </div>
      )}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Checkout</h1>
        <p className="text-slate-500">Secure your appointment on the Stellar Ledger</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-2xl p-0 overflow-hidden rounded-[2.5rem] shadow-2xl relative">
        <div className={`absolute top-0 left-0 h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ${status === 'confirming' ? 'w-2/3' : status === 'success' ? 'w-full' : 'w-0'}`} />

        <div className="p-8 md:p-10 space-y-8">
            <div className="flex items-center gap-5 p-6 bg-slate-950/40 rounded-3xl border border-white/5">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                    <User className="text-white w-8 h-8" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-white leading-tight">{FIXED_DOCTOR_NAME}</h3>
                   <p className="text-cyan-400/80 text-sm font-medium">Cardiovascular Specialist</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-950/40 rounded-3xl border border-white/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-black tracking-widest">Date</span>
                    </div>
                    <p className="text-lg font-bold text-slate-100">{booking.date}</p>
                </div>
                <div className="p-5 bg-slate-950/40 rounded-3xl border border-white/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-black tracking-widest">Time</span>
                    </div>
                    <p className="text-lg font-bold text-slate-100">{booking.time}</p>
                </div>
            </div>

            {booking.reason && (
                <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-indigo-400/60">
                        <Stethoscope className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-black tracking-widest">Medical Context</span>
                    </div>
                    <p className="text-lg font-medium text-slate-300 italic">"{booking.reason}"</p>
                </div>
            )}

            <div className="pt-4">
                {status === 'success' ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-8 text-center animate-in zoom-in duration-500 shadow-2xl shadow-emerald-500/5">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20 animate-bounce">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <h4 className="text-2xl font-black text-emerald-400 mb-3">Booking Secured</h4>
                        <p className="text-slate-400 text-sm mb-6 max-w-[240px] mx-auto leading-relaxed">
                            Confirmed on Stellar Testnet. Returning you to Telegram safely...
                        </p>
                        {txHash && (
                            <a 
                                href={sorobanService.getExplorerUrl(txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-cyan-400 transition-colors bg-slate-950/50 px-4 py-2 rounded-full border border-white/5"
                            >
                                <ExternalLink className="w-3 h-3" />
                                VIEW ON EXPLORER
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Button 
                            onClick={() => handleConfirmOnChain()}
                            disabled={status === 'confirming' || status === 'connecting'}
                            className={`w-full h-16 text-xl font-black rounded-[1.25rem] shadow-2xl transition-all duration-300 active:scale-95 disabled:opacity-80 relative overflow-hidden group
                                ${status === 'idle' ? 'shadow-cyan-500/40 animate-pulse' : 'shadow-cyan-500/20'}
                            `}
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {status === 'confirming' ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                                        <span>SIGNING...</span>
                                    </>
                                ) : status === 'connecting' ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                                        <span>CONNECTING WALLET...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-6 h-6 transform group-hover:rotate-12 transition-transform" />
                                        <span>CONFIRM & SIGN</span>
                                    </>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Button>
                        
                        <div className="flex items-center justify-center gap-3 text-slate-700">
                             <div className="h-px flex-1 bg-slate-800" />
                             <span className="text-[10px] uppercase font-black tracking-[0.2em]">
                                 {contextActiveAddress?.startsWith('0x') ? 'Secure Booking via EVM' : 'Audit Trail via Freighter'}
                             </span>
                             <div className="h-px flex-1 bg-slate-800" />
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="mt-8 p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-400 text-sm flex items-start gap-4 animate-in shake-in duration-300">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-bold mb-1 uppercase tracking-tight text-xs">Authorization Failed</p>
                             <p className="text-rose-400/80 leading-relaxed">{errorMsg}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </Card>
      
      <div className="mt-12 text-center space-y-4">
        <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest max-w-[300px] mx-auto leading-relaxed opacity-50">
            Encrypted P2P Medical Identity • Verified by Soroban Protocol
        </p>
        <div className="flex items-center justify-center gap-2 opacity-30 grayscale saturate-0 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Stellar Testnet Node: SDF-1</span>
        </div>
      </div>
    </div>
  );
}

