# Chaoxing Location Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users complete Chaoxing location sign-ins by either resolving coordinates from a place/address or picking a point from a Baidu-backed map flow, with the result auto-filled back into the existing sign-in form.

**Architecture:** Keep the backend payload contract unchanged and implement this feature entirely on the frontend in the first pass. Split the work into a Baidu location service, a focused picker modal component, and a small integration layer inside the existing sign-in page so the large page does not absorb all provider-specific logic.

**Tech Stack:** React 18, Vite, Vitest, jsdom, existing component primitives in `frontend/src/components`

---

### Task 1: Add Frontend Test Coverage For Location Resolution Flow

**Files:**
- Create: `frontend/src/services/baiduLocation.test.js`
- Create: `frontend/src/pages/ChaoxingSignin.location.test.jsx`
- Modify: `frontend/tests/setup.js`
- Test: `frontend/src/services/baiduLocation.test.js`
- Test: `frontend/src/pages/ChaoxingSignin.location.test.jsx`

- [ ] **Step 1: Write the failing service tests**

```js
import { describe, expect, test, vi, beforeEach } from 'vitest'

import {
  buildBaiduGeocoderUrl,
  normalizeBaiduLocationResult,
  resolveBaiduAddress,
} from './baiduLocation'

describe('baidu location service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('normalizes a baidu geocoder result into address and coordinates', () => {
    const normalized = normalizeBaiduLocationResult({
      result: {
        location: { lat: 39.9042, lng: 116.4074 },
        formatted_address: '北京市朝阳区'
      }
    })

    expect(normalized).toEqual({
      address: '北京市朝阳区',
      latitude: '39.9042',
      longitude: '116.4074'
    })
  })

  test('rejects when baidu does not return a valid coordinate pair', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: null })
    }))

    await expect(resolveBaiduAddress('朝阳区')).rejects.toThrow('未找到可用坐标')
  })
})
```

- [ ] **Step 2: Write the failing page integration tests**

```jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, test, expect } from 'vitest'

import ChaoxingSignin from './ChaoxingSignin'

vi.mock('../services/baiduLocation', () => ({
  resolveBaiduAddress: vi.fn(async () => ({
    address: '北京市朝阳区',
    latitude: '39.9042',
    longitude: '116.4074'
  }))
}))

test('fills latitude and longitude after resolving an address', async () => {
  window.sessionStorage.setItem('auth_token', 'demo-token')

  render(
    <MemoryRouter>
      <ChaoxingSignin />
    </MemoryRouter>
  )

  fireEvent.change(screen.getByLabelText('签到类型'), { target: { value: 'location' } })
  fireEvent.change(screen.getByLabelText('地址'), { target: { value: '北京市朝阳区' } })
  fireEvent.click(screen.getByRole('button', { name: '解析坐标' }))

  await waitFor(() => {
    expect(screen.getByLabelText('纬度')).toHaveValue('39.9042')
    expect(screen.getByLabelText('经度')).toHaveValue('116.4074')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- --run src/services/baiduLocation.test.js src/pages/ChaoxingSignin.location.test.jsx`

Expected: FAIL because `baiduLocation` service and location action UI do not exist yet.

- [ ] **Step 4: Extend frontend test setup for DOM and provider mocks**

```js
import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'

const createMemoryStorage = () => {
  const store = new Map()
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null },
    setItem(key, value) { store.set(key, String(value)) },
    removeItem(key) { store.delete(key) },
    clear() { store.clear() },
  }
}

if (!window.localStorage || typeof window.localStorage.setItem !== 'function') {
  Object.defineProperty(window, 'localStorage', { value: createMemoryStorage(), configurable: true })
}

if (!window.sessionStorage || typeof window.sessionStorage.setItem !== 'function') {
  Object.defineProperty(window, 'sessionStorage', { value: createMemoryStorage(), configurable: true })
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})
```

- [ ] **Step 5: Run the tests again and keep them red for the right reason**

Run: `npm test -- --run src/services/baiduLocation.test.js src/pages/ChaoxingSignin.location.test.jsx`

Expected: FAIL on missing implementation rather than environment setup.

- [ ] **Step 6: Commit the test harness**

```bash
git add frontend/tests/setup.js frontend/src/services/baiduLocation.test.js frontend/src/pages/ChaoxingSignin.location.test.jsx
git commit -m "test: add chaoxing location sign-in coverage"
```

### Task 2: Build A Reusable Baidu Location Service

**Files:**
- Create: `frontend/src/services/baiduLocation.js`
- Test: `frontend/src/services/baiduLocation.test.js`

- [ ] **Step 1: Write the minimal service implementation to satisfy the tests**

