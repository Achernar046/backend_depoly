# WasteCoin Backend API

Base URL: `http://<host>:3000`

Auth:
- Public: no token required
- `auth`: `Authorization: Bearer <jwt>`
- `officer`: `Authorization: Bearer <jwt>` with officer role

Common error JSON:

```json
{"error":"Internal server error"}
```

## Endpoint Summary

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/waste/submit` | `auth` | Submit waste |
| GET | `/api/waste/my-submissions` | `auth` | List my submissions |
| GET | `/api/waste/pending` | `officer` | List pending submissions |
| POST | `/api/waste/approve` | `officer` | Approve waste submission |
| POST | `/api/officer/add-coins` | `officer` | Mint coins to user |
| GET | `/api/officer/transactions` | `officer` | List recent transactions |
| GET | `/api/officer/rewards/report` | `officer` | Reward inventory and redemption report |
| GET | `/api/wallet/balance` | `auth` | Get wallet token balance |
| GET | `/api/wallet/info` | `auth` | Get wallet/profile info |
| POST | `/api/wallet/transfer` | `auth` | Transfer tokens |
| GET | `/api/wallet/export` | `auth` | Export wallet private key |
| GET | `/api/transactions/history` | `auth` | List transaction history |
| GET | `/api/users/profile` | `auth` | Get profile and stats |
| PUT | `/api/users/profile` | `auth` | Update profile |
| POST | `/api/users/change-password` | `auth` | Change password |
| GET | `/api/users/list` | `officer` | List users |
| GET | `/api/app/dashboard` | `auth` | Dashboard aggregate |
| POST | `/api/app/verify-identity` | `auth` | Verify current password |
| POST | `/api/app/change-password` | `auth` | Change password via app flow |
| GET | `/api/rewards/list` | `auth` | List rewards in stock |
| POST | `/api/rewards/redeem` | `auth` | Redeem reward |
| GET | `/api/rewards/history` | `auth` | Redemption history |
| POST | `/api/rewards/add` | `officer` | Add reward |
| PUT | `/api/rewards/update/:id` | `officer` | Update reward |
| DELETE | `/api/rewards/delete/:id` | `officer` | Delete reward |
| GET | `/api/notifications` | `auth` | List notifications |
| PUT | `/api/notifications/read-all` | `auth` | Mark all notifications as read |
| PUT | `/api/notifications/:id/read` | `auth` | Mark one notification as read |

## Health

### GET /health
- Auth: Public
- Success codes: `200`
- Common errors: none

Response `200`:

```json
{"status":"ok","message":"WasteCoin Backend is running"}
```

Curl:

```bash
curl -X GET "http://<host>:3000/health"
```

## Auth

### POST /api/auth/register
- Auth: Public
- Success codes: `201`
- Common errors: `400`, `409`, `500`

Request:

```json
{"user_id":"65001","name":"John Doe","email":"john@example.com","password":"123456","role":"user"}
```

Response `201`:

```json
{"message":"User registered successfully","token":"<jwt>","user":{"id":"<objectId>","userId":"65001","name":"John Doe","email":"john@example.com","role":"user","walletAddress":"0x..."}}
```

Common error examples:

```json
{"error":"ID User, Name, Email and Password are required"}
{"error":"Password must be at least 6 characters"}
{"error":"Invalid email format"}
{"error":"User ID already exists"}
{"error":"Email already exists"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"65001","name":"John Doe","email":"john@example.com","password":"123456","role":"user"}'
```

### POST /api/auth/login
- Auth: Public
- Success codes: `200`
- Common errors: `400`, `401`, `500`

Request:

```json
{"email":"john@example.com","password":"123456"}
```

Response `200`:

```json
{"message":"Login successful","token":"<jwt>","user":{"id":"<objectId>","email":"john@example.com","role":"user","walletAddress":"0x..."}}
```

Common error examples:

```json
{"error":"Email and password are required"}
{"error":"Invalid email or password"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"123456"}'
```

## Waste

### POST /api/waste/submit
- Auth: `auth`
- Success codes: `201`
- Common errors: `400`, `401`, `500`

Request:

```json
{"waste_type":"plastic","weight_kg":1.5,"description":"bottles","image_url":"https://example.com/img.jpg"}
```

Response `201`:

```json
{"message":"Waste submission created successfully","submission":{"id":"<objectId>","user_id":"<objectId>","waste_type":"plastic","weight_kg":1.5,"description":"bottles","image_url":"https://example.com/img.jpg","status":"pending","created_at":"<date>","updated_at":"<date>"}}
```

Common error examples:

```json
{"error":"Waste type and weight are required"}
{"error":"Weight must be greater than 0"}
{"error":"Unauthorized: No token provided"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/waste/submit" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"waste_type":"plastic","weight_kg":1.5,"description":"bottles","image_url":"https://example.com/img.jpg"}'
```

### GET /api/waste/my-submissions
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `500`

Response `200`:

```json
[{"_id":"<objectId>","user_id":"<objectId>","waste_type":"plastic","weight_kg":1.5,"status":"pending","created_at":"<date>","updated_at":"<date>"}]
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/waste/my-submissions" \
  -H "Authorization: Bearer <jwt>"
```

### GET /api/waste/pending
- Auth: `officer`
- Success codes: `200`
- Common errors: `401`, `403`, `500`

Response `200`:

```json
[{"_id":"<objectId>","user_id":"<objectId>","waste_type":"plastic","weight_kg":1.5,"status":"pending","user":{"_id":"<objectId>","email":"john@example.com"}}]
```

Common error examples:

```json
{"error":"Forbidden: Officer access only"}
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/waste/pending" \
  -H "Authorization: Bearer <officer-jwt>"
```

### POST /api/waste/approve
- Auth: `officer`
- Success codes: `200`
- Common errors: `400`, `401`, `403`, `404`, `500`

Request:

```json
{"submission_id":"<objectId>","coin_amount":25}
```

Response `200`:

```json
{"message":"Submission approved and coins minted","txHash":"0x...","coin_amount":25}
```

Common error examples:

```json
{"error":"Submission ID and coin amount are required"}
{"error":"Coin amount must be greater than 0"}
{"error":"Submission not found"}
{"error":"Submission already processed"}
{"error":"User not found"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/waste/approve" \
  -H "Authorization: Bearer <officer-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"submission_id":"<objectId>","coin_amount":25}'
```

## Officer

### POST /api/officer/add-coins
- Auth: `officer`
- Success codes: `201`
- Common errors: `400`, `401`, `403`, `404`, `500`

Request:

```json
{"user_id":"<objectId>","amount":100}
```

Response `201`:

```json
{"message":"Coins added successfully","transaction":{"id":"<objectId>","amount":100,"user":"john@example.com","walletAddress":"0x...","txHash":"0x..."}}
```

Common error examples:

```json
{"error":"User ID and amount are required"}
{"error":"Amount must be greater than 0"}
{"error":"Invalid user ID"}
{"error":"User not found"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/officer/add-coins" \
  -H "Authorization: Bearer <officer-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<objectId>","amount":100}'
```

### GET /api/officer/transactions
- Auth: `officer`
- Success codes: `200`
- Common errors: `401`, `403`, `500`

Response `200`:

```json
[{"_id":"<objectId>","user_id":"<objectId>","type":"mint","amount":100,"to_address":"0x...","blockchain_tx_hash":"0x...","status":"confirmed","created_at":"<date>","user":{"_id":"<objectId>","email":"john@example.com"}}]
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/officer/transactions" \
  -H "Authorization: Bearer <officer-jwt>"
```

### GET /api/officer/rewards/report
- Auth: `officer`
- Success codes: `200`
- Common errors: `401`, `403`, `500`

Response `200`:

```json
{"inventory":[{"_id":"<objectId>","name":"Reward A","coin_price":10,"stock":5}],"history":[{"_id":"<objectId>","user_id":"<objectId>","user_name":"John Doe","reward_name":"Reward A","created_at":"<date>","status":"pending"}]}
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/officer/rewards/report" \
  -H "Authorization: Bearer <officer-jwt>"
```

## Wallet

### GET /api/wallet/balance
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `500`

Response `200`:

```json
{"walletAddress":"0x...","balance":"100.0","symbol":"WST"}
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/wallet/balance" \
  -H "Authorization: Bearer <jwt>"
```

### GET /api/wallet/info
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `404`, `500`

Response `200`:

```json
{"userId":"65001","name":"John Doe","email":"john@example.com","role":"user","walletAddress":"0x..."}
```

Common error examples:

```json
{"error":"User not found"}
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/wallet/info" \
  -H "Authorization: Bearer <jwt>"
```

### POST /api/wallet/transfer
- Auth: `auth`
- Success codes: `200`
- Common errors: `400`, `401`, `500`

Request:

```json
{"to_address":"0xabc...","amount":5}
```

Response `200`:

```json
{"message":"Transfer successful","txHash":"0x..."}
```

Common error examples:

```json
{"error":"Recipient address and amount are required"}
{"error":"Amount must be greater than 0"}
{"error":"Transfer failed: <reason>"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/wallet/transfer" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"to_address":"0xabc...","amount":5}'
```

### GET /api/wallet/export
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `404`, `500`

Response `200`:

```json
{"address":"0x...","privateKey":"0x...","warning":"NEVER share your private key with anyone!"}
```

Common error examples:

```json
{"error":"Wallet not found"}
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/wallet/export" \
  -H "Authorization: Bearer <jwt>"
```

## Transactions

### GET /api/transactions/history
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `500`

Response `200`:

```json
[{"_id":"<objectId>","user_id":"<objectId>","type":"transfer","amount":5,"to_address":"0x...","blockchain_tx_hash":"0x...","status":"confirmed","created_at":"<date>"}]
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/transactions/history" \
  -H "Authorization: Bearer <jwt>"
```

## Users

### GET /api/users/profile
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `404`, `500`

Response `200`:

```json
{"_id":"<objectId>","user_id":"65001","name":"John Doe","email":"john@example.com","role":"user","wallet_address":"0x...","created_at":"<date>","updated_at":"<date>","stats":{"total_submissions":3,"approved_submissions":2,"total_coins_earned":50}}
```

Common error examples:

```json
{"error":"User not found"}
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/users/profile" \
  -H "Authorization: Bearer <jwt>"
```

### PUT /api/users/profile
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `404`, `500`

Request:

```json
{"name":"John D","profile_image":"https://example.com/me.jpg","phone_number":"0812345678"}
```

Response `200`:

```json
{"message":"Profile updated successfully"}
```

Curl:

```bash
curl -X PUT "http://<host>:3000/api/users/profile" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"John D","profile_image":"https://example.com/me.jpg","phone_number":"0812345678"}'
```

### POST /api/users/change-password
- Auth: `auth`
- Success codes: `200`
- Common errors: `400`, `401`, `404`, `500`

Request:

```json
{"currentPassword":"123456","newPassword":"654321"}
```

Response `200`:

```json
{"message":"Password changed successfully"}
```

Common error examples:

```json
{"error":"Current and new password are required"}
{"error":"New password must be at least 6 characters"}
{"error":"Invalid current password"}
{"error":"User not found"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/users/change-password" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"123456","newPassword":"654321"}'
```

### GET /api/users/list
- Auth: `officer`
- Success codes: `200`
- Common errors: `401`, `403`, `500`

Response `200`:

```json
[{"_id":"<objectId>","user_id":"65001","name":"John Doe","email":"john@example.com","role":"user","wallet_address":"0x...","created_at":"<date>","updated_at":"<date>"}]
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/users/list" \
  -H "Authorization: Bearer <officer-jwt>"
```

## App

### GET /api/app/dashboard
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `404`, `500`

Response `200`:

```json
{"profile":{"userId":"65001","name":"John Doe","email":"john@example.com","role":"user","walletAddress":"0x..."},"wallet":{"address":"0x...","createdAt":"<date>"},"recentTransactions":[{"_id":"<objectId>","type":"mint","amount":25}]}
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/app/dashboard" \
  -H "Authorization: Bearer <jwt>"
```

### POST /api/app/verify-identity
- Auth: `auth`
- Success codes: `200`
- Common errors: `400`, `401`, `404`, `500`

Request:

```json
{"password":"123456"}
```

Response `200`:

```json
{"message":"Identity verified successfully","verified":true}
```

Common error examples:

```json
{"error":"Password is required"}
{"error":"Invalid password"}
{"error":"User not found"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/app/verify-identity" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"password":"123456"}'
```

### POST /api/app/change-password
- Auth: `auth`
- Success codes: `200`
- Common errors: `400`, `401`, `404`, `500`

Request:

```json
{"old_password":"123456","new_password":"654321"}
```

Response `200`:

```json
{"message":"Password updated successfully"}
```

Common error examples:

```json
{"error":"old_password and new_password are required"}
{"error":"New password must be at least 6 characters"}
{"error":"Invalid old password"}
{"error":"User not found"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/app/change-password" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"123456","new_password":"654321"}'
```

## Rewards

### GET /api/rewards/list
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `500`

Response `200`:

```json
[{"_id":"<objectId>","name":"Reward A","description":"...","image_url":"https://example.com/r.jpg","coin_price":10,"stock":5,"category":"test","created_at":"<date>","updated_at":"<date>"}]
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/rewards/list" \
  -H "Authorization: Bearer <jwt>"
```

### POST /api/rewards/redeem
- Auth: `auth`
- Success codes: `200`
- Common errors: `400`, `401`, `404`, `500`

Request:

```json
{"reward_id":"<objectId>"}
```

Response `200`:

```json
{"message":"Redemption successful","redemption":{"reward_name":"Reward A","txHash":"0x..."}}
```

Common error examples:

```json
{"error":"Reward ID is required"}
{"error":"Invalid reward ID"}
{"error":"Reward not found"}
{"error":"Reward out of stock"}
{"error":"Redemption failed: <reason>"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/rewards/redeem" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"reward_id":"<objectId>"}'
```

### GET /api/rewards/history
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `500`

Response `200`:

```json
[{"_id":"<objectId>","user_id":"<objectId>","reward_id":"<objectId>","reward_name":"Reward A","coin_price":10,"status":"pending","blockchain_tx_hash":"0x...","created_at":"<date>","updated_at":"<date>"}]
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/rewards/history" \
  -H "Authorization: Bearer <jwt>"
```

### POST /api/rewards/add
- Auth: `officer`
- Success codes: `201`
- Common errors: `400`, `401`, `403`, `500`

Request:

```json
{"name":"Reward A","description":"created by api test","image_url":"https://example.com/test.png","coin_price":10,"stock":1,"category":"test"}
```

Response `201`:

```json
{"message":"Reward added successfully","reward":{"id":"<objectId>","name":"Reward A","description":"created by api test","image_url":"https://example.com/test.png","coin_price":10,"stock":1,"category":"test","created_at":"<date>","updated_at":"<date>","_id":"<objectId>"}}
```

Common error examples:

```json
{"error":"Name, coin price, and stock are required"}
{"error":"Coin price must be greater than 0"}
{"error":"Stock must be a non-negative integer"}
```

Curl:

```bash
curl -X POST "http://<host>:3000/api/rewards/add" \
  -H "Authorization: Bearer <officer-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Reward A","description":"created by api test","image_url":"https://example.com/test.png","coin_price":10,"stock":1,"category":"test"}'
```

### PUT /api/rewards/update/:id
- Auth: `officer`
- Success codes: `200`
- Common errors: `400`, `401`, `403`, `404`, `500`

Request:

```json
{"stock":2,"coin_price":15}
```

Response `200`:

```json
{"message":"Reward updated successfully"}
```

Common error examples:

```json
{"error":"Invalid reward ID"}
{"error":"Coin price must be greater than 0"}
{"error":"Stock must be a non-negative integer"}
{"error":"Reward not found"}
```

Curl:

```bash
curl -X PUT "http://<host>:3000/api/rewards/update/<id>" \
  -H "Authorization: Bearer <officer-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"stock":2,"coin_price":15}'
```

### DELETE /api/rewards/delete/:id
- Auth: `officer`
- Success codes: `200`
- Common errors: `400`, `401`, `403`, `404`, `500`

Response `200`:

```json
{"message":"Reward deleted successfully"}
```

Common error examples:

```json
{"error":"Invalid reward ID"}
{"error":"Reward not found"}
```

Curl:

```bash
curl -X DELETE "http://<host>:3000/api/rewards/delete/<id>" \
  -H "Authorization: Bearer <officer-jwt>"
```

## Notifications

### GET /api/notifications
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `500`

Response `200`:

```json
[{"_id":"<objectId>","user_id":"<objectId>","title":"...","message":"...","type":"success","is_read":false,"created_at":"<date>"}]
```

Curl:

```bash
curl -X GET "http://<host>:3000/api/notifications" \
  -H "Authorization: Bearer <jwt>"
```

### PUT /api/notifications/read-all
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `500`

Response `200`:

```json
{"message":"All notifications marked as read"}
```

Curl:

```bash
curl -X PUT "http://<host>:3000/api/notifications/read-all" \
  -H "Authorization: Bearer <jwt>"
```

### PUT /api/notifications/:id/read
- Auth: `auth`
- Success codes: `200`
- Common errors: `401`, `404`, `500`

Response `200`:

```json
{"message":"Notification marked as read"}
```

Common error examples:

```json
{"error":"Notification not found"}
```

Curl:

```bash
curl -X PUT "http://<host>:3000/api/notifications/<id>/read" \
  -H "Authorization: Bearer <jwt>"
```
