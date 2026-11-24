import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientAddress, createLoginRateLimiter } from "./login-rate-limit";

describe("failed login rate limit", () => {
  it("locks one IP and email after 5 failures for 15 minutes", () => {
    let time = 1_000_000;
    const limiter = createLoginRateLimiter({ now: () => time });
    const ip = "203.0.113.10";
    const email = "User@Example.com";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal(limiter.check(ip, email).limited, false);
      limiter.recordFailure(ip, email);
    }

    const locked = limiter.check(ip, "user@example.com");
    assert.equal(locked.limited, true);
    assert.equal(locked.retryAfterSeconds, 15 * 60);

    assert.equal(limiter.check(ip, "other@example.com").limited, false);
    assert.equal(limiter.check("203.0.113.11", email).limited, false);

    time += 15 * 60 * 1000;
    assert.equal(limiter.check(ip, email).limited, false);
  });

  it("clears the counter after a successful login", () => {
    const limiter = createLoginRateLimiter({ now: () => 50 });
    for (let attempt = 0; attempt < 5; attempt += 1) limiter.recordFailure("10.0.0.1", "a@b.c");
    assert.equal(limiter.check("10.0.0.1", "a@b.c").limited, true);
    limiter.clear("10.0.0.1", "a@b.c");
    assert.equal(limiter.check("10.0.0.1", "a@b.c").limited, false);
  });
});

describe("client address", () => {
  it("uses the first forwarded address, then x-real-ip", () => {
    assert.equal(
      clientAddress({
        get(name) {
          return name === "x-forwarded-for" ? " 198.51.100.8 , 10.0.0.1 " : null;
        },
      }),
      "198.51.100.8",
    );
    assert.equal(
      clientAddress({
        get(name) {
          return name === "x-real-ip" ? "198.51.100.9" : null;
        },
      }),
      "198.51.100.9",
    );
    assert.equal(clientAddress({ get: () => null }), "unknown");
  });
});
