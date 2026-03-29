import { useState, useEffect } from 'react';
import { isAllowed, setAllowed, getAddress, isConnected } from '@stellar/freighter-api';

export function useWallet() {
  const [address, setAddress] = useState('');
  const [isWalletInstalled, setIsWalletInstalled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    try {
      const installed = await isConnected();
      setIsWalletInstalled(installed);

      if (installed) {
        const allowed = await isAllowed();
        if (allowed) {
          const { address: publicKey } = await getAddress();
          if (publicKey) setAddress(publicKey);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const connect = async () => {
    try {
      if (!isWalletInstalled) {
        const errorMsg = 'Freighter wallet not installed.';
        setError(errorMsg);
        alert(errorMsg);
        return;
      }
      
      await setAllowed();
      const { address: publicKey } = await getAddress();
      if (publicKey) {
        setAddress(publicKey);
        setError('');
      }
    } catch (err) {
      const errorMsg = 'Connection failed or rejected.';
      console.error(err);
      setError(errorMsg);
      alert(errorMsg);
    }
  };

  return { address, isWalletInstalled, connect, error };
}
