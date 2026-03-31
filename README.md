# DecentraCare - Web3 Healthcare DApp

DecentraCare is a state-of-the-art decentralized application (DApp) built on the Stellar Soroban blockchain. It redefines healthcare data management by enabling physicians to create immutable, verifiable prescriptions and giving patients complete sovereign control over who can access their clinical data.


## 🌟 Key Features

- **Role-Based Web3 Authentication:** Secure onboarding process creating separate on-chain identities for 'Doctors' and 'Patients' using Freighter Wallet.
- **On-chain Consultation Proof:** Every medical visit generates a digitally signed `Consultation Record` mapped sequentially to both the Doctor and Patient.
- **Immutable Prescriptions:** Medical records are cryptographically hashed via SHA-256 and securely stored. Pharmacies and Insurance companies can rapidly verify the integrity of the record in O(1) time.
- **Stellar Soroban Smart Contracts:** Fully leverages the speed, affordability, and rust-based safety of Soroban.
  

## 🚀 How to Set up and Run Locally

 ## Pre-Requesits to Run :

 1. Download Freighter wallet web extension.
 2. set up your Freighter Wallet.
 3. VS code should be installed
    
 ## How To Run :

 open in VS code ----> Go to Terminal ----> cd Frontend ----> Give a command "npm run dev" ----> Run on Localhost (CTRL + click) ----->You're Ready To Go. 🚀 

 or

 simply click on deployed dapp link (deployed via vercel)

 
## 📱 Screenshots with working Steps

<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/6d9ff1b7-7f48-43f1-8235-6039c21ff183" />

<img width="1919" height="909" alt="image" src="https://github.com/user-attachments/assets/2c7a714c-c12a-47d4-a197-36ea5e2b4601" />

<img width="1919" height="913" alt="image" src="https://github.com/user-attachments/assets/d61a4a7d-0939-4164-ba46-da753705e0f5" />

<img width="1917" height="910" alt="image" src="https://github.com/user-attachments/assets/c7e8ce35-4a41-4934-ac48-0230a66daf5a" />


## Contract Details :

Contract ID : "CAU65DY66S74TTRKRWYCCAPK7WZCMHP6FBVKZIHU4BPFC56VKTBYMYBI"

- View On Stellar :

<img width="1918" height="902" alt="image" src="https://github.com/user-attachments/assets/d3808791-21c3-45a6-bf38-5742232b62f0" />


## Test Results :

    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.19s
     Running unittests src\lib.rs (target\debug\deps\hello_world-df17804e81af7abd.exe)

running 5 tests
test test::test_security_unauthorized_viewing - should panic ... ok
test test::test_security_unauthorized_record_addition - should panic ... ok
test test::test_frictionless_onboarding_via_booking ... ok
test test::test_complete_healthcare_lifecycle ... ok
test test::test_appointment_and_consultation_flow ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.15s



