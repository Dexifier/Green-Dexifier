import { describe, expect, it } from "vitest";
import { joinApiUrl } from "@/lib/url";

describe("joinApiUrl", () => {
  it("preserves the base path prefix when path starts with a slash", () => {
    // Regression: new URL("/rate", "https://exolix.com/api/v2") drops /api/v2
    expect(joinApiUrl("https://exolix.com/api/v2", "/rate").href).toBe(
      "https://exolix.com/api/v2/rate",
    );
  });

  it("tolerates a trailing slash on the base", () => {
    expect(joinApiUrl("https://exolix.com/api/v2/", "/rate").href).toBe(
      "https://exolix.com/api/v2/rate",
    );
  });

  it("works when the base has no path prefix", () => {
    expect(joinApiUrl("https://chainflip-broker.io", "/quotes").href).toBe(
      "https://chainflip-broker.io/quotes",
    );
  });

  it("accepts paths without a leading slash", () => {
    expect(joinApiUrl("https://exolix.com/api/v2", "rate").href).toBe(
      "https://exolix.com/api/v2/rate",
    );
  });

  it("appends query params and skips empty values", () => {
    const url = joinApiUrl("https://chainflip-broker.io", "/quotes", {
      apiKey: "secret",
      amount: "100",
      empty: "",
    });
    expect(url.href).toBe(
      "https://chainflip-broker.io/quotes?apiKey=secret&amount=100",
    );
  });
});
