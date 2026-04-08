# DecentraCare DApp Architecture Documentation

DecentraCare is a decentralized, AI-augmented healthcare ecosystem. It provides a multi-channel booking and clinical management experience, integrating local LLMs, Telegram, and the Stellar blockchain to ensure trustless data integrity and effortless accessibility.

---

## 🏗️ High-Level Architecture

The application follows an **AI-Enabled Multi-Channel Architecture**:

1.  **Client Tier (User Interface)**:
    *   **React DApp**: Premium web interface with integrated AI chat.
    *   **Telegram Bot**: Lightweight, intent-based booking interface for mobile users.
2.  **Logic Tier (Backend & AI)**:
    *   **DecentraCare AI Backend**: Node.js proxy for LLM communication and Telegram handling.
    *   **AI Engine (Ollama)**: Local Llama 3 model for secure, private natural language processing.
3.  **Settlement Layer (Blockchain)**:
    *   **Stellar Soroban**: Rust-based smart contracts for immutable identity, access control, and auditing.
4.  **Sync Layer (Cloud/Database)**:
    *   **Supabase**: Real-time cross-user data synchronization and persistent metadata storage.

---

## 🔌 System Components

### 1. Multi-Channel Intake
*   **AI Assistant (AIAssistant.jsx)**: A natural language interface within the DApp that allows patients to book checkups, query history, and verify prescriptions.
*   **Telegram Bot (telegram.js)**: An intent-based bot that captures appointment details (Date, Time, Reason) and generates a one-click persistent link to the DApp for blockchain signature.

### 2. AI & Backend Logic
*   **Engine**: **Ollama (Llama 3)** running locally for maximum privacy.
*   **Processing**: Natural language is parsed into structured clinical intents (Date, Time, Reason).
*   **Trigger Protocol**: The AI uses a hardened trigger phrase `STATION_BOOKING_INITIALIZED` to dynamically render booking widgets in the UI.

### 3. Smart Contract Layer (Soroban)
*   **Location**: `/DecentraCareSmartContracts`
*   **Functions**:
    *   **Identity Registry**: Maps wallet addresses to Clinical Roles.
    *   **Access Control**: Cryptographic permissions for doctors to interact with patient data.
    *   **Anchor Point**: Securely hashes and stores medical records (`Record Hash`) to the Stellar Testnet.

### 4. Synchronization (Supabase)
*   **Role**: Bridges the gap between disparate platforms (DApp, Telegram, and multiple browser sessions).
*   **Real-time Notifications**: Alerts Doctors instantly in their dashboard when a new appointment is booked via AI or Telegram.

---

## 📈 Key Information Flows

### A. Intent-Based AI Booking
1.  **User** sends a message: *"I want a checkup tomorrow at 4 PM for headache."*
2.  **Ollama** parses the intent and returns a structured trigger phrase.
3.  **Frontend** detects the phrase and renders a **Blockchain Booking Widget**.
4.  **User** clicks "Confirm on Stellar" to sign the transaction via **Freighter**.
5.  **Supabase** syncs the record for the Doctor's dashboard.

### B. Telegram Booking Flow
1.  **User** chats with `@DecentraCare_Bot`.
2.  **Bot** collects details and generates a DApp URL with a unique `bookingId`.
3.  **User** opens the link in the DApp and signs the transaction.
4.  **Bot** notifies the User on Telegram once the transaction is confirmed on Stellar.

---

## 🛡️ Security & Privacy Models

| Feature | Implementation |
| :--- | :--- |
| **Identity** | Ed25519 signatures via Freighter Wallet |
| **Logic Safety** | Intent-based triggers (prevents AI hallucinations) |
| **Private AI** | Local LLM processing (sensitive data never leaves the local machine) |
| **Integrity** | SHA-256 Record Hashing on Stellar |

---

## 📂 Project Structure

```text
├── backend/                   # Node.js + Telegram Bot + AI Proxy
│   ├── server.js              # AI Chat and Health Check
│   └── telegram.js            # Telegram Bot polling and logic
├── DecentraCareSmartContracts/# Rust / Soroban smart contracts
├── src/
│   ├── pages/
│   │   ├── AIAssistant.jsx    # Web-based AI Interface
│   │   ├── ConfirmBooking.jsx # Telegram Link Landing Page
│   │   └── RoleSelection.jsx  # Web3 Onboarding
│   └── services/
│       ├── sorobanService.js  # Stellar Blockchain Interface
│       └── supabaseService.js # Cloud Synchronization
├── .env                       # API Keys & Contract Configuration
└── ARCHITECTURE.md            # You are here
```
