# DecentraCare DApp Architecture Documentation

DecentraCare is a decentralized healthcare application (DApp) designed to streamline clinical workflows while maintaining patient privacy and data integrity through blockchain technology and Zero-Knowledge Proofs (ZKP).

---

## 🏗️ High-Level Architecture

The application follows a modern **Decentralized Three-Tier Architecture**:

1.  **Client Tier (Frontend)**: A React-based Single Page Application (SPA).
2.  **Logic Tier (Blockchain/ZKP)**: Stellar Soroban Smart Contracts and SnarkJS-powered ZKP.
3.  **Data Tier (Cloud/Shared Sync)**: Supabase for real-time synchronization and Stellar Ledger for immutable auditing.

---

## 🔌 System Components

### 1. Frontend Portal (React & Vite)
- **Framework**: React 18 with Vite for high-performance development and bundling.
- **UI/UX**: Custom design system using Tailwind CSS, emphasizing glassmorphism and accessibility.
- **Wallet Integration**: `Freighter Wallet` API for secure transaction signing and identity verification.

### 2. Smart Contract Layer (Soroban)
- **Location**: `/DecentraCareSmartContracts`
- **Language**: Rust
- **Core Functions**:
    - **Identity Registry**: Maps Stellar addresses to clinical roles (Doctor, Patient).
    - **Access Control List (ACL)**: Manages permissions for doctors to view/add patient records.
    - **Appointment Pipeline**: Tracks pending appointments and handles auto-granting of access during bookings.
    - **Record Indexing**: Stores hashes of medical records to ensure immutability and easy verification by third parties (e.g., pharmacies).

### 3. Synchronization Layer (Supabase)
- **Service**: `supabaseService.js` (aliased as `dbService`).
- **Role**: Provides a shared, live data store that bridges the gap between individual browser local storage and the global blockchain.
- **Data Flow**:
    - Every on-chain interaction (booking, prescription) is mirrored to Supabase.
    - This enables a "Global View" where any user on any device can see the shared state of the clinic in real-time.

### 4. Privacy & Verification (Zero-Knowledge Proofs)
- **Technology**: SnarkJS using Groth16 proofs.
- **Workflow**:
    - When a doctor issues a prescription, a ZK-proof is generated off-chain using the `consultationProof.wasm`.
    - This proof proves that a specific doctor issued a specific record to a specific patient *without* revealing sensitive metadata on-chain.
    - Third parties (like pharmacists) use the `Record Hash` to verify the existence of the prescription on the ledger.

---

## 📈 Key Information Flows

### A. Appointment Booking Flow
1.  **Patient** connects Freighter wallet.
2.  **Patient** selects a doctor and submits a "Book & Grant Access" request.
3.  **Soroban Contract** executes `book_appointment`, which:
    - Auto-registers both profiles if new.
    - Registers the appointment on-chain.
    - Auto-grants "Access Permission" to the doctor.
4.  **Supabase** receives a mirrored record to alert the doctor's dashboard in real-time.

### B. Prescription Issuance Flow
1.  **Doctor** selects a patient from the "Pending Arrivals" list.
2.  **Doctor** fills in medicines and diagnosis.
3.  **Frontend** generates a unique `Record Hash` and a **ZK-Proof**.
4.  **Soroban Contract** executes `store_consultation_proof` to anchor the hash immutably.
5.  **Supabase** is updated to mark the appointment as "Completed" and store the record data for the patient's history portal.

---

## 🛡️ Security & Privacy Models

| Feature | Implementation |
| :--- | :--- |
| **Authentication** | Ed25519 signatures via Freighter Wallet |
| **Authorization** | On-chain ACL (Access Control List) in `lib.rs` |
| **Data Integrity** | SHA-256 Hashing and Stellar Testnet anchors |
| **Identity Privacy** | Hidden wallet addresses in UI and ZKP-based verification |

---

## 📂 Project Structure

```text
├── DecentraCareSmartContracts/  # Rust / Soroban code
│   └── contracts/hello-world/src/lib.rs
├── src/
│   ├── components/              # Atomic UI components
│   ├── context/                 # Wallet and Role providers
│   ├── pages/                   # Core Views (Doctor/Patient/RoleSelection)
│   ├── services/                # Integration layers (Soroban/Supabase)
│   └── circuits/                # Circom / ZKP source (for proof generation)
├── .env                         # Critical Config (API Keys/Contract IDs)
└── ARCHITECTURE.md              # Documentation
```
