#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String, Symbol, Vec,
};

#[contracttype]
pub struct PatientProfile {
    pub name: String,
    pub age: u32,
}

#[contracttype]
pub struct DoctorProfile {
    pub name: String,
    pub specialization: String,
}

#[contracttype]
#[derive(Clone)]
pub struct MedicalRecord {
    pub patient: Address,
    pub doctor: Address,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct AccessLogEntry {
    pub actor: Address,
    pub timestamp: u64,
    pub action: Symbol,
}

#[contracttype]
#[derive(Clone)]
pub struct ConsultationRecord {
    pub doctor: Address,
    pub patient: Address,
    pub prescription_id: BytesN<32>,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum Role {
    Patient,
    Doctor,
    Pharmacist,
    Insurer,
}

#[contracttype]
pub struct PharmacistProfile {
    pub name: String,
    pub license_number: String,
}

#[contracttype]
pub struct InsurerProfile {
    pub name: String,
    pub company: String,
}

#[contracttype]
pub enum DataKey {
    Patients(Address),
    Doctors(Address),
    Pharmacists(Address),
    Insurers(Address),
    Records(Address),          // Maps Address -> Vec<BytesN<32>>
    RecordDetails(BytesN<32>), // Maps BytesN<32> -> MedicalRecord
    Access(Address, Address),
    Logs(Address),
    DoctorPatients(Address),  // Maps Doctor -> Vec<Address>
    PendingAppointments(Address), // Maps Doctor -> Vec<Address>
    PatientConsultations(Address), // Maps Patient -> Vec<ConsultationRecord>
    DoctorConsultations(Address),  // Maps Doctor -> Vec<ConsultationRecord>
}#[contract]
pub struct HealthcareDapp;

#[contractimpl]
impl HealthcareDapp {
    pub fn register_patient(env: Env, patient: Address, name: String, age: u32) {
        patient.require_auth();
        let mut roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        if roles.contains_key(patient.clone()) {
            panic!("role already exists");
        }
        roles.set(patient.clone(), Role::Patient);
        env.storage().persistent().set(&symbol_short!("ROLE"), &roles);
        env.storage().persistent().set(&DataKey::Patients(patient), &PatientProfile { name, age });
    }

    pub fn register_doctor(env: Env, doctor: Address, name: String, specialization: String) {
        doctor.require_auth();
        let mut roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        if roles.contains_key(doctor.clone()) {
            panic!("role already exists");
        }
        roles.set(doctor.clone(), Role::Doctor);
        env.storage().persistent().set(&symbol_short!("ROLE"), &roles);
        env.storage().persistent().set(&DataKey::Doctors(doctor), &DoctorProfile { name, specialization });
    }

    pub fn register_pharmacist(env: Env, pharmacist: Address, name: String, license_number: String) {
        pharmacist.require_auth();
        let mut roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        if roles.contains_key(pharmacist.clone()) {
            panic!("role already exists");
        }
        roles.set(pharmacist.clone(), Role::Pharmacist);
        env.storage().persistent().set(&symbol_short!("ROLE"), &roles);
        env.storage().persistent().set(&DataKey::Pharmacists(pharmacist), &PharmacistProfile { name, license_number });
    }

    pub fn register_insurer(env: Env, insurer: Address, name: String, company: String) {
        insurer.require_auth();
        let mut roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        if roles.contains_key(insurer.clone()) {
            panic!("role already exists");
        }
        roles.set(insurer.clone(), Role::Insurer);
        env.storage().persistent().set(&symbol_short!("ROLE"), &roles);
        env.storage().persistent().set(&DataKey::Insurers(insurer), &InsurerProfile { name, company });
    }

    pub fn is_patient(env: Env, address: Address) -> bool {
        let roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        roles.get(address.clone()).unwrap_or(Role::Insurer) == Role::Patient && env.storage().persistent().has(&DataKey::Patients(address))
    }

    pub fn is_doctor(env: Env, address: Address) -> bool {
        let roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        roles.get(address.clone()).unwrap_or(Role::Insurer) == Role::Doctor && env.storage().persistent().has(&DataKey::Doctors(address))
    }

    pub fn is_pharmacist(env: Env, address: Address) -> bool {
        let roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        roles.get(address.clone()).unwrap_or(Role::Patient) == Role::Pharmacist && env.storage().persistent().has(&DataKey::Pharmacists(address))
    }

    pub fn is_insurer(env: Env, address: Address) -> bool {
        let roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        roles.get(address.clone()).unwrap_or(Role::Patient) == Role::Insurer && env.storage().persistent().has(&DataKey::Insurers(address))
    }

