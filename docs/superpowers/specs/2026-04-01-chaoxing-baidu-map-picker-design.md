# Chaoxing Baidu Map Picker Design

**Date:** 2026-04-01

**Goal:** Complete the Chaoxing sign-in location module by adding a shared Baidu map picker modal that supports place search, direct map click selection, reverse geocoding, and confirmed write-back of address plus coordinates into the existing sign-in form.

## Context

The current Chaoxing sign-in page already supports manual `address`, `latitude`, `longitude`, and `altitude` fields for `location` and `qrcode` sign types. It also already has lightweight Baidu-backed address resolution and place search helpers. The remaining gap is an actual map-based point picker that lets the user visually choose a point, inspect the resolved location, and confirm the final values before they are written back into the form.

The existing backend sign-in contract already accepts the fields needed by Chaoxing:

- `address`
- `latitude`
- `longitude`
- `altitude` when relevant for QR code sign-ins

This feature should preserve that contract and stay focused on the frontend sign-in workflow.

## User-Approved Direction

The approved interaction model is:

- a shared `地图选点` entry for both `位置签到` and `二维码签到`
- a modal picker instead of an inline expanded panel
- support for both:
  - place-name search
  - direct map click selection
- reverse geocoding after a point is selected
- a preview area inside the modal
- a `确认选点` button that the user must click before any values are written back
- no automatic sign submission after point selection
- values remain editable in the form after write-back
- direct frontend loading of the Baidu Maps JavaScript SDK is acceptable

## Recommended Architecture

Use a frontend-led hybrid approach:

1. Keep the existing Chaoxing sign-in payload contract unchanged.
2. Add a dedicated Baidu map picker modal component for map interactions.
3. Add a small loader utility that dynamically loads the Baidu Maps JavaScript SDK once.
4. Keep the existing REST-based Baidu helper service for the existing `解析坐标` and `搜索地点` flows, and as a lightweight fallback utility.

This keeps the new visual map interaction isolated while avoiding a backend redesign.

## Alternatives Considered

### Option A: Search-only modal without a real map

Show a modal with place search and candidate selection, but no embedded Baidu map.

**Pros**
- smallest implementation surface
- fastest to ship
- easy to test

**Cons**
- does not satisfy the approved direct map-click requirement
- weaker recovery path when the user only knows the visual location

### Option B: Full frontend Baidu map modal

Load the Baidu Maps JavaScript SDK in the browser and handle search, map click selection, reverse geocoding, preview, and confirmation inside the modal.

**Pros**
- fully satisfies the approved UX
- keeps visual interaction close to the form
- reuses one flow for both `location` and `qrcode`

**Cons**
- adds SDK lifecycle and modal state complexity
- requires frontend environment configuration for the Baidu AK

### Option C: Backend-heavy proxy plus frontend map shell

Use the map in the browser but proxy all search and reverse geocoding through backend endpoints.

**Pros**
- centralizes external API behavior
- reduces direct frontend dependence on Baidu service methods

**Cons**
- larger implementation surface
- slower delivery
- unnecessary for the currently approved scope

**Recommendation:** Option B, while preserving the existing frontend REST helpers instead of replacing them.

## UX Design

### Affected Screen

- `frontend/src/pages/ChaoxingSignin.jsx`

### Entry Points

Show the same `地图选点` action for:

- `位置签到`
- `二维码签到`

The existing `解析坐标` and `搜索地点` actions remain available as lightweight alternatives.

### Modal Layout

The modal contains:

- a header with title and close affordance
- a search input and search trigger
- a search results list
- an embedded Baidu map
- a preview area showing the currently selected point
- footer actions:
  - `取消`
  - `确认选点`

### Initial Location Rules

When the modal opens:

- if the form already has `latitude` and `longitude`, center the map there and place a marker
- else if the form has an `address`, try to resolve that address and center the map there
- else start from a sensible default city-level view

### Selection Rules

The user can produce a draft location by:

- clicking a search result
- clicking any point on the map

Both flows update the same modal-local draft state.

### Preview Rules

After a draft point is chosen:

- update the marker on the map
- update draft `latitude` and `longitude`
- trigger reverse geocoding
- show a preview containing:
  - human-readable address
  - latitude
  - longitude
  - source, such as search result or map click

### Confirmation Rules

The form must not change until the user clicks `确认选点`.

When `确认选点` is clicked:

- write back `address`
- write back `latitude`
- write back `longitude`
- close the modal

The picker does not auto-submit the sign-in form.

### Cancellation Rules

When the user cancels or closes the modal:

- do not modify the form
- discard the modal-local draft selection

## Component Design

### `BaiduMapPickerModal`

Create a focused modal component responsible for:

