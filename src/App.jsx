import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Button from './components/Button';
import { ShieldCheck } from 'lucide-react';
import Home from './pages/Home';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import AIAssistant from './pages/AIAssistant';

import { WalletProvider, useWallet } from './context/WalletContext';
import { RoleProvider } from './context/RoleContext';
import RoleSelection from './pages/RoleSelection';
import ConfirmBooking from './pages/ConfirmBooking';

const AUTHORIZED_DOCTOR = 'GDK7TWNN3H57JWZBBC4V3BQNI3NTHSUDEVDZB5DGPPCULFJRIP3APG42';

const ProtectedRoute = ({ children, allowedRole = null }) => {
  const { stellarAddress } = useWallet();
  
  if (!stellarAddress) return <Navigate to="/" />;
  
  // Special check for Doctor Page
  if (allowedRole === 'doctor' && stellarAddress !== AUTHORIZED_DOCTOR) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                  <ShieldCheck className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4">Unauthorized Access</h2>
              <p className="text-slate-400 max-w-md leading-relaxed">
                  The Physician Portal is strictly restricted to authorized medical personnel on the Stellar Testnet. 
                  Your connected wallet is not whitelisted for these operations.
              </p>
              <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[10px] text-rose-400/70">
                  {stellarAddress}
              </div>
              <Button onClick={() => window.location.href = '/select-role'} className="mt-8">Return to Portal</Button>
          </div>
      );
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <WalletProvider>
        <RoleProvider>
          <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/select-role" element={<RoleSelection />} />
                  <Route path="/doctor" element={<ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
                  <Route path="/patient" element={<ProtectedRoute allowedRole="patient"><PatientDashboard /></ProtectedRoute>} />
                  <Route path="/assistant" element={<AIAssistant />} />
                  <Route path="/confirm-booking" element={<ConfirmBooking />} />
                </Routes>
            </main>
          
          <footer className="py-8 text-center text-slate-600 text-xs border-t border-slate-900 mt-20">
            <p>© 2026 DecentraCare • Powered by Stellar Soroban</p>
          </footer>
        </div>
        </RoleProvider>
      </WalletProvider>
    </Router>
  );
}

export default App;
