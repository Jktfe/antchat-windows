import type { CapabilityResponse } from "$shared/api-types";
import {
  fetchCapabilities,
  staleCapabilities,
  type CapabilitiesSource,
} from "$lib/api/capabilities";

type Status = "idle" | "loading" | "ready" | "error";

class CapabilitiesStore {
  data = $state<CapabilityResponse | null>(staleCapabilities()?.data ?? null);
  source = $state<CapabilitiesSource | null>(staleCapabilities()?.source ?? null);
  status = $state<Status>("idle");
  error = $state<string | null>(null);

  async load(force = false): Promise<void> {
    this.status = "loading";
    this.error = null;
    try {
      const result = await fetchCapabilities(force);
      this.data = result.data;
      this.source = result.source;
      this.status = "ready";
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.status = "error";
    }
  }
}

export const capabilities = new CapabilitiesStore();
