#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

#[test]
fn test_complete_healthcare_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(HealthcareDapp, ());
    let client = HealthcareDappClient::new(&env, &contract_id);

    let patient = Address::generate(&env);
    let doctor = Address::generate(&env);

    // 1. REGISTRATION
    client.register_patient(&patient, &String::from_str(&env, "Alice"), &30);
    client.register_doctor(&doctor, &String::from_str(&env, "Dr. Bob"), &String::from_str(&env, "Cardiology"));

    // 2. ACCESS CONTROL
    client.grant_access(&patient, &doctor);
    assert_eq!(client.check_access(&patient, &doctor), true);

    // 3. PRESCRIPTION CREATION (By Authorized Doctor)
    let record_hash = BytesN::from_array(&env, &[1; 32]);
    client.add_medical_record(&patient, &doctor, &record_hash);

    // 4. VERIFICATION (By Pharmacy/Insurance)
    assert_eq!(client.verify_prescription(&record_hash), true);
    
    // Test fake hash verification
    let fake_hash = BytesN::from_array(&env, &[0; 32]);
    assert_eq!(client.verify_prescription(&fake_hash), false);

    // 5. DATA RETRIEVAL
    let records = client.get_medical_records(&patient, &patient);
    assert_eq!(records.len(), 1);
    assert_eq!(records.get(0).unwrap(), record_hash);

    // 6. REVOCATION & SECURITY CHECK
    client.revoke_access(&patient, &doctor);
    assert_eq!(client.check_access(&patient, &doctor), false);
}

#[test]
#[should_panic(expected = "doctor not authorized to add records")]
fn test_security_unauthorized_record_addition() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(HealthcareDapp, ());
    let client = HealthcareDappClient::new(&env, &contract_id);

    let patient = Address::generate(&env);
    let unauthorized_doctor = Address::generate(&env);
    
    client.register_patient(&patient, &String::from_str(&env, "Alice"), &30);
    client.register_doctor(&unauthorized_doctor, &String::from_str(&env, "Hacker"), &String::from_str(&env, "None"));

    // Attempt to add record without "grant_access" should trigger panic
    let record_hash = BytesN::from_array(&env, &[1; 32]);
    client.add_medical_record(&patient, &unauthorized_doctor, &record_hash);
}

#[test]
#[should_panic(expected = "unauthorized to view records")]
fn test_security_unauthorized_viewing() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(HealthcareDapp, ());
    let client = HealthcareDappClient::new(&env, &contract_id);

    let patient = Address::generate(&env);
    let stranger = Address::generate(&env);
    
    client.register_patient(&patient, &String::from_str(&env, "Alice"), &30);
    
    // Someone trying to view Alice's records without permission
    client.get_medical_records(&patient, &stranger);
}

#[test]
fn test_appointment_and_consultation_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(HealthcareDapp, ());
    let client = HealthcareDappClient::new(&env, &contract_id);

    let patient = Address::generate(&env);
    let doctor = Address::generate(&env);
    let nobody = Address::generate(&env);

    // 1. Roles
    assert_eq!(client.get_role(&patient), symbol_short!("none"));

    client.register_patient(&patient, &String::from_str(&env, "Alice"), &30);
    client.register_doctor(&doctor, &String::from_str(&env, "Dr. Bob"), &String::from_str(&env, "Cardiology"));

    assert_eq!(client.get_role(&patient), symbol_short!("patient"));
    assert_eq!(client.get_role(&doctor), symbol_short!("doctor"));
    assert_eq!(client.get_role(&nobody), symbol_short!("none"));

    // 2. Book Appointment
    client.book_appointment(&patient, &doctor);
    
    // Check pending appointments
    let pending = client.get_pending_appointments(&doctor);
    assert_eq!(pending.len(), 1);
    assert_eq!(pending.get(0).unwrap(), patient);

    // Check authorized patients (auto-granted access during booking)
    assert_eq!(client.check_access(&patient, &doctor), true);
    let authorized = client.get_authorized_patients(&doctor);
    assert_eq!(authorized.len(), 1);
    assert_eq!(authorized.get(0).unwrap(), patient);

    // 3. Store Consultation Proof
    let record_hash = BytesN::from_array(&env, &[2; 32]);
    client.store_consultation_proof(&doctor, &patient, &record_hash);

    let doc_consults = client.get_consultations_by_doctor(&doctor);
    assert_eq!(doc_consults.len(), 1);
    assert_eq!(doc_consults.get(0).unwrap().prescription_id, record_hash);
    
    let pat_consults = client.get_consultations_by_patient(&patient);
    assert_eq!(pat_consults.len(), 1);
    assert_eq!(pat_consults.get(0).unwrap().prescription_id, record_hash);

    // 4. Complete Appointment
    client.complete_appointment(&doctor, &patient);
    let pending_after = client.get_pending_appointments(&doctor);
    assert_eq!(pending_after.len(), 0);

    // 5. Revoke Access and check Authorized list
    client.revoke_access(&patient, &doctor);
    let authorized_after = client.get_authorized_patients(&doctor);
    assert_eq!(authorized_after.len(), 0);
}
