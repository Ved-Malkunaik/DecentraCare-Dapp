// generateProof.js
// This script takes the raw parameters and generates a zero-knowledge snark 
// using snarkjs and the compiled webassembly circuit.

const snarkjs = require("snarkjs");
const fs = require("fs");

/**
 * Helper to turn strings into numbers/bigints for Poseidon hashes
 */
function addressToBigInt(str) {
    if (!str) return 0n;
    // VERY primitive mapping for demo purposes. 
    // Real implementation would hash the string to a BN128 Field Element securely
    let num = 0n;
    for (let i = 0; i < str.length; i++) {
        num = num * 256n + BigInt(str.charCodeAt(i));
    }
    return num.toString();
}

async function run() {
    // 1. In a real scenario, these would come via arguments/API body from the Insurer click.
    const doctorWallet = process.argv[2] || "GBDOK...1234";
    const patientWallet = process.argv[3] || "GAXYZ...5678";
    const prescriptionId = process.argv[4] || "aa11bb22cc33...";

    console.log(`\n🔍 Generating ZK Proof for Consultation...`);
    
    // 2. Format inputs to match circom definitions 
    const inputSignals = {
        doctor_wallet: addressToBigInt(doctorWallet),
        patient_wallet: addressToBigInt(patientWallet),
        prescription_id: addressToBigInt(prescriptionId)
    };

    try {
        // 3. Generate proof and outputs using trusted setup keys
        // NOTE: In production, paths point to 'consultationProof.wasm' and 'consultation_final.zkey'
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputSignals,
            "./circuits/consultationProof_js/consultationProof.wasm",
            "./setup/consultation_final.zkey"
        );

        console.log(`\n✅ Proof Generated Successfully!`);
        console.log(`-- Public Output Hash: ${publicSignals[0]}`);
        
        // Export Proof
        fs.writeFileSync("proof.json", JSON.stringify(proof, null, 2));
        fs.writeFileSync("public.json", JSON.stringify(publicSignals, null, 2));
        console.log(`-- Wrote proof.json and public.json`);

    } catch (err) {
        console.error("❌ Proof generation failed:", err.message);
        console.log("Did you run the trusted setup commands from README.md?");
    }
}

if (require.main === module) {
    run();
}

module.exports = { run, addressToBigInt };
