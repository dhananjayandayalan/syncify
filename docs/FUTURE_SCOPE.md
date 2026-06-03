# Syncify — Future Scope

This document covers features deferred for future development phases.

---

## 1. AI-Powered Track Matching (Claude API)

### Problem
Jaccard similarity fails for:
- Non-English music (transliterated titles, different romanisations)
- Cover versions and live recordings (different title format)
- Remasters ("Song Name - 2023 Remaster" vs "Song Name")
- Tracks where artist name differs across platforms

### Approach
When the automated matcher returns `NOT_FOUND`, instead of immediately marking the track as not found, send the track metadata to Claude and ask it to evaluate potential matches from the search results.

```
Prompt template:
"You are a music matching assistant. Given a source track and a list of
candidate tracks from a streaming platform, determine if any candidate
is the same song. Consider title variations, remasters, live versions,
and transliterations as matches.

Source: { title, artist, album, isrc, durationMs }
Candidates: [ { title, artist, album, durationMs, platformTrackId } ]

Return the platformTrackId of the best match, or null if none match."
```

### Integration point
In `api/src/jobs/sync.worker.ts` — `syncPlatform()`, after `adapter.searchTrack()` returns null:
1. Call Claude API with source track + top 10 search results
2. If Claude returns a match → use that `platformTrackId`
3. If Claude returns null → mark as `NOT_FOUND` as today

### Cost consideration
Only trigger Claude when Jaccard fails AND the user has NOT already manually matched the track. Each call costs ~$0.001. With 100 NOT_FOUND tracks/day this is $0.10/day.

---

## 2. Collaborative Playlists

### What it means
Multiple Syncify users can co-manage a single playlist. Each contributor has their own platform connections — when they add a track, it syncs to **their** Spotify/YouTube accounts. The playlist is shared at the Syncify layer, not at the platform layer.

### Database schema additions
```prisma
model PlaylistMember {
  id          String            @id @default(cuid())
  playlistId  String
  userId      String
  role        CollaboratorRole  @default(EDITOR)
  joinedAt    DateTime          @default(now())

  playlist    Playlist          @relation(...)
  user        User              @relation(...)
  @@unique([playlistId, userId])
}

model PlaylistInvite {
  id          String    @id @default(cuid())
  playlistId  String
  email       String
  token       String    @unique @default(cuid())
  expiresAt   DateTime
  createdAt   DateTime  @default(now())

  playlist    Playlist  @relation(...)
}

enum CollaboratorRole { OWNER EDITOR VIEWER }
```

### Backend routes
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/playlists/:id/invite` | Owner sends invite by email → creates `PlaylistInvite`, sends email with link |
| `GET` | `/invites/:token` | Public — accepts invite, creates `PlaylistMember`, redirects to app |
| `GET` | `/playlists/:id/members` | List members + roles |
| `DELETE` | `/playlists/:id/members/:userId` | Owner removes a member |
| `PATCH` | `/playlists/:id/members/:userId` | Owner changes a member's role |

### Auth changes
- `playlists.service.ts` `list()` → union query: owned playlists + playlists where user is a member
- `assertOwner()` → replace with `assertAccess(userId, playlistId, requiredRole)` which checks both owner and membership

### Sync behaviour
- Adding a track triggers sync against the **current user's** platform connections — not the owner's
- The `PlatformTrack` rows are per-track (shared), but each member's sync runs under their own access tokens
- This means: Alice adds a song → it goes into Alice's Spotify. Bob sees the same song in Syncify and clicks "Sync now" → it goes into Bob's Spotify under Bob's account

### Frontend changes
- Playlist detail: "Invite collaborator" button (owner only)
- Member avatars/initials row on playlist detail
- `/invite/:token` — public accept-invite page
- Visual distinction for collaborative vs personal playlists

### Email service requirement
Needs a transactional email provider (Resend, SendGrid, or Nodemailer with SMTP). Add `EMAIL_FROM`, `EMAIL_API_KEY` to `.env`.

---

## 3. React Native Mobile App

### Why React Native (not PWA)
- Native iOS and Android feel
- Access to native music app deep-links (open Spotify/YouTube in native app)
- Background sync via `BackgroundFetch`
- Push notifications for sync completion
- Better authentication experience with system biometrics

### Architecture
The existing REST API is already mobile-ready. Key adaptations needed:

#### Auth changes
httpOnly cookies don't work in React Native. Two options:
1. **Add a `/auth/mobile/login` endpoint** that returns `{ accessToken, refreshToken }` in the response body instead of setting cookies. Store in `expo-secure-store` (iOS Keychain / Android Keystore).
2. **Use OAuth2 PKCE** for the main auth flow (same as Spotify PKCE already implemented).

The refresh token rotation logic stays identical — just the transport changes (header vs cookie).

#### Recommended stack
```
Expo SDK (managed workflow)
├── expo-router (file-based routing like Next.js)
├── expo-secure-store (token storage)
├── expo-background-fetch (background sync polling)
├── expo-notifications (sync complete notifications)
├── @reduxjs/toolkit (can reuse store slices with minor changes)
└── react-native-reanimated (animations)
```

#### Shared code opportunities
- `web/src/types/index.ts` → move to `packages/shared/types.ts` (monorepo)
- API client logic → move to `packages/shared/api/` 
- Redux slice logic → largely reusable

#### Platform-specific
- Spotify: Use Spotify iOS/Android SDK for richer playback integration
- YouTube Music: No official SDK — use the same OAuth2 flow as web via `expo-web-browser`
- Deep-links: `syncify://playlist/:id` for notifications

### Suggested monorepo structure
```
syncify/
├── api/          (existing Fastify backend)
├── web/          (existing React web app)
├── mobile/       (new React Native app)
└── packages/
    └── shared/   (types, API client, constants)
```

---

## 4. Apple Music Integration

Planned as the final platform integration. See implementation roadmap in the main backlog — this will be implemented step by step after all other features are complete.

**Prerequisites:**
- Apple Developer Program membership ($99/year)
- MusicKit JS (web) or MusicKit for Swift/Kotlin (mobile)
- `music-user-token` flow (different from standard OAuth2)

---

## 5. Deferred from Current Backlog

| Feature | Why deferred |
|---------|-------------|
| Global activity feed | Requires a new DB view / materialized query across all playlists |
| Public shareable playlist page | Needs public routing, SEO meta tags, and cache headers |
| Liked Songs sync | Requires new platform OAuth scopes and a special "virtual playlist" concept |
