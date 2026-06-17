const WORDS = `able ably ache achy acid acme acne acre acts adam adar aeon aero aery afar aged
ahem ahoy aide aint airy ajar akin alan alas alba alco alec alef alex alfa ally
alma aloe also alto alum amar amen amid amir ammo amok amos anal anat andy anew
anna anne anon anti anus apex aqua area arms army arse atom atop aunt aura auto
avid away awry axis babe baby bach back bait bald balm bane bang bank bark barn
bash bask bath bead beak beam bean beat beef been beer bees bell belt best beth
bias bike bill bind bird bite blip blob bloc blue blur boat body bola bolt bomb
bond bone bong boom boot boss brag brat brim bull bump burp busk bust busy butt
buzz cage cake calf calm cape card cart case cash cave cell chat chef chew chia
chin chip chug city clam clan clap claw clay clip club clue coal coat coca code
coin cold cone cook cool cord cork corn cost cosy crab crap crib cuba cube cult
curb cure cusp cute cyan dali dare dash data date dawn dead deaf deal dean dear
debt deck deed deer defy demi desk dial dibs dice dire dirt diva dive dock does
doom door dorm dose doug dove drag draw dual duck dude duel duet dull dumb dump
dune dunk dusk dust duty each ease east easy eats echo edge else envy epic even
ever evil exam exit face fact fade fail fame farm fast fate fear feel fiat film`.split(/\s+/);

const TTL_SECONDS = 60 * 60;

const text = (body, status = 200) => new Response(body, { status });
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});
const keyFor = (game, playerId) => `player:${game}:${playerId}`;

function parsePath(url) {
  return new URL(url).pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

function phrase() {
  return [0, 1, 2].map(() => WORDS[Math.floor(Math.random() * WORDS.length)]).join(" ");
}

function parsePort(value) {
  if (!/^\d+$/.test(value)) return null;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) return null;
  return port;
}

async function getPlayer(env, game, playerId) {
  return env.MATCHES.get(keyFor(game, playerId), { type: "json" });
}

async function putPlayer(env, player) {
  await env.MATCHES.put(keyFor(player.game, player.id), JSON.stringify(player), {
    expirationTtl: TTL_SECONDS,
  });
}

async function register(env, game, ip, port) {
  return registerPlayer(env, game, ip, port, [`${ip}:${port}`]);
}

async function register2(env, game, publicIp, port, localIp) {
  return registerPlayer(env, game, publicIp, port, [`${publicIp}:${port}`, `${localIp}:${port}`]);
}

async function registerPlayer(env, game, ip, port, addresses) {
  for (let i = 0; i < 100; i += 1) {
    const id = phrase();
    if (await getPlayer(env, game, id)) continue;
    await putPlayer(env, { game, id, ip, port, addresses, connectedTo: null });
    return text(id);
  }
  return text("Could not allocate player id", 503);
}

async function connect(env, game, srcId, dstId) {
  const src = await getPlayer(env, game, srcId);
  const dst = await getPlayer(env, game, dstId);
  if (!src || !dst) return text("Not Found", 404);
  if (dst.connectedTo !== null) return text("AssertionError", 500);

  await putPlayer(env, { ...src, connectedTo: dst.id });
  return lookup(env, game, dst.id);
}

async function connect2(env, game, srcId, dstId) {
  const src = await getPlayer(env, game, srcId);
  const dst = await getPlayer(env, game, dstId);
  if (!src || !dst) return text("Not Found", 404);
  if (dst.connectedTo !== null) return text("AssertionError", 500);

  await putPlayer(env, { ...src, connectedTo: dst.id });
  return lookup2(env, game, dst.id);
}

async function lookup(env, game, playerId) {
  const host = await getPlayer(env, game, playerId);
  if (!host) return text("Not Found", 404);

  const peers = [`${host.ip}:${host.port}`];
  let cursor;
  do {
    const page = await env.MATCHES.list({ prefix: `player:${game}:`, cursor });
    cursor = page.cursor;
    for (const { name } of page.keys) {
      const player = await env.MATCHES.get(name, { type: "json" });
      if (player?.connectedTo === host.id) peers.push(`${player.ip}:${player.port}`);
    }
  } while (cursor);
  // ponytail: prefix scan is fine for small rooms; add a reverse index if lookup latency matters.
  return text(peers.join(" "));
}

async function lookup2(env, game, playerId) {
  const host = await getPlayer(env, game, playerId);
  if (!host) return text("Not Found", 404);

  const peers = [addressesFor(host)];
  let cursor;
  do {
    const page = await env.MATCHES.list({ prefix: `player:${game}:`, cursor });
    cursor = page.cursor;
    for (const { name } of page.keys) {
      const player = await env.MATCHES.get(name, { type: "json" });
      if (player?.connectedTo === host.id) peers.push(addressesFor(player));
    }
  } while (cursor);
  // ponytail: prefix scan is fine for small rooms; add a reverse index if lookup latency matters.
  return json(peers);
}

function addressesFor(player) {
  return player.addresses ?? [`${player.ip}:${player.port}`];
}

export async function handleRequest(request, env) {
  const [action, game, a, b, c] = parsePath(request.url);
  if (request.method !== "GET") return text("Method Not Allowed", 405);

  if (action === undefined) return text("A matching server for peer-to-peer games");
  if (action === "register" && game && a && b) {
    const port = parsePort(b);
    return port === null ? text("Not Found", 404) : register(env, game, a, port);
  }
  if (action === "register2" && game && a && b) {
    const port = parsePort(b);
    return port === null || !c ? text("Not Found", 404) : register2(env, game, a, port, c);
  }
  if (action === "connect" && game && a && b) return connect(env, game, a, b);
  if (action === "connect2" && game && a && b) return connect2(env, game, a, b);
  if (action === "lookup" && game && a) return lookup(env, game, a);
  if (action === "lookup2" && game && a) return lookup2(env, game, a);
  return text("Not Found", 404);
}

export default {
  fetch: handleRequest,
};
