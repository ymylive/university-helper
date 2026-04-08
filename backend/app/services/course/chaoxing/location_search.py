from typing import Any, Dict, List, Optional


def coerce_coordinate(value: Any) -> Optional[float]:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric


def build_place_candidate_address(candidate: Dict[str, Any]) -> str:
    parts = [candidate.get("city"), candidate.get("district"), candidate.get("address")]
    return " ".join(str(item).strip() for item in parts if str(item or "").strip())


def normalize_place_search_results(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    results = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(results, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for index, candidate in enumerate(results):
        if not isinstance(candidate, dict):
            continue

        location = candidate.get("location")
        if not isinstance(location, dict):
            continue

        latitude = coerce_coordinate(location.get("lat"))
        longitude = coerce_coordinate(location.get("lng"))
        if latitude is None or longitude is None:
            continue

        normalized.append(
            {
                "id": str(
                    candidate.get("uid")
                    or candidate.get("name")
                    or f"candidate-{index}"
                ),
                "name": str(candidate.get("name") or "").strip(),
                "address": build_place_candidate_address(candidate),
                "latitude": latitude,
                "longitude": longitude,
            }
        )

    return normalized
