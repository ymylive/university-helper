from app.services.course.chaoxing.payload_mapper import normalize_tiku_config


def test_normalize_tiku_config_maps_frontend_fields():
    normalized = normalize_tiku_config(
        {
            "provider": "TikuYanxi",
            "token": "token-a,token-b",
            "coverage_threshold": 0.9,
            "judge_mapping": {"correct": ["对", "正确"], "wrong": ["错", "错误"]},
            "submit_mode": "submit",
        }
    )

    assert normalized["provider"] == "TikuYanxi"
    assert normalized["tokens"] == "token-a,token-b"
    assert normalized["cover_rate"] == 0.9
    assert normalized["true_list"] == "对,正确"
    assert normalized["false_list"] == "错,错误"
    assert normalized["submit"] == "true"


def test_normalize_tiku_config_disables_token_provider_without_token():
    normalized = normalize_tiku_config(
        {
            "provider": "TikuYanxi",
            "token": "",
            "coverage_threshold": 0.75,
            "submit_mode": "save",
        }
    )

    assert "provider" not in normalized
    assert "tokens" not in normalized
    assert normalized["cover_rate"] == 0.75
    assert normalized["submit"] == "false"
