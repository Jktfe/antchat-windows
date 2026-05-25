import { openUrl } from "@tauri-apps/plugin-opener";
import type { BringInTarget, RoomContextPayload } from "$shared/api-types";

export type LaunchOutcome = {
  status: "launched" | "fallback" | "unavailable";
  method: "url-scheme" | "clipboard";
  message: string;
};

export type LaunchEnvironment = {
  openExternalUrl?: (url: string) => Promise<void>;
  copyText?: (value: string) => Promise<void>;
};

export type BringInAppAdapter = {
  target: BringInTarget;
  label: string;
  available: boolean;
  unavailableReason?: string;
  launch(payload: RoomContextPayload, env?: LaunchEnvironment): Promise<LaunchOutcome>;
};

export function buildExternalLLMPrompt(
  payload: RoomContextPayload,
  opts: { trailing?: string } = {},
): string {
  const sections = [`I'm working in an ANT room called "${payload.roomName}".`];
  if (payload.roomDescription) {
    sections.push(`Room context: ${payload.roomDescription}`);
  }
  if (payload.openAsksMarkdown) {
    sections.push(`Open asks in this room:\n${payload.openAsksMarkdown}`);
  }
  if (payload.recentMessagesMarkdown) {
    sections.push(`Recent conversation:\n${payload.recentMessagesMarkdown}`);
  }
  sections.push(opts.trailing ?? "Please help me think about this.");
  return sections.join("\n\n");
}

async function copyPrompt(prompt: string, env?: LaunchEnvironment): Promise<boolean> {
  try {
    if (env?.copyText) {
      await env.copyText(prompt);
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(prompt);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

const claudeDesktopAdapter: BringInAppAdapter = {
  target: "claude-desktop",
  label: "Claude Desktop",
  available: true,
  async launch(payload, env) {
    const prompt = buildExternalLLMPrompt(payload);
    const url = `claude://new?text=${encodeURIComponent(prompt)}`;
    const openExternalUrl = env?.openExternalUrl ?? ((value: string) => openUrl(value));

    try {
      await openExternalUrl(url);
      await copyPrompt(prompt, env);
      return {
        status: "launched",
        method: "url-scheme",
        message: "Opening Claude Desktop. Prompt copied as fallback.",
      };
    } catch {
      if (await copyPrompt(prompt, env)) {
        return {
          status: "fallback",
          method: "clipboard",
          message: "Prompt copied. Open Claude Desktop and paste to continue.",
        };
      }
      return {
        status: "unavailable",
        method: "url-scheme",
        message: "Could not open Claude Desktop or copy the prompt.",
      };
    }
  },
};

function placeholder(
  target: BringInTarget,
  label: string,
  unavailableReason: string,
): BringInAppAdapter {
  return {
    target,
    label,
    available: false,
    unavailableReason,
    async launch() {
      return { status: "unavailable", method: "clipboard", message: unavailableReason };
    },
  };
}

export const BRING_IN_APP_ADAPTERS: BringInAppAdapter[] = [
  claudeDesktopAdapter,
  placeholder("claude-mobile", "Claude Mobile", "Claude Mobile ships in v0.5"),
  placeholder("chatgpt", "ChatGPT", "ChatGPT ships in v0.5"),
  placeholder("codex-desktop", "Codex Desktop", "Codex Desktop ships in v0.5"),
  placeholder("gemini", "Gemini", "Gemini ships in v0.5"),
];

export function findBringInAppAdapter(target: BringInTarget): BringInAppAdapter | undefined {
  return BRING_IN_APP_ADAPTERS.find((adapter) => adapter.target === target);
}
