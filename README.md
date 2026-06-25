A matching server for peer-to-peer games, now as a Cloudflare Worker backed by KV.

## API

- `GET /register/:game/:ip/:port/` returns a three-word player id.
- `GET /connect/:game/:src_id/:dst_id/` connects `src_id` to `dst_id` and returns `lookup(dst_id)`.
- `GET /lookup/:game/:player_id/` returns space-separated `ip:port` entries.
- `GET /register2/:game/:public_ip/:port/:local_ip/` returns a three-word player id and stores public/local UDP candidates.
- `GET /connect2/:game/:src_id/:dst_id/` connects `src_id` to `dst_id` and returns `lookup2(dst_id)`.
- `GET /lookup2/:game/:player_id/` returns JSON arrays of grouped UDP candidates.
- `GET /register3/:game/:json_candidates/` returns a three-word player id and stores a full candidate list for `lookup2`/`connect2`.

Player records expire after one hour.

## Setup

```sh
npm install
npx wrangler kv namespace create MATCHES
npx wrangler kv namespace create MATCHES --preview
```

Put the returned ids in `wrangler.jsonc`, then:

```sh
npm test
npm run dev
npm run deploy
```
