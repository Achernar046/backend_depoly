# ใช้ Node.js เป็น base
FROM node:18-alpine

WORKDIR /app

# Copy ไฟล์ทั้งหมดในโฟลเดอร์ backend-deploy เข้าไป
COPY package*.json ./
RUN npm install

# Copy ส่วนที่เหลือทั้งหมด (src, artifacts, typechain-types)
COPY . .

# Build TypeScript เป็น JavaScript
RUN npm run build

# กำหนด Port (ปรับตามที่ backend ของคุณใช้ เช่น 3000 หรือ 5000)
EXPOSE 3000

# สั่งรันแอปจากโฟลเดอร์ dist (ที่ได้จากการ build)
CMD ["node", "dist/index.js"]