    pub fn add_medical_record(
        env: Env, 
        patient: Address, 
        doctor: Address, 
        record_hash: BytesN<32>,
    ) {
        doctor.require_auth();
        if !env.storage().persistent().has(&DataKey::Patients(patient.clone())) || !env.storage().persistent().has(&DataKey::Doctors(doctor.clone())) {
            panic!("patient or doctor not registered");
        }
        if !env.storage().persistent().has(&DataKey::Access(patient.clone(), doctor.clone())) {
            panic!("doctor not authorized to add records");
        }
        if env.storage().persistent().has(&DataKey::RecordDetails(record_hash.clone())) {
            panic!("record with hash already exists");
        }

        let record = MedicalRecord { 
            patient: patient.clone(),
            doctor: doctor.clone(),
            timestamp: env.ledger().timestamp(),
        };

        // Store Record globally for O(1) Pharmacy verification
        env.storage().persistent().set(&DataKey::RecordDetails(record_hash.clone()), &record);

        // Map it to patient
        let mut records: Vec<BytesN<32>> = env.storage().persistent().get(&DataKey::Records(patient.clone())).unwrap_or(Vec::new(&env));
        records.push_back(record_hash.clone());
        env.storage().persistent().set(&DataKey::Records(patient.clone()), &records);

        Self::_log_access_event(env, patient, doctor, symbol_short!("add_rec"));
    }

    // NEW LOGIC: Allows Pharmacy/Insurance to verify a prescription hash securely
    pub fn verify_prescription(env: Env, record_hash: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::RecordDetails(record_hash))
    }

    pub fn get_medical_records(env: Env, patient: Address, caller: Address) -> Vec<BytesN<32>> {
        caller.require_auth();
        if !env.storage().persistent().has(&DataKey::Patients(patient.clone())) {
            panic!("patient not registered");
        }
        if caller != patient && !env.storage().persistent().has(&DataKey::Access(patient.clone(), caller.clone())) {
            panic!("unauthorized to view records");
        }
        
        Self::_log_access_event(env.clone(), patient.clone(), caller, symbol_short!("read_rec"));
        env.storage().persistent().get(&DataKey::Records(patient)).unwrap_or(Vec::new(&env))
    }

    pub fn grant_access(env: Env, patient: Address, doctor: Address) {
        patient.require_auth();
        Self::_grant_access(env, patient, doctor);
    }

    fn _grant_access(env: Env, patient: Address, doctor: Address) {
        if !env.storage().persistent().has(&DataKey::Patients(patient.clone())) || !env.storage().persistent().has(&DataKey::Doctors(doctor.clone())) {
            panic!("patient or doctor not registered");
        }
        
        if !env.storage().persistent().has(&DataKey::Access(patient.clone(), doctor.clone())) {
            env.storage().persistent().set(&DataKey::Access(patient.clone(), doctor.clone()), &true);
            
            // Add patient to doctor's patient list for dashboard visibility
            let mut patients: Vec<Address> = env.storage().persistent().get(&DataKey::DoctorPatients(doctor.clone())).unwrap_or(Vec::new(&env));
            if !patients.contains(&patient) {
                patients.push_back(patient.clone());
                env.storage().persistent().set(&DataKey::DoctorPatients(doctor.clone()), &patients);
            }
        }
        
        Self::_log_access_event(env, patient, doctor, symbol_short!("grant_acc"));
    }

    pub fn book_appointment(env: Env, patient: Address, doctor: Address) {
        patient.require_auth();
        if !env.storage().persistent().has(&DataKey::Patients(patient.clone())) || !env.storage().persistent().has(&DataKey::Doctors(doctor.clone())) {
            panic!("patient or doctor not registered");
        }
        
        // Add to pending appointments for doctor
        let mut pending: Vec<Address> = env.storage().persistent().get(&DataKey::PendingAppointments(doctor.clone())).unwrap_or(Vec::new(&env));
        if !pending.contains(&patient) {
            pending.push_back(patient.clone());
            env.storage().persistent().set(&DataKey::PendingAppointments(doctor.clone()), &pending);
        }

        // Logical booking - could store more details, but for now we log it and grant access
        Self::_log_access_event(env.clone(), patient.clone(), doctor.clone(), symbol_short!("book_apt"));
        
        // Auto-grant access on booking
        Self::_grant_access(env, patient, doctor);
    }

    pub fn get_pending_appointments(env: Env, doctor: Address) -> Vec<Address> {
        doctor.require_auth();
        env.storage().persistent().get(&DataKey::PendingAppointments(doctor)).unwrap_or(Vec::new(&env))
    }

