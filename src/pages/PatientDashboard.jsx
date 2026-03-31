import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  ClipboardList,
  Search,
  Loader2,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  History,
  UserPlus,
  UserMinus,
  Lock,
  Unlock,
  AlertTriangle,
  Calendar,
  Stethoscope,
  MessageSquare,
  User,
  QrCode,
  Shield,
  Clock,
  MapPin,
  LogOut,
  Copy
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { sorobanService } from '../services/sorobanService';
import { dbService } from '../services/supabaseService';

const FIXED_DOCTOR_ADDRESS = 'GDK7TWNN3H57JWZBBC4V3BQNI3NTHSUDEVDZB5DGPPCULFJRIP3APG42';
const FIXED_DOCTOR_NAME = 'Dr. Vijay Bharne';
const FIXED_DOCTOR_QUAL = 'MBBS,MD';

export default function PatientDashboard() {
  const { stellarAddress } = useWallet();
  const [searchId, setSearchId] = useState('');
  const [status, setStatus] = useState('idle'); // idle | searching | found | error | pending | registering | booking
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [doctorToManage, setDoctorToManage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [appointmentData, setAppointmentData] = useState({
    doctorAddr: FIXED_DOCTOR_ADDRESS,
    date: new Date().toISOString().split('T')[0],
    reason: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingTxHash, setBookingTxHash] = useState('');
  const [activeQr, setActiveQr] = useState(null);
  const [verifiedData, setVerifiedData] = useState(null);

  // 1. Initial Access Check
  useEffect(() => {
    if (stellarAddress && doctorToManage) {
      checkCurrentAccess();
    }
  }, [stellarAddress, doctorToManage]);

  const [recordHistory, setRecordHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [myConsultations, setMyConsultations] = useState([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);

  // 1. Initial Access & History Check
  React.useEffect(() => {
    if (stellarAddress) {
      checkCurrentAccess();
      fetchHistory();
      fetchConsultations();
    }
  }, [stellarAddress]);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const records = await sorobanService.getMedicalRecords(stellarAddress, stellarAddress);

      const hexRecords = (records || []).map(r => {
        // Browser-safe hex conversion for Uint8Array
        return Array.from(r).map(b => b.toString(16).padStart(2, '0')).join('');
      });

      setRecordHistory(hexRecords.reverse().slice(0, 5));
    } catch (e) {
      console.warn("History fetch failed", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchConsultations = async () => {
    try {
      setLoadingConsultations(true);
      const onChain = await sorobanService.getConsultationsByPatient(stellarAddress);

      // Merge with Simulations
      const consultSimStr = localStorage.getItem('decentracare_sim_consults') || '[]';
      const consultSimRaw = JSON.parse(consultSimStr);

      // Fetch from Database (Supabase)
      const dbConsults = await dbService.getConsultationsByPatient(stellarAddress);

      // Filter for current patient
      const relevantSim = consultSimRaw.filter(c => c.patient === stellarAddress).map(c => ({
        ...c,
        prescription_id: c.prescription_id // In sim it's string, in on-chain it's Uint8Array
      }));

      const combined = [...(onChain || []), ...dbConsults, ...relevantSim];
      setMyConsultations(combined);
    } catch (e) {
      console.warn("Consult fetch failed", e);
    } finally {
      setLoadingConsultations(false);
    }
  };

  const checkCurrentAccess = async () => {
    try {
      const hasAccess = await sorobanService.checkAccess(stellarAddress, doctorToManage);
      setIsAccessGranted(hasAccess);
    } catch (e) {
      console.warn("Access check failed", e);
    }
  };

  const toggleAccess = async () => {
    if (!stellarAddress || !doctorToManage) return;

    try {
      setStatus('pending');
      setErrorMsg('');

      // Step A: Check Patient Registration
      const isPatientReg = await sorobanService.checkRegistry(stellarAddress, false);
      if (!isPatientReg) {
        console.log("Patient not found. Auto-registering...");
        setStatus('registering');
        await sorobanService.registerUser(stellarAddress, "DecentraCare Patient", "0", false);
        console.log("Patient registration successful.");
        setStatus('pending');
      }

      // Step B: Check Doctor Registration
      const isDoctorReg = await sorobanService.checkRegistry(doctorToManage, true);
      if (!isDoctorReg) {
        throw new Error(`The doctor address (${doctorToManage.substring(0, 10)}...) is NOT registered. Only registered doctors can be granted access.`);
      }

      if (isAccessGranted) {
        await sorobanService.revokeAccess(stellarAddress, doctorToManage);
        setIsAccessGranted(false);
      } else {
        await sorobanService.grantAccess(stellarAddress, doctorToManage);
        setIsAccessGranted(true);
      }
      setStatus('idle');
    } catch (error) {
      console.error('Access toggle failed', error);
      setErrorMsg(error.message || 'Failed to update access on blockchain.');
      setStatus('error');
    }
  };

  const formatId = (id) => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    try {
      return Buffer.from(id).toString('hex');
    } catch (e) {
      return id.toString();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!stellarAddress || !appointmentData.doctorAddr) return;

    try {
      setStatus('booking');
      setErrorMsg('');
      setBookingSuccess(false);

      // 1. On-Chain Transaction (Triggers Freighter Popup)
      const txResult = await sorobanService.bookAppointment(stellarAddress, appointmentData.doctorAddr);
      setBookingTxHash(txResult.hash);

      // 2. Mirror to Database (Supabase) for cross-user sync
      await dbService.insertAppointment({
          patient_wallet: stellarAddress,
          doctor_wallet: appointmentData.doctorAddr,
          date: appointmentData.date,
          reason: appointmentData.reason,
          tx_hash: txResult.hash,
          is_simulated: false
      });
      await dbService.grantAccess(stellarAddress, appointmentData.doctorAddr);

      // 3. Local Simulation Sync (fallback for offline/demo)
      const pendingSimStr = localStorage.getItem('decentracare_sim_pending') || '[]';
      const pendingSim = JSON.parse(pendingSimStr);
      pendingSim.push({
        doctor: appointmentData.doctorAddr,
        patient: stellarAddress,
        date: appointmentData.date,
        reason: appointmentData.reason,
        timestamp: Date.now()
      });
      localStorage.setItem('decentracare_sim_pending', JSON.stringify(pendingSim));

      setBookingSuccess(true);
      setIsAccessGranted(true);
      setDoctorToManage(appointmentData.doctorAddr);
      setStatus('idle');

      // Keep success message visible and let user see the explorer link
    } catch (error) {
      console.error('Booking failed', error);
      setErrorMsg(error.message || 'Failed to book appointment.');
      setStatus('error');
    }
  };

  // Support real-time updates across tabs for demo
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'decentracare_sim_consults' || e.key === 'decentracare_sim_pending') {
        fetchConsultations();
        fetchHistory();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId) return;

    try {
      setStatus('searching');
      setVerifiedData(null);

      // 1. Check On-Chain First
      let isValid = await sorobanService.verifyPrescription(searchId);

      // 2. Check Simulation Store (Demo Fallback for skipped popups)
      const consultSimStr = localStorage.getItem('decentracare_sim_consults') || '[]';
      const consultSim = JSON.parse(consultSimStr);
      const simFound = consultSim.find(c => c.prescription_id === searchId);

      if (isValid || simFound) {
        if (simFound) {
          setVerifiedData(simFound);
        } else {
          setVerifiedData({ medication: "Standard Consultation", diagnosis: "Recovered from Ledger" });
        }
        setStatus('found');
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error("Search failed", err);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-12 py-8">
      {/* 📅 SECTION 1: BOOK APPOINTMENT */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Book Appointment</h2>
            <p className="text-sm text-slate-400 font-medium">Schedule a visit and auto-grant access to your medical records.</p>
          </div>
        </div>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <form onSubmit={handleBookAppointment} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <Stethoscope className="w-3 h-3 text-blue-500" /> Selected Specialist
              </label>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-0.5 border-l-2 border-l-blue-500">
                <p className="text-sm font-bold text-slate-100">{FIXED_DOCTOR_NAME}</p>
                <p className="text-[10px] text-blue-400 font-medium">{FIXED_DOCTOR_QUAL}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Preferred Date
              </label>
              <input
                type="date"
                value={appointmentData.date}
                onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/30"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Reason for Visit
              </label>
              <input
                type="text"
                value={appointmentData.reason}
                onChange={(e) => setAppointmentData({ ...appointmentData, reason: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/30"
                placeholder="e.g. Checkup"
              />
            </div>
            <div className="md:col-span-3">
              <Button
                type="submit"
                disabled={status === 'booking' || status === 'registering'}
                className="w-full h-12 flex items-center justify-center gap-2 font-bold tracking-tight"
              >
                {status === 'booking' ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling on Soroban...</> :
                  status === 'registering' ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering Profile...</> :
                    <><Stethoscope className="w-4 h-4" /> Confirm Appointment & Grant Access</>}
              </Button>
            </div>
          </form>
          {bookingSuccess && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 text-emerald-400 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm font-medium">Appointment booked & Access granted on-chain!</p>
              </div>
              {bookingTxHash && (
                <a
                  href={sorobanService.getExplorerUrl(bookingTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-all border border-emerald-500/30"
                >
                  View on Stellar Expert <History className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
          {status === 'error' && errorMsg && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 animate-in slide-in-from-top-2">
              <XCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}
        </Card>
      </div>

      {/* 🔍 SECTION 2: MY PRESCRIPTIONS */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <ClipboardList className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Manage Pharmacy</h2>
            <p className="text-sm text-slate-400 font-medium">Verify and view your medical records from the blockchain for pharmacists.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-12 space-y-6">
            <Card className="bg-slate-900 border-slate-800 shadow-xl p-6">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-purple-500 transition-colors" />
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="Paste Prescription Hash (64 chars)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all font-mono text-xs"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={status === 'searching' || !searchId}
                  className="h-12 px-8"
                >
                  {status === 'searching' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Hash"}
                </Button>
              </form>
            </Card>

            {status === 'found' ? (
              <Card className="border-emerald-500/30 bg-emerald-500/5 p-8 relative overflow-hidden flex flex-col md:flex-row gap-8 items-start group animate-in slide-in-from-bottom-4">
                <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
                <div className="w-full md:w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                  <ClipboardList className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <h4 className="text-xl font-bold text-slate-100">Verified Medical Record</h4>
                    <p className="text-[10px] text-slate-500 font-mono break-all line-clamp-1">{searchId}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                    <div>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">Medication</p>
                      <p className="text-xs text-slate-100 font-medium italic">{verifiedData?.medication || "Consultation Completed"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">Diagnosis / Instructions</p>
                      <p className="text-xs text-slate-100 font-medium italic">{verifiedData?.diagnosis || "Record exists on blockchain"}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : status === 'error' && (
              <div className="p-8 text-center border-2 border-dashed border-rose-500/10 rounded-2xl bg-rose-500/5">
                <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                <h4 className="text-lg font-bold text-rose-400">Verification Failed</h4>
                <p className="text-xs text-slate-500 mt-1">Hash not found or unauthorized.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🧾 SECTION 3: CONSULTATION HISTORY */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Stethoscope className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Consultation History</h2>
            <p className="text-sm text-slate-400 font-medium">Immutable proof of medical visits generated by your doctors.</p>
          </div>
          <button onClick={fetchConsultations} className="ml-auto p-2 hover:bg-slate-900 border border-slate-800 rounded-xl transition-colors">
            <History className={`w-5 h-5 text-indigo-400 ${loadingConsultations && 'animate-spin'}`} />
          </button>
        </div>

        <Card className="bg-slate-950/50 border-slate-800 p-6">
          {loadingConsultations ? (
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {[1, 2, 3].map(i => <div key={i} className="min-w-[300px] h-32 bg-slate-900 rounded-2xl animate-pulse shrink-0 border border-slate-800" />)}
            </div>
          ) : myConsultations.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar items-start">
              {[...myConsultations].reverse().map((consult, idx) => (
                <div key={idx} className="min-w-[320px] max-w-[320px] p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 shrink-0 group hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Verified Visit</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">{new Date(Number(consult.timestamp) * 1000).toLocaleDateString()}</div>
                    <button
                      onClick={() => setActiveQr({ id: formatId(consult.prescription_id), date: new Date(Number(consult.timestamp) * 1000).toLocaleDateString() })}
                      className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors border border-indigo-500/20 group-hover:scale-110"
                    >
                      <QrCode className="w-4 h-4 text-indigo-400" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-600 mb-0.5">Attending Doctor</p>
                      <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <Stethoscope className="w-3 h-3 text-slate-500" />
                        <p className="text-xs font-mono text-cyan-400 truncate">{consult.doctor}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-600 mb-0.5">Prescription ID</p>
                      <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-600" onClick={() => { setSearchId(formatId(consult.prescription_id)); handleSearch({ preventDefault: () => { } }); window.scrollTo({ top: 300, behavior: 'smooth' }); }}>
                        <ClipboardList className="w-3 h-3 text-emerald-500" />
                        <p className="text-xs font-mono text-emerald-400 truncate">{formatId(consult.prescription_id)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
              <Stethoscope className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-slate-400">No Visit History</h4>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">Consultation proofs will automatically appear here once your doctor signs them.</p>
            </div>
          )}
        </Card>
      </div>


      {activeQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="max-w-md w-full p-8 border-indigo-500/30 bg-slate-900 shadow-2xl relative">
            <button onClick={() => setActiveQr(null)} className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <XCircle className="w-5 h-5 text-slate-500" />
            </button>
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Share Prescription</h3>
                <p className="text-sm text-slate-400 font-medium">Show this QR code to your pharmacist for instant verification.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl inline-block shadow-lg shadow-indigo-500/20">
                <QRCodeSVG
                  value={activeQr.id}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prescription ID</p>
                  <p className="text-xs font-mono text-indigo-400 break-all">{activeQr.id}</p>
                </div>
                <p className="text-[10px] text-slate-500 italic">This code contains a cryptographic link to your record on the Stellar blockchain.</p>
              </div>

              <Button onClick={() => setActiveQr(null)} className="w-full">Done</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

