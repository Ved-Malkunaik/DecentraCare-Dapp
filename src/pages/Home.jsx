import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Activity, FileKey, Calendar } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useRole } from '../context/RoleContext';
import { useEffect } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const { role } = useRole();

  useEffect(() => {
    if (role && role !== 'none') {
        // Redirect to selection screen once wallet is connected
        navigate('/select-role');
    }
  }, [role, navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-12 lg:py-24 text-center">

      <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold max-w-4xl tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mb-6 drop-shadow-sm">
        Privacy-Preserving Healthcare on <br className="hidden md:block"/> <span className="text-cyan-400">Stellar Blockchain</span>
      </h1>
      
      <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
        Securely book appointments, manage your medical data, and verify prescriptions with full privacy using DecentraCare.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => navigate('/select-role')} className="px-10 py-5 text-xl rounded-2xl shadow-2xl shadow-cyan-500/20">
          Enter DecentraCare <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl text-left">
        <Card className="hover:-translate-y-2 transition-all border-slate-800 bg-slate-900/50 backdrop-blur-sm p-8">
          <Calendar className="w-12 h-12 text-cyan-500 mb-6" />
          <h3 className="text-2xl font-bold text-slate-100 mb-3">Instant Booking</h3>
          <p className="text-slate-400 leading-relaxed text-sm">Anyone can become a patient and book an appointment with a registered doctor in seconds via the Soroban network.</p>
        </Card>
        <Card className="hover:-translate-y-2 transition-all border-slate-800 bg-slate-900/50 backdrop-blur-sm p-8">
          <FileKey className="w-12 h-12 text-blue-500 mb-6" />
          <h3 className="text-2xl font-bold text-slate-100 mb-3">Patient Privacy</h3>
          <p className="text-slate-400 leading-relaxed text-sm">Control exactly who sees your medical history. Access is identity-based and can be revoked at any time.</p>
        </Card>
        <Card className="hover:-translate-y-2 transition-all border-slate-800 bg-slate-900/50 backdrop-blur-sm p-8">
          <ShieldCheck className="w-12 h-12 text-purple-500 mb-6" />
          <h3 className="text-2xl font-bold text-slate-100 mb-3">Tamper-Proof</h3>
          <p className="text-slate-400 leading-relaxed text-sm">Prescriptions and records are immutable. Pharmacy and insurance verification happen without sharing raw data.</p>
        </Card>
      </div>
    </div>
  );
}
