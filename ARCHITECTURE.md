# TicketBoss Architecture

## Introduction

When you're building a ticketing system that needs to handle real-time seat reservations without over-selling, you're essentially solving one of the classic problems in distributed systems: how do you let multiple people compete for the same limited resource while maintaining data integrity? This document walks through the architectural decisions we made, why we made them, and how they work together to solve this problem.

## The Complete System

Here's the full architecture from the outside in:

```
┌─────────────────────────────────────────────────────────────────┐
│                         HTTP CLIENT                             │
│                    (External Partners)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ POST /reservations
                            │ DELETE /reservations/:id
                            │ GET /reservations
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (server.ts)                   │
│                                                                 │
│  • Load environment variables (dotenv)                          │
│  • Parse JSON request bodies                                    │
│  • Register routes                                              │
│  • Handle uncaught errors                                       │
│  • Graceful shutdown on SIGTERM/SIGINT                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ROUTES LAYER (routes/)                       │
│                                                                 │
│  POST   /reservations           → Reserve seats                 │
│  DELETE /reservations/:id       → Cancel reservation            │
│  GET    /reservations/list      → List all reservations         │
│  GET    /reservations           → Event summary                 │
│                                                                 │
│  Each route wires: Validation Middleware → Controller Method    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               MIDDLEWARE LAYER (middleware/)                    │
│                                                                 │
│  • Validate request structure                                   │
│  • Check data types (string, number)                            │
│  • Enforce business rules (1-10 seats)                          │
│  • Return 400 Bad Request if invalid                            │
│  • Call next() if valid                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              CONTROLLER LAYER (controllers/)                    │
│                                                                 │
│  Responsibilities:                                              │
│  • Extract data from req.body / req.params                      │
│  • Call appropriate service method                              │
│  • Catch errors from service layer                              │
│  • Map business errors → HTTP status codes:                     │
│    - "Not enough seats" → 409 Conflict                          │
│    - "Not found" → 404 Not Found                                │
│    - Unknown errors → 500 Internal Server Error                 │
│  • Build JSON response                                          │
│  • Send response to client                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                SERVICE LAYER (services/)                        │
│                                                                 │
│  The "brain" of the application:                                │
│  • Implement all business logic                                 │
│  • Start MongoDB transactions (session.startTransaction)        │
│  • Orchestrate multiple repository calls                        │
│  • Check business rules (availability, version matching)        │
│  • Commit transaction on success                                │
│  • Rollback transaction on failure                              │
│  • Throw descriptive errors                                     │
│                                                                 │
│  Example: reserveSeats()                                        │
│    1. Start transaction                                         │
│    2. Read current event state (with version)                   │
│    3. Validate: available_seats >= requested_seats              │
│    4. Update seats WITH version check (optimistic lock)         │
│    5. Create reservation record                                 │
│    6. Commit (or rollback on any failure)                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              REPOSITORY LAYER (repositories/)                   │
│                                                                 │
│  Data access abstraction:                                       │
│  • Execute MongoDB queries using Mongoose                       │
│  • Handle optimistic locking (version-based updates)            │
│  • CRUD operations (Create, Read, Update, Delete)               │
│  • Return typed domain models                                   │
│  • Accept session parameter for transactions                    │
│                                                                 │
│  Key Method: updateSeatsWithVersion()                           │
│    UPDATE events                                                │
│    SET available_seats = available_seats + change,              │
│        version = version + 1                                    │
│    WHERE event_id = X                                           │
│      AND version = currentVersion  ← Optimistic lock            │
│      AND available_seats + change >= 0                          │
│                                                                 │
│    Returns: true if updated, false if version mismatch          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MODELS LAYER (models/)                         │
│                                                                 │
│  Mongoose Schema Definitions:                                   │
│  • event.model.ts: Event schema with indexes                    │
│  • reservation.model.ts: Reservation schema with indexes        │
│                                                                 │
│  Key Fields:                                                    │
│  Event.version → Enables optimistic concurrency control         │
│  Event.available_seats → Decremented on reserve, incremented on │
│                          cancel                                 │
│  Reservation.status → 'confirmed' or 'cancelled'                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MONGODB DATABASE                             │
│                                                                 │
│  Collections:                                                   │
│  • events                                                       │
│    - event_id (unique index)                                    │
│    - version (for optimistic locking)                           │
│    - available_seats, total_seats                               │
│                                                                 │
│  • reservations                                                 │
│    - reservation_id (unique index)                              │
│    - event_id (index)                                           │
│    - status (index for queries)                                 │
│                                                                 │
│  Features Used:                                                 │
│  • Multi-document transactions (ACID)                           │
│  • Atomic operations ($inc, $set)                               │
│  • Compound indexes for performance                             │
└─────────────────────────────────────────────────────────────────┘
```

