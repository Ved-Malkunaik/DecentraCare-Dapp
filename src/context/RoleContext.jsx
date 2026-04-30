import React, { createContext, useContext, useState, useEffect } from "react";
import { useMultiWallet } from "./MultiWalletContext";
import { sorobanService } from "../services/sorobanService";
import { dbService } from "../services/supabaseService";

const RoleContext = createContext();

export const useRole = () => useContext(RoleContext);

export const RoleProvider = ({ children }) => {
  const { stellarAddress, evmAddress, isStellarConnected } = useMultiWallet();
  const [role, setRole] = useState(null); // null meant fetching initial state
  const [loading, setLoading] = useState(false);

  // Expose fetchRole globally so registration pages can trigger re-checks
  const fetchRole = async () => {
    if (!stellarAddress) {
      setRole("none");
      return;
    }

    try {
      setLoading(true);
      const userRole = await sorobanService.getRole(stellarAddress);
      const cleanRole = userRole === "none" ? "unregistered" : userRole;
      setRole(cleanRole);

      // Sync role state to Supabase for audit/backend trail
      // Primary ID is Stellar, EVM is linked
      await dbService.upsertUser({
        wallet_address: stellarAddress,
        evm_address: evmAddress,
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
    if (stellarAddress) {
      fetchRole();

      // Connection Diagnostic
      dbService.testConnection().then(res => {
        if (res.success) {
          console.log("%c[DB] Supabase Layer: Active ✅", "color: #10b981; font-weight: bold;");
        }
      });
    } else {
      setRole(null);
    }
  }, [stellarAddress, evmAddress]); // Re-fetch/re-sync if either wallet changes

  return (
    <RoleContext.Provider value={{ role, fetchRole, loading }}>
      {children}
    </RoleContext.Provider>
  );
};
