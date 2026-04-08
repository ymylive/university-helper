# Chaoxing Location Sign-In UX Design

**Date:** 2026-03-29

**Goal:** Improve the Chaoxing sign-in module so location-based sign-ins can reliably accept manual coordinates and can also derive latitude/longitude directly from a place search powered by Baidu.

## Context

The current Chaoxing sign-in page already exposes `latitude`, `longitude`, `address`, and `altitude` fields for `location` and `qrcode` sign types, and the backend already accepts those values. The current gap is mostly interaction design and input flow:

- users do not have an obvious way to resolve a place into coordinates
- manual coordinate entry is too raw and easy to miss or misuse
- there is no map-based fallback when users know the place visually but not its exact coordinates

This work should stay focused on the existing Chaoxing sign-in page and reuse the current backend payload shape whenever possible.

## Recommended Approach

Use a staged hybrid flow:

1. Add a first-class address-to-coordinate action in the existing form
2. Add a map pick flow backed by Baidu as the fallback / precision tool
3. Keep manual latitude and longitude editing available after auto-fill

This is the fastest path to something useful without forcing the first version to become a full custom map product.

## Alternatives Considered

### Option A: Address resolver only

Add a `Resolve Coordinates` action next to the address input and call Baidu geocoding to fill `latitude` and `longitude`.

**Pros**
- smallest implementation surface
- fastest path to production
- keeps current page structure intact

**Cons**
- weak recovery path when address parsing is ambiguous
- less helpful when users only know the approximate spot visually

### Option B: Full embedded Baidu map first

Build an in-page map modal with search, click-to-pick, marker confirmation, and reverse-fill.

**Pros**
- best UX
- most intuitive for ambiguous locations

**Cons**
- higher frontend complexity
- more UI and state management risk in the first delivery

### Option C: Hybrid, phased inside one form

Keep the current fields, add address resolution as the default path, and add a map pick entry as the fallback / advanced path.

**Pros**
- fastest practical path
- strongest recovery path
- lowest backend churn

**Cons**
- slightly more UI than Option A

**Recommendation:** Option C.

## User Experience Design

### Affected Screen

`frontend/src/pages/ChaoxingSignin.jsx`

### New Interaction Model

For `location` and `qrcode` sign types:

- keep `latitude`, `longitude`, `address`, and `altitude`
- add an action row near the address field:
  - `解析坐标`
  - `地图选点`
  - optional helper text showing the latest resolution result
- allow auto-filled coordinates to remain editable

### Expected User Flow

#### Flow 1: Resolve from address

1. User selects `位置签到`
2. User enters an address or place name
3. User clicks `解析坐标`
4. Frontend calls the Baidu-backed resolver
5. UI fills `latitude` and `longitude`
6. User may adjust coordinates manually
7. User submits sign-in

#### Flow 2: Pick from map

1. User selects `位置签到`
2. User clicks `地图选点`
3. A lightweight Baidu map modal or picker opens
4. User searches or clicks a point
5. Selected address + coordinates are returned to the form
6. User confirms or edits
7. User submits sign-in

## Technical Design

### Frontend

Primary file:

- `frontend/src/pages/ChaoxingSignin.jsx`

Add the following state:

- geocode loading state
- geocode error state
- picker open/close state
- selected location metadata for the latest resolved result

Add the following behaviors:

- `resolveAddressToCoordinates(address)` to query Baidu and fill coordinates
- `openLocationPicker()` to open the Baidu picker flow
- `applyResolvedLocation({ address, latitude, longitude })` to update the form in one place
- validation helpers for coordinate format and range

Add the following UI rules:

- `解析坐标` is enabled only when address is non-empty
- `地图选点` is always available for `location` and `qrcode`
- resolved values should visibly update the inputs
- any resolver error should surface as inline feedback, not only in console logs

### Backend

Primary files:

- `backend/app/api/v1/chaoxing.py`
- optional new helper or service file if a backend proxy is needed

Preferred backend strategy:

- keep current sign payload contract unchanged
- only add a new backend endpoint if Baidu integration requires hiding credentials, signing, or avoiding direct browser dependency

If a proxy endpoint is added, it should:

- accept an address / keyword
- call the Baidu resolver
- return normalized `address`, `latitude`, `longitude`
- never change sign-in submission semantics

### Baidu Integration Strategy

Use Baidu in two modes:

- geocode / place lookup for `地址 -> 经纬度`
- lightweight map picker for search + click selection

Implementation preference:

- if the existing Baidu query tool can be safely used from the browser without exposing sensitive credentials, integrate it directly in the frontend
- otherwise, move address resolution behind a backend endpoint and keep only the picker UI in the browser

## Validation and Error Handling

### Form Validation

For `location` sign-ins:

- submit should allow either:
  - manually entered latitude + longitude
  - auto-filled coordinates
- if one coordinate is filled and the other is missing, show a validation error
- latitude must be within `[-90, 90]`
- longitude must be within `[-180, 180]`

For `qrcode` sign-ins:

- keep current QR requirements
- still allow address / coordinate augmentation to improve success rate

### Resolver Errors

Show clear user-facing messages for:

- address empty
- no matching place found
- ambiguous result not usable
- Baidu service unavailable
- picker cancelled without selection

Do not block manual coordinate submission if resolution fails.

## Testing Design

### Frontend Tests

Add tests for:

- address resolver success fills latitude and longitude
- resolver failure shows inline error and preserves manual editing
- map picker result correctly fills address and coordinates
- invalid coordinate formats block submission with useful feedback
- manually typed coordinates still submit unchanged

### Backend Tests

Only if a proxy endpoint is added:

- resolver endpoint returns normalized coordinates
- downstream Baidu errors are sanitized
- empty or malformed address requests are rejected cleanly

## Out of Scope

- saved favorite locations
- multi-provider map abstraction
- route planning or navigation
- automatic reverse geocoding for every manual keystroke
- changes outside the Chaoxing sign-in flow

## Rollout Notes

Deliver in this order:

1. Address resolver + coordinate validation
2. Map picker integration
3. Small UX polish based on real usage

This keeps the first release fast while still delivering the complete path the user asked for.
