import assert from "node:assert/strict";
import test from "node:test";
import { handleRequest } from "../src/worker.js";

class FakeKV {
  constructor() {
    this.store = new Map();
  }

  async get(key, options) {
    const value = this.store.get(key);
    return options?.type === "json" && value ? JSON.parse(value) : value ?? null;
  }

  async put(key, value) {
    this.store.set(key, value);
  }

  async list({ prefix }) {
    return {
      keys: [...this.store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })),
    };
  }
}

const request = (path) => new Request(`https://example.com${path}`);

test("register, connect, and lookup keep the old API shape", async () => {
  const env = { MATCHES: new FakeKV() };

  const host = await (await handleRequest(request("/register/chess/10.0.0.1/1234/"), env)).text();
  const peer = await (await handleRequest(request("/register/chess/10.0.0.2/5678/"), env)).text();

  assert.match(host, /^\w+ \w+ \w+$/);
  assert.equal(await (await handleRequest(request(`/lookup/chess/${encodeURIComponent(host)}/`), env)).text(), "10.0.0.1:1234");

  const connected = await (
    await handleRequest(request(`/connect/chess/${encodeURIComponent(peer)}/${encodeURIComponent(host)}/`), env)
  ).text();
  assert.equal(connected, "10.0.0.1:1234 10.0.0.2:5678");
});

test("missing players return 404", async () => {
  const response = await handleRequest(request("/lookup/chess/missing/"), { MATCHES: new FakeKV() });
  assert.equal(response.status, 404);
});

test("register rejects non-integer ports", async () => {
  const response = await handleRequest(request("/register/chess/10.0.0.1/not-a-port/"), { MATCHES: new FakeKV() });
  assert.equal(response.status, 404);
});
