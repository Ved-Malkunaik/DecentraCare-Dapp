import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAllowed } from '@stellar/freighter-api';
import { getWalletAddress, checkWalletConnection } from '../utils/wallet';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      if (await checkWalletConnection()) {
        const address = await getWalletAddress();
        if (address && typeof address === 'string') {
          setWalletAddress(address);
          setIsConnected(true);
        }
      }
    } catch (e) {
      console.error('Stellar checks failed', e);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      await setAllowed();
      const address = await getWalletAddress();
      if (address && typeof address === 'string') {
        setWalletAddress(address);
        setIsConnected(true);
      }
      return address;
    } catch (error) {
      console.error('Freighter connection failed', error);
      alert('Failed to connect Freighter wallet.');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
  };

  return (
    <WalletContext.Provider value={{
      stellarAddress: walletAddress,
      walletAddress,
      isConnected,
      loading,
      connectWallet,
      disconnectWallet
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
