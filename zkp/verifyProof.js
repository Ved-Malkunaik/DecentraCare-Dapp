// verifyProof.js
// This script takes a generated proof and validates it against the verification key.

const snarkjs = require("snarkjs");
const fs = require("fs");

async function verify() {
    try {
        console.log(`\n🛡️ Validating Zero Knowledge Proof...`);
        
        // 1. Read files
        const verificationKey = JSON.parse(fs.readFileSync("./setup/verification_key.json"));
        const publicSignals = JSON.parse(fs.readFileSync("public.json"));
        const proof = JSON.parse(fs.readFileSync("proof.json"));

        // 2. The Verifier (Insurance Agent / Pharmacy) checks the proof
        // using ONLY the Public Hash and Verification Key, discovering NOTHING about the inputs.
        const res = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);

        if (res === true) {
            console.log(`\n✅ Verification PASS: The Medical Consultation is VALID.`);
            console.log(`The Doctor and Patient did consult, resulting in Prescription ID (Hashed Output: ${publicSignals[0]}).\n`);
            return true;
        } else {
            console.log(`\n❌ Verification FAIL: The Medical Consultation is INVALID.\n`);
            return false;
        }
    } catch (err) {
        console.error("❌ Verification encountered an error:", err.message);
        console.log("Did you generate the verification_key.json via the CLI commands?");
        return false;
    }
}

if (require.main === module) {
    verify();
}

module.exports = { verify };
