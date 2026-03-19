# WasteCoin (WST) — Waste-to-Coin Monorepo

แพลตฟอร์ม “Waste-to-Coin” ที่ให้ผู้ใช้นำข้อมูลการคัดแยก/ส่งมอบขยะเข้าระบบ แล้ว **เจ้าหน้าที่ (Officer)** ตรวจสอบและ **Mint เหรียญ WasteCoin (WST)** บนเครือข่าย **Ethereum Sepolia** ส่งเข้ากระเป๋าของผู้ใช้โดยอัตโนมัติ

Repo นี้เป็น **Monorepo** แยกเป็น 3 ส่วนหลัก:

- **Frontend**: `frontend/` (Next.js App Router)
- **Backend API**: `backend/` (Express + MongoDB)
- **Smart Contract**: `contracts/` (Solidity + Hardhat)

---

## System Overview

### High-level Architecture

- **Frontend (Next.js)**
  - หน้าเว็บสำหรับ User/Officer
  - เก็บ `JWT` และข้อมูลผู้ใช้ไว้ที่ `localStorage`
  - เรียก Backend ด้วย `fetch` ผ่าน REST API
- **Backend (Express)**
  - Authentication/Authorization (JWT + role)
  - Business logic: submit waste, approve/mint, wallet balance, transfer
  - Custodial wallet: สร้าง wallet ให้ผู้ใช้และเก็บ private key แบบเข้ารหัสใน MongoDB
- **Blockchain (WasteCoin.sol)**
  - ERC20 + AccessControl
  - เฉพาะ address ที่มี `OFFICER_ROLE` เท่านั้นที่เรียก `mintCoins()` ได้

### Main Runtime Flow

#### 1) Register / Login

- **Frontend**: `frontend/app/auth/page.tsx`
- **Backend**: `POST /api/auth/register`, `POST /api/auth/login`

Register:

- Backend สร้าง user ใน collection `users`
- Backend สร้าง Ethereum wallet (custodial)
- Private key ถูกเข้ารหัสด้วย AES-256-CBC แล้วเก็บใน collection `wallets`
- Backend ออก `JWT` กลับไปให้ frontend

#### 2) Submit Waste → Officer Approve → Mint WST

- **User** ส่งรายการขยะ
  - Backend บันทึก `waste_submissions.status = pending`
- **Officer** ดึงรายการ pending แล้วอนุมัติ
  - Backend เรียก smart contract `mintCoins(to, amount, reason)` ผ่าน `ethers v6`
  - Backend บันทึก transaction ลง `transactions`
  - Backend อัปเดต `waste_submissions` เป็น `approved` และเก็บ `blockchain_tx_hash`

#### 3) View Balance / Transfer

- Balance: backend อ่าน `balanceOf()` จาก contract
- Transfer: backend ถอดรหัส private key ของ user (จาก MongoDB) แล้วเซ็น `transfer()` ไปยัง Sepolia

---

## Tech Stack

### Frontend (`frontend/`)

- **Next.js** `^16.1.x` (App Router)
- **React** `^19.x`
- **TypeScript**
- **Styling**: CSS Modules / global CSS

### Backend (`backend/`)

- **Node.js** (แนะนำ `>= 18`)
- **Express**
- **MongoDB** (native driver)
- **Auth**: JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`)
- **Web3**: `ethers v6`
- **Dev**: `ts-node`, `nodemon`

### Smart Contract / Tooling

- **Solidity** `0.8.20`
- **OpenZeppelin Contracts**
- **Hardhat** (+ toolbox)
- **Scripts**: `concurrently`, `dotenv`

---

## Project Structure

```text
.
├─ frontend/                 # Next.js UI
│  └─ app/
│     ├─ page.tsx            # Landing
│     ├─ auth/page.tsx       # Login/Register
│     ├─ dashboard/page.tsx  # User dashboard
│     └─ officer/page.tsx    # Officer dashboard
├─ backend/                  # Express API
│  ├─ src/
│  │  ├─ index.ts            # app + routes
│  │  ├─ lib/                # auth, middleware, mongodb, wallet, blockchain
│  │  ├─ routes/             # auth, waste, officer, wallet, transactions, users
│  │  └─ models/types.ts
│  └─ package.json
├─ contracts/
│  └─ WasteCoin.sol          # ERC20 + roles
├─ scripts/
│  ├─ verify-setup.js
│  └─ generate-secrets.js
├─ hardhat.config.ts
└─ package.json              # root scripts (dev/build/contracts)
```

---

## Environment Variables

มี 2 บริบทหลัก:

### 1) Root `.env.local` (ใช้กับ Hardhat และ scripts/verify-setup)

Hardhat config โหลดไฟล์นี้โดยตรง:

- `hardhat.config.ts` → `dotenv.config({ path: '.env.local' })`

ตัวแปรที่ใช้จริง (อิงจากโค้ด):

```env
MONGODB_URI=...
MONGODB_DB=waste-coin-db

