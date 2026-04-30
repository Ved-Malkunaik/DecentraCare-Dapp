import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import Card from '../components/Card';
import { 
  Stethoscope, 
  User, 
  ShieldCheck, 
  ArrowRight,
  Globe,
  Zap
} from 'lucide-react';
import { useMultiWallet } from '../context/MultiWalletContext';
import { dbService } from '../services/supabaseService';

const AUTHORIZED_DOCTOR = 'GDK7TWNN3H57JWZBBC4V3BQNI3NTHSUDEVDZB5DGPPCULFJRIP3APG42';

export default function RoleSelection() {
  const { activeAddress, stellarAddress } = useMultiWallet();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = React.useState('');

  if (!activeAddress) return <Navigate to="/" />;

  const roles = [
    {
      id: 'doctor',
      title: 'Sign in as a Doctor',
      description: 'Create prescriptions, manage patient records, and sign ZK-proofs.',
      icon: <Stethoscope className="w-8 h-8 text-blue-400" />,
      path: '/doctor',
      color: 'blue'
    },
    {
      id: 'patient',
      title: 'Sign in as a Patient',
      description: 'View your medical history, share QR codes, and book appointments.',
      icon: <User className="w-8 h-8 text-emerald-400" />,
      path: '/patient',
      color: 'emerald'
    }
  ];

  const handleDoctorNav = async () => {
    setErrorMsg('');
    
    // For this demo, only the specific Stellar address is whitelisted as a doctor
    if (activeAddress !== AUTHORIZED_DOCTOR) {
        setErrorMsg(`Doctor Access Denied. Whitelist required for this role.`);
        return;
    }
    
    await dbService.upsertUser({ wallet_address: activeAddress, role: 'doctor', name: 'Dr. Vijay Bharne' });
    navigate('/doctor');
  };

  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 tracking-tighter">
          Select Your Portal
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
          Navigate directly to your dedicated dashboard using your connected wallet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {roles.map((role) => (
          <Card 
            key={role.id}
            onClick={async () => {
                if (role.id === 'doctor') {
                    await handleDoctorNav();
                } else {
                    await dbService.upsertUser({ wallet_address: activeAddress, role: 'patient' });
                    navigate(role.path);
                }
            }}
            className={`p-8 border-2 border-slate-900 bg-slate-900/40 hover:bg-slate-900/80 transition-all cursor-pointer group hover:scale-[1.05] hover:border-slate-700 relative overflow-hidden ${role.id === 'doctor' && activeAddress !== AUTHORIZED_DOCTOR ? 'opacity-70 saturate-50' : ''}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full bg-${role.color}-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <div className={`w-14 h-14 rounded-2xl bg-${role.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              {role.icon}
            </div>

            <h3 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-white transition-colors">
              {role.title}
            </h3>
            
            <p className="text-slate-500 text-sm leading-relaxed mb-8 group-hover:text-slate-400 transition-colors">
              {role.description}
            </p>

            {role.id === 'doctor' && (
                <div className="mb-4 text-[9px] font-mono text-blue-500/60 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                    Whitelist Required: {AUTHORIZED_DOCTOR.substring(0,6)}...{AUTHORIZED_DOCTOR.substring(52)}
                </div>
            )}

            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-100 transition-colors">
              Enter Portal <ArrowRight className="w-4 h-4" />
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-20 p-8 rounded-3xl bg-slate-900/20 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5" />
          {errorMsg && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-6 w-full max-w-sm px-6 py-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center gap-3 text-rose-500 animate-in slide-in-from-bottom-2 duration-300">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <p className="text-xs font-bold uppercase tracking-tight">{errorMsg}</p>
              </div>
          )}
          <div className="flex items-center gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeAddress.startsWith('0x') ? 'bg-purple-500/20' : 'bg-cyan-500/20'}`}>
                  {activeAddress.startsWith('0x') ? <Globe className="w-6 h-6 text-purple-500" /> : <Zap className="w-6 h-6 text-cyan-500" />}
              </div>
              <div>
                  <h4 className="font-bold text-slate-200 uppercase tracking-tight text-sm">Identity Linked</h4>
                  <p className="text-xs font-mono text-slate-500 truncate max-w-[200px] sm:max-w-none">{activeAddress}</p>
              </div>
          </div>
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic relative z-10">
              Multi-Chain Protocol: {activeAddress.startsWith('0x') ? 'Ethereum/EVM' : 'Stellar Soroban'}
          </div>
      </div>
    </div>
  );
}
