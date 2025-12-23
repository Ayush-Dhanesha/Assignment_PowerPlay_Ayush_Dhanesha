# Assignment_PowerPlay_Ayush_Dhanesha

# TicketBoss - Event Ticketing API

Real-time event ticketing API with optimistic concurrency control, preventing over-selling in high-traffic scenarios.

## 🚀 Features

- **Real-time Reservations**: Instant accept/deny responses (no queuing)
- **Optimistic Locking**: Version-based concurrency control prevents over-selling
- **MVC Architecture**: Clean separation with Controllers, Services, and Repositories
- **Type-Safe**: 100% TypeScript with strict mode (no `any` types)
- **MongoDB Transactions**: ACID guarantees for data consistency
- **RESTful API**: Clean, intuitive endpoint design

---

## 📋 Prerequisites

- **Node.js** v16+ ([Download](https://nodejs.org/))
- **MongoDB** v6.0+ - Choose one:
  - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free cloud hosting - Recommended)
  - [MongoDB Community](https://www.mongodb.com/docs/manual/installation/) (Local installation)

---

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file in project root:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ticketboss?retryWrites=true&w=majority
```

**For MongoDB Atlas:**
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster → Get connection string
3. Whitelist your IP address
4. Replace `<username>` and `<password>` in `.env`

**For Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/ticketboss
```

### 3. Build & Start

**Development (with hot reload):**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

Server starts at: `http://localhost:3000`

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### **1. Reserve Seats**

**POST** `/reservations`

Reserve seats for the event.

**Request:**
```json
{
  "partnerId": "partner-123",
  "seats": 5
}
```

**Parameters:**
- `partnerId` (string, required): Partner identifier
- `seats` (number, required): Number of seats (1-10)

**Response:** `201 Created`
```json
{
  "reservationId": "550e8400-e29b-41d4-a716-446655440000",
  "seats": 5,
  "status": "confirmed"
}
```

**Errors:**
- `400 Bad Request`: Invalid input (missing fields, seats < 1 or > 10)
- `409 Conflict`: Not enough seats available or concurrent update detected

**Example:**
```bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"partner-123","seats":5}'
```

---

### **2. Cancel Reservation**

**DELETE** `/reservations/:reservationId`

Cancel a reservation and return seats to available pool.

**Path Parameters:**
- `reservationId` (string, required): Reservation ID to cancel

**Response:** `204 No Content`

**Errors:**
- `404 Not Found`: Reservation not found or already cancelled

**Example:**
```bash
curl -X DELETE http://localhost:3000/reservations/550e8400-e29b-41d4-a716-446655440000
```

---

### **3. Get Event Summary**

**GET** `/reservations`

Get current event status with seat availability.

**Response:** `200 OK`
```json
{
  "eventId": "node-meetup-2025",
  "name": "Node.js Meet-up",
  "totalSeats": 500,
  "availableSeats": 495,
  "reservationCount": 1,
  "version": 1
}
```

**Example:**
```bash
curl http://localhost:3000/reservations
```

---

### **4. List All Reservations**

**GET** `/reservations/list`

Get all reservations with details and IDs.

**Response:** `200 OK`
```json
{
  "eventId": "node-meetup-2025",
  "totalReservations": 2,
  "reservations": [
    {
      "reservationId": "550e8400-e29b-41d4-a716-446655440000",
      "partnerId": "partner-123",
      "seats": 5,
      "status": "confirmed",
      "createdAt": "2025-12-23T09:30:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/reservations/list
```

---

## 🏗️ Technical Decisions

### 1. **MVC Architecture with Service & Repository Layers**

**Why?** Clean separation of concerns for maintainability and testability.

```
Routes → Middleware → Controller → Service → Repository → MongoDB
```

**Layer Responsibilities:**
- **Routes**: Define API endpoints
- **Middleware**: Validate requests
- **Controllers**: Handle HTTP (request → response mapping)
- **Services**: Business logic & transaction orchestration
- **Repositories**: Data access abstraction
- **Models**: Mongoose schemas & type definitions

### 2. **MongoDB with Mongoose**

**Why MongoDB?**
- Flexible schema for future enhancements
- Built-in support for transactions (ACID guarantees)
- Horizontal scalability with replica sets
- Cloud-ready (MongoDB Atlas)

**Key Features Used:**
- Multi-document transactions for atomicity
- Indexes for fast queries
- Mongoose ODM for type-safe models

### 3. **Optimistic Concurrency Control**

**Why not locks?** Pessimistic locking kills performance under high traffic.

**How it works:**
```typescript
// Each event has a version number
const event = { available_seats: 100, version: 5 };

// Update only if version matches
UPDATE events 
SET available_seats = 95, version = 6
WHERE event_id = 'X' AND version = 5

// If version changed (concurrent update), query returns 0 rows → reject
```

**Benefits:**
- Prevents over-selling in race conditions
- No database locks (better throughput)
- Instant feedback to clients (accept/deny)

### 4. **TypeScript with Strict Mode**

**Configuration:**
- `noImplicitAny: true`
- `strictNullChecks: true`
- Zero `any` types in codebase

**Benefits:**
- Catch errors at compile time
- Self-documenting code
- Better IDE support

### 5. **Transaction Management**

All seat operations wrapped in MongoDB transactions:

```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 1. Check availability
  // 2. Update seats (with version check)
  // 3. Create/cancel reservation
  await session.commitTransaction(); // All or nothing
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

**Guarantees:**
- Atomicity: All operations succeed or all fail
- Consistency: No partial updates
- Isolation: Concurrent transactions don't interfere

---

## 📁 Project Structure

```
Assignment/
├── src/
│   ├── config/
│   │   └── constants.ts           # App config & error messages
│   ├── models/
│   │   ├── event.model.ts         # Event Mongoose schema
│   │   └── reservation.model.ts   # Reservation Mongoose schema
│   ├── repositories/
│   │   ├── event.repository.ts    # Event data access
│   │   └── reservation.repository.ts
│   ├── services/
│   │   └── reservation.service.ts # Business logic
│   ├── controllers/
│   │   └── reservation.controller.ts # HTTP handlers
│   ├── middleware/
│   │   └── validation.ts          # Request validation
│   ├── routes/
│   │   └── reservations.ts        # API endpoints
│   ├── db/
│   │   └── database.ts            # MongoDB connection
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   └── server.ts                  # Express app setup
├── dist/                          # Compiled JavaScript
├── package.json
├── tsconfig.json
├── .env                           # Environment variables
├── .gitignore
├── README.md
└── ARCHITECTURE.md
```

---

## 🔍 Database Schema

### **Events Collection**
```typescript
{
  event_id: "node-meetup-2025",      // Primary key
  name: "Node.js Meet-up",
  total_seats: 500,
  available_seats: 495,
  version: 1,                        // For optimistic locking
  created_at: "2025-12-23T09:00:00.000Z",
  updated_at: "2025-12-23T09:30:00.000Z"
}
```

**Indexes:** `event_id` (unique), `(event_id, version)` (compound)

### **Reservations Collection**
```typescript
{
  reservation_id: "550e8400-...",   // Primary key (UUID)
  event_id: "node-meetup-2025",     // Foreign key
  partner_id: "partner-123",
  seats: 5,
  status: "confirmed",               // "confirmed" | "cancelled"
  created_at: "2025-12-23T09:30:00.000Z",
  cancelled_at: null
}
```

**Indexes:** `reservation_id` (unique), `event_id`, `(event_id, status)`

---

## 🧪 Testing the API

### Quick Test Workflow

```bash
# 1. Check initial state (500 seats available)
curl http://localhost:3000/reservations

# 2. Reserve 5 seats
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"partner-1","seats":5}'

# Output: {"reservationId":"550e8400-...","seats":5,"status":"confirmed"}

# 3. List all reservations (get IDs)
curl http://localhost:3000/reservations/list

# 4. Cancel reservation (use ID from step 3)
curl -X DELETE http://localhost:3000/reservations/550e8400-...

# 5. Verify seats returned
curl http://localhost:3000/reservations
```

### Test Concurrency

```bash
# Simulate 10 simultaneous reservations
for i in {1..10}; do
  curl -X POST http://localhost:3000/reservations \
    -H "Content-Type: application/json" \
    -d "{\"partnerId\":\"partner-$i\",\"seats\":50}" &
done
wait

# Verify no over-selling
curl http://localhost:3000/reservations
```

---

## 📦 NPM Scripts

```bash
npm run build     # Compile TypeScript to JavaScript
npm start         # Start production server
npm run dev       # Start development server with hot reload
npm run seed      # Manually seed database (auto-runs on first start)
```

---

## ⚙️ Assumptions

1. **Single Event**: Current implementation focuses on one event (`node-meetup-2025`). Multi-event support is straightforward to add.

2. **No Authentication**: API is open. Production would add JWT/API key authentication.

3. **Partner Trust**: Partners provide valid `partnerId`. Production would validate credentials.

4. **Seat Limit**: Max 10 seats per reservation (configurable in `constants.ts`).

5. **Immediate Consistency**: All operations require strong consistency (no eventual consistency).

6. **500 Initial Seats**: Auto-seeded on first startup.

---

## 🔒 Error Handling

All errors return consistent JSON format:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `200 OK`: Successful GET request
- `201 Created`: Successful reservation
- `204 No Content`: Successful cancellation
- `400 Bad Request`: Invalid input
- `404 Not Found`: Resource not found
- `409 Conflict`: Business rule violation (not enough seats, concurrent update)
- `500 Internal Server Error`: Unexpected error

---

## 🚀 Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure MongoDB Atlas connection string
- [ ] Whitelist deployment server IP in Atlas
- [ ] Enable authentication (JWT/API keys)
- [ ] Set up rate limiting
- [ ] Configure CORS
- [ ] Enable HTTPS
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy
- [ ] Test graceful shutdown

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/ticketboss` |

---

## 📄 License

ISC

---

## 📚 Additional Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for in-depth architecture details and design decisions.
