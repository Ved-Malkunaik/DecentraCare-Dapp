import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Activity, Shield, Stethoscope, LogOut, Menu, X, ChevronRight, Globe, Zap } from 'lucide-react';
import { useMultiWallet } from '../context/MultiWalletContext';
import { useRole } from '../context/RoleContext';
import Button from './Button';
import EVMWalletButton from './EVMWalletButton';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const {
    stellarAddress,
    evmAddress,
    connectFreighter,
    connectAlbedo,
    disconnectFreighter,
    disconnectEVM,
    disconnectAll,
    isEVMConnected,
    isStellarConnected
  } = useMultiWallet();
  
  const { role } = useRole();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const links = [
    { name: 'Home', path: '/' },
    { name: 'Doctor', path: '/doctor' },
    { name: 'Patient', path: '/patient' },
    { name: 'Assistant', path: '/assistant' },
  ];

  const shortenAddress = (addr) => addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : '';

  const handleStellarConnect = async () => {
    try {
        await connectFreighter();
        setIsWalletModalOpen(false);
    } catch (e) {
        // Error handled in context
    }
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center group-hover:bg-transparent transition-colors duration-300">
              <Activity className="text-cyan-400 group-hover:text-white transition-colors duration-300 w-5 h-5" />
            </div>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 group-hover:to-slate-200 transition-all">
            DecentraCare
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 bg-slate-900/50 p-1 rounded-full border border-slate-800 backdrop-blur-md">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${location.pathname === link.path
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Real Web3 Role Badge */}
          {(stellarAddress || evmAddress) && role && !['none', 'unregistered'].includes(role) && (
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-black text-[10px] uppercase tracking-widest ${role === 'doctor' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
               {role === 'doctor' ? <Stethoscope className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
               {role}
            </div>
          )}

          {!stellarAddress && !evmAddress ? (
            <Button 
                onClick={() => {
                  const gateway = document.getElementById('wallet-gateway');
                  if (location.pathname === '/' && gateway) {
                    gateway.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setIsWalletModalOpen(true);
                  }
                }} 
                variant="primary" 
                className="rounded-full px-6 h-11 text-xs sm:text-sm font-bold tracking-wide"
            >
              Connect Wallet
            </Button>
          ) : (
            <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-3 px-4 h-11 bg-slate-900 border border-slate-800 rounded-full">
                    {stellarAddress && (
                        <div className={`flex items-center gap-2 ${evmAddress ? 'pr-3 border-r border-slate-800' : ''}`}>
                             <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                             <span className="font-mono text-[10px] text-slate-300">Stellar: {shortenAddress(stellarAddress)}</span>
                        </div>
                    )}
                    {evmAddress && (
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                             <span className="font-mono text-[10px] text-slate-300">EVM: {shortenAddress(evmAddress)}</span>
                        </div>
                    )}
                </div>
                
                <button 
                  onClick={disconnectAll} 
                  className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-400/30 hover:bg-rose-400/5 transition-all"
                  title="Disconnect All Wallets"
                >
                    <LogOut className="w-4 h-4" />
                </button>
                
                {!stellarAddress && (
                   <button 
                    onClick={() => {
                      const gateway = document.getElementById('wallet-gateway');
                      if (location.pathname === '/' && gateway) {
                        gateway.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        setIsWalletModalOpen(true);
                      }
                    }} 
                    className="hidden sm:block p-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all" 
                    title="Connect Stellar"
                   >
                      <Zap className="w-4 h-4" />
                   </button>
                )}
                {!evmAddress && (
                   <button 
                    onClick={() => {
                      const gateway = document.getElementById('wallet-gateway');
                      if (location.pathname === '/' && gateway) {
                        gateway.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        setIsWalletModalOpen(true);
                      }
                    }} 
                    className="hidden sm:block p-2.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all" 
                    title="Connect EVM"
                   >
                      <Globe className="w-4 h-4" />
                   </button>
                )}
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Wallet Selection Modal */}
      <AnimatePresence>
        {isWalletModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWalletModalOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden my-auto z-[101]"
            >
              <div className="absolute top-0 right-0 p-6">
                <button 
                  onClick={() => setIsWalletModalOpen(false)} 
                  className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-10">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20 rotate-3">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight mb-2">Connect Gateway</h2>
                <p className="text-slate-400 font-medium">Choose your preferred blockchain network to enter the portal.</p>
              </div>

              <div className="space-y-4">
                {/* Stellar Option */}
                {!isStellarConnected ? (
                   <div className="space-y-3">
                     {/* Freighter */}
                     <button 
                      onClick={handleStellarConnect}
                      className="w-full group p-5 bg-slate-950/50 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 rounded-3xl transition-all duration-300 flex items-center justify-between"
                     >
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-cyan-500/30">
                               <Zap className="w-6 h-6 text-cyan-500" />
                          </div>
                          <div className="text-left">
                              <div className="text-sm font-bold text-white group-hover:text-cyan-400">Freighter Wallet</div>
                              <div className="text-xs text-slate-500 font-medium uppercase tracking-widest">Stellar Browser Extension</div>
                          </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                     </button>

                     {/* Albedo */}
                     <button 
                      onClick={async () => {
                        await connectAlbedo();
                        setIsWalletModalOpen(false);
                      }}
                      className="w-full group p-5 bg-slate-950/50 hover:bg-blue-500/10 border border-slate-800 hover:border-blue-500/30 rounded-3xl transition-all duration-300 flex items-center justify-between"
                     >
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-blue-500/30">
                               <Globe className="w-6 h-6 text-blue-500" />
                          </div>
                          <div className="text-left">
                              <div className="text-sm font-bold text-white group-hover:text-blue-400">Albedo Wallet</div>
                              <div className="text-xs text-slate-500 font-medium uppercase tracking-widest">Stellar Web Wallet</div>
                          </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                     </button>
                   </div>
                ) : (
                    <div className="w-full p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-white">Stellar Connected</div>
                                <div className="text-[10px] text-cyan-400 font-mono tracking-tighter">{shortenAddress(stellarAddress)}</div>
                            </div>
                        </div>
                        <button onClick={disconnectFreighter} className="text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest">Disconnect</button>
                    </div>
                )}

                {/* EVM Option */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-[2rem] opacity-0 group-hover:opacity-20 transition-opacity blur" />
                  <div className="relative">
                    <EVMWalletButton />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Secure Dual-Chain Access</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-slate-950 border-b border-slate-800 p-4 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === link.path
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            {stellarAddress && role && !['none', 'unregistered'].includes(role) && (
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 rounded-xl border border-slate-800 w-fit">
                 {role === 'doctor' ? <Stethoscope className="w-4 h-4 text-cyan-400" /> : <Shield className="w-4 h-4 text-blue-400" />}
                 <span className="text-xs font-bold uppercase tracking-widest text-slate-300">{role}</span>
              </div>
            )}
        </div>
      )}
    </nav>
  );
}
