import type { CapabilityResponse } from "$shared/api-types";
import { getServerUrl } from "$lib/server-config";

const CACHE_TTL_MS = 60_000;
const CLIENT_VERSION = "2026.05.16";

export type CapabilitiesSource = "server" | "fallback-404" | "fallback-network";

export interface CapabilitiesResult {
  data: CapabilityResponse;
  source: CapabilitiesSource;
  fetchedAt: number;
}

let cached: CapabilitiesResult | null = null;
let inflight: Promise<CapabilitiesResult> | null = null;

// Synthesised OSS-default capabilities. Returned when the server does not
// advertise /api/capabilities (404) or is unreachable. Keeps the app
// renderable instead of crashing on a missing optional endpoint.
function defaultOssCapabilities(): CapabilityResponse {
  return {
    serverVersion: "unknown",
    buildChannel: "unknown",
    tier: "oss",
    features: {
      oss: ["core"],
      native: [],
      enterprise: [],
    },
    featureFlags: {},
    limits: {
      maxRooms: null,
      maxTerminals: null,
      maxAgentsPerRoom: null,
      messageRetentionDays: 0,
    },
    migrationCompatibility: {
      minClientVersion: "0.0.0",
      deprecatedFeatures: [],
      breakingChanges: [],
    },
    branding: {
      productName: "ANT Chat",
      upgradeCta: null,
    },
  };
}

export async function fetchCapabilities(force = false): Promise<CapabilitiesResult> {
  const now = Date.now();
  if (!force && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      let res: Response;
      try {
        res = await fetch(`${getServerUrl()}/api/capabilities`, {
          headers: {
            "Ant-Client-Version": CLIENT_VERSION,
            Accept: "application/json",
          },
        });
      } catch {
        // Server unreachable — fall back to OSS defaults so the UI renders.
        // Source flag surfaces the detached state to the user.
        const result: CapabilitiesResult = {
          data: defaultOssCapabilities(),
          source: "fallback-network",
          fetchedAt: Date.now(),
        };
        cached = result;
        return result;
      }

      if (res.status === 404) {
        // Endpoint designed but not yet shipped (gated behind ANT_TIER
        // discovery rollout). Render OSS defaults.
        const result: CapabilitiesResult = {
          data: defaultOssCapabilities(),
          source: "fallback-404",
          fetchedAt: Date.now(),
        };
        cached = result;
        return result;
      }

      if (!res.ok) {
        throw new Error(
          `capabilities request failed: ${res.status} ${res.statusText}`,
        );
      }

      const data = (await res.json()) as CapabilityResponse;
      const result: CapabilitiesResult = {
        data,
        source: "server",
        fetchedAt: Date.now(),
      };
      cached = result;
      return result;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function staleCapabilities(): CapabilitiesResult | null {
  return cached;
}

export function clearCapabilitiesCache(): void {
  cached = null;
}

export function isFeatureEnabled(
  caps: CapabilityResponse,
  feature: string,
): boolean {
  return (
    caps.features[caps.tier].includes(feature) ||
    caps.featureFlags[feature] === true
  );
}
