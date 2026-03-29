# DecentraCare Zero Knowledge Proof Setup 🛡️

This directory contains the Zero Knowledge Proof (zk-SNARK) infrastructure for Insurance Claim Verifications.

## Requirements
Make sure you have `circom` and `snarkjs` globally installed:
```bash
npm install -g circom snarkjs
```

## Step-by-Step Trusted Setup

### 1. Compile the Circuit
Compiles the `.circom` file into r1cs (Rank-1 Constraint System) and WASM formats.
```bash
cd zkp/circuits
circom consultationProof.circom --r1cs --wasm --sym
```

### 2. Powers of Tau Calibration
Generates the cryptographic "toxic waste" securely.
```bash
cd ../
mkdir setup && cd setup

# Start Powers of Tau
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="Random Entropy 123"

# Phase 2 prep
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
```

### 3. Generate ZKey
Creates the specific proving and verification keys for our exact `ConsultationProof` circuit.
```bash
snarkjs groth16 setup ../circuits/consultationProof.r1cs pot12_final.ptau consultation_0000.zkey
snarkjs zkey contribute consultation_0000.zkey consultation_final.zkey --name="Second contribution" -v -e="Random Entropy 456"

# Export the Verification Key
snarkjs zkey export verificationkey consultation_final.zkey verification_key.json
```

---

The generated `consultation_final.zkey` and `consultationProof.wasm` will be used by our `generateProof.js` utility!
