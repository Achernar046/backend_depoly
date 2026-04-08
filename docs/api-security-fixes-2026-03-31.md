# API And Security Fixes - 2026-03-31

เอกสารนี้สรุปสิ่งที่แก้ในรอบวันที่ 2026-03-31 สำหรับ backend ของ WasteCoin เพื่อให้ตามงานต่อได้ง่าย และใช้เป็นบันทึกก่อน deploy

## เป้าหมาย

- แก้จุดที่ API ยังตอบผิดพลาดจาก validation ไม่ครบ
- ลดโอกาสเกิด `500` จาก input ที่ไม่ถูกต้อง
- เพิ่มความปลอดภัยของระบบในจุดที่เสี่ยงจริง
- ทำให้พฤติกรรมของ API สม่ำเสมอขึ้น

## สิ่งที่แก้

### 1. ปิดช่องโหว่สมัครเป็น officer จากฝั่ง client

ไฟล์ที่เกี่ยวข้อง:

- `src/routes/auth.ts`

สิ่งที่เปลี่ยน:

- ไม่รับ `role` จาก request body อีกต่อไป
- ผู้ใช้ที่สมัครใหม่จะถูกสร้างเป็น `user` เสมอ
- normalize email ให้เป็น lowercase ก่อนเช็กซ้ำและก่อน login

เหตุผล:

- ก่อนแก้ ผู้ใช้สามารถส่ง `role: "officer"` มาเองตอนสมัครสมาชิกได้
- เป็นช่องโหว่ privilege escalation ที่ร้ายแรงที่สุดในรอบนี้

### 2. เพิ่ม rate limit ให้ auth endpoint

ไฟล์ที่เกี่ยวข้อง:

- `src/lib/rate-limit.ts`
- `src/routes/auth.ts`

สิ่งที่เปลี่ยน:

- เพิ่ม rate limiter แบบ in-memory
- ใช้กับ `POST /api/auth/register`
- ใช้กับ `POST /api/auth/login`

เหตุผล:

- ลด brute force และ spam request พื้นฐาน
- เป็นชั้นป้องกันเบื้องต้นโดยไม่เพิ่ม dependency ใหม่

ข้อจำกัด:

- เป็น memory-based limiter
- ถ้ามีหลาย instance จะไม่นับร่วมกัน

### 3. เพิ่ม validation utility กลาง

ไฟล์ที่เกี่ยวข้อง:

- `src/lib/validation.ts`

สิ่งที่เพิ่ม:

- `normalizeEmail`
- `parsePositiveNumber`
- `parseNonNegativeInteger`
- `isValidObjectId`
- `isValidEthereumAddress`
- `sanitizeString`

เหตุผล:

- ลด logic ซ้ำ
- ทำให้ทุก endpoint ใช้มาตรฐาน validation เดียวกัน

### 4. Hardening ระดับแอป

ไฟล์ที่เกี่ยวข้อง:

- `src/index.ts`

สิ่งที่เปลี่ยน:

- ปิด `x-powered-by`
- เพิ่ม header:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Strict-Transport-Security` ใน production
- จำกัด JSON body size เป็น `100kb`
- handle malformed JSON ให้ตอบ `400`
- handle payload ใหญ่เกิน limit ให้ตอบ `413`

เหตุผล:

- ลด fingerprint ของระบบ
- ลดความเสี่ยงจาก payload แปลกหรือ request body ขนาดใหญ่
- ทำให้ client ได้ error ที่ชัดเจนขึ้น

### 5. เพิ่ม validation ให้ endpoint ที่เสี่ยง

ไฟล์ที่เกี่ยวข้อง:

- `src/routes/waste.ts`
- `src/routes/officer.ts`
- `src/routes/wallet.ts`
- `src/routes/notifications.ts`
- `src/routes/rewards.ts`

สิ่งที่เปลี่ยน:

- `POST /api/waste/submit`
- validate และ sanitize `waste_type`, `weight_kg`, `description`, `image_url`

- `POST /api/waste/approve`
- validate `submission_id`
- validate `coin_amount`

- `POST /api/officer/add-coins`
- validate `user_id`
- validate `amount`

- `POST /api/wallet/transfer`
- validate Ethereum address
- กันโอนเข้ากระเป๋าตัวเอง

- `PUT /api/notifications/:id/read`
- validate notification id ก่อน query MongoDB

- reward endpoints
- validate `reward_id`
- sanitize `name`, `description`, `image_url`, `category`
- validate `coin_price`
- validate `stock`

เหตุผล:

- ป้องกัน invalid input ที่เดิมมีโอกาสทำให้ route ไปพังในชั้นลึก
- ลด `500` ที่เกิดจากข้อมูลไม่ถูกต้องตั้งแต่ request

### 6. ลดการเปิดเผยรายละเอียดภายในของระบบ

ไฟล์ที่เกี่ยวข้อง:

- `src/routes/wallet.ts`
- `src/routes/rewards.ts`

สิ่งที่เปลี่ยน:

- ไม่ส่งข้อความ error ภายในจาก blockchain/library กลับไปที่ client ตรง ๆ แล้ว
- ใช้ข้อความกลางเช่น `Transfer failed` และ `Redemption failed`

เหตุผล:

- ลดการรั่วของรายละเอียด implementation
- ลดข้อมูลที่ attacker ใช้เดา behavior ภายในระบบ

### 7. แก้ข้อความ notification ที่มีปัญหา encoding

ไฟล์ที่เกี่ยวข้อง:

- `src/routes/waste.ts`
- `src/routes/rewards.ts`

สิ่งที่เปลี่ยน:

- จัดรูปข้อความ notification ใหม่
- เขียนข้อความภาษาไทยในรูปแบบที่ไม่เสี่ยงเพี้ยนจาก encoding ของ shell/editor

เหตุผล:

- ก่อนหน้านี้บางข้อความแสดงอาการ mojibake
- ช่วยให้ข้อมูลที่บันทึกลง DB เสถียรมากขึ้น

## ผลการตรวจสอบ

สิ่งที่ตรวจแล้ว:

- `npm.cmd run build` ผ่าน
- start server ได้
- เชื่อม MongoDB ได้
- `GET /health` ตอบ `ok`
- ทดสอบสมัครสมาชิกโดยส่ง `role: "officer"` แล้วผลลัพธ์ถูกบังคับเป็น `user`
- ทดสอบ `PUT /api/notifications/not-an-id/read` ได้ `400`
- ทดสอบ `POST /api/wallet/transfer` ด้วย address ไม่ถูกต้อง ได้ `400`

## ผลกระทบที่ควรรู้

- ถ้า frontend เดิมส่ง `role` ตอนสมัคร ระบบจะไม่สนใจ field นี้แล้ว
- ถ้า client ส่ง JSON body ใหญ่เกิน `100kb` จะโดน `413`
- auth rate limiting ปัจจุบันเป็นระดับพื้นฐานใน process เดียว

## งานที่ควรทำต่อ

- เพิ่ม integration tests สำหรับ endpoint สำคัญ
- เพิ่ม audit log สำหรับ officer actions เช่น approve waste, add coins, reward management
- ถ้าจะ scale หลาย instance ควรย้าย rate limit ไป Redis หรือ shared store
- พิจารณาเพิ่ม `helmet` หรือ reverse proxy hardening ที่ชั้น deploy
