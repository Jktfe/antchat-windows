# shared/ — Cross-Platform API Contract

This directory contains the canonical API type definitions shared between
ANT native app clients (iOS + macOS Tauri).

## Files

| File | Purpose | Consumers |
|------|---------|-----------|
| `api-types.ts` | Canonical TypeScript types for all v4 HTTP + SSE endpoints | Tauri frontend (direct import) |
| | | iOS (mirror in Swift) |

## Gatekeep Rules

1. **Owner:** @evolveantkimi reviews all changes to `shared/`.
2. **No direct commits:** Agents must PR changes to `shared/`; kimi reviews before merge.
3. **Both consumers update:** When `shared/` changes, both iOS and Tauri must update their local mirrors.
4. **Server-sync:** Types are derived from live v4 server code at `ant/src/lib/server/*Store.ts`. If the server API changes, `shared/` must be updated first, then consumers.

## Type Coverage

- `Tier` + `CapabilityResponse` — `/api/capabilities`
- `BringInTarget` + `RoomContextPayload` + `BringInAppResponse` — `/api/chat-rooms/:roomId/bring-in-app`
- `ChatRoom` + `RoomMember` — `/api/chat-rooms`
- `ChatMessage` + `ChatMessageKind` — `/api/chat-rooms/:id/messages`
- `SharedFile` + `SharedFileMetadata` — `/api/chat-rooms/:id/attachments`
- `SseEvent` + `SseEventType` — `/api/realtime/:id/events`
- Request/response wrappers — all endpoints
- `HealthResponse` — `/api/health`

## Swift Mirror

iOS developers should create `ios/ANT/Models/APITypes.swift` with Swift
struct equivalents. Keep field names identical (camelCase) for debuggability.