## Peeling the Onion: Layer by Layer

### Layer 1: The HTTP Layer (What Users See)

The outermost layer is the API surface. External partners hit our endpoints with HTTP requests. We needed something simple and RESTful:
- `POST /reservations` - Try to reserve seats
- `DELETE /reservations/:id` - Cancel a reservation
- `GET /reservations` - Get event summary

The Express server sits here, handling all the HTTP concerns. It parses JSON, matches routes, and deals with errors that bubble up from below. When the process receives a termination signal, this layer ensures we close database connections gracefully before shutting down.

Why Express? It's minimal, well-understood, and gets out of your way. We don't need a heavy framework here because our API surface is intentionally small.

### Layer 2: Validation (The Gatekeeper)

Before any request gets deeper into the system, middleware functions validate the input. This might seem paranoid, but it's critical. If someone sends `seats: "five"` instead of `seats: 5`, we catch it here and return a 400 Bad Request immediately. No point in wasting database resources on malformed requests.

The validation layer enforces:
- Required fields exist
- Data types are correct
- Business constraints are met (1-10 seats per request)

This is also where we could add authentication in the future. The middleware pattern makes it trivial to insert auth checks without touching any other code.

### Layer 3: Controllers (HTTP to Business Logic Bridge)

Controllers are translators. They speak HTTP on one side and domain logic on the other. When a request comes in, the controller:
1. Extracts the relevant data from `req.body` or `req.params`
2. Calls the appropriate service method
3. Waits for the result or catches an error
4. Maps that result to an HTTP status code and JSON response

Here's the important part: controllers have NO business logic. They don't know what "optimistic locking" means. They don't care about transactions. They just know: "Service said not enough seats? Return 409 Conflict. Service said success? Return 201 Created with the reservation ID."

This separation means we could swap HTTP for WebSockets or gRPC tomorrow, and the business logic wouldn't change.

### Layer 4: Services (The Brain)

This is where everything interesting happens. The service layer contains all business rules and orchestrates complex operations using transactions.

Let's walk through what happens when someone tries to reserve 5 seats:

