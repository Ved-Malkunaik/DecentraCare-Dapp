import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Loader2, CheckCircle2, ShieldCheck, ArrowLeft, Stethoscope } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useWallet } from '../context/WalletContext';
import { sorobanService } from '../services/sorobanService';
import { supabase } from '../services/supabaseService';

const FIXED_DOCTOR_ADDRESS = 'GDK7TWNN3H57JWZBBC4V3BQNI3NTHSUDEVDZB5DGPPCULFJRIP3APG42';
const FIXED_DOCTOR_NAME = 'Dr. Vijay Bharne';

export default function ConfirmBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { stellarAddress, connectWallet } = useWallet();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | confirming | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    const autoProcess = async () => {
      if (booking && status === 'idle') {
        let currentAddr = stellarAddress;
        
        // If wallet not connected, try connecting first
        if (!currentAddr) {
          console.log("Auto-connecting wallet...");
          currentAddr = await connectWallet();
        }

        // If we have an address (already had or just connected), trigger sign
        if (currentAddr) {
          handleConfirmOnChain();
        }
      }
    };

    const timer = setTimeout(autoProcess, 1200);
    return () => clearTimeout(timer);
  }, [booking, stellarAddress]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      
      // Try Supabase first (works on any device)
      if (supabase) {
        const { data, error } = await supabase
          .from('telegram_bookings')
          .select('*')
          .eq('id', bookingId)
          .single();
        
        if (!error && data) {
          setBooking(data);
          return;
        }
      }

      // Fallback to Backend API (for local testing)
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/booking/${bookingId}`);
      if (!res.ok) throw new Error("Booking not found");
      const data = await res.json();
      setBooking(data);
    } catch (err) {
      console.error(err);
      setErrorMsg("We couldn't find your booking details.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOnChain = async () => {
    if (!stellarAddress) {
      alert("Please connect your Freighter wallet first.");
      return;
    }

    try {
      setStatus('confirming');
      setErrorMsg('');

      // 1. Call Smart Contract
      const txResult = await sorobanService.bookAppointment(stellarAddress, FIXED_DOCTOR_ADDRESS);

      // 2. Notify Backend & Update Supabase
      if (supabase) {
        await supabase
          .from('telegram_bookings')
          .update({ 
            status: 'confirmed_onchain',
            wallet: stellarAddress,
            tx_hash: txResult.hash 
          })
          .eq('id', bookingId);
      }

      // 3. (Optional) Notify Local Backend if reachable
      try {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/confirm/${bookingId}`, {
          method: "POST",
          body: JSON.stringify({ 
            wallet: stellarAddress,
            txHash: txResult.hash 
          }),
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        console.log("Backend notification skipped (offline)");
      }

      setStatus('success');
      
      // Auto redirect after a delay
      setTimeout(() => {
        window.location.href = "https://t.me/DecentraCare_Bot";
      }, 3000);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to confirm booking on blockchain.");
      setStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!booking && !loading) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="bg-rose-500/10 p-4 rounded-full inline-block mb-6">
          <Stethoscope className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Invalid Booking</h2>
        <p className="text-slate-400 mb-8">{errorMsg || "This booking link appears to be invalid or expired."}</p>
        <Button onClick={() => navigate('/')}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-20 pb-12 px-4">
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h1 className="text-3xl font-bold text-white tracking-tight">Confirm Booking</h1>
      </div>

      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck className="w-32 h-32 text-cyan-500" />
        </div>

        <div className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500">Date</span>
              </div>
              <p className="text-lg font-semibold text-slate-200">{booking.date}</p>
            </div>
            <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500">Time</span>
              </div>
              <p className="text-lg font-semibold text-slate-200">{booking.time}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
            <div className="flex items-center gap-3 mb-2">
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] uppercase font-bold text-slate-500">Service Provider</span>
            </div>
            <p className="text-lg font-semibold text-slate-200">{FIXED_DOCTOR_NAME}</p>
            <p className="text-xs text-slate-500 font-mono mt-1">{FIXED_DOCTOR_ADDRESS}</p>
          </div>

          {booking.reason && (
            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500">Reason for Checkup</span>
              </div>
              <p className="text-lg font-semibold text-slate-200">{booking.reason}</p>
            </div>
          )}

          <div className="pt-6 border-t border-slate-800">
            {status === 'success' ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center animate-in zoom-in duration-300">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-emerald-400 mb-2">Booking Confirmed!</h4>
                <p className="text-sm text-slate-400">Your appointment has been secured on the Stellar blockchain. Redirecting you back to Telegram...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={handleConfirmOnChain}
                  disabled={status === 'confirming'}
                  className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-cyan-500/20"
                >
                  {status === 'confirming' ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Signing Transaction...</>
                  ) : (
                    <><ShieldCheck className="w-5 h-5 mr-2" /> Confirm on Blockchain</>
                  )}
                </Button>
                <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest">
                  Requires Freighter Wallet Confirmation
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3">
                <Stethoscope className="w-5 h-5" />
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      </Card>
      
      <p className="mt-8 text-center text-slate-500 text-xs">
        By confirming, you agree to share your basic medical identity with the selected healthcare provider on the Soroban network.
      </p>
    </div>
  );
}

