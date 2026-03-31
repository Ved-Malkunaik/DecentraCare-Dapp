import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  User,
  Pill,
  FileText,
  CheckCircle2,
  Loader2,
  XCircle,
  ShieldAlert,
  Share2,
  History,
  Info,
  Stethoscope,
  ShieldCheck,
  ClipboardCopy,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { sorobanService } from '../services/sorobanService';
import * as snarkjs from 'snarkjs';

export default function DoctorDashboard() {
  const { stellarAddress, role } = useWallet();
  const [formData, setFormData] = useState({
    patientAddr: '',
    medicines: '',
    notes: ''
  });

  const [status, setStatus] = useState('idle'); // idle | pending | success | error | registering
  const [errorMsg, setErrorMsg] = useState('');
  const [syncStep, setSyncStep] = useState('idle'); // idle, preparing, awaiting_signature, indexing, confirmed
  const [generatedId, setGeneratedId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [authorizedPatients, setAuthorizedPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [isFromPending, setIsFromPending] = useState(false);
  const [myConsultations, setMyConsultations] = useState([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);

  React.useEffect(() => {
    if (stellarAddress) {
      fetchPatients();
      fetchPendingAppointments();
      fetchConsultations();
    }
  }, [stellarAddress]);

  const fetchConsultations = async () => {
    try {
      setLoadingConsultations(true);
      const onChain = await sorobanService.getConsultationsByDoctor(stellarAddress);

      // Merge with Simulations
      const consultSimStr = localStorage.getItem('decentracare_sim_consults') || '[]';
      const consultSimRaw = JSON.parse(consultSimStr);

      const relevantSim = consultSimRaw.filter(c => c.doctor === stellarAddress);

      const combined = [...(onChain || []), ...relevantSim];
      setMyConsultations(combined);
    } catch (e) {
      console.warn("Failed to fetch consultations", e);
    } finally {
      setLoadingConsultations(false);
    }
  };

  const removeConsultation = (prescriptionId) => {
    // Directly update state and storage for frictionless demo
    const updatedConsults = myConsultations.filter(c => formatId(c.prescription_id) !== formatId(prescriptionId));
    setMyConsultations(updatedConsults);

    const consultSimStr = localStorage.getItem('decentracare_sim_consults') || '[]';
    let consultSim = JSON.parse(consultSimStr);
    consultSim = consultSim.filter(c => formatId(c.prescription_id) !== formatId(prescriptionId));
    localStorage.setItem('decentracare_sim_consults', JSON.stringify(consultSim));
  };

  const fetchPendingAppointments = async () => {
    try {
      setLoadingPending(true);
      const pendingOnChain = await sorobanService.getPendingAppointments(stellarAddress);

      // Merge with Simulation Store
      const pendingSimStr = localStorage.getItem('decentracare_sim_pending') || '[]';
      const pendingSim = JSON.parse(pendingSimStr);

      // Filter for current doctor
      const relevantSim = pendingSim.filter(p => p.doctor === stellarAddress).map(p => p.patient);

      const combined = [...new Set([...pendingOnChain, ...relevantSim])].filter(p => p);
      setPendingAppointments(combined);
    } catch (e) {
      console.warn("Failed to fetch pending", e);
    } finally {
      setLoadingPending(false);
    }
  };


  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const onChainAuthorized = await sorobanService.getAuthorizedPatients(stellarAddress);

      // Extract patients from Consultations (Simulated)
      const consultSimStr = localStorage.getItem('decentracare_sim_consults') || '[]';
      const consultSim = JSON.parse(consultSimStr);
      const simConsultPatients = consultSim.filter(c => c.doctor === stellarAddress).map(c => c.patient);

      // Extract patients from Pending Appointments (Simulated)
      const pendingSimStr = localStorage.getItem('decentracare_sim_pending') || '[]';
      const pendingSim = JSON.parse(pendingSimStr);
      const simPendingPatients = pendingSim.filter(p => p.doctor === stellarAddress).map(p => p.patient);

      // Combine all sources: On-chain, Simulated Consultations, Simulated Appointments
      const allPatients = [
        ...(onChainAuthorized || []),
        ...simConsultPatients,
        ...simPendingPatients
      ];
      
      // Filter unique and valid G... addresses (DRY principle)
      const uniquePatients = [...new Set(allPatients)]
        .filter(p => p && p.startsWith('G'))
        .sort();

      setAuthorizedPatients(uniquePatients);
    } catch (e) {
      console.warn("Failed to fetch patients", e);
    } finally {
      setLoadingPatients(false);
    }
  };

  // 1. Pre-flight check before submitting
  const prepareAndSubmit = async (e) => {
    e.preventDefault();
    if (!stellarAddress) return alert("Please connect Freighter wallet");

    try {
      setStatus('pending');
      setErrorMsg('');

      // Step A: Check Registration
      console.log("Checking doctor registration status...");
      const isReg = await sorobanService.checkRegistry(stellarAddress, true);

      if (!isReg) {
        console.log("Doctor not found. Auto-registering...");
        setStatus('registering');
        await sorobanService.registerUser(stellarAddress, "DecentraCare Doctor", "General Practice", true, true);
        console.log("Registration successful.");
      }

      // Step B: Submit Prescription (Visible Ledger Synchronization)
      setStatus('pending');
      setSyncStep('preparing');
      const hash = await generateHash(formData);

      console.log("Preparing ledger synchronization...");

      let txResponse;
      try {
        // Progress Step: Await User Signature in Freighter
        setSyncStep('awaiting_signature');

        txResponse = await sorobanService.createPrescription(
          formData.patientAddr,
          stellarAddress,
          hash,
          true // skipPopup
        );

        // Progress Step: Confirmed by User, now Indexing to Ledger
        setSyncStep('indexing');
        console.log("On-chain record created:", txResponse.hash);

      } catch (err) {
        console.error("Ledger Sync Failed:", err);
        if (err.message.toLocaleLowerCase().includes("cancelled")) {
          setStatus('error');
          setErrorMsg("Transaction cancelled. Ledger sync is mandatory for verification.");
          return;
        }
        throw err;
      }

      // Progress Step: Confirmed on Testnet
      setSyncStep('confirmed');

      // Step C: Update Local History
      const consultSimStr = localStorage.getItem('decentracare_sim_consults') || '[]';
      const consultSim = JSON.parse(consultSimStr);
      consultSim.push({
        doctor: stellarAddress,
        patient: formData.patientAddr,
        prescription_id: hash,
        timestamp: Math.floor(Date.now() / 1000),
        medication: formData.medicines,
        diagnosis: formData.notes
      });
      localStorage.setItem('decentracare_sim_consults', JSON.stringify(consultSim));

      setGeneratedId(hash);
      setTxHash(txResponse.hash);

      // Step D: Generate ZKP Proof
      setStatus('generating_proof');
      console.log("Generating Zero-Knowledge Proof...");
      try {
        const inputs = {
          doctor_wallet: addressToBigInt(stellarAddress),
          patient_wallet: addressToBigInt(formData.patientAddr),
          prescription_id: addressToBigInt(hash)
        };

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
          inputs,
          "/consultationProof.wasm",
          "/consultation_final.zkey"
        );

        // Store proof locally for sharing demo
        localStorage.setItem(`proof_${hash}`, JSON.stringify({ proof, publicSignals }));
        console.log("ZKP Proof generated and stored locally.");
      } catch (zkpErr) {
        console.warn("ZKP Generation failed (not blocking)", zkpErr);
      }

      // Step E: Complete Appointment if applicable (Always check pending list)
      const isInPendingList = pendingAppointments.includes(formData.patientAddr);
      if (isInPendingList || isFromPending) {
        try {
          console.log("Automatically completing appointment...");
          // Only call real soroban service if it was a real pending record, otherwise just simulate
          if (isInPendingList && !isFromPending) {
            // If it's on-chain pending, try to complete it
            try { await sorobanService.completeAppointment(stellarAddress, formData.patientAddr); } catch (e) { }
          }

          // Clear Simulation Record if it exists
          const pendingSimStr = localStorage.getItem('decentracare_sim_pending') || '[]';
          const pendingSim = JSON.parse(pendingSimStr);
          const updatedSim = pendingSim.filter(p => !(p.doctor === stellarAddress && p.patient === formData.patientAddr));
          localStorage.setItem('decentracare_sim_pending', JSON.stringify(updatedSim));

          fetchPendingAppointments();
          setIsFromPending(false);
        } catch (compErr) {
          console.warn("Failed to complete appointment record", compErr);
        }
      }

      setStatus('success');
      setFormData({ patientAddr: '', medicines: '', notes: '' });
      fetchConsultations();
      fetchPendingAppointments();
      fetchPatients();

    } catch (err) {
      console.error("Submission failed:", err);
      setStatus('error');
      // Specific mapping for visibility
      let finalError = err.message || "An unknown blockchain error occurred.";
      if (finalError.includes("Contract Execution Error") || finalError.includes("rejected by the smart contract") || finalError.includes("authorized")) {
        finalError = "Patient has not granted access. Ask patient to book an appointment to sync records.";
      }
      setErrorMsg(finalError);
    }
  };

  const generateHash = async (data) => {
    const encoder = new TextEncoder();
    const salt = Date.now().toString();
    const dataBuffer = encoder.encode(JSON.stringify(data) + salt);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const addressToBigInt = (str) => {
    if (!str) return '0';
    let num = 0n;
    for (let i = 0; i < str.length; i++) {
      num = num * 256n + BigInt(str.charCodeAt(i));
    }
    return num.toString();
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
    // UI Feedback could be added here if needed
  };

  const proofToJson = (proof) => {
    return JSON.stringify(proof, null, 2);
  };

  return (
    <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 h-full">
      <div className="lg:col-span-7 flex flex-col gap-8">
        <div className="w-full">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-50">Doctor Portal</h2>
          <p className="text-slate-400 mt-2">Issue verifiable prescriptions directly to the Stellar blockchain.</p>
        </div>

        <Card className="p-8">
          <form onSubmit={prepareAndSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-cyan-500" /> Target Patient Wallet
              </label>
              <input
                type="text"
                value={formData.patientAddr}
                onChange={(e) => setFormData({ ...formData, patientAddr: e.target.value })}
                placeholder="Paste Patient's G... address"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-slate-200 font-mono text-xs focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
                  <Pill className="w-3.5 h-3.5 text-cyan-500" /> Prescribed Medication
                </label>
                <textarea
                  value={formData.medicines}
                  onChange={(e) => setFormData({ ...formData, medicines: e.target.value })}
                  placeholder="e.g. Paracetamol 500mg, twice daily for 5 days"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-cyan-500" /> Diagnostic Summary
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Diagnosis or pharmacist instructions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex flex-col items-center gap-4">
              <Button
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-lg shadow-lg shadow-blue-500/20 transition-all border-0 flex items-center justify-center gap-3 group disabled:opacity-70"
                disabled={status === 'pending' || status === 'generating_proof' || !formData.patientAddr}
                type="submit"
              >
                {status === 'pending' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {syncStep === 'preparing' && "Preparing Ledger Audit..."}
                    {syncStep === 'awaiting_signature' && "Awaiting Wallet Signature..."}
                    {syncStep === 'indexing' && "Indexing to Stellar Testnet..."}
                    {syncStep === 'confirmed' && "Transaction Confirmed!"}
                  </>
                ) : status === 'generating_proof' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating Prescription</>
                ) : status === 'registering' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Registering Doctor Profile...</>
                ) : (
                  <><ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" /> Create Prescription</>
                )}
              </Button>

              {status === 'error' && (
                <div className="w-full flex items-start gap-3 text-rose-400 bg-rose-500/5 p-4 rounded-xl border border-rose-500/20 text-xs leading-relaxed animate-in slide-in-from-top-2">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="flex-1">{errorMsg}</span>
                </div>
              )}
            </div>
          </form>
        </Card>
      </div>

      <div className="lg:col-span-5">
        {status === 'success' ? (
          <div className="animate-in zoom-in duration-500 h-full">
            <Card className="border-emerald-500/30 bg-emerald-500/5 h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/40">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-emerald-400 mb-2">Prescription Created</h3>
              <p className="text-slate-400 text-sm mb-8">Record has been permanently hashed and stored on the Stellar Network.</p>

              <div className="w-full space-y-4 text-left">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <label className="text-[10px] text-slate-600 font-bold uppercase block mb-1">Prescription Hash (ID)</label>
                  <div className="flex items-center justify-between gap-4 group cursor-pointer hover:bg-slate-900/50 p-1 rounded-lg transition-colors" onClick={() => { navigator.clipboard.writeText(generatedId); alert("ID Copied!"); }}>
                    <code className="text-[10px] text-cyan-400 break-all font-mono leading-relaxed">{generatedId}</code>
                    <div className="shrink-0 p-2 bg-slate-900 border border-slate-800 rounded-lg group-hover:border-cyan-500/50 transition-colors">
                      <Copy className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                    </div>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setStatus('idle')} className="w-full py-3 h-12">Create Another</Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col gap-6 h-full">
            {/* 🆕 SECTION: PENDING APPOINTMENTS */}
            <Card className="bg-slate-900 border-slate-800 flex flex-col p-6 max-h-[350px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-slate-100">Pending Appointments</h4>
                </div>
                <button onClick={fetchPendingAppointments} className="p-1.5 hover:bg-slate-800 rounded-lg">
                  <Loader2 className={`w-3.5 h-3.5 text-slate-500 ${loadingPending && 'animate-spin'}`} />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {loadingPending ? (
                  [1, 2].map(i => <div key={i} className="h-14 bg-slate-950/20 border border-slate-900 rounded-xl animate-pulse" />)
                ) : pendingAppointments.length > 0 ? (
                  pendingAppointments.map((addr, idx) => (
                    <div key={idx} className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl group">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-[10px] font-mono text-amber-500/70 truncate">{addr}</p>
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-tighter">Awaiting</span>
                      </div>
                      <Button
                        variant="secondary"
                        className="w-full h-8 text-[10px] bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white"
                        onClick={() => {
                          setFormData({ ...formData, patientAddr: addr });
                          setIsFromPending(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Issue Prescription
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                    <p className="text-[10px] text-slate-600 font-medium">No pending walk-ins.</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 flex-1 flex flex-col p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-slate-100">Patients With Access</h4>
                </div>
                <button onClick={fetchPatients} className="p-1.5 hover:bg-slate-800 rounded-lg">
                  <History className={`w-3.5 h-3.5 text-slate-500 ${loadingPatients && 'animate-spin'}`} />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {loadingPatients ? (
                  [1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-950/50 border border-slate-900 rounded-xl animate-pulse" />)
                ) : authorizedPatients.length > 0 ? (
                  authorizedPatients.map((addr, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setFormData({ ...formData, patientAddr: addr }); setIsFromPending(false); }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer group ${formData.patientAddr === addr && !isFromPending ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="truncate">
                            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Patient Wallet</p>
                            <p className="text-xs font-mono truncate">{addr}</p>
                          </div>
                        </div>
                        <CheckCircle2 className={`w-4 h-4 shrink-0 transition-opacity ${formData.patientAddr === addr && !isFromPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                    <Info className="w-8 h-8 text-slate-700 mb-2" />
                    <p className="text-xs text-slate-600 font-medium px-6">No patients have granted access yet.</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 flex-1 flex flex-col p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <h4 className="font-bold text-slate-100">My Consultations</h4>
                </div>
                <button onClick={fetchConsultations} className="p-1.5 hover:bg-slate-800 rounded-lg">
                  <History className={`w-3.5 h-3.5 text-slate-500 ${loadingConsultations && 'animate-spin'}`} />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {loadingConsultations ? (
                  [1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-950/50 border border-slate-900 rounded-xl animate-pulse" />)
                ) : myConsultations.length > 0 ? (
                  [...myConsultations].reverse().map((consult, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Consultation Proof</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          <button
                            onClick={() => removeConsultation(consult.prescription_id)}
                            className="p-1 hover:bg-rose-500/10 rounded-lg text-slate-600 hover:text-rose-500 transition-colors"
                            title="Remove from list"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 break-all mb-1">
                        Patient: <span className="font-mono text-cyan-400">{consult.patient}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 group/id">
                        Prescription ID:
                        <span className="font-mono text-emerald-400 truncate max-w-[120px]">{formatId(consult.prescription_id)}</span>
                        <button
                          onClick={() => copyToClipboard(formatId(consult.prescription_id))}
                          className="p-1 hover:bg-emerald-500/10 rounded transition-colors text-slate-600 hover:text-emerald-400 group-hover/id:opacity-100 opacity-0"
                          title="Copy ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                    <Info className="w-8 h-8 text-slate-700 mb-2" />
                    <p className="text-xs text-slate-600 font-medium px-6">No consultation records generated yet.</p>
                  </div>
                )}
              </div>
            </Card>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 text-[10px] text-slate-500 italic">
              <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
              Only patients who have specifically authorized your address can be issued prescriptions.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
