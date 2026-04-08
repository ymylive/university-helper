from app.services.course.chaoxing.location_search import normalize_place_search_results


def test_normalize_place_search_results_returns_selectable_candidates():
    payload = {
        "results": [
            {
                "uid": "place-1",
                "name": "北京大学",
                "city": "北京市",
                "district": "海淀区",
                "address": "颐和园路5号",
                "location": {"lat": 39.9928, "lng": 116.3055},
            }
        ]
    }

    assert normalize_place_search_results(payload) == [
        {
            "id": "place-1",
            "name": "北京大学",
            "address": "北京市 海淀区 颐和园路5号",
            "latitude": 39.9928,
            "longitude": 116.3055,
        }
    ]


def test_normalize_place_search_results_skips_items_without_coordinates():
    payload = {
        "results": [
            {"uid": "bad-1", "name": "无坐标地点", "address": "未知地点"},
            {
                "uid": "good-1",
                "name": "清华大学",
                "city": "北京市",
                "district": "海淀区",
                "address": "双清路30号",
                "location": {"lat": 40.0024, "lng": 116.3269},
            },
        ]
    }

    assert normalize_place_search_results(payload) == [
        {
            "id": "good-1",
            "name": "清华大学",
            "address": "北京市 海淀区 双清路30号",
            "latitude": 40.0024,
            "longitude": 116.3269,
        }
    ]
