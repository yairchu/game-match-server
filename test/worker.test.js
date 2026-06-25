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

test("register2 and lookup2 return grouped candidate addresses", async () => {
  const env = { MATCHES: new FakeKV() };

  const host = await (await handleRequest(request("/register2/chess/203.0.113.1/1234/192.168.1.10/"), env)).text();
  const peer = await (await handleRequest(request("/register2/chess/203.0.113.2/5678/192.168.1.20/"), env)).text();

  assert.deepEqual(
    await (await handleRequest(request(`/lookup2/chess/${encodeURIComponent(host)}/`), env)).json(),
    [["203.0.113.1:1234", "192.168.1.10:1234"]],
  );

  const connected = await (
    await handleRequest(request(`/connect2/chess/${encodeURIComponent(peer)}/${encodeURIComponent(host)}/`), env)
  ).json();
  assert.deepEqual(connected, [
    ["203.0.113.1:1234", "192.168.1.10:1234"],
    ["203.0.113.2:5678", "192.168.1.20:5678"],
  ]);

  assert.deepEqual(
    await (await handleRequest(request(`/lookup2/chess/${encodeURIComponent(host)}/`), env)).json(),
    [
      ["203.0.113.1:1234", "192.168.1.10:1234"],
      ["203.0.113.2:5678", "192.168.1.20:5678"],
    ],
  );
});

test("register3 records work with lookup2 and connect2", async () => {
  const env = { MATCHES: new FakeKV() };

  const host = await (
    await handleRequest(
      request('/register3/chess/%5B%22203.0.113.1%3A1234%22%2C%22192.168.1.10%3A4321%22%5D/'),
      env,
    )
  ).text();
  const peer = await (
    await handleRequest(
      request('/register3/chess/%5B%22203.0.113.2%3A5678%22%2C%22192.168.1.20%3A8765%22%5D/'),
      env,
    )
  ).text();

  assert.deepEqual(
    await (await handleRequest(request(`/lookup2/chess/${encodeURIComponent(host)}/`), env)).json(),
    [["203.0.113.1:1234", "192.168.1.10:4321"]],
  );

  const connected = await (
    await handleRequest(request(`/connect2/chess/${encodeURIComponent(peer)}/${encodeURIComponent(host)}/`), env)
  ).json();
  assert.deepEqual(connected, [
    ["203.0.113.1:1234", "192.168.1.10:4321"],
    ["203.0.113.2:5678", "192.168.1.20:8765"],
  ]);
});

test("register3 rejects malformed candidates after the first", async () => {
  const response = await handleRequest(
    request('/register3/chess/%5B%22203.0.113.1%3A1234%22%2C%22not-an-address%22%5D/'),
    { MATCHES: new FakeKV() },
  );

  assert.equal(response.status, 404);
});

test("lookup2 falls back to old player records", async () => {
  const env = { MATCHES: new FakeKV() };

  const host = await (await handleRequest(request("/register/chess/10.0.0.1/1234/"), env)).text();

  assert.deepEqual(
    await (await handleRequest(request(`/lookup2/chess/${encodeURIComponent(host)}/`), env)).json(),
    [["10.0.0.1:1234"]],
  );
});

test("missing players return 404", async () => {
  const response = await handleRequest(request("/lookup/chess/missing/"), { MATCHES: new FakeKV() });
  assert.equal(response.status, 404);
});

test("register rejects non-integer ports", async () => {
  const response = await handleRequest(request("/register/chess/10.0.0.1/not-a-port/"), { MATCHES: new FakeKV() });
  assert.equal(response.status, 404);
});
