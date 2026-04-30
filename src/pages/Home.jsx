import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, Activity, FileKey, Calendar,
  Lock, Zap, Users, Globe, Database, BrainCircuit, HeartPulse
} from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { useRole } from '../context/RoleContext';
import { useMultiWallet } from '../context/MultiWalletContext';
import EVMWalletButton from '../components/EVMWalletButton';

const FeatureItem = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    <Card className="h-full hover:-translate-y-2 transition-all duration-500 border-slate-800 bg-slate-900/40 backdrop-blur-xl p-8 group">
      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-6 group-hover:border-cyan-500/50 transition-colors">
        <Icon className="w-7 h-7 text-cyan-500" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm group-hover:text-slate-300 transition-colors">{description}</p>
    </Card>
  </motion.div>
);

const StatCard = ({ label, value, subtext }) => (
  <div className="text-center p-6 rounded-3xl bg-slate-950/50 border border-white/5 backdrop-blur-sm">
    <div className="text-4xl font-black text-white mb-1 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">{value}</div>
    <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500/60 mb-2">{label}</div>
    <div className="text-[10px] text-slate-600 font-medium">{subtext}</div>
  </div>
);

export default function Home() {
  const navigate = useNavigate();
  const { role } = useRole();
  const { activeAddress, stellarAddress, evmAddress, connectFreighter, connectAlbedo } = useMultiWallet();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative w-full overflow-x-hidden">
      {/* Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-cyan-500 origin-left z-[60]" style={{ scaleX }} />

      {/* 🚀 Hero Section */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center py-20 px-4 text-center relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-1/4 -left-1/4 w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -right-1/4 w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-cyan-400 text-xs font-black uppercase tracking-widest mb-8">
            <Globe className="w-3.5 h-3.5" /> Empowering Patient Autonomy
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black max-w-5xl tracking-tight leading-[1.1] mb-8">
            <span className="text-slate-100">Healthcare</span> <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">Reimagined.</span>
          </h1>

          <p className="text-lg sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
            The world's first privacy-first medical ecosystem powered by
            <span className="text-white"> Stellar Soroban</span>. Secure, auditable, and entirely yours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button
              onClick={() => {
                if (activeAddress) {
                  navigate('/select-role');
                } else {
                  document.getElementById('wallet-gateway')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-12 py-6 text-xl rounded-2xl shadow-2xl shadow-cyan-500/20 group h-16 w-full sm:w-auto"
            >
              {activeAddress ? "Enter the Portal" : "Start Your Journey"} <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <div className="flex items-center gap-3 text-slate-500 font-bold px-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>Audited on Testnet</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 💳 Wallet Gateway Section (Big Area Below Partition) */}
      {(!stellarAddress || !evmAddress) && (
        <section id="wallet-gateway" className="py-24 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 opacity-50" />
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-cyan-500 mb-4">Onboarding</h2>
              <h3 className="text-4xl md:text-6xl font-black text-white mb-6">Connect Your Gateway</h3>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                Choose your preferred blockchain network to securely access your medical records and book appointments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Stellar Card */}
              <Card 
                className="p-10 border-slate-800 bg-slate-900/40 backdrop-blur-xl hover:border-cyan-500/50 transition-all duration-500 group"
              >
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-3xl flex items-center justify-center group-hover:border-cyan-500/30 transition-colors shadow-2xl">
                    <Zap className="w-10 h-10 text-cyan-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">Stellar Network</h4>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Stellar Identity</p>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed mb-10 text-sm">
                  The primary network for Soroban smart contracts. Secure, high-speed medical record issuance.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={connectFreighter}
                    className="flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group/btn"
                  >
                    <span className="text-sm font-bold text-slate-300 group-hover/btn:text-cyan-400">Use Freighter</span>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover/btn:text-cyan-400 group-hover/btn:translate-x-1 transition-all" />
                  </button>
                  <button 
                    onClick={connectAlbedo}
                    className="flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group/btn"
                  >
                    <span className="text-sm font-bold text-slate-300 group-hover/btn:text-blue-400">Use Albedo</span>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover/btn:text-blue-400 group-hover/btn:translate-x-1 transition-all" />
                  </button>
                </div>
              </Card>

              {/* EVM Card */}
              <Card className="p-10 border-slate-800 bg-slate-900/40 backdrop-blur-xl hover:border-purple-500/50 transition-all duration-500 group relative overflow-hidden">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-3xl flex items-center justify-center group-hover:border-purple-500/30 transition-colors shadow-2xl">
                    <Globe className="w-10 h-10 text-purple-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">EVM Chains</h4>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">MetaMask / WalletConnect</p>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed mb-10 text-sm">
                  Access the portal using your Ethereum or Sepolia identity. Seamless cross-chain identity management.
                </p>
                <div className="relative z-10">
                  <EVMWalletButton />
                </div>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* 📊 Network Stats */}
      <section className="py-20 border-y border-white/5 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          <StatCard label="Network Uptime" value="99.9%" subtext="Distributed Soroban Nodes" />
          <StatCard label="Total Bookings" value="20+" subtext="On-Chain Validated" />
          <StatCard label="Data Privacy" value="100%" subtext="Zero Knowledge Protocol" />
          <StatCard label="Processing" value="< 5s" subtext="Average Ledger Latency" />
        </div>
      </section>

      {/* 🛡️ Core Features */}
      <section className="py-32 px-4 max-w-7xl mx-auto overflow-hidden">
        <div className="text-center mb-24">
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-cyan-500 mb-4">Architecture</h2>
          <h3 className="text-4xl md:text-6xl font-black text-white">Advanced Blockchain Core</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureItem
            icon={Calendar}
            title="Smart Booking"
            description="Direct P2P scheduling without intermediaries. Appointments are cryptographically secured on the Stellar ledger."
            delay={0.1}
          />
          <FeatureItem
            icon={FileKey}
            title="Identity Control"
            description="Self-sovereign medical identity. Your data stays in your wallet, only shared explicitly with authorized physicians."
            delay={0.2}
          />
          <FeatureItem
            icon={ShieldCheck}
            title="Immutable Records"
            description="Once a record is issued, it can never be altered. Verify authenticity in real-time across the global network."
            delay={0.3}
          />
          <FeatureItem
            icon={BrainCircuit}
            title="AI Diagnostics"
            description="Privately consult with our AI Assistant to triage symptoms before committing to a provider visit."
            delay={0.1}
          />
          <FeatureItem
            icon={Lock}
            title="Vault Encryption"
            description="AES-256 equivalent encryption for all metadata, with transaction hashes stored on-chain for verification."
            delay={0.2}
          />
          <FeatureItem
            icon={Zap}
            title="Instant Settle"
            description="Healthcare billing and verification happen in sub-seconds using the high-performance Stellar network."
            delay={0.3}
          />
        </div>
      </section>

      {/* 🛤️ How It Works (Visual Flow) - Commented out for now
      <section className="py-32 bg-slate-900/20 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1 space-y-8">
              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">Coming soon... <br />Zero-Trust <br /><span className="text-cyan-500">Infrastructure</span></h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Traditional healthcare systems rely on centralized databases—single points of failure.
                DecentraCare decentralizes trust, ensuring your privacy isn't just a promise, it's enforced by code.
              </p>
              <div className="space-y-6 pt-6">
                {[
                  { step: "01", text: "Onboard via Freighter Wallet securely" },
                  { step: "02", text: "Cryptographic identity verification" },
                  { step: "03", text: "Direct Smart Contract interaction" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-6 group">
                    <span className="text-2xl font-black text-slate-800 group-hover:text-cyan-500/50 transition-colors uppercase italic">{item.step}</span>
                    <span className="text-slate-300 font-bold group-hover:translate-x-2 transition-transform">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="aspect-square bg-gradient-to-br from-cyan-500/10 to-blue-600/5 rounded-full blur-3xl absolute inset-0" />
              <Card className="relative z-10 border-slate-800 bg-slate-950/80 p-10 transform rotate-2 hover:rotate-0 transition-transform duration-700">
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">ledger_status_active</div>
                  </div>
                  <div className="space-y-4 font-mono text-xs text-cyan-500/60 leading-relaxed">
                    <p>const contract = new SorobanContract("CAU6...");</p>
                    <p>const result = await contract.call("book_appt", {"{"}</p>
                    <p className="ml-4">patient: "GA...",</p>
                    <p className="ml-4">doctor: "GD...",</p>
                    <p className="ml-4">access: true</p>
                    <p>{"}"});</p>
                    <p className="text-emerald-500">{">>"} Success. Tx Hash: 0x82f...a1</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* 🔮 Final CTA */}
      <section className="py-40 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

          <HeartPulse className="w-20 h-20 text-cyan-500 mx-auto mb-10 animate-pulse" />
          <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">Ready to take control?</h2>
          <p className="text-slate-400 text-lg mb-12 max-w-xl mx-auto font-medium">
            Join the decentralized healthcare revolution on the Stellar Testnet today. No accounts, no trackers—just you and your health.
          </p>
          <Button
            onClick={() => navigate('/select-role')}
            className="px-12 py-7 text-2xl h-16 rounded-[1.25rem] shadow-2xl shadow-cyan-500/30"
          >
            Enter the Portal <Users className="w-6 h-6 ml-3" />
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
