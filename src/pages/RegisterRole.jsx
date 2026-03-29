import React, { useState } from "react";
import { useRole } from "../context/RoleContext";
import { useWallet } from "../context/WalletContext";
import { sorobanService } from "../services/sorobanService";
import { useNavigate } from "react-router-dom";

export default function RegisterRole() {
  const { fetchRole } = useRole();
  const { walletAddress } = useWallet();
  const navigate = useNavigate();
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (roleType) => {
    try {
      setLoadingMsg(`Registering as ${roleType} via Freighter...`);
      setError("");
      
      if (roleType === "Patient") {
        await sorobanService.registerPatient(walletAddress);
      } else if (roleType === "Doctor") {
        await sorobanService.registerDoctor(walletAddress);
      } else if (roleType === "Pharmacist") {
        await sorobanService.registerPharmacist(walletAddress);
      } else if (roleType === "Insurer") {
        await sorobanService.registerInsurer(walletAddress);
      }

      setLoadingMsg("Transaction successful. Updating role...");
      await fetchRole();
      
      const onChainRole = await sorobanService.getRole(walletAddress);
      if (onChainRole === 'none') {
          console.warn("Legacy polyfills failed to detect role. Contract state might be broken.");
      }
      
      const routeMap = {
        Patient: "/patient",
        Doctor: "/doctor",
        Pharmacist: "/pharmacy",
        Insurer: "/insurance"
      };
      navigate(routeMap[roleType] || "/");
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed.");
      setLoadingMsg("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">Complete Your Web3 Identity</h1>
      <p className="text-gray-400 mb-8 max-w-md text-center">
        Your wallet address is the key. Choose how you want to participate in the DecentraCare network.
      </p>

      {error && <div className="bg-red-500/20 text-red-300 p-4 rounded mb-6 border border-red-500/50 w-full max-w-lg">{error}</div>}
      
      {loadingMsg ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-primary font-medium">{loadingMsg}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
          {["Patient", "Doctor", "Pharmacist", "Insurer"].map((role) => (
            <div key={role} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-primary transition-all group flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-semibold mb-2 text-blue-300">Register as {role}</h3>
                <p className="text-sm text-gray-400 mb-6">
                  {role === "Patient" && "Own your medical data, book appointments, and grant doctors temporary access to your records."}
                  {role === "Doctor" && "Create on-chain prescriptions, access patient histories, and manage your medical practice securely."}
                  {role === "Pharmacist" && "Verify prescriptions immutably on the Ledger and dispense medication."}
                  {role === "Insurer" && "Audit medical consultation proofs securely without violating patient privacy."}
                </p>
              </div>
              <button 
                onClick={() => handleRegister(role)}
                className="w-full py-3 rounded-lg bg-gray-700 group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-teal-500 text-white font-medium transition-all"
              >
                Register as {role} →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
