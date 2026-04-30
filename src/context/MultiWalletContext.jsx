import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { setAllowed } from '@stellar/freighter-api';
import albedo from '@albedo-link/intent';
import { getWalletAddress, checkWalletConnection } from '../utils/wallet';
import toast from 'react-hot-toast';

const MultiWalletContext = createContext();

export function MultiWalletProvider({ children }) {
  const [stellarAddress, setStellarAddress] = useState(localStorage.getItem('stellar_wallet_address') || '');
  const { address: evmAddress, isConnected: isEVMConnected } = useAccount();
  const { disconnect: disconnectEVM } = useDisconnect();
  
  const [walletTypeConnected, setWalletTypeConnected] = useState(localStorage.getItem('wallet_type_connected') || 'none');

  // Update Wallet Type based on connected addresses
  const updateWalletStatus = () => {
    const hasStellar = !!stellarAddress;
    const hasEVM = !!evmAddress;
    
    let type = 'none';
    if (hasStellar && hasEVM) type = 'both';
    else if (hasStellar) type = 'stellar';
    else if (hasEVM) type = 'evm';
    
    setWalletTypeConnected(type);
    localStorage.setItem('wallet_type_connected', type);
  };

  // Sync state with localStorage and account changes
  useEffect(() => {
    if (evmAddress) {
      localStorage.setItem('evm_wallet_address', evmAddress);
    } else {
      localStorage.removeItem('evm_wallet_address');
    }
    updateWalletStatus();
  }, [evmAddress]);

  useEffect(() => {
    if (stellarAddress) {
      localStorage.setItem('stellar_wallet_address', stellarAddress);
    } else {
      localStorage.removeItem('stellar_wallet_address');
    }
    updateWalletStatus();
  }, [stellarAddress]);

  // Initial Check for Stellar
  useEffect(() => {
    const checkStellar = async () => {
      if (stellarAddress) {
        try {
          // If it looks like a Stellar address, we'll keep it. 
          // Real-time connection checking for both Freighter/Albedo can be complex
          // but for this demo, persistence via localStorage is primary.
        } catch (e) {
          console.error("Stellar persistence check failed", e);
        }
      }
    };
    checkStellar();
  }, []);

  const connectFreighter = async () => {
    try {
      await setAllowed();
      const addr = await getWalletAddress();
      if (addr) {
        setStellarAddress(addr);
        toast.success('Freighter wallet connected!');
        return addr;
      }
    } catch (error) {
      console.error('Freighter connection failed', error);
      toast.error('Failed to connect Freighter wallet.');
      throw error;
    }
  };

  const connectAlbedo = async () => {
    try {
      const result = await albedo.publicKey({});
      if (result.pubkey) {
        setStellarAddress(result.pubkey);
        toast.success('Albedo wallet connected!');
        return result.pubkey;
      }
    } catch (error) {
      console.error('Albedo connection failed', error);
      if (error.message !== 'Window closed by user') {
        toast.error('Failed to connect Albedo wallet.');
      }
      throw error;
    }
  };

  const disconnectFreighter = () => {
    setStellarAddress('');
    toast.success('Stellar wallet disconnected');
  };

  const disconnectAll = () => {
    disconnectFreighter();
    disconnectEVM();
    toast.success('All wallets disconnected');
  };

  return (
    <MultiWalletContext.Provider value={{
      stellarAddress,
      evmAddress,
      activeAddress: stellarAddress || evmAddress,
      walletTypeConnected,
      connectFreighter,
      connectAlbedo,
      disconnectFreighter,
      disconnectEVM,
      disconnectAll,
      isEVMConnected,
      isStellarConnected: !!stellarAddress
    }}>
      {children}
    </MultiWalletContext.Provider>
  );
}

export const useMultiWallet = () => useContext(MultiWalletContext);