```js
const toCoordinateString = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    throw new Error('未找到可用坐标')
  }
  return String(numeric)
}

export const normalizeBaiduLocationResult = (payload) => {
  const location = payload?.result?.location
  if (!location) {
    throw new Error('未找到可用坐标')
  }

  return {
    address: String(payload?.result?.formatted_address || '').trim(),
    latitude: toCoordinateString(location.lat),
    longitude: toCoordinateString(location.lng),
  }
}

export const buildBaiduGeocoderUrl = (query) => {
  const keyword = encodeURIComponent(String(query).trim())
  return `/api/baidu/geocode?query=${keyword}`
}

export const resolveBaiduAddress = async (query) => {
  const response = await fetch(buildBaiduGeocoderUrl(query))
  if (!response.ok) {
    throw new Error('地点解析失败，请稍后重试')
  }
  const payload = await response.json()
  return normalizeBaiduLocationResult(payload)
}
```

- [ ] **Step 2: Add a second service helper for map-picker payload normalization**

```js
export const normalizeBaiduPickerSelection = (selection) => {
  const point = selection?.point || selection?.location || selection
  const address = selection?.address || selection?.name || ''

  return {
    address: String(address).trim(),
    latitude: String(Number(point?.lat)),
    longitude: String(Number(point?.lng)),
  }
}
```

- [ ] **Step 3: Run the service tests**

Run: `npm test -- --run src/services/baiduLocation.test.js`

Expected: PASS

- [ ] **Step 4: Refactor names only if tests stay green**

```js
export const BAIDU_GEOCODE_ERROR_MESSAGE = '地点解析失败，请稍后重试'
export const BAIDU_EMPTY_RESULT_MESSAGE = '未找到可用坐标'
```

- [ ] **Step 5: Re-run the service tests**

Run: `npm test -- --run src/services/baiduLocation.test.js`

Expected: PASS

- [ ] **Step 6: Commit the service**

```bash
git add frontend/src/services/baiduLocation.js frontend/src/services/baiduLocation.test.js
git commit -m "feat: add baidu location resolver service"
```

### Task 3: Create A Focused Baidu Picker Component

**Files:**
- Create: `frontend/src/components/BaiduLocationPicker.jsx`
- Create: `frontend/src/components/BaiduLocationPicker.test.jsx`
- Modify: `frontend/src/components/index.js`
- Test: `frontend/src/components/BaiduLocationPicker.test.jsx`

- [ ] **Step 1: Write the failing picker tests**

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { test, expect, vi } from 'vitest'

import { BaiduLocationPicker } from './BaiduLocationPicker'

test('returns selected location to the caller', async () => {
  const onSelect = vi.fn()

  render(
    <BaiduLocationPicker
      open
      onClose={() => {}}
      onSelect={onSelect}
      pickerApi={{
        open: async () => ({
          address: '北京市朝阳区',
          latitude: '39.9042',
          longitude: '116.4074'
        })
      }}
    />
  )

  fireEvent.click(screen.getByRole('button', { name: '确认选点' }))

  expect(onSelect).toHaveBeenCalledWith({
    address: '北京市朝阳区',
    latitude: '39.9042',
    longitude: '116.4074'
  })
})
```

- [ ] **Step 2: Run the picker test to verify it fails**

Run: `npm test -- --run src/components/BaiduLocationPicker.test.jsx`

Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Implement the smallest usable picker component**

```jsx
import { useState } from 'react'

import { Button } from './Button'

