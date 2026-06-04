# IMPLEMENTATION_PLAN.md

Use this file before large implementation work.

## Goal

Add Apple Music as a third platform integration in Syncify, alongside Spotify and YouTube Music.

## Scope

In scope:
- `APPLE_MUSIC` added to the Platform enum (DB migration required)
- Apple Music adapter implementing the full `PlatformAdapter` interface
- Backend: developer-token endpoint + music-user-token connect endpoint (no redirect-URI OAuth flow)
- Frontend: MusicKit JS authorization flow (SDK loaded on demand, no redirect)
- Token storage: music-user-token stored as `accessToken`; no expiry / no refresh token
- Platform connection UI in AppShell sidebar

Out of scope:
- Cover image upload (Apple Music API does not expose this)
- Remove tracks (Apple Music library API has no DELETE track endpoint)
- Delete playlist (Apple Music library API has no DELETE playlist endpoint)
- Mobile (React Native) — see FUTURE_SCOPE.md §3
- Token refresh (MUT is valid until user revokes in Apple ID settings)

## Existing System Notes

- Platform enum lives in both Prisma schema and TypeScript types (backend + frontend)
- Adapters are registered in `api/src/platforms/index.ts`
- Auth flow for existing platforms uses redirect-URI OAuth2; Apple Music uses MusicKit JS instead
- The `accessToken` field in `PlatformConnection` will hold the music-user-token (MUT)
- The `expiresAt` and `refreshToken` fields will be null for Apple Music
- `getValidAccessToken()` already handles null `expiresAt` (returns stored token as-is)
- Developer token is a self-signed ES256 JWT generated from Apple Developer keys; cached 12 h in memory

## Architecture

- Developer token generated server-side from APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, APPLE_MUSIC_PRIVATE_KEY
- New route `GET /api/v1/auth/apple-music/developer-token` — returns developer token to frontend (authenticated)
- New route `POST /api/v1/auth/apple-music/connect` — accepts MUT from frontend, stores connection
- Frontend loads MusicKit JS from Apple CDN on demand, calls `authorize()`, posts MUT
- Apple Music API calls use both developer token (Authorization Bearer) + MUT (Music-User-Token header)

## Files Expected to Change

- `api/prisma/schema.prisma` — add APPLE_MUSIC to Platform enum
- `api/src/platforms/platform.types.ts` — add 'APPLE_MUSIC' to Platform type
- `api/src/platforms/apple-music.adapter.ts` — new file
- `api/src/platforms/index.ts` — register adapter
- `api/src/platforms/token-refresh.ts` — APPLE_MUSIC branch (no refresh, return stored token)
- `api/src/config/env.ts` — add APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, APPLE_MUSIC_PRIVATE_KEY
- `api/src/modules/auth/oauth.service.ts` — add connectAppleMusic(), getAppleMusicDeveloperToken()
- `api/src/modules/auth/auth.routes.ts` — add /apple-music/developer-token, /apple-music/connect, /apple-music/disconnect
- `api/.env.example` — document Apple Music vars
- `web/src/types/index.ts` — add 'APPLE_MUSIC' to Platform
- `web/src/api/auth.api.ts` — add getAppleMusicDeveloperToken(), connectAppleMusic()
- `web/src/components/AppShell/AppShell.tsx` — MusicKit JS flow for Apple Music
- `web/src/styles/tokens.css` — add --color-apple-music

## Testing Plan

- Unit: generateDeveloperToken() produces a valid 3-part JWT with correct header alg/kid
- Integration: /apple-music/developer-token returns 401 without auth, 200 with auth
- Integration: /apple-music/connect stores encrypted MUT, returns 200
- Integration: /apple-music/disconnect deletes connection
- Manual: Connect flow in browser (requires Apple Developer account)

## Security Plan

- Developer token never exposed via unauthenticated endpoint
- MUT stored encrypted (same AES-256-GCM as other tokens)
- Private key read only from env, never logged
- MusicKit JS loaded only from Apple CDN (js-cdn.music.apple.com) — CSP-safe

## Rollback Plan

- Revert schema migration (remove APPLE_MUSIC from enum)
- Revert all changed files
- No data migration needed — no Apple Music connections exist before this

## Token Plan

- Load only relevant files
- Use focused patches
- Avoid full-file rewrites unless necessary
