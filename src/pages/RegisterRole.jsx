import React, { useState } from "react";
import { useRole } from "../context/RoleContext";
import { useMultiWallet } from "../context/MultiWalletContext";
import { sorobanService } from "../services/sorobanService";
import { dbService } from "../services/supabaseService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function RegisterRole() {
  const { fetchRole } = useRole();
  const { activeAddress } = useMultiWallet();
  const navigate = useNavigate();
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (roleType) => {
    try {
      setError("");
      const isEVM = activeAddress?.startsWith('0x');
      
      if (isEVM) {
        setLoadingMsg(`Registering ${roleType} identity...`);
        // Virtual Identity Registration for EVM
        await dbService.upsertUser({ 
            wallet_address: activeAddress, 
            role: roleType.toLowerCase(),
            name: `EVM ${roleType}`
        });
        await new Promise(r => setTimeout(r, 1000));
      } else {
        setLoadingMsg(`Registering as ${roleType} via Freighter...`);
        if (roleType === "Patient") {
          await sorobanService.registerPatient(activeAddress);
        } else if (roleType === "Doctor") {
          await sorobanService.registerDoctor(activeAddress);
        } else if (roleType === "Pharmacist") {
          await sorobanService.registerPharmacist(activeAddress);
        } else if (roleType === "Insurer") {
          await sorobanService.registerInsurer(activeAddress);
        }
      }

      setLoadingMsg("Registration successful. Finalizing profile...");
      await fetchRole();
      
      const routeMap = {
        Patient: "/patient",
        Doctor: "/doctor",
        Pharmacist: "/pharmacy",
        Insurer: "/insurance"
      };
      
      toast.success(`${roleType} Registered!`);
      navigate(routeMap[roleType] || "/");
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed.");
      setLoadingMsg("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 tracking-tighter">
            Complete Your Identity
        </h1>
        <p className="text-slate-400 max-w-md mx-auto font-medium">
            Your wallet is the key. Choose your role in the DecentraCare ecosystem.
        </p>
      </div>

      {error && <div className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl mb-8 border border-rose-500/20 w-full max-w-lg text-sm text-center">{error}</div>}
      
      {loadingMsg ? (
        <div className="flex flex-col items-center space-y-6">
          <div className="animate-spin rounded-2xl h-16 w-16 border-t-2 border-b-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]"></div>
          <p className="text-cyan-400 font-black uppercase tracking-widest text-xs">{loadingMsg}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {["Patient", "Doctor", "Pharmacist", "Insurer"].map((role) => (
            <div key={role} className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 hover:border-cyan-500/50 transition-all group flex flex-col justify-between backdrop-blur-xl">
              <div>
                <h3 className="text-2xl font-bold mb-3 text-slate-100 group-hover:text-cyan-400 transition-colors">Register as {role}</h3>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                  {role === "Patient" && "Own your medical data, book appointments, and grant doctors temporary access to your records."}
                  {role === "Doctor" && "Create on-chain prescriptions, access patient histories, and manage your medical practice securely."}
                  {role === "Pharmacist" && "Verify prescriptions immutably on the Ledger and dispense medication."}
                  {role === "Insurer" && "Audit medical consultation proofs securely without violating patient privacy."}
                </p>
              </div>
              <button 
                onClick={() => handleRegister(role)}
                className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 text-white font-bold transition-all shadow-lg hover:shadow-cyan-500/20"
              >
                Enter as {role} →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
