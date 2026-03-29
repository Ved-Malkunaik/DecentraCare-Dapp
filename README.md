# DecentraCare - Web3 Healthcare DApp

DecentraCare is a state-of-the-art decentralized application (DApp) built on the Stellar Soroban blockchain. It redefines healthcare data management by enabling physicians to create immutable, verifiable prescriptions and giving patients complete sovereign control over who can access their clinical data.

![DecentraCare Architecture Placeholder](/placeholder-architecture.png)

## 🌟 Key Features

- **Role-Based Web3 Authentication:** Secure onboarding process creating separate on-chain identities for 'Doctors' and 'Patients' using Freighter Wallet.
- **On-chain Consultation Proof:** Every medical visit generates a digitally signed `Consultation Record` mapped sequentially to both the Doctor and Patient.
- **Immutable Prescriptions:** Medical records are cryptographically hashed via SHA-256 and securely stored. Pharmacies and Insurance companies can rapidly verify the integrity of the record in O(1) time.
- **Zero-Knowledge Access Control:** Patients grant, view, and revoke temporary access permissions to individual Doctors dynamically.
- **Stellar Soroban Smart Contracts:** Fully leverages the speed, affordability, and rust-based safety of Soroban.

## 📱 Screenshots

| Patient Dashboard | Doctor Dashboard | Role Selection |
| :---: | :---: | :---: |
| ![Patient View](/placeholder-patient.png) | ![Doctor View](/placeholder-doctor.png) | ![Role Selection](/placeholder-role.png) |

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- Rust and Cargo (`rustup target add wasm32-unknown-unknown`)
- Soroban CLI installed
- Freighter Wallet extension configured to **Testnet**

### 1. Clone & Install
```bash
git clone https://github.com/your-username/decentracare-dapp.git
cd "decentracare-dapp"
npm install
```

### 2. Smart Contract (Optional, if you want to deploy yourself)
```bash
cd DecentraCareSmartContracts/contracts/hello-world
cargo build --target wasm32-unknown-unknown --release
```

### 3. Run the DApp
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## 🧪 Testing

This project achieved Level-4 Production Readiness using `Vitest`, `@testing-library/react`, and simulated Soroban Contract tests!

### Run Frontend UI Tests
These tests simulate routing, UI interactions, and simulated transactions:
```bash
npm run test
```

### Run Smart Contract Tests
These Rust tests simulate the entire Doctor-Patient lifecycle on an isolated ledger:
```bash
cd DecentraCareSmartContracts/contracts/hello-world
cargo test
```

## 🔁 CI/CD Pipeline

We utilize **GitHub Actions** to automate our delivery and enforce code quality.

The pipeline triggers automatically on every **Push** and **Pull Request** to the `main` branch.

**Workflow Steps:**
1. **Checkout:** Clones the repository.
2. **Setup Node.js:** Initializes a clean V20 Node environment.
3. **Install Dependencies:** Clean installs all NPM packages.
4. **Linting:** Enforces ESLint standards (`npm run lint`).
5. **Testing:** Executes the Vitest test suite (`npm run test`).
6. **Build Verification:** Compiles and builds the production app to guarantee no bundling errors (`npm run build`).

If any step fails, the pipeline prevents merging, ensuring that only production-ready code is shipped.

---

> **Built with ❤️ on Stellar Soroban**
