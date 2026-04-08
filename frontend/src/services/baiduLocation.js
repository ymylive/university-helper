const BAIDU_EMPTY_RESULT_MESSAGE = '未找到可用坐标'
const BAIDU_REQUEST_ERROR_MESSAGE = '地点解析失败，请稍后重试'
const BAIDU_EMPTY_SEARCH_MESSAGE = '未找到可选地点'

const toCoordinateString = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    throw new Error(BAIDU_EMPTY_RESULT_MESSAGE)
  }

  return String(numeric)
}

const parseResponsePayload = async (response) => {
  if (typeof response.text === 'function') {
    const text = await response.text()
    if (!text) return {}

    try {
      return JSON.parse(text)
    } catch {
      throw new Error(BAIDU_REQUEST_ERROR_MESSAGE)
    }
  }

  return {}
}

export const buildBaiduGeocoderUrl = (query) => {
  const keyword = encodeURIComponent(String(query ?? '').trim())
  return `/api/v1/chaoxing/location/geocode?query=${keyword}`
}

export const buildBaiduPlaceSearchUrl = (query) => {
  const keyword = encodeURIComponent(String(query ?? '').trim())
  return `/api/v1/chaoxing/location/search?query=${keyword}`
}

const readPayloadData = (payload) => payload?.data || payload || {}

export const normalizeBaiduLocationResult = (payload) => {
  const source = readPayloadData(payload)
  const location = source?.result?.location
  if (!location) {
    throw new Error(BAIDU_EMPTY_RESULT_MESSAGE)
  }

  return {
    address: String(source?.result?.formatted_address || '').trim(),
    latitude: toCoordinateString(location.lat),
    longitude: toCoordinateString(location.lng),
  }
}

const buildCandidateAddress = (candidate) => {
  return [candidate?.city, candidate?.district, candidate?.address]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
}

export const normalizeBaiduPlaceCandidates = (payload) => {
  const source = readPayloadData(payload)
  const results = Array.isArray(source?.results) ? source.results : []

  return results
    .map((candidate, index) => {
      const location = candidate?.location || {
        lat: candidate?.latitude,
        lng: candidate?.longitude,
      }

      const resolvedAddress = candidate?.location
        ? buildCandidateAddress(candidate) || String(candidate?.address || '').trim()
        : String(candidate?.address || '').trim() || buildCandidateAddress(candidate)
      if (!location) return null

      return {
        id: String(candidate?.uid || candidate?.id || candidate?.name || `candidate-${index}`),
        name: String(candidate?.name || '').trim(),
        address: resolvedAddress,
        latitude: toCoordinateString(location.lat),
        longitude: toCoordinateString(location.lng),
      }
    })
    .filter(Boolean)
}

export const resolveBaiduAddress = async (query) => {
  const response = await fetch(buildBaiduGeocoderUrl(query))
  const payload = await parseResponsePayload(response)

  if (!response.ok) {
    throw new Error(payload?.message || payload?.msg || BAIDU_REQUEST_ERROR_MESSAGE)
  }

  return normalizeBaiduLocationResult(payload)
}

export const searchBaiduPlaces = async (query) => {
  const response = await fetch(buildBaiduPlaceSearchUrl(query))
  const payload = await parseResponsePayload(response)

  if (!response.ok) {
    throw new Error(payload?.message || payload?.msg || BAIDU_REQUEST_ERROR_MESSAGE)
  }

  const results = normalizeBaiduPlaceCandidates(payload)
  if (results.length === 0) {
    throw new Error(BAIDU_EMPTY_SEARCH_MESSAGE)
  }

  return results
}

export { BAIDU_EMPTY_RESULT_MESSAGE, BAIDU_REQUEST_ERROR_MESSAGE, BAIDU_EMPTY_SEARCH_MESSAGE }
