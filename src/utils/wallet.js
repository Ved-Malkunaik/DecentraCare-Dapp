import { getAddress, isConnected as checkIsConnected } from "@stellar/freighter-api";

export const getWalletAddress = async () => {
  try {
    const result = await getAddress();
    // Freighter might return { address: "G..." } or just "G..." depending on version
    if (typeof result === 'string') {
      return result;
    }
    return result?.address || "";
  } catch (error) {
    console.error("Failed to get wallet address:", error);
    return "";
  }
};

export const checkWalletConnection = async () => {
  try {
    const connected = await checkIsConnected();
    // Some versions return { isConnected: true }
    if (typeof connected === 'boolean') return connected;
    return connected?.isConnected || false;
  } catch (error) {
    console.error("Failed to check wallet connection:", error);
    return false;
  }
};
