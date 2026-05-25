/**
 * Shared API Types — ant-native
 *
 * Canonical type definitions for the ANT v4 HTTP + SSE API surface.
 * Both iOS (Swift) and macOS Tauri (TypeScript/Svelte) consumers
 * should mirror these shapes in their respective languages.
 *
 * Source of truth: derived from live v4 server code at
 * /Users/jamesking/CascadeProjects/ant/src/lib/server/*Store.ts
 * Last synced: 2026-05-16
 */

// ============================================================================
// Tier + Capability Discovery
// ============================================================================

export type Tier = 'oss' | 'native' | 'enterprise';

export interface CapabilityResponse {
  serverVersion: string;
  buildChannel: string;
  tier: Tier;
  features: {
    oss: string[];
    native: string[];
    enterprise: string[];
  };
  featureFlags: Record<string, boolean>;
  limits: {
    maxRooms: number | null;
    maxTerminals: number | null;
    maxAgentsPerRoom: number | null;
    messageRetentionDays: number;
  };
  migrationCompatibility: {
    minClientVersion: string;
    deprecatedFeatures: string[];
    breakingChanges: string[];
  };
  branding: {
    productName: string;
    upgradeCta: string | null;
  };
}

// ============================================================================
// Bring in App
// ============================================================================

export type BringInTarget =
  | 'claude-desktop'
  | 'claude-mobile'
  | 'chatgpt'
  | 'codex-desktop'
  | 'gemini';

export interface RoomContextPayload {
  roomId: string;
  roomName: string;
  roomDescription: string | null;
  recentMessagesMarkdown: string;
  openAsksMarkdown: string | null;
  generatedAtMs: number;
}

export interface BringInAppResponse {
  launchId: string;
  target: BringInTarget;
  launchedAtMs: number;
  payload: RoomContextPayload;
}

// ============================================================================
// Room
// ============================================================================

export type RoomAttentionState =
  | 'ready'
  | 'working'
  | 'asking'
  | 'blocked'
  | 'stale';

export interface RoomMember {
  handle: string;
  displayName: string;
  joinedAt: string;
  kind: 'human' | 'agent';
  // Per-room presentation overrides (Fix 5). Server emits when present;
  // clients render with handle-hash fallback when omitted.
  displayColor?: string;
  displayIcon?: string;
  displayBackgroundStyle?: 'card' | 'tint' | 'transparent';
}

export interface ChatRoom {
  id: string;
  name: string;
  summary: string;
  attentionState: RoomAttentionState;
  lastUpdate: string;
  whenItWasCreated: string;
  whoCreatedIt: string;
  creationOrder: number;
  members: RoomMember[];
}

export interface RecoverableChatRoom {
  id: string;
  name: string;
  summary: string;
  attentionState: RoomAttentionState;
  lastUpdate: string;
  whenItWasCreated: string;
  whoCreatedIt: string;
  creationOrder: number;
  archivedAtMs: number | null;
  deletedAtMs: number | null;
  restorable: boolean;
  deleteBoundary?: string;
}

// ============================================================================
// Message
// ============================================================================

export type ChatMessageKind = 'human' | 'agent' | 'system' | 'system-break';

export interface ChatMessage {
  id: string;
  roomId: string;
  authorHandle: string;
  authorDisplayName: string;
  kind: ChatMessageKind;
  body: string;
  postedAt: string;
  postOrder: number;
  parentMessageId?: string;
  discussion_id?: string;
  // #74 soft-delete: set when the author has removed the message.
  // Clients render a tombstone and exclude the body from rendering/notifications.
  deletedAtMs?: number;
  deletedByHandle?: string;
  // #76 edit: set when the author has updated the body. Clients can render an
  // "edited" indicator and still show the latest body. Native-paid surfaces
  // expose the edit affordance; OSS renders the indicator only.
  editedAtMs?: number;
}

// ============================================================================
// Attachment (File)
// ============================================================================

export interface SharedFile {
  id: string;
  roomId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  contentsBase64: string;
  uploadedByHandle: string;
  uploadedAt: string;
}

/** Metadata-only variant returned by GET /api/chat-rooms/:id/attachments */
export type SharedFileMetadata = Omit<SharedFile, 'contentsBase64'>;

// ============================================================================
// SSE Event (realtime stream)
// ============================================================================

export type SseEventType =
  | 'message_added'
  | 'message_updated'
  | 'member_joined'
  | 'member_left'
  | 'typing'
  | 'agent_event'
  | 'terminal_event'
  | 'plan_event'
  | 'task_event';

export interface SseEvent {
  type: SseEventType;
  roomId: string;
  payload: unknown;
  ts: string;
}

// ============================================================================
// API Request / Response Wrappers
// ============================================================================

export interface ListRoomsResponse {
  chatRooms: ChatRoom[];
}

export interface CreateRoomRequest {
  name: string;
  whoCreatedIt?: string;
}

export interface CreateRoomResponse {
  chatRoom: ChatRoom;
}

export interface ListMessagesResponse {
  messages: ChatMessage[];
}

export interface PostMessageRequest {
  body: string;
  authorHandle?: string;
  kind?: ChatMessageKind;
  parentMessageId?: string;
}

export interface PostMessageResponse {
  message: ChatMessage;
}

export interface ListAttachmentsResponse {
  sharedFiles: SharedFileMetadata[];
}

export interface UploadAttachmentRequest {
  filename: string;
  mimeType: string;
  contentsBase64: string;
  uploadedByHandle: string;
}

export interface UploadAttachmentResponse {
  sharedFile: SharedFileMetadata;
}

// ============================================================================
// Health / Diagnostics
// ============================================================================

export interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
  pid: number;
  db: {
    reachable: boolean;
    error: string | null;
  };
  booted: Record<string, boolean>;
  sampledAt: string;
}
