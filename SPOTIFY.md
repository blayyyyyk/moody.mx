# Connect the Music section

The section uses Blake's Spotify account for the public listening feed and shared queue. Visitors do not sign in. Until credentials are configured, it displays a disconnected state rather than sample listening data.

## One-time connection

1. Sign in at <https://developer.spotify.com/dashboard> and create an app with Web API access. The app owner needs Spotify Premium for Development Mode.
2. In the app settings, register this **exact redirect URI**: `http://127.0.0.1:4381/callback`. Spotify allows HTTP for explicit loopback IPs, not `localhost`.
3. Create `.env.local` in the project root and add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` from the app dashboard. `.env.example` lists the names. Keep these values private; do not use `NEXT_PUBLIC_` prefixes.
4. Run `npm run spotify:connect`. Open the URL printed in your terminal and authorize **your own** account. If using a different account from the app owner, add it to the app's authorized users first.
5. The helper saves `SPOTIFY_REFRESH_TOKEN` in the gitignored `.env.local` file. It binds only to your computer's loopback interface, validates OAuth state and PKCE, and exits after completion or five minutes. No token is sent to the browser or printed.
6. Restart `npm run dev -- --port 3000`, then open <http://localhost:3000/#music>.

The requested scopes are `user-read-recently-played`, `user-top-read`, `user-read-currently-playing`, and `user-modify-playback-state`.

## Deploy

Add all three Spotify environment values to the hosting project's server environment and redeploy. The local redirect URI is only used for the one-time connection helper; the deployed site refreshes access tokens server-side. Do not commit `.env.local`.

The remaining portfolio integrations use their existing GitHub/Google environment variables. Without them, the local site shows empty project, publication, timeline, and photo sections.

## Behavior

- History: up to 50 recently played tracks, newest first; durations are track lengths, not time spent listening.
- Favorites: Spotify's top track and artist over approximately the past four weeks. These are affinity rankings, **not exact play counts or a calendar-month total**.
- Freshness: the browser refreshes every 30 seconds while visible, with a 20-second server snapshot cache and 15-minute favorites cache per running instance. This is polling, not a Spotify push stream.
- Search: waits 350ms after typing and returns up to 10 Spotify tracks. Stale requests are canceled.
- Queue: visitors can add Spotify tracks to Blake's queue. Spotify needs an active player on his Premium account. Start playing a song in Spotify if the API reports no active player.
- Limits: a one-minute browser cooldown, up to 10 queue attempts/minute and 60 searches/minute per server instance. These are best-effort abuse controls, not durable global limits; configure hosting WAF rate limits on `/api/spotify/queue` and `/api/spotify/search` for multi-instance production traffic.
- Spotify credentials and access tokens stay server-side. The API returns only public display metadata.
- Spotify-hosted images retain their original content/aspect ratio and the track/artist displays link back to Spotify.

If authorization is revoked or the developer app changes, run the connection helper again and update the deployed refresh token. The UI keeps the last successfully loaded history visible through transient refresh failures.