export function BaiduLocationPicker({ open, onClose, onSelect, pickerApi }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      const result = await pickerApi.open()
      onSelect(result)
      onClose()
    } catch (err) {
      setError(err.message || '选点失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true">
      <h3>地图选点</h3>
      {error ? <p>{error}</p> : null}
      <Button type="button" onClick={handleConfirm}>
        {submitting ? '选点中...' : '确认选点'}
      </Button>
      <Button type="button" variant="secondary" onClick={onClose}>
        取消
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Export the picker from the shared components barrel**

```js
export { BaiduLocationPicker } from './BaiduLocationPicker'
```

- [ ] **Step 5: Run the picker tests**

Run: `npm test -- --run src/components/BaiduLocationPicker.test.jsx`

Expected: PASS

- [ ] **Step 6: Commit the picker slice**

```bash
git add frontend/src/components/BaiduLocationPicker.jsx frontend/src/components/BaiduLocationPicker.test.jsx frontend/src/components/index.js
git commit -m "feat: add baidu map picker component"
```

### Task 4: Integrate Address Resolution And Picker Into ChaoxingSignin

**Files:**
- Modify: `frontend/src/pages/ChaoxingSignin.jsx`
- Modify: `frontend/src/pages/ChaoxingSignin.location.test.jsx`
- Modify: `frontend/src/components/Input.jsx`
- Test: `frontend/src/pages/ChaoxingSignin.location.test.jsx`

- [ ] **Step 1: Add local UI state for location actions**

```jsx
const [locationResolveLoading, setLocationResolveLoading] = useState(false)
const [locationResolveError, setLocationResolveError] = useState('')
const [pickerOpen, setPickerOpen] = useState(false)
const [locationResolvedAt, setLocationResolvedAt] = useState('')
```

- [ ] **Step 2: Add helpers to validate and apply resolved locations**

```jsx
const applyResolvedLocation = useCallback(({ address, latitude, longitude }) => {
  setForm((prev) => ({
    ...prev,
    address: address || prev.address,
    latitude: latitude ?? prev.latitude,
    longitude: longitude ?? prev.longitude,
  }))
  setLocationResolvedAt(new Date().toISOString())
  setLocationResolveError('')
}, [])

const validateCoordinateRange = (value, min, max, label) => {
  if (value === '') return
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new Error(`${label}格式不正确`)
  }
}
```

- [ ] **Step 3: Add the resolve action and picker action into the location form block**

```jsx
<div className="md:col-span-2 flex flex-wrap gap-3">
  <Button
    type="button"
    variant="secondary"
    disabled={!form.address.trim() || locationResolveLoading}
    onClick={handleResolveAddress}
  >
    {locationResolveLoading ? '解析中...' : '解析坐标'}
  </Button>
  <Button
    type="button"
    variant="secondary"
    onClick={() => setPickerOpen(true)}
  >
    地图选点
  </Button>
</div>
{locationResolveError ? <p className="md:col-span-2 text-sm text-red-600">{locationResolveError}</p> : null}
```

- [ ] **Step 4: Wire in the service and picker callbacks**

```jsx
const handleResolveAddress = useCallback(async () => {
  setLocationResolveLoading(true)
  setLocationResolveError('')
  try {
    const resolved = await resolveBaiduAddress(form.address)
    applyResolvedLocation(resolved)
  } catch (err) {
    setLocationResolveError(err.message || '地点解析失败，请稍后重试')
  } finally {
    setLocationResolveLoading(false)
  }
}, [applyResolvedLocation, form.address])
```

- [ ] **Step 5: Enforce submit-time validation for location sign-ins**

```jsx
if (signType === 'location') {
  if (!form.address.trim() && (!form.latitude || !form.longitude)) {
    throw new Error('位置签到需要填写地址或经纬度。')
  }
  validateCoordinateRange(form.latitude, -90, 90, '纬度')
  validateCoordinateRange(form.longitude, -180, 180, '经度')
}
```

- [ ] **Step 6: Render the picker modal beside the main form**

```jsx
<BaiduLocationPicker
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  onSelect={applyResolvedLocation}
  pickerApi={baiduLocationPickerApi}
/>
```

- [ ] **Step 7: Run the page tests**

Run: `npm test -- --run src/pages/ChaoxingSignin.location.test.jsx`

Expected: PASS

- [ ] **Step 8: Run the full frontend suite and build**

Run: `npm test -- --run`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 9: Commit the page integration**

```bash
git add frontend/src/pages/ChaoxingSignin.jsx frontend/src/pages/ChaoxingSignin.location.test.jsx frontend/src/components/Input.jsx
git commit -m "feat: add baidu-assisted location sign-in flow"
```

### Task 5: Update Documentation And Final Verification

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Test: `frontend/src/services/baiduLocation.test.js`
- Test: `frontend/src/components/BaiduLocationPicker.test.jsx`
- Test: `frontend/src/pages/ChaoxingSignin.location.test.jsx`

- [ ] **Step 1: Add a short usage note for location sign-ins**

```md
- Location sign-ins now support:
  - manual latitude / longitude input
  - address-to-coordinate resolution
  - Baidu map point selection
```

- [ ] **Step 2: Add configuration notes if the Baidu integration needs browser-side setup**

```md
### Baidu Location Integration

If your deployment requires a Baidu script key or picker URL, configure it in the frontend environment before using the location picker.
```

- [ ] **Step 3: Run targeted verification**

Run: `npm test -- --run src/services/baiduLocation.test.js src/components/BaiduLocationPicker.test.jsx src/pages/ChaoxingSignin.location.test.jsx`

Expected: PASS

- [ ] **Step 4: Run final frontend verification**

Run: `npm test -- --run && npm run build`

Expected: PASS

- [ ] **Step 5: Commit the documentation and verification pass**

```bash
git add README.md README.zh-CN.md
git commit -m "docs: document location sign-in improvements"
```
