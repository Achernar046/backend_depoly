# Officer Wallet Repair - 2026-03-31

เอกสารนี้สรุปการแก้ปัญหา officer wallet เดิมที่ทำให้ `POST /api/wallet/transfer` และ `POST /api/rewards/redeem` ใช้งานไม่ได้จาก officer account เดิม

## อาการที่พบ

จากการทดสอบจริง:

- `POST /api/officer/add-coins` ผ่าน
- `POST /api/waste/approve` ผ่าน
- แต่ `POST /api/wallet/transfer` ผ่านเฉพาะบางกรณี
- และ `POST /api/rewards/redeem` ล้มด้วย `500 Redemption failed`

นอกจากนี้ เมื่อลองถอดรหัส private key ของ officer wallet เดิมจาก MongoDB พบว่า decrypt ไม่ผ่านกับ `ENCRYPTION_SECRET` ปัจจุบัน

## ต้นเหตุ

ระบบมี wallet อยู่ 2 บทบาทที่ปะปนกัน:

- treasury / mint wallet จาก `OFFICER_PRIVATE_KEY`
- officer app wallet ที่เก็บอยู่ใน MongoDB ใต้ user `test@gmail.com`

ปัญหาที่พบจริงมี 2 ส่วน:

1. wallet ของ officer user ใน MongoDB เดิม decrypt ไม่ผ่านแล้ว
- หมายความว่า `/api/wallet/*` ที่ต้องใช้ private key จาก DB ใช้งานไม่ได้

2. officer app wallet กับ treasury wallet ไม่ควรเป็นกระเป๋าเดียวกัน
- ถ้าใช้ wallet เดียวกัน `redeem` จะพยายามโอนเหรียญจาก user ไปยังกระเป๋า officer treasury
- ถ้า caller เองก็คือ officer ที่ถือ treasury wallet เดียวกัน จะกลายเป็นโอนเข้ากระเป๋าตัวเอง
- จึงไม่ใช่รูปแบบที่ควรใช้สำหรับการใช้งานจริงของ officer account

## สิ่งที่ทำ

### 1. เพิ่ม guard ตรวจความถูกต้องของ wallet key

ไฟล์:

- `src/lib/wallet.ts`

สิ่งที่เพิ่ม:

- หลัง decrypt private key จาก `wallets` collection แล้ว
- สร้าง signer และตรวจว่า address ของ signer ต้องตรงกับ `walletDoc.address`
- ถ้าไม่ตรง ให้ throw error ชัดเจนว่า key ใน DB ไม่ตรงกับ address ที่บันทึกไว้

ผล:

- ป้องกันกรณีข้อมูล wallet ใน DB เสียหรือ secret เปลี่ยนแล้วระบบยังพยายามใช้งานต่อแบบเงียบ ๆ

### 2. เพิ่ม script สำหรับซ่อม officer wallet

ไฟล์:

- `src/scripts/repair-officer-wallet.ts`

ความสามารถ:

- รับ email ของ officer
- รองรับ strategy สองแบบ
- `configured`
- ใช้ wallet จาก `OFFICER_PRIVATE_KEY`
- `fresh`
- สร้าง wallet ใหม่ แล้วเข้ารหัสด้วย `ENCRYPTION_SECRET` ปัจจุบัน

ค่า default:

- ใช้ `fresh`

เหตุผลที่เลือก `fresh`:

- ทำให้ officer app wallet กลับมาใช้งาน `/api/wallet/*` ได้แน่นอน
- ไม่ปะปนกับ treasury / mint wallet
- เหมาะกับ flow `transfer` และ `redeem` มากกว่า

### 3. ซ่อมข้อมูลของ officer account จริง

บัญชีที่ซ่อม:

- `test@gmail.com`

ผลการเปลี่ยนแปลงใน MongoDB:

- `users.wallet_address` ถูกอัปเดต
- `wallets.address` ถูกอัปเดต
- `wallets.encrypted_private_key` ถูกสร้างใหม่
- `wallets.encryption_iv` ถูกสร้างใหม่

ค่าที่เปลี่ยน:

- old wallet: `0x5363A84907D180a37089EfC942323173FefCaF35`
- new wallet: `0x399ea06e4D05dCa136790ADE4D36Cd37177967dE`

หมายเหตุ:

- ระหว่างการวิเคราะห์มีการทดสอบแนวทางผูก officer account เข้ากับ configured wallet
- แนวทางนั้นไม่เหมาะสำหรับ `redeem`
- สุดท้ายจึงเปลี่ยน officer app wallet เป็น wallet ใหม่แบบ `fresh`

### 4. เติม Sepolia ETH ขั้นต่ำให้ officer wallet ใหม่

ทำเพื่อ:

- ให้ officer wallet ใหม่มี gas สำหรับ `transfer` และ `redeem`

ธุรกรรมเติม ETH:

- `0x2e22e28b6ea5309b0303a8f7ceea467baccad5a07ba6fae961171d34beb5316a`

### 5. เติม WST ขั้นต่ำให้ officer wallet ใหม่

ทำผ่าน API:

- `POST /api/officer/add-coins`

ธุรกรรม mint:

- `0x5da0d5ddee5cf9a502aa5371460ae35845e06f0d9c29f3609f870c3c3bddfb3e`

## ผลการทดสอบหลังซ่อม

หลัง repair แล้ว officer account เดิมใช้งานได้จริง

### 1. Wallet Transfer

Endpoint:

- `POST /api/wallet/transfer`

ผล:

- success

transaction hash:

- `0xb3a62784830ed277237fd6394932999e93484a77af68eb8b707cb62ffbfa01a9`

### 2. Reward Redemption

Endpoint:

- `POST /api/rewards/redeem`

ผล:

- success

transaction hash:

- `0x99418611463b8a8932007d72ac5201ca4dca5be08b04e22c86ec6c2b673dbcd6`

reward ที่ใช้ทดสอบ:

- `Officer Fresh Wallet Reward 1774925174`

## ข้อสรุป

ปัญหาไม่ได้อยู่ที่ route หลักของ `/api/wallet/transfer` หรือ `/api/rewards/redeem`

ปัญหาจริงคือ:

- officer wallet เดิมใน MongoDB ใช้ไม่ได้แล้วกับ secret ปัจจุบัน
- และ officer app wallet ไม่ควรใช้กระเป๋าเดียวกับ treasury wallet

หลังซ่อม:

- officer account เดิมกลับมาใช้ `/api/wallet/transfer` ได้
- officer account เดิมกลับมาใช้ `/api/rewards/redeem` ได้
- ระบบมี guard เพิ่มเพื่อจับข้อมูล wallet ที่เสียในอนาคตเร็วขึ้น

## งานที่ควรทำต่อ

- commit และ push โค้ดใน `src/lib/wallet.ts` และ `src/scripts/repair-officer-wallet.ts`
- เพิ่มเอกสาร operational guideline ว่า treasury wallet กับ app wallet ต้องแยกกัน
- ถ้ามี officer หลายบัญชี ควรมี script audit ตรวจ wallet record ทั้งระบบ
- พิจารณาเพิ่ม endpoint หรือ admin tool สำหรับ rotate custodial wallet อย่างปลอดภัย