- modal shell and close behavior
- search input and results rendering
- map container lifecycle
- marker placement
- preview area
- confirmation and cancellation

Suggested interface:

```js
<BaiduMapPickerModal
  open={open}
  initialLocation={initialLocation}
  onClose={handleClose}
  onConfirm={handleConfirm}
/>
```

`onConfirm` returns a normalized object:

```js
{
  address: '北京市海淀区颐和园路5号',
  latitude: '39.9928',
  longitude: '116.3055',
}
```

### `baiduMapLoader`

Add a dedicated loader utility responsible for:

- injecting the Baidu Maps JavaScript SDK script
- ensuring the SDK is loaded only once
- resolving only when `window.BMapGL` is ready
- surfacing a clear error when loading fails

### Existing `baiduLocation` Service

Keep the existing REST-style location helper module for:

- `解析坐标`
- existing candidate search flow
- lightweight non-map location helpers

Do not force this feature to replace the existing helpers with a backend-heavy abstraction.

### `ChaoxingSignin.jsx` Integration

Keep the page-level integration small:

- manage `isMapPickerOpen`
- pass current form values as `initialLocation`
- reuse a single `applyResolvedLocation` path for confirmed write-back

## Baidu SDK Integration

### Configuration

Use a frontend environment variable:

- `VITE_BAIDU_MAP_AK`

If the AK is missing:

- opening `地图选点` should produce a clear user-facing error
- the sign-in page should keep working with manual entry and existing lightweight resolver actions

### Required SDK Behaviors

The modal should use the Baidu Maps JavaScript SDK for:

- map rendering
- marker placement
- map click events
- point centering and zooming
- local search support if appropriate
- reverse geocoding for clicked or chosen points

## Data Flow

### Open Picker

1. User clicks `地图选点`.
2. The sign-in page assembles `initialLocation` from current form values.
3. The modal opens and initializes the map from current form state.

### Search-Based Selection

1. User enters a place name.
2. The picker performs place search.
3. User selects one result.
4. The picker updates the draft point and marker.
5. The picker resolves and previews the readable address.

### Click-Based Selection

1. User clicks any point on the map.
2. The picker updates the draft point and marker.
3. The picker runs reverse geocoding.
4. The preview updates with coordinates and address.

### Confirm

1. User clicks `确认选点`.
2. The picker emits the normalized location object.
3. `ChaoxingSignin.jsx` writes the values into form state.
4. The modal closes.

## Error Handling

### SDK and Network Errors

If the Baidu Maps JavaScript SDK fails to load:

- show an inline error inside the modal region or before opening the modal
- do not break the rest of the sign-in page

### Reverse Geocoding Failure

If reverse geocoding fails after a valid point is selected:

- keep the selected coordinates
- show a fallback address such as `未解析到详细地址`
- still allow confirmation

### Search Failure

If search fails:

- show an inline error for the search area
- keep any existing draft point unchanged

If search returns no results:

- show an explicit empty state
- keep any existing draft point unchanged

### Invalid Confirmation State

If the user has not selected a valid point:

- disable `确认选点`

## Form and Submission Behavior

After confirmed write-back:

- the form inputs for `address`, `latitude`, and `longitude` show the selected values
- the user may still edit those values manually
- the backend submission format remains unchanged

This applies equally to:

- `location` sign-ins
- `qrcode` sign-ins that benefit from location augmentation

## Testing Design

### Frontend Unit Tests

Add coverage for:

- SDK loader loads only once
- SDK loader surfaces a clear error on load failure
- modal initializes from `initialLocation`
- search result selection updates preview state but does not write back before confirmation
- map click selection updates preview state and triggers reverse geocoding
- `确认选点` emits normalized values
- `取消` does not emit values

### Frontend Integration Tests

Extend sign-in page tests so they verify:

- both `location` and `qrcode` sign types expose the same map picker entry
- confirmed picker selection writes back to the form
- the sign-in payload still uses the current `address`, `latitude`, and `longitude` fields

### Backend Tests

No backend contract changes are required for this feature.

Existing backend location helper coverage can remain focused on:

- current geocode/search normalization behavior
- current Chaoxing sign payload handling

## Out of Scope

- favorites or saved map locations
- multi-provider map abstraction
- route planning
- automatic continuous reverse geocoding on every manual form keystroke
- backend redesign of the sign-in payload
- unrelated refactoring outside the Chaoxing sign-in flow

## Rollout Notes

Deliver in this order:

1. add the map SDK loader and modal shell
2. connect search, map click, marker, and reverse geocoding
3. integrate confirmed write-back into the existing Chaoxing sign-in form
4. verify both `location` and `qrcode` flows

This sequence keeps the feature bounded while covering the approved user journey end to end.
