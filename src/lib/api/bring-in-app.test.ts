import { describe, expect, test, vi } from "vitest";
import { bringInApp } from "./bring-in-app";

describe("bringInApp", () => {
  test("POSTs target to the room-scoped bring-in endpoint with bearer auth", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          launchId: "bia_test",
          target: "claude-desktop",
          launchedAtMs: 123,
          payload: {
            roomId: "room-1",
            roomName: "Room One",
            roomDescription: null,
            recentMessagesMarkdown: "",
            openAsksMarkdown: null,
            generatedAtMs: 123,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await bringInApp("room-1", "token-1", "claude-desktop", fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:6174/api/chat-rooms/room-1/bring-in-app",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ target: "claude-desktop" }),
      }),
    );
    expect(result.launchId).toBe("bia_test");
  });

  test("surfaces server errors with response text", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "premium required" }), {
        status: 403,
        statusText: "Forbidden",
      }),
    );

    await expect(bringInApp("room-1", "token-1", "claude-desktop", fetchMock))
      .rejects
      .toThrow("premium required");
  });
});
