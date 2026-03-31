import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Activity, Shield, Stethoscope, LogOut, Menu, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useRole } from '../context/RoleContext';
import Button from './Button';

export default function Navbar() {
  const {
    stellarAddress,
    connectWallet,
    disconnectWallet
  } = useWallet();
  const { role } = useRole();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { name: 'Home', path: '/' },
    { name: 'Doctor', path: '/doctor' },
    { name: 'Patient', path: '/patient' },
  ];

  const shortenAddress = (addr) => addr ? `${addr.slice(0, 5)}...${addr.slice(-4)}` : '';

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
          {stellarAddress && role && !['none', 'unregistered'].includes(role) && (
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-black text-[10px] uppercase tracking-widest ${role === 'doctor' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
               {role === 'doctor' ? <Stethoscope className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
               {role}
            </div>
          )}

          {!stellarAddress ? (
            <Button onClick={connectWallet} variant="primary" className="rounded-full px-6 h-11 text-xs sm:text-sm font-bold tracking-wide">
              Connect Freighter
            </Button>
          ) : (
            <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 px-3 h-10 bg-slate-900 border border-slate-800 rounded-full font-mono text-[10px] text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {shortenAddress(stellarAddress)}
                </div>
                <button 
                  onClick={disconnectWallet} 
                  className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-400/30 hover:bg-rose-400/5 transition-all"
                  title="Disconnect Wallet"
                >
                    <LogOut className="w-4 h-4" />
                </button>
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
