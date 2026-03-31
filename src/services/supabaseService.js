import { createClient } from '@supabase/supabase-js';

// ─── Configuration ──────────────────────────────────────────────────────────
// Add these to your .env file:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!isConfigured) {
  console.warn('[DecentraCare DB] Supabase not configured. Running in localStorage-only mode.');
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ─── DB Service ──────────────────────────────────────────────────────────────
export const dbService = {

  // ── 1. USERS / WALLET REGISTRY ────────────────────────────────────────────

  /**
   * Upsert a user (patient or doctor) by wallet address.
   * Called when a wallet connects for the first time.
   */
  async upsertUser({ wallet_address, role, name = null }) {
    if (supabase) {
      const { error } = await supabase
        .from('users')
        .upsert({ wallet_address, role, name }, { onConflict: 'wallet_address' });
      if (error) console.error('[DB] upsertUser error:', error.message);
    }
    // Mirror to localStorage
    const users = lsGet('dc_users');
    const idx = users.findIndex(u => u.wallet_address === wallet_address);
    if (idx === -1) users.push({ wallet_address, role, name, created_at: new Date().toISOString() });
    else users[idx] = { ...users[idx], role, name };
    lsSet('dc_users', users);
  },

  // ── 2. APPOINTMENTS ───────────────────────────────────────────────────────

  /**
   * Record a new appointment booking.
   * Called from PatientDashboard when patient confirms appointment.
   */
  async insertAppointment({ patient_wallet, doctor_wallet, date, reason, tx_hash = null, is_simulated = true }) {
    const record = {
      patient_wallet,
      doctor_wallet,
      date: date || new Date().toISOString().split('T')[0],
      reason,
      status: 'pending',
      tx_hash,
      is_simulated,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase.from('appointments').insert(record);
      if (error) console.error('[DB] insertAppointment error:', error.message);
    }

    // Mirror to localStorage (deduplication on patient+doctor)
    const existing = lsGet('decentracare_sim_pending');
    const alreadyExists = existing.some(a =>
      a.patient === patient_wallet && a.doctor === doctor_wallet && a.status !== 'completed'
    );
    if (!alreadyExists) {
      existing.push({ ...record, patient: patient_wallet, doctor: doctor_wallet });
      lsSet('decentracare_sim_pending', existing);
    }
  },

  /**
   * Fetch all pending appointments for a doctor.
   */
  async getPendingAppointments(doctor_wallet) {
    if (supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_wallet', doctor_wallet)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
      console.error('[DB] getPendingAppointments error:', error?.message);
    }
    // localStorage fallback
    return lsGet('decentracare_sim_pending')
      .filter(a => a.doctor === doctor_wallet || a.doctor_wallet === doctor_wallet);
  },

  /**
   * Mark an appointment as completed (after prescription issued).
   */
  async completeAppointment(patient_wallet, doctor_wallet) {
    if (supabase) {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('patient_wallet', patient_wallet)
        .eq('doctor_wallet', doctor_wallet)
        .eq('status', 'pending');
      if (error) console.error('[DB] completeAppointment error:', error.message);
    }
    // localStorage fallback
    const existing = lsGet('decentracare_sim_pending');
    const updated = existing.filter(a =>
      !(a.patient === patient_wallet && a.doctor === doctor_wallet)
    );
    lsSet('decentracare_sim_pending', updated);
  },

  // ── 3. CONSULTATIONS / PRESCRIPTIONS ─────────────────────────────────────

  /**
   * Save a new consultation/prescription record.
   * Called from DoctorDashboard after prescription is issued.
   */
  async insertConsultation({ doctor_wallet, patient_wallet, prescription_id, medication, diagnosis, tx_hash = null, is_simulated = true }) {
    const record = {
      doctor_wallet,
      patient_wallet,
      prescription_id,
      medication,
      diagnosis,
      tx_hash,
      is_simulated,
      timestamp: Math.floor(Date.now() / 1000),
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase.from('consultations').insert(record);
      if (error) console.error('[DB] insertConsultation error:', error.message);
    }

    // Mirror to localStorage
    const existing = lsGet('decentracare_sim_consults');
    existing.push({ ...record, doctor: doctor_wallet, patient: patient_wallet });
    lsSet('decentracare_sim_consults', existing);
  },

  /**
   * Fetch all consultations for a doctor (for My Consultations panel).
   */
  async getConsultationsByDoctor(doctor_wallet) {
    if (supabase) {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('doctor_wallet', doctor_wallet)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
      console.error('[DB] getConsultationsByDoctor error:', error?.message);
    }
    return lsGet('decentracare_sim_consults')
      .filter(c => c.doctor === doctor_wallet || c.doctor_wallet === doctor_wallet);
  },

  /**
   * Fetch all consultations for a patient (for Consultation History panel).
   */
  async getConsultationsByPatient(patient_wallet) {
    if (supabase) {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_wallet', patient_wallet)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
      console.error('[DB] getConsultationsByPatient error:', error?.message);
    }
    return lsGet('decentracare_sim_consults')
      .filter(c => c.patient === patient_wallet || c.patient_wallet === patient_wallet);
  },

  /**
   * Verify a prescription by its hash ID.
   */
  async verifyPrescription(prescription_id) {
    if (supabase) {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('prescription_id', prescription_id)
        .maybeSingle();
      if (!error) return data;
      console.error('[DB] verifyPrescription error:', error?.message);
    }
    const all = lsGet('decentracare_sim_consults');
    return all.find(c => c.prescription_id === prescription_id) || null;
  },

  /**
   * Delete a consultation by prescription ID.
   * Called from DoctorDashboard when doctor removes a record.
   */
  async deleteConsultation(prescription_id) {
    if (supabase) {
      const { error } = await supabase
        .from('consultations')
        .delete()
        .eq('prescription_id', prescription_id);
      if (error) console.error('[DB] deleteConsultation error:', error.message);
    }
    const existing = lsGet('decentracare_sim_consults');
    lsSet('decentracare_sim_consults', existing.filter(c => c.prescription_id !== prescription_id));
  },

  // ── 4. ACCESS GRANTS ─────────────────────────────────────────────────────

  /**
   * Grant a doctor access to a patient's records (DRY: deduplicates on insert).
   * Called from PatientDashboard on successful booking.
   */
  async grantAccess(patient_wallet, doctor_wallet) {
    if (supabase) {
      const { error } = await supabase
        .from('access_grants')
        .upsert(
          { patient_wallet, doctor_wallet, is_active: true, granted_at: new Date().toISOString() },
          { onConflict: 'patient_wallet,doctor_wallet' }
        );
      if (error) console.error('[DB] grantAccess error:', error.message);
    }
    // localStorage fallback — uses Set for deduplication
    const existing = lsGet('decentracare_sim_access');
    const unique = [...new Set([...existing, patient_wallet])];
    lsSet('decentracare_sim_access', unique);
  },

  /**
   * Get all patients who have granted access to a doctor.
   */
  async getAuthorizedPatients(doctor_wallet) {
    if (supabase) {
      const { data, error } = await supabase
        .from('access_grants')
        .select('patient_wallet')
        .eq('doctor_wallet', doctor_wallet)
        .eq('is_active', true);
      if (!error && data) return data.map(r => r.patient_wallet);
      console.error('[DB] getAuthorizedPatients error:', error?.message);
    }
    return lsGet('decentracare_sim_access');
  },

  // ── 5. ACTIVITY LOG ───────────────────────────────────────────────────────

  /**
   * Log any DApp action for audit trail.
   */
  async logActivity({ wallet_address, action, metadata = {} }) {
    if (!supabase) return;
    const { error } = await supabase.from('activity_log').insert({
      wallet_address,
      action,
      metadata,
      created_at: new Date().toISOString(),
    });
    if (error) console.error('[DB] logActivity error:', error.message);
  },

  /**
   * Diagnostic: Test if Supabase is connected and responding.
   */
  async testConnection() {
    if (!supabase) return { success: false, message: 'Supabase URL/Key missing in .env' };
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      if (error) throw error;
      return { success: true, message: 'Connected successfully to Supabase!' };
    } catch (e) {
      console.error('[DB] Connection test failed:', e.message);
      return { success: false, message: e.message };
    }
  }
};

export default dbService;
