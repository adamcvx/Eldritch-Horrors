# Eldritch Horrors

This is the copied Base44 React application with a browser-local preview. From this directory, run `npm ci` once, then `npm run dev`. Open http://127.0.0.1:4173/. `npm run build` checks the production bundle.

The local adapter in `src/api/localBase44.js` uses the supplied starter portraits and the imported Base44 catalogs. Catalog records live in `src/api/base44Catalog.json` and imported images in `public/Artwork/base44`. On the first visit at the prototype's original address, it copies the prototype save from the current browser into a separate local save, including the wallet, creatures, learned talent, and owned and equipped orbs. The two saves are independent after that. Original React pages and their game rules drive the preview. To start a campaign fight, equip an ability under Blasphemous Relics → Ability Glyphs. Prototype campaign progress is retained in a separate save field because the imported campaign has different stages. The daily ritual counter does not transfer.

## Base44 dependencies

| Area | Original dependency | Local preview |
| --- | --- | --- |
| Accounts and settings | Base44 Auth, app public settings, player profiles and roles | A single browser-local player |
| Game data | Base44 entity queries and writes for player data and game catalogs | Local browser records and imported catalogs |
| Fusion names and artwork | Core InvokeLLM and GenerateImage, with stored image fallback | Local names and imported fusion artwork |
| Marketplace | Shared listings, bids, ownership and currency plus createListing, purchaseListing and cancelListing | The page can render local records. Transactions require a shared backend |
| Multiplayer | Shared users, matches, rankings and match updates | No cross-player matchmaking or shared leaderboard |
| Campaign | Campaign entities and the generateWeeklyCampaign function | Five imported stages and enemy fusions. Weekly generation requires the backend |
| Catalog and media | Existing hosted artwork, audio, campaign content, orbs, abilities, tomes and other entity records | Starter portraits, fusion artwork, backgrounds, avatars and orb icons are local. Audio and original player records were outside this import |
| Other platform integrations | Core file uploads, extraction, email and SMS, app logs and editor tooling | Unsupported integrations report that a backend is needed. App logging is idle |

The default build uses local mode. The original SDK path is available via `npm run dev -- --mode base44`, with the existing `VITE_BASE44_APP_ID` and `VITE_BASE44_BACKEND_URL` configuration. That mode needs a valid Base44 session and is outside the local preview check. No live database or production credentials are needed for the local preview.

## Catalog import notes

The Base44 dashboard supplied 10 abilities, 4 orbs, 13 talents, 5 stages and their enemy fusions, and 269 image files. Campaign enemy identities match the dashboard creation order and timestamps encoded in the referenced IDs. Ability IDs in enemy loadouts were matched by timestamp and record order within tied timestamp groups. Stage stories 3–5 retain the excerpts exposed by the dashboard. The source talent Echo Mastery references Echoes of the Void, which was absent from the Talent table. The local preview waives that missing prerequisite. Campaign replays award base Echoes and half of the listed boss Fragments, rounded down. Random bonuses and orb drops are reserved for first clears.

## Netlify and Turso

Netlify builds this directory using the repository’s netlify.toml. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Netlify’s Functions environment before publishing. The first save request initializes the single_player_saves table.

On the old localhost build, open Profile → Game save → Export save. On the deployed build, open the same section and import that file. This copies the wallet, collection, orbs, talents and campaign progress. The hosted build keeps its private save key in the browser and stores progress in Turso. No account or cross-device login is required. export a backup before clearing browser storage or moving devices.
