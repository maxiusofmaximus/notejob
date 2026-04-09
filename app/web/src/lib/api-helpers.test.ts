import { describe, expect, it } from "bun:test";
import { requireUser } from "./api-helpers";

describe("requireUser", () => {
  it("throws missing-auth when no token", async () => {
    const request = new Request("http://localhost/api/items");
    await expect(requireUser(request)).rejects.toThrow("missing-auth");
  });
});
