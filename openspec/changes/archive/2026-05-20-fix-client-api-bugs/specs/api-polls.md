## MODIFIED Requirements

### Requirement: Update poll via REST API
The system SHALL allow updating poll metadata (question, themes) via `PUT /api/polls/:id` with `x-user-id` header.

#### Scenario: Client sends PUT to update poll
- **WHEN** client sends `PUT /api/polls/:id` with valid `x-user-id` and JSON body
- **THEN** server returns 200 with updated poll object

#### Scenario: Client sends PATCH to update poll (rejected)
- **WHEN** client sends `PATCH /api/polls/:id`
- **THEN** server returns 404 (no PATCH route registered)

### Requirement: WebSocket subscribe message
The WebSocket server SHALL accept a `subscribe` message type from authenticated clients without returning an error.

#### Scenario: Client subscribes after auth
- **WHEN** authenticated WebSocket client sends `{ type: "subscribe", payload: { pollId } }`
- **THEN** server silently acknowledges (no response sent, no error sent)

#### Scenario: Unauthenticated subscribe
- **WHEN** unauthenticated WebSocket client sends `{ type: "subscribe", payload: { pollId } }`
- **THEN** server returns `{ type: "error", payload: { message: "Not authenticated" } }`
