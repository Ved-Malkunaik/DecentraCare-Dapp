import React, { createContext, useContext, useState, useEffect } from "react";
import { useWallet } from "./WalletContext";
import { sorobanService } from "../services/sorobanService";

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
      setRole(userRole === "none" ? "unregistered" : userRole);
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