JWT_SECRET=...
ENCRYPTION_SECRET=...

NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

SEPOLIA_RPC_URL=...
OFFICER_PRIVATE_KEY=0x...
WASTE_COIN_CONTRACT_ADDRESS=0x...
```

### 2) Backend environment (`backend/`)

Backend เรียก `dotenv.config()` ใน `backend/src/index.ts` และ `backend/src/lib/mongodb.ts` ดังนั้นตอนรันผ่าน `npm run dev` ที่ root จะไปทำงานใน `backend/` ทำให้ backend สามารถอ่าน env จากไฟล์ในโฟลเดอร์ backend ได้ตามปกติ (เช่น `backend/.env`) หรือจาก environment ของเครื่อง

---

## How to Run (Development)

### Prerequisites

- Node.js `>= 18`
- MongoDB (Atlas หรือ local)
- RPC URL สำหรับ Sepolia (Alchemy/Infura/ฯลฯ)
- Contract ถูก deploy แล้ว และมี `WASTE_COIN_CONTRACT_ADDRESS`

### Install

ที่ root:

```bash
npm install
```

### Run frontend + backend พร้อมกัน

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Health check: `GET http://localhost:3001/health`

### Build

```bash
npm run build
```

---

## API (Backend)

Base URL (dev): `http://localhost:3001`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Waste

- `POST /api/waste/submit` (ต้องมี Bearer token)
- `GET /api/waste/pending` (Officer only)
- `POST /api/waste/approve` (Officer only)

### Wallet

- `GET /api/wallet/balance` (ต้องมี Bearer token)
- `GET /api/wallet/info` (ต้องมี Bearer token)
- `POST /api/wallet/transfer` (ต้องมี Bearer token)
- `GET /api/wallet/export` (ต้องมี Bearer token)

### Transactions

- `GET /api/transactions/history` (ต้องมี Bearer token)

### Officer

- `POST /api/officer/add-coins` (Officer only)
- `GET /api/officer/transactions` (Officer only)

### Users (Officer)

- `GET /api/users/list` (Officer only)

---

## Smart Contract

Contract หลัก: `contracts/WasteCoin.sol`

- ERC20: ชื่อ `WasteCoin`, symbol `WST`, 18 decimals
- `mintCoins(to, amount, reason)` จำกัดสิทธิ์ด้วย `OFFICER_ROLE`
- มี `pause/unpause` สำหรับ emergency stop

### Contract Commands (Hardhat)

```bash
npm run compile
npm run test:contract
npm run deploy:sepolia
```

---

## Utility Scripts

- `npm run verify-setup`
  - ตรวจ Node.js version, ตรวจว่ามี `.env.local`, และตรวจ key variables เบื้องต้น
- `npm run generate-secrets`
  - สร้าง `JWT_SECRET` และ `ENCRYPTION_SECRET` สำหรับนำไปใส่ใน `.env.local`

---

## Notes (Security)

- ระบบนี้เป็น **custodial wallet**: private key ของผู้ใช้ถูกเก็บใน DB แบบเข้ารหัส และถูกถอดรหัสชั่วคราวเพื่อเซ็นธุรกรรมบน backend
- ห้ามนำ endpoint `GET /api/wallet/export` ไปเปิดใช้งานใน production โดยไม่มีมาตรการเพิ่มเติม (เช่น re-auth, audit log, rate limit)
