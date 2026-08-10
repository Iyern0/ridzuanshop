# Malaysia Transit Widget — Design v1

> Status: **DESIGNED, NOT BUILT**. Paused by request. Come back here to resume.
> Decisions locked: web widget first, two tabs, GPS auto-detect, 30s auto-poll, single-file (Approach A).

## 1. Goal

A web widget that shows live Malaysia public transport:
- **Buses tab** — live bus positions on a map.
- **Trains tab** — real-time arrival/departure board at the nearest train station (non-KTM preference; KTM optional).

## 2. Verified API research (all live-tested 2026-08-11)

### Data source
| Endpoint | Auth | Notes |
|---|---|---|
| `https://mcp.techmavie.digital/malaysiatransit/mcp` | **None (public)** | MCP streamable-http JSON-RPC. CORS `*`. All tools work client-side. |
| `https://malaysiatransit.techmavie.digital/api/...` | **API key required** (`X-API-Key` header) | Clean REST. Subscribe: `https://developers.malaysiatransit.techmavie.digital`. CORS `*`. |

**Decision: prototype hits the public MCP endpoint** — zero signup, all tools (incl. geocoding) work. Swap to REST later = one-function change.

### MCP call pattern (from browser)
```
POST /malaysiatransit/mcp
1. initialize  {protocolVersion, capabilities:{}, clientInfo}  → header `Mcp-Session-Id`
2. tools/call  {name, arguments}  with `Mcp-Session-Id` header
```
Response is SSE: `event: message\ndata: {...}`. Text content is JSON inside `result.content[0].text` (sometimes double-encoded).

### Tools that matter

| Tool | Args | Returns | Verdict |
|---|---|---|---|
| `get_live_vehicles` | `{area, type?: bus\|rail}` | `vehicles[]` each `{vehicleId, position:{lat,lng,bearing,speed,isStationary,sampleAgeMs}, status, trip:{routeId}, providerName, providerColor, providerIcon}` + `providers[]` with `vehicleCount` | ✅ **Live bus positions confirmed** (Penang returned moving buses). |
| `get_stop_routes` | `{area, stopId}` | Per route: `originStop, destination, nextDepartures[]` each `{time, minutesUntil, timeUntil, status, destination, tripId}` | ✅ **Train departure board confirmed** (KJ15 LRT, KG20 MRT both returned next departures with countdown). |
| `get_stop_arrivals` | `{area, stopId}` | Real-time arrival predictions (shape-based, ±2–4 min claimed) | ⚠️ Real-time rail arrivals returned **empty**. GPS train tracking basically absent. |
| `find_nearby_stops` | `{area, lat, lon}` | Stops with routes (name + color) + lat/lon | ✅ Confirmed. Rail station = stop whose routes look rail (KTM/LRT/MRT/Monorail/KLIA). |
| `find_nearby_stops_with_arrivals` | `{area, location?|lat+lon, radius}` | Stops + arrivals in one call | ⚠️ Arrivals came back empty (late-night feed idle). Useful later. |
| `detect_location_area` | `{lat, lon}` | `{area, confidence}` | ⚠️ **Weak** — returned `area:"unknown"` for KL Sentral coords. Fallback needed. |
| `get_ktm_station_departures` | `{stationName, type: komuter-utara\|intercity}` | Timetable departures with `minutesUntil` | ✅ Works, but **user wants non-KTM only** — skip. |
| `search_stops` | `{area, q}` | Stop list | ⚠️ Returned `[]` in test — unreliable. Use `find_nearby_stops` instead. |

### Key caveats (design must handle)
1. **Trains have no live GPS.** Rail `get_live_vehicles` → 0 vehicles. Train board is **timetable countdown** (`get_stop_routes`), not GPS-based. Delays won't show. Acceptable — that's what commuter apps show.
2. **Live positions can be stale.** Observed `sampleAgeMs` up to ~2.8 h for a bus. Filter/grey out pins with `sampleAgeMs > 5 min`.
3. **Empty results are normal** (late night, idle feeds). Always render an empty state, never a crash.
4. **Area detection is weak.** `detect_location_area` returns "unknown" from bare coords. Fallback: default `klang-valley`; let user override area via URL param / stored config.

## 3. Design (Approach A — single file, locked)

**File:** `transit-widget/index.html` — single self-contained file. Vanilla JS. Leaflet via CDN (only dependency). Dark theme matching the waktusolat widget aesthetic.

### Layout
```
┌──────────────────────────────────┐
│  [area name]  ·  updated 12:04:33 │
│  🚌 Buses      |      🚈 Trains   │   ← tab bar
├──────────────────────────────────┤
│  BUSES TAB: full-height Leaflet   │
│  map. Bus pins = provider color   │
│  dot + provider icon. Grey =      │
│  stale. Tap → name/route/status.  │
│  TRAINS TAB: station name header  │
│  + departure board: per direction │
│  destination, next departures,    │
│  countdown, provider color chip.  │
└──────────────────────────────────┘
```

### Data flow
1. **Boot:** `navigator.geolocation.getCurrentPosition` → `detect_location_area` → on "unknown" fall back to `klang-valley`. Persist area + station to `localStorage` so reload is instant.
2. **Train station pick:** `find_nearby_stops {area, lat, lon}` radius 800 m → nearest stop whose route names match rail (`KTM`, `LRT`, `MRT`, `Monorail`, `KLIA`) → save `stopId`.
3. **Buses tab:** `get_live_vehicles {area, type:'bus'}` → Leaflet markers.
4. **Trains tab:** `get_stop_routes {area, stopId}` → departure board.
5. **Poll:** both every **30 s**. Auto-pause when tab hidden (`visibilitychange`) to save calls. Never wipe last-good data on error.

### Error handling
- Empty vehicles / empty departures → "No live buses right now" / "No departures found".
- API failure → keep last-good data + stale banner, retry next poll.
- No rail stop found → "No nearby train station".

### Config
- Area + station auto-detected once, stored in `localStorage`.
- Optional URL param `?area=penang` for override.
- No settings UI in v1.

## 4. Open items (decide when resuming)
- [ ] Test with browser geolocation in real Malaysia (works best if opened on a phone).
- [ ] Bus pin animation between polls (v2, if wanted).
- [ ] Real-time rail arrivals if feed ever populates — `get_stop_arrivals` already wired in data layer.
- [ ] REST + API-key path if public MCP endpoint rate-limits.

## 5. Next steps when resuming
1. Build `index.html` per design above.
2. Open in browser; verify both tabs, pins move across polls, countdown ticks.
3. Screenshot via emulator/browser for the record.
4. Commit. Then decide: Android widget port (reuse waktusolat-widget pattern: RemoteViews, AlarmManager poll, `PrayerApi.kt` → `TransitApi.kt`).

---
*Research probes: `probe_mcp.sh`, `probe2.sh`, `probe3.sh` in `/tmp` (not saved). API facts above were live-verified.*
