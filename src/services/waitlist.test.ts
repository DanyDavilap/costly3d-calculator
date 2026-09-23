import { afterEach, describe, expect, it, vi } from "vitest";
import { sendBetaWaitlistEmail } from "./waitlist";

const mockResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
});

describe("waitlist registration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reconoce un correo ya registrado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(200, { ok: true, alreadyRegistered: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendBetaWaitlistEmail("maker@example.com")).resolves.toEqual({
      status: "already_registered",
      message: "Este correo ya estaba en la lista.",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("no envía un header apikey vacío", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(200, { ok: true, registered: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendBetaWaitlistEmail("maker@example.com");
    const request = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(request.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("convierte una caída del backend en un mensaje entendible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(500, { ok: false, error: "Database error" })),
    );

    const result = await sendBetaWaitlistEmail("maker@example.com");
    expect(result.status).toBe("error");
    expect(result.message).toContain("no está disponible");
  });

  it("informa un problema de conexión", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await sendBetaWaitlistEmail("maker@example.com");
    expect(result.status).toBe("error");
    expect(result.message).toContain("conectar");
  });
});
