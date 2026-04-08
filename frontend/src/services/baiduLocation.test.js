import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  buildBaiduGeocoderUrl,
  buildBaiduPlaceSearchUrl,
  normalizeBaiduPlaceCandidates,
  normalizeBaiduLocationResult,
  searchBaiduPlaces,
  resolveBaiduAddress,
} from './baiduLocation'

describe('baidu location service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('builds the geocoder request URL for an address query', () => {
    expect(buildBaiduGeocoderUrl(' 北京市朝阳区 ')).toBe('/api/v1/chaoxing/location/geocode?query=%E5%8C%97%E4%BA%AC%E5%B8%82%E6%9C%9D%E9%98%B3%E5%8C%BA')
  })

  test('builds the place search request URL for a query', () => {
    expect(buildBaiduPlaceSearchUrl(' 北京大学 ')).toBe('/api/v1/chaoxing/location/search?query=%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6')
  })

  test('normalizes a baidu geocoder result into address and coordinates', () => {
    expect(
      normalizeBaiduLocationResult({
        result: {
          location: { lat: 39.9042, lng: 116.4074 },
          formatted_address: '北京市朝阳区',
        },
      })
    ).toEqual({
      address: '北京市朝阳区',
      latitude: '39.9042',
      longitude: '116.4074',
    })
  })

  test('rejects when baidu does not return a valid coordinate pair', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: null }),
        text: async () => JSON.stringify({ result: null }),
      })
    )

    await expect(resolveBaiduAddress('朝阳区')).rejects.toThrow('未找到可用坐标')
  })

  test('normalizes place search candidates into selectable location records', () => {
    expect(
      normalizeBaiduPlaceCandidates({
        results: [
          {
            uid: 'pk-1',
            name: '北京大学',
            city: '北京市',
            district: '海淀区',
            address: '颐和园路5号',
            location: { lat: 39.9928, lng: 116.3055 },
          },
        ],
      })
    ).toEqual([
      {
        id: 'pk-1',
        name: '北京大学',
        address: '北京市 海淀区 颐和园路5号',
        latitude: '39.9928',
        longitude: '116.3055',
      },
    ])
  })

  test('searches places and returns normalized candidates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            results: [
              {
                uid: 'pk-1',
                name: '北京大学',
                city: '北京市',
                district: '海淀区',
                address: '颐和园路5号',
                location: { lat: 39.9928, lng: 116.3055 },
              },
            ],
          }),
      })
    )

    await expect(searchBaiduPlaces('北京大学')).resolves.toEqual([
      {
        id: 'pk-1',
        name: '北京大学',
        address: '北京市 海淀区 颐和园路5号',
        latitude: '39.9928',
        longitude: '116.3055',
      },
    ])
  })
})