    pub fn complete_appointment(env: Env, doctor: Address, patient: Address) {
        doctor.require_auth();
        let mut pending: Vec<Address> = env.storage().persistent().get(&DataKey::PendingAppointments(doctor.clone())).unwrap_or(Vec::new(&env));
        if let Some(idx) = pending.first_index_of(&patient) {
            pending.remove(idx);
            env.storage().persistent().set(&DataKey::PendingAppointments(doctor.clone()), &pending);
        }
        Self::_log_access_event(env, patient, doctor, symbol_short!("comp_apt"));
    }

    pub fn store_consultation_proof(env: Env, doctor: Address, patient: Address, prescription_id: BytesN<32>) {
        doctor.require_auth();
        if !env.storage().persistent().has(&DataKey::Patients(patient.clone())) || !env.storage().persistent().has(&DataKey::Doctors(doctor.clone())) {
            panic!("patient or doctor not registered");
        }
        
        let record = ConsultationRecord {
            doctor: doctor.clone(),
            patient: patient.clone(),
            prescription_id,
            timestamp: env.ledger().timestamp(),
        };

        // Add to patient's consultations
        let mut p_consults: Vec<ConsultationRecord> = env.storage().persistent().get(&DataKey::PatientConsultations(patient.clone())).unwrap_or(Vec::new(&env));
        p_consults.push_back(record.clone());
        env.storage().persistent().set(&DataKey::PatientConsultations(patient.clone()), &p_consults);

        // Add to doctor's consultations
        let mut d_consults: Vec<ConsultationRecord> = env.storage().persistent().get(&DataKey::DoctorConsultations(doctor.clone())).unwrap_or(Vec::new(&env));
        d_consults.push_back(record);
        env.storage().persistent().set(&DataKey::DoctorConsultations(doctor.clone()), &d_consults);
    }

    pub fn get_consultations_by_patient(env: Env, patient: Address) -> Vec<ConsultationRecord> {
        env.storage().persistent().get(&DataKey::PatientConsultations(patient)).unwrap_or(Vec::new(&env))
    }

    pub fn get_consultations_by_doctor(env: Env, doctor: Address) -> Vec<ConsultationRecord> {
        env.storage().persistent().get(&DataKey::DoctorConsultations(doctor)).unwrap_or(Vec::new(&env))
    }

    pub fn get_authorized_patients(env: Env, doctor: Address) -> Vec<Address> {
        doctor.require_auth();
        env.storage().persistent().get(&DataKey::DoctorPatients(doctor)).unwrap_or(Vec::new(&env))
    }

    pub fn revoke_access(env: Env, patient: Address, doctor: Address) {
        patient.require_auth();
        if !env.storage().persistent().has(&DataKey::Patients(patient.clone())) || !env.storage().persistent().has(&DataKey::Doctors(doctor.clone())) {
            panic!("patient or doctor not registered");
        }
        env.storage().persistent().remove(&DataKey::Access(patient.clone(), doctor.clone()));
        
        // Remove patient from doctor's patient list
        let mut patients: Vec<Address> = env.storage().persistent().get(&DataKey::DoctorPatients(doctor.clone())).unwrap_or(Vec::new(&env));
        if let Some(idx) = patients.first_index_of(&patient) {
            patients.remove(idx);
            env.storage().persistent().set(&DataKey::DoctorPatients(doctor.clone()), &patients);
        }

        Self::_log_access_event(env, patient, doctor, symbol_short!("revk_acc"));
    }

    pub fn check_access(env: Env, patient: Address, doctor: Address) -> bool {
        env.storage().persistent().has(&DataKey::Access(patient, doctor))
    }

    pub fn get_role(env: Env, address: Address) -> Symbol {
        let roles: soroban_sdk::Map<Address, Role> = env.storage().persistent().get(&symbol_short!("ROLE")).unwrap_or(soroban_sdk::Map::new(&env));
        if let Some(role) = roles.get(address.clone()) {
            match role {
                Role::Doctor => symbol_short!("doctor"),
                Role::Patient => symbol_short!("patient"),
                Role::Pharmacist => Symbol::new(&env, "pharmacist"),
                Role::Insurer => symbol_short!("insurer"),
            }
        } else {
            symbol_short!("none")
        }
    }

    fn _log_access_event(env: Env, patient: Address, actor: Address, action: Symbol) {
        let mut logs: Vec<AccessLogEntry> = env.storage().persistent().get(&DataKey::Logs(patient.clone())).unwrap_or(Vec::new(&env));
        logs.push_back(AccessLogEntry { actor, timestamp: env.ledger().timestamp(), action });
        env.storage().persistent().set(&DataKey::Logs(patient), &logs);
    }
}

mod test;

