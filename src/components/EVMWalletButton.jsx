import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function EVMWalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
            className="w-full"
          >
            {(() => {
              if (!connected) {
                return (
                  <button 
                    onClick={openConnectModal} 
                    type="button" 
                    className="w-full py-4 px-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                             <div className="w-6 h-6 flex items-center justify-center text-xl">🌈</div>
                        </div>
                        <div>
                            <div className="text-base font-bold text-white">EVM Wallets</div>
                            <div className="text-xs text-slate-500">MetaMask, Coinbase, WalletConnect</div>
                        </div>
                    </div>
                    <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all">
                        Connect
                    </div>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button 
                    onClick={openChainModal} 
                    type="button" 
                    className="w-full py-4 px-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold text-center hover:bg-rose-500/20 transition-all"
                  >
                    Switch to Sepolia
                  </button>
                );
              }

              return (
                <button
                    onClick={openAccountModal}
                    type="button"
                    className="w-full py-4 px-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-between group hover:border-cyan-500/40 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">
                            {chain.iconUrl ? (
                                <img alt={chain.name} src={chain.iconUrl} className="w-5 h-5" />
                            ) : "E"}
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-bold text-white">{account.displayName}</div>
                            <div className="text-[10px] text-cyan-400 font-mono">{account.displayBalance}</div>
                        </div>
                    </div>
                    <div className="text-slate-500 group-hover:text-cyan-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
