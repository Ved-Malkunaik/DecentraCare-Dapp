pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template ConsultationProof() {
    // Private Inputs (The actual medical data and wallet IDs)
    signal input doctor_wallet;
    signal input patient_wallet;
    signal input prescription_id;

    // Public Output (The verifiable hash that the insurer sees)
    signal output stored_consultation_hash;

    // Instantiate Poseidon hash function for 3 inputs
    component hasher = Poseidon(3);

    hasher.inputs[0] <== doctor_wallet;
    hasher.inputs[1] <== patient_wallet;
    hasher.inputs[2] <== prescription_id;

    // Output the resulting hash
    stored_consultation_hash <== hasher.out;
}

component main = ConsultationProof();
