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
  Copy,
  X
} from 'lucide-react';
import { useMultiWallet } from '../context/MultiWalletContext';
import { sorobanService } from '../services/sorobanService';
import { dbService } from '../services/supabaseService';
import toast from 'react-hot-toast';

const FIXED_DOCTOR_ADDRESS = 'GDK7TWNN3H57JWZBBC4V3BQNI3NTHSUDEVDZB5DGPPCULFJRIP3APG42';
const FIXED_DOCTOR_NAME = 'Dr. Vijay Bharne';
const FIXED_DOCTOR_QUAL = 'MBBS,MD';

export default function PatientDashboard() {
  const { activeAddress } = useMultiWallet();
  const [searchId, setSearchId] = useState('');
  const [status, setStatus] = useState('idle'); // idle | searching | found | error | pending | registering | booking
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [doctorToManage, setDoctorToManage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [appointmentData, setAppointmentData] = useState({
    doctorAddr: FIXED_DOCTOR_ADDRESS,
    date: new Date().toISOString().split('T')[0],
    slot: '10:00 AM',
    reason: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingTxHash, setBookingTxHash] = useState('');
  const [activeQr, setActiveQr] = useState(null);
  const [verifiedData, setVerifiedData] = useState(null);

  const [recordHistory, setRecordHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [myConsultations, setMyConsultations] = useState([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);

  // 1. Initial Access & History Check
  useEffect(() => {
    if (activeAddress) {
      if (doctorToManage) checkCurrentAccess();
      fetchHistory();
      fetchConsultations();
    }
  }, [activeAddress]);

  const fetchHistory = async () => {
    if (!activeAddress || activeAddress.startsWith('0x')) return; // History is currently Stellar-specific
    try {
      setLoadingHistory(true);
      const records = await sorobanService.getMedicalRecords(activeAddress, activeAddress);
      const hexRecords = (records || []).map(r => {
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
    if (!activeAddress) return;
    try {
      setLoadingConsultations(true);
      
      let onChain = [];
      if (!activeAddress.startsWith('0x')) {
        onChain = await sorobanService.getConsultationsByPatient(activeAddress);
      }

      // Fetch from Database (Supabase)
      const dbConsults = await dbService.getConsultationsByPatient(activeAddress);

      // Filter for current patient simulation
      const consultSimStr = localStorage.getItem('decentracare_sim_consults') || '[]';
      const consultSimRaw = JSON.parse(consultSimStr);
      const relevantSim = consultSimRaw.filter(c => c.patient === activeAddress);

      const combined = [...(onChain || []), ...dbConsults, ...relevantSim];
      setMyConsultations(combined);
    } catch (e) {
      console.warn("Consult fetch failed", e);
    } finally {
      setLoadingConsultations(false);
    }
  };

  const checkCurrentAccess = async () => {
    if (!activeAddress || activeAddress.startsWith('0x')) {
        // For EVM we check Supabase instead of Soroban
        const hasAccess = await dbService.checkAccess(activeAddress, doctorToManage);
        setIsAccessGranted(hasAccess);
        return;
    }
    try {
      const hasAccess = await sorobanService.checkAccess(activeAddress, doctorToManage);
      setIsAccessGranted(hasAccess);
    } catch (e) {
      console.warn("Access check failed", e);
    }
  };

  const toggleAccess = async () => {
    if (!activeAddress || !doctorToManage) return;

    try {
      setStatus('pending');
      setErrorMsg('');

      if (activeAddress.startsWith('0x')) {
        // EVM Path: Virtual Access Grant
        if (isAccessGranted) {
            await dbService.revokeAccess(activeAddress, doctorToManage);
            setIsAccessGranted(false);
        } else {
            await dbService.grantAccess(activeAddress, doctorToManage);
            setIsAccessGranted(true);
        }
        setStatus('idle');
        toast.success(isAccessGranted ? "Access Revoked" : "Access Granted");
        return;
      }

      // Stellar Path: On-Chain Access Grant
      const isPatientReg = await sorobanService.checkRegistry(activeAddress, false);
      if (!isPatientReg) {
        setStatus('registering');
        await sorobanService.registerUser(activeAddress, "DecentraCare Patient", "0", false);
        setStatus('pending');
      }

      const isDoctorReg = await sorobanService.checkRegistry(doctorToManage, true);
      if (!isDoctorReg) {
        throw new Error(`Doctor not registered on-chain.`);
      }

      if (isAccessGranted) {
        await sorobanService.revokeAccess(activeAddress, doctorToManage);
        setIsAccessGranted(false);
      } else {
        await sorobanService.grantAccess(activeAddress, doctorToManage);
        setIsAccessGranted(true);
      }
      setStatus('idle');
    } catch (error) {
      setErrorMsg(error.message || 'Action failed.');
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

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!activeAddress || !appointmentData.doctorAddr) return;

    try {
      setStatus('booking');
      setErrorMsg('');
      setBookingSuccess(false);

      let txHashToSave = '';
      const isEVM = activeAddress.startsWith('0x');

      if (isEVM) {
        console.log("EVM Appointment booking...");
        txHashToSave = `EVM_BOOK_${Math.random().toString(36).substring(2, 15)}`;
        await new Promise(r => setTimeout(r, 1500));
      } else {
        const txResult = await sorobanService.bookAppointment(activeAddress, appointmentData.doctorAddr);
        txHashToSave = txResult.hash;
      }

      setBookingTxHash(txHashToSave);

      // 2. Mirror to Database
      await dbService.insertAppointment({
        patient_wallet: activeAddress,
        doctor_wallet: appointmentData.doctorAddr,
        date: appointmentData.date,
        reason: appointmentData.reason,
        tx_hash: txHashToSave,
        is_simulated: isEVM
      });
      await dbService.grantAccess(activeAddress, appointmentData.doctorAddr);

      setBookingSuccess(true);
      setIsAccessGranted(true);
      setDoctorToManage(appointmentData.doctorAddr);
      setStatus('idle');
      toast.success("Appointment Booked!");
    } catch (error) {
      setErrorMsg(error.message || 'Booking failed.');
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

  const handleDeleteHistory = async (prescription_id) => {
    if (!window.confirm("Remove this entry from your history?")) return;
    try {
      const pid = formatId(prescription_id);
      await dbService.deleteConsultation(pid);
      // Update local state
      setMyConsultations(prev => prev.filter(c => formatId(c.prescription_id) !== pid));
    } catch (err) {
      console.error("Failed to delete history", err);
    }
  };

  const getDoctorDisplayName = (addr) => {
    if (!addr) return 'Unknown Doctor';
    const cleanAddr = typeof addr === 'string' ? addr : formatId(addr);
    if (cleanAddr === FIXED_DOCTOR_ADDRESS) return FIXED_DOCTOR_NAME;
    return `${cleanAddr.substring(0, 8)}...${cleanAddr.substring(cleanAddr.length - 4)}`;
  };

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-12 pt-28 pb-12 px-4 shadow-sm">
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
          <form onSubmit={handleBookAppointment} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
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
                <Calendar className="w-3 h-3 text-blue-400" /> Preferred Date
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
                <Clock className="w-3 h-3 text-cyan-400" /> Time Slot
              </label>
              <select
                value={appointmentData.slot}
                onChange={(e) => setAppointmentData({ ...appointmentData, slot: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none"
                required
              >
                {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'].map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3 h-3 text-indigo-400" /> Reason for Visit
              </label>
              <input
                type="text"
                value={appointmentData.reason}
                onChange={(e) => setAppointmentData({ ...appointmentData, reason: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/30"
                placeholder="e.g. Checkup"
                required
              />
            </div>
            <div className="md:col-span-4">
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
                <div key={idx} className="min-w-[320px] max-w-[320px] p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 shrink-0 group hover:border-indigo-500/40 transition-colors relative">
                  <button
                    onClick={() => handleDeleteHistory(consult.prescription_id)}
                    className="absolute -top-2 -right-2 p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-full border border-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Remove from history"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
                        <p className="text-xs font-bold text-cyan-400 truncate">{getDoctorDisplayName(consult.doctor || consult.doctor_wallet)}</p>
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

