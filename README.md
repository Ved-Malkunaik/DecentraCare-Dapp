# DecentraCare - Web3 Healthcare DApp

DecentraCare is a multi-platform AI + Web3 healthcare booking system that allows patients to book doctor appointments through a DApp, Telegram— with final confirmations stored on-chain using wallet signature.

This project demonstrates how traditional healthcare booking can be transformed into a trustless, decentralized and AI-assisted experience.


## 🌟 Key Features

- **Role-Based Web3 Authentication:** Secure onboarding process creating separate on-chain identities for 'Doctors' and 'Patients' using Freighter Wallet.
- **On-chain Consultation Record:** Every medical visit generates a digitally signed `Consultation Record` mapped sequentially to both the Doctor and Patient.
- **Immutable Prescriptions:** Medical records are cryptographically hashed via SHA-256 and securely stored. Pharmacies and Insurance companies can rapidly verify the integrity of the record in O(1) time.
- **Dynamic Access Control:** Patients grant, view, and revoke temporary access permissions to individual Doctors dynamically.
- **Stellar Soroban Smart Contracts:** Fully leverages the speed, affordability, and rust-based safety of Soroban.
- **🤖 AI Assistant (Local LLM)**
Powered by Ollama
Users can chat with an AI assistant inside the DApp to:
Book appointments using natural language
View prescriptions
Navigate the platform easily
-💬 Multi-Platform Booking Bots

Patients can book appointments from anywhere:
| Platform     | Capability         |
| ------------ | ------------------ |
| DApp Chat    | AI powered booking |
| Telegram Bot | Chat based booking |



## 🚀 How to Set up and Run Locally

 ## Pre-Requesits to Run :

 1. Download Freighter wallet web extension.
 2. set up your Freighter Wallet.
 3. VS code should be installed
    
 ## How To Run :

 open in VS code ----> Go to Terminal ----> cd Frontend ----> Give a command "npm run dev" ----> Run on Localhost (CTRL + click) ----->You're Ready To Go. 🚀 

 or

 simply click on deployed dapp link (deployed via vercel)
  
 or

### 4. Start Telegram Bot
1. Open **Telegram**
2. Search for **@BotFather**
3. Create a new bot named `DecentraCare_Bot`
4. Copy the **BOT TOKEN** and paste it into `backend/telegram.js`.
5. Run the backend:
```bash
cd backend
npm install
node server.js
```
6. Search for your bot in Telegram: **@DecentraCare_Bot**
7. Send **"Hi"** to start your booking!

## 🧪 Testing

 or 

 simply go open telegram ----> search for 'DecentraCare_Bot' ----> chat with bot & book appointment. (fastest way)

 
## 📱 Screenshots with working Steps

<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/6d9ff1b7-7f48-43f1-8235-6039c21ff183" />

<img width="1919" height="909" alt="image" src="https://github.com/user-attachments/assets/2c7a714c-c12a-47d4-a197-36ea5e2b4601" />

<img width="1919" height="913" alt="image" src="https://github.com/user-attachments/assets/d61a4a7d-0939-4164-ba46-da753705e0f5" />

<img width="1917" height="910" alt="image" src="https://github.com/user-attachments/assets/c7e8ce35-4a41-4934-ac48-0230a66daf5a" />

<img width="1919" height="904" alt="image" src="https://github.com/user-attachments/assets/bba42693-fccb-41cc-9b61-a165e1d41df0" />

<img width="1394" height="908" alt="image" src="https://github.com/user-attachments/assets/3331ef86-6552-4a83-a72a-3c22d39e2cef" />





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


## Working Demo link :

Manually booking appointment from dapp :
https://drive.google.com/file/d/1ZKZPRopfS3h2i_dPZLBcbdU0x3_klYDB/view?usp=sharing

Booking Appointment through AI Assistant (just by prompt) :
https://drive.google.com/file/d/1uY_7gC3RM7Hin36eUcAD6_M9x44e0iL6/view?usp=sharing

Booking appointment from Telegram bot (just by chat) :
https://drive.google.com/file/d/1YdKO8kVbm-cLecUmv-G_tnFHhyAF89Yb/view?usp=sharing



##  Users Feedbacks :

https://docs.google.com/spreadsheets/d/1raan1JCqNyyh3HL9LEstHhj77bzBiuHqpAAxKyhmf5Q/edit?usp=sharing