```typescript
async reserveSeats(eventId: string, partnerId: string, seats: number): Promise<string> {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // First, get the current state of the event
    const event = await this.eventRepository.findById(eventId);
    if (!event) throw new Error('Event not found');
    
    // Check if we have enough seats
    if (event.available_seats < seats) {
      throw new Error('Not enough seats available');
    }
    
    // Try to update with optimistic locking
    const updated = await this.eventRepository.updateSeatsWithVersion(
      eventId,
      -seats,
      event.version,  // This is the key: version must match
      session
    );
    
    // If version changed between read and update, someone else got there first
    if (!updated) {
      throw new Error('Concurrent update detected, please retry');
    }
    
    // Create the reservation record
    const reservationId = uuidv4();
    await this.reservationRepository.create(
      reservationId, eventId, partnerId, seats, session
    );
    
    // All good - commit the transaction
    await session.commitTransaction();
    return reservationId;
    
  } catch (error) {
    // Something failed - undo everything
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

Notice the transaction wrapping everything. Either all operations succeed (update seats AND create reservation) or none do. This is crucial for data integrity.

Why put business logic here and not in controllers? Because business logic should be reusable. Tomorrow, we might add a CLI tool for manual reservations, or a batch import feature. Both can use the same service without duplicating logic.

### Layer 5: Repositories (Database Abstraction)

Repositories are our interface to MongoDB. They execute queries, but they don't know WHY. The service tells them "update these seats with this version check," and the repository just does it.

The most critical method here is `updateSeatsWithVersion()`:

```typescript
async updateSeatsWithVersion(
  eventId: string,
  seatsChange: number,
  currentVersion: number,
  session: ClientSession
): Promise<boolean> {
  const result = await EventModel.updateOne(
    {
      event_id: eventId,
      version: currentVersion,  // Must match current version
      available_seats: { $gte: -seatsChange }, // Prevent negative seats
    },
    {
      $inc: {
        available_seats: seatsChange,
        version: 1,  // Always increment version
      },
      $set: { updated_at: new Date() },
    },
    { session }
  );
  
  return result.modifiedCount > 0;
}
```

This is where optimistic locking happens. The WHERE clause includes the version number. If the version changed between when we read it and when we try to update, MongoDB won't update anything and returns `modifiedCount: 0`. The service sees this failure and can return a conflict error to the client.

Why abstract database operations this way? Because it makes testing easier (mock the repository, not MongoDB), and it makes database changes localized. If we switched from MongoDB to PostgreSQL, we'd only change repository implementations, not service or controller code.

### Layer 6: Models (Data Definitions)

At the core are Mongoose schemas. These define:
- What fields exist in each collection
- Data types and validation rules
- Indexes for query performance
- Default values

The Event model includes a `version` field defaulting to 0. Every time we update an event, we increment this. It's the foundation of our optimistic locking strategy.

The Reservation model tracks `status` so we can mark reservations as cancelled without deleting them. This gives us an audit trail.

### Layer 7: MongoDB (The Foundation)

We chose MongoDB for several reasons:
1. It has built-in support for multi-document transactions (we need ACID guarantees)
2. Atomic operations like `$inc` make concurrent updates safer
3. Flexible schema makes future feature additions easier
4. MongoDB Atlas provides easy cloud hosting

The database stores two collections: events and reservations. Indexes ensure fast lookups, especially on `event_id` and `(event_id, version)` for the optimistic locking queries.

## The Core Problem: Race Conditions

Let's talk about why this architecture exists at all. Imagine two people, Alice and Bob, both trying to reserve the last 3 seats at the exact same time.

### Without Optimistic Locking (The Bad Scenario)

```
Time    Alice                   Bob                     Database
────────────────────────────────────────────────────────────────
t0      Read: seats=3           Read: seats=3           seats=3
t1      Check: 3 >= 3 ✅        Check: 3 >= 3 ✅
t2      Update: seats=0         Update: seats=0         seats=0 then -3
t3      Success!                Success!                💥 OVERSOLD
```

Both read 3 seats, both see enough availability, both update. Result: 6 seats sold from a pool of 3. This is the classic "lost update" problem.

### With Optimistic Locking (The Good Scenario)

```
Time    Alice                   Bob                     Database
────────────────────────────────────────────────────────────────
t0      Read: v=10, seats=3     Read: v=10, seats=3     v=10, seats=3
t1      Check: 3 >= 3 ✅        Check: 3 >= 3 ✅
t2      UPDATE WHERE v=10       (waiting for lock...)   UPDATING
        Success! ✅                                      v=11, seats=0
t3                              UPDATE WHERE v=10       v=11, seats=0
                                Fails! ❌ (v is now 11) modifiedCount=0
t4      Returns 201             Returns 409 Conflict    ✅ Correct!
```

Alice's update succeeds and bumps the version to 11. When Bob's update tries to match version 10, it finds version 11 instead, so MongoDB doesn't modify anything. Bob's service layer sees `modifiedCount: 0` and returns a conflict error. Bob can retry, but he'll be told there are no seats left.

This is why the version field exists, and why every update increments it. It's a simple integer that prevents a catastrophic bug.

## Why MongoDB Transactions Matter

You might wonder: why wrap everything in transactions? Can't we just update seats and create a reservation?

Here's the problem. Imagine this sequence:

```
1. Update event: available_seats = 495
2. ❌ Server crashes
3. Reservation was never created
```

Now 5 seats are gone from the available pool, but there's no record of who reserved them. The seats are lost in limbo.

With transactions:

```
1. Start transaction
2. Update event: available_seats = 495
3. ❌ Server crashes
4. MongoDB automatically rolls back the update
5. available_seats is still 500
```

The transaction ensures atomicity: either both the seat update and reservation creation happen, or neither does. No partial state, no lost seats.

MongoDB's multi-document transactions give us full ACID guarantees:
- **Atomicity**: All or nothing
- **Consistency**: Database always valid
- **Isolation**: Transactions don't see each other's partial state
- **Durability**: Once committed, changes persist even if server crashes

## Type Safety and Why It Matters

The entire codebase is written in TypeScript with strict mode enabled. That means:
- No `any` types anywhere
- All nullable values explicitly typed
- Function parameters and returns fully typed

This isn't just about being pedantic. Type safety catches bugs at compile time that would otherwise show up in production. For example:

```typescript
// This won't compile
const seats: number = "five";

