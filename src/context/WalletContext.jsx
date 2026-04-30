import React, { createContext, useContext } from 'react';
import { useMultiWallet } from './MultiWalletContext';

const WalletContext = createContext();

/**
 * @deprecated Use MultiWalletProvider instead. 
 * This is kept for backward compatibility with existing components.
 */
export function WalletProvider({ children }) {
  return <>{children}</>;
}

export const useWallet = () => {
  const { 
    stellarAddress, 
    connectFreighter, 
    disconnectFreighter, 
    isStellarConnected 
  } = useMultiWallet();

  return {
    stellarAddress,
    walletAddress: stellarAddress, // legacy alias
    isConnected: isStellarConnected,
    loading: false, 
    connectWallet: connectFreighter,
    disconnectWallet: disconnectFreighter
  };
};
