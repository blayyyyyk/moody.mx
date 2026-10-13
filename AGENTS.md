# moody.mx

## Design and documentation

Read `DESIGN.md` before changing frontend layout, styling, or motion. It is the visual authority for Blake's personal portfolio. Keep additional durable project guidance in this file rather than creating separate product, design-contract, or completion-report documents.

## Music

- Preserve the desktop one-viewport composition: history/search at left, top track above top artist in the middle, and a top-down Sony PS-LX310BT line-art turntable at right. Mobile flows vertically. Music's anchor must clear the sticky navigation.
- The turntable follows Spotify playback: while playing, a line-art record and its circular album-art label rotate clockwise beneath the arm. The label occupies the center third of the record's diameter. When idle, remove the record and park the arm. Machine outlines and lettering remain vector paths; respect reduced motion.
- Leave the turntable area unframed; align the player's left and right edges with the bordered “Playing now” panel below.
- Use primary-color separators and square-cropped, bordered artwork. History uses floating square up/down controls instead of a visible scrollbar; their visibility follows scroll boundaries.
- Public visitors recommend tracks to **Blake's** queue, without signing in. The invitation is “recommend me three songs.”
- The allowance is three successful additions per rolling hour, shared across visitors. Blake explicitly chose **no persistent storage or IP tracking**. The in-memory implementation is best-effort per server instance; restarts and separate Vercel instances do not share its budget. Reserve slots before asynchronous writes and release them on failure.
- Spotify's short-term favorites are roughly four-week affinity rankings, not calendar-month totals or exact play counts. Refreshing is polling, not a push stream.

## Spotify connection and deployment

For initial authorization or revoked credentials:

1. Configure the server-only variables listed in `.env.example` in `.env.local`. Register `http://127.0.0.1:4381/callback` in the Spotify developer app; its loopback IP matters.
2. Run `npm run spotify:connect` and authorize Blake's account. Completion means the helper has saved a nonempty refresh token in `.env.local`. Restart the local server afterward.
3. Sync all three Spotify values to Vercel's linked `portfolio` project for the required environments, keeping values out of output and Git. Verify remote values before declaring them synchronized. Environment changes take effect on the next deployment.

Queue writes require an active Spotify player on Blake's Premium account. Verify queue behavior with the mocked tests rather than adding real songs. Browser fixtures are synthetic, not evidence of a live connection.

Keep `.env.local` as the local environment source: pull Vercel values through a temporary file and merge private local overrides so an environment pull cannot erase a freshly authorized token. Existing GitHub/Google credentials supply the other portfolio sections.

## Performance

- Runtime wireframe assets are generated from the original STLs with `npm run models:prepare`. Preserve those source assets. The generator simplifies the solid mesh while retaining original sharp outlines; `public/models/manifest.json` records source hashes and error bounds.
- Keep STL parsing, vertex welding, and edge generation offline. Runtime decoding creates typed-array views into the downloaded buffer without reconstructing geometry.
- Mount model renderers near the viewport and pause offscreen, hidden-tab, and reduced-motion animation. Verify first load and first scroll so deferred loading does not just postpone a stall.
- The ASCII hero stays alive while visible: full motion normally, slow drift without pointer distortion under reduced motion. Pause it offscreen and in hidden tabs, resuming without a time jump.
- Measure production builds on a consistent browser/device setup. `perf:measure` reports local lab measurements, not real-user guarantees. Preserve the initial identity/links, ASCII landscape, and model appearance while optimizing.
- `npm run test:performance` and `npm run perf:measure` build against synthetic GitHub/Google fixtures in `.next-performance`, so book, GPU, and photo coverage cannot disappear with missing credentials or contaminate a production build. `perf:measure` enforces the checked-in local budgets; set `PERF_ASSERT=0` only for exploratory measurements.

## Manga / Anime

- MAL account: `TheSwiginator`. Show the full public lists, sorted by personal score descending; zero/missing scores are unrated and sort last. Ties use alphabetical title order. Manga rows show cover, title, rating, then chapter progress; anime uses episodes. MAL totals of zero mean unknown, displayed as `?`.
- Match Music's three-column desktop composition: manga, anime, then the latest updated in-progress entry from each list under “Currently into.” Show MAL update dates; these are list activity, not proof of recent reading/watching. Keep the shared Heading, neutral panels, hidden list scrollbars and square boundary-aware chevrons.
- Visitor recommendations add only new titles to Plan to Read / Plan to Watch. Check uncached authorized `my_list_status` before writing and reject existing entries. MAL provides no atomic insert-if-absent operation; external list edits can race that check. Verify writes with mocks rather than modifying Blake's real lists.
- Three successful recommendations per rolling hour are shared across both lists and all visitors, separate from Music's budget. Reserve before asynchronous calls and release on failure. The budget and duplicate locks are best-effort per instance, without IP tracking or persistent storage.
- Public reads need only server-only `MAL_CLIENT_ID`. Recommendations also require `MAL_CLIENT_SECRET` and `MAL_REFRESH_TOKEN`. Register `http://127.0.0.1:4382/callback` in the MAL app and run `npm run mal:connect`; the helper verifies TheSwiginator before saving the token. `MAL_ENV_DIR` selects the existing checkout's environment directory when working in an isolated worktree. Restart the server after authorization.
- MAL refresh tokens expire after approximately one month. Refreshed tokens stay in server memory; the deployed environment token still expires, so renew authorization and synchronize all three MAL variables before that deadline. Environment changes require redeployment. Keep tokens out of client responses, logs, and Git. A published branch alone does not configure live recommendations.
