import { describe, expect, test, vi } from "vitest";
import {
  BRING_IN_APP_ADAPTERS,
  buildExternalLLMPrompt,
  findBringInAppAdapter,
} from "./adapters";
import type { RoomContextPayload } from "$shared/api-types";

const payload: RoomContextPayload = {
  roomId: "orsz2321qb",
  roomName: "speed matters",
  roomDescription: "Full-hog delivery room",
  recentMessagesMarkdown: "**@speedycodex**: peer review complete",
  openAsksMarkdown: "- confirm next delivery lane",
  generatedAtMs: 1779714000000,
};

describe("buildExternalLLMPrompt", () => {
  test("includes room metadata, asks, recent messages, and trailing instruction", () => {
    const prompt = buildExternalLLMPrompt(payload, {
      trailing: "Use this context and help from Windows.",
    });

    expect(prompt).toContain('"speed matters"');
    expect(prompt).toContain("Full-hog delivery room");
    expect(prompt).toContain("confirm next delivery lane");
    expect(prompt).toContain("peer review complete");
    expect(prompt).toContain("Use this context and help from Windows.");
  });

  test("omits optional sections when absent", () => {
    const prompt = buildExternalLLMPrompt({
      ...payload,
      roomDescription: null,
      recentMessagesMarkdown: "",
      openAsksMarkdown: null,
    });

    expect(prompt).not.toContain("Room context:");
    expect(prompt).not.toContain("Open asks");
    expect(prompt).not.toContain("Recent conversation");
  });
});

describe("BRING_IN_APP_ADAPTERS", () => {
  test("keeps the same five server targets", () => {
    expect(BRING_IN_APP_ADAPTERS.map((a) => a.target).sort()).toEqual([
      "chatgpt",
      "claude-desktop",
      "claude-mobile",
      "codex-desktop",
      "gemini",
    ]);
  });

  test("Windows v0 enables Claude Desktop and keeps the rest as placeholders", () => {
    expect(BRING_IN_APP_ADAPTERS.filter((a) => a.available).map((a) => a.target)).toEqual([
      "claude-desktop",
    ]);
    expect(findBringInAppAdapter("chatgpt")?.unavailableReason).toContain("v0.5");
  });

  test("Claude Desktop adapter opens the URL scheme and copies fallback prompt", async () => {
    const opened: string[] = [];
    const copy = vi.fn(async (_value: string) => {});
    const adapter = findBringInAppAdapter("claude-desktop");

    const outcome = await adapter?.launch(payload, {
      openExternalUrl: async (url) => { opened.push(url); },
      copyText: copy,
    });

    expect(outcome?.status).toBe("launched");
    expect(opened[0]).toMatch(/^claude:\/\/new\?text=/);
    expect(decodeURIComponent(opened[0].split("text=")[1])).toContain("speed matters");
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("speed matters"));
  });
});