// This won't compile either
function reserveSeats(seats: number) { ... }
reserveSeats("five");
```

The compiler catches these mistakes before the code even runs. In a system where over-selling could cost real money and reputation, compile-time guarantees are invaluable.

TypeScript also makes refactoring safer. If we change a function signature, the compiler tells us every place that needs updating. Without types, we'd have to grep the codebase and hope we found everything.

## Design Decisions and Trade-offs

### Why MVC + Service Layer?

We could have put all the logic directly in controllers. It would be faster to write initially. But as the system grows, this architecture pays dividends:
- Services can be unit tested without HTTP mocking
- Business logic can be reused from different entry points (API, CLI, batch jobs)
- Controllers stay thin and focused on HTTP concerns
- Repositories make database changes localized

### Why Optimistic Locking Instead of Pessimistic?

Pessimistic locking means: "Lock this row while I'm working with it, unlock when done." The problem is, if you have 100 concurrent requests, 99 of them sit waiting for the lock. Throughput tanks.

Optimistic locking says: "I'll try to update, and if someone else changed it first, I'll fail fast and let the client retry." Most of the time, conflicts are rare, so most requests succeed immediately. When conflicts do happen, the client gets an instant response to retry.

The trade-off is that clients need to handle 409 Conflict responses and retry. But this is better than all clients waiting in a queue.

### Why MongoDB Instead of PostgreSQL?

MongoDB gives us:
- Multi-document transactions (we need ACID)
- Flexible schema (easier to add features like seat tiers, waitlists, etc.)
- Easy cloud hosting with MongoDB Atlas
- Atomic operations like `$inc` that work well with optimistic locking

The trade-off is that MongoDB's relational modeling is weaker than PostgreSQL. But for this use case, we only have two entities (events and reservations) with a simple relationship. MongoDB handles that fine.

### Why Repository Pattern?

Repositories abstract database operations. Services don't call `EventModel.updateOne()` directly; they call `eventRepository.updateSeatsWithVersion()`.

Benefits:
- Easy to mock repositories in tests
- Services don't need to know about Mongoose
- Switching databases only requires new repository implementations
- Query logic is centralized (DRY principle)

The trade-off is extra files and indirection. But in a production system, this pays off quickly.

## How Data Flows Through the System

Let's trace a complete request, from HTTP call to database and back:

1. **Client sends**: `POST /reservations {"partnerId": "abc", "seats": 5}`

2. **Express parses JSON** and routes to `POST /reservations`

3. **Validation middleware checks**:
   - Is `partnerId` a string? Yes ✅
   - Is `seats` a number between 1-10? Yes ✅
   - Calls `next()`

4. **Controller extracts data**:
   - `partnerId = "abc"`
   - `seats = 5`
   - Calls `service.reserveSeats("node-meetup-2025", "abc", 5)`

5. **Service starts transaction** and begins orchestration

6. **Repository reads event**:
   - MongoDB query: `db.events.findOne({ event_id: "node-meetup-2025" })`
   - Returns: `{ available_seats: 100, version: 10, ... }`

7. **Service validates**:
   - Is `100 >= 5`? Yes ✅

8. **Repository updates with optimistic lock**:
   - MongoDB query:
     ```
     db.events.updateOne(
       { event_id: "node-meetup-2025", version: 10, available_seats: { $gte: 5 } },
       { $inc: { available_seats: -5, version: 1 }, $set: { updated_at: now } }
     )
     ```
   - Result: `{ modifiedCount: 1 }` ✅

9. **Repository creates reservation**:
   - MongoDB query:
     ```
     db.reservations.insertOne({
       reservation_id: "550e8400-...",
       event_id: "node-meetup-2025",
       partner_id: "abc",
       seats: 5,
       status: "confirmed"
     })
     ```

10. **Service commits transaction**:
    - Both operations succeed ✅
    - Returns `reservationId: "550e8400-..."`

11. **Controller builds response**:
    - Status: 201 Created
    - Body: `{ "reservationId": "550e8400-...", "seats": 5, "status": "confirmed" }`

12. **Client receives JSON response** and knows the reservation succeeded

If any step failed (e.g., version mismatch at step 8), the service would rollback the transaction, throw an error, and the controller would return 409 Conflict.

## Performance Considerations

### Indexes

MongoDB uses B-tree indexes. Without indexes, queries scan every document (O(n)). With indexes, lookups are O(log n).

We index:
- `event_id` (unique) - for fast event lookups
- `(event_id, version)` (compound) - for optimistic locking queries
- `reservation_id` (unique) - for fast reservation lookups
- `(event_id, status)` (compound) - for counting active reservations

### Connection Pooling

Mongoose maintains a connection pool. Instead of opening a new TCP connection for every request, it reuses existing connections. This dramatically improves latency.

### Transaction Duration

We keep transactions as short as possible. Long-running transactions hold locks and reduce concurrency. Our transactions typically complete in milliseconds.

### Projection

When we only need `available_seats` and `version`, we tell Mongoose to fetch only those fields:

```typescript
EventModel.findOne({ event_id: 'X' }).select('available_seats version');
```

This reduces data transfer and memory usage.

## What We'd Change for Production Scale

Right now, this architecture handles hundreds of requests per second on a single server. For production at scale, we'd add:

1. **Multiple app instances** behind a load balancer
2. **MongoDB replica set** with read replicas to distribute query load
3. **Redis caching** for event summaries (frequently read, rarely written)
4. **Rate limiting** to prevent abuse
5. **JWT authentication** to validate partners
6. **Structured logging** with correlation IDs for debugging
7. **Monitoring** with metrics on latency, error rates, and throughput
8. **Horizontal scaling** with more servers as traffic grows

The beauty of this architecture is that we can add all of these without changing the core business logic. The layered design keeps concerns separated.

## Common Questions

**Q: Why not use database locks instead of optimistic locking?**
A: Pessimistic locks kill throughput. With 100 concurrent requests, 99 wait for locks. Optimistic locking lets them all proceed, and only conflicts fail fast.

**Q: What if two requests have the exact same version and both try to update?**
A: MongoDB's atomic operations ensure only one update succeeds. The WHERE clause checks the version in the same operation as the update. There's no race condition.

**Q: Can't transactions be slow?**
A: They add milliseconds of overhead. The benefit (no data corruption) far outweighs the cost. We keep transactions short to minimize impact.

**Q: Why TypeScript? JavaScript works fine.**
A: Type safety catches bugs at compile time. In a financial system (tickets cost money), runtime bugs are expensive. TypeScript is insurance.

**Q: Could we use PostgreSQL instead?**
A: Absolutely. We'd rewrite the repositories to use SQL queries, but the services, controllers, and routes would stay the same. That's the value of abstraction.

**Q: What if MongoDB goes down?**
A: The app crashes gracefully. In production, we'd have a replica set with automatic failover. MongoDB Atlas handles this automatically.

## Conclusion

This architecture solves a specific problem: high-concurrency seat reservations without over-selling. The solution is:

1. **Optimistic locking** (version field) prevents lost updates
2. **Transactions** ensure atomicity (no partial state)
3. **Layered architecture** (MVC + Service + Repository) keeps concerns separated
4. **Type safety** (TypeScript strict mode) catches bugs early

Each layer has a clear responsibility. Each pattern solves a specific problem. Nothing is over-engineered, and nothing is under-engineered. It's a pragmatic architecture for a real-world problem.

If you're building something similar, you can steal this entire design. Just remember: the version field is critical, transactions are non-negotiable, and separation of concerns will save you when requirements change.
