import React, { createContext, useContext, useState, useEffect } from "react";
import { useWallet } from "./WalletContext";
import { sorobanService } from "../services/sorobanService";
import { dbService } from "../services/supabaseService";

const RoleContext = createContext();

export const useRole = () => useContext(RoleContext);

export const RoleProvider = ({ children }) => {
  const { walletAddress, isConnected } = useWallet();
  const [role, setRole] = useState(null); // null meant fetching initial state
  const [loading, setLoading] = useState(false);

  // Expose fetchRole globally so registration pages can trigger re-checks
  const fetchRole = async () => {
    if (!walletAddress) {
      setRole("none");
      return;
    }
    
    try {
      setLoading(true);
      const userRole = await sorobanService.getRole(walletAddress);
      const cleanRole = userRole === "none" ? "unregistered" : userRole;
      setRole(cleanRole);

      // Sync role state to Supabase for audit/backend trail
      await dbService.upsertUser({ 
          wallet_address: walletAddress, 
          role: cleanRole === "unregistered" ? "none" : cleanRole 
      });
    } catch (e) {
      console.error("Error fetching role", e);
      setRole("unregistered");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchRole();
      
      // Connection Diagnostic - Logs health status once per session
      dbService.testConnection().then(res => {
        if (res.success) console.log("%c[DB] Supabase Layer: Active & Responding ✅", "color: #10b981; font-weight: bold;");
        else console.warn(`%c[DB] Supabase Layer: LocalStorage Fallback (%c${res.message}%c) ⚠️`, "color: #f59e0b; font-weight: bold;", "color: #f87171;", "color: #f59e0b; font-weight: bold;");
      });
    } else {
      setRole(null);
    }
  }, [isConnected, walletAddress]);

  return (
    <RoleContext.Provider value={{ role, fetchRole, loading }}>
      {children}
    </RoleContext.Provider>
  );
};
