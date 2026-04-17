"""Characterisation tests for ChaoxingSigninClient._parse_courses fallback paths.

These tests lock in the current accumulator shape for the regex-based fallback
parsers in signin.py (lines 432-482). They exist to protect a refactor from
regressing observable behaviour.

Each test crafts a content string that does NOT match the earlier structured
(BeautifulSoup) or primary `course_<id>_<id>` parsers, so the targeted fallback
regex is the path that actually populates the course list.
"""

from app.services.course.chaoxing.signin import ChaoxingSigninClient


def test_fallback_href_query_forward_pair():
    """courseid=...<240ch>...clazzid=... pattern (forward)."""
    client = ChaoxingSigninClient()
    content = (
        '<html><body>'
        '<a href="/foo?courseid=111&extra=1&clazzid=222&cpi=333">Link</a>'
        '</body></html>'
    )

    courses = client._parse_courses(content)

    assert len(courses) == 1
    assert courses[0]["courseId"] == "111"
    assert courses[0]["classId"] == "222"
    assert courses[0]["cpi"] == "333"
    assert courses[0]["id"] == "111_222_333"
    assert courses[0]["name"] == "Course 111"
    assert courses[0]["courseName"] == "Course 111"


def test_fallback_href_query_reverse_pair():
    """clazzid=...<240ch>...courseid=... pattern (reverse)."""
    client = ChaoxingSigninClient()
    content = (
        '<html><body>'
        '<a href="/bar?clazzid=444&other=x&courseid=555">Link</a>'
        '</body></html>'
    )

    courses = client._parse_courses(content)

    assert len(courses) == 1
    assert courses[0]["courseId"] == "555"
    assert courses[0]["classId"] == "444"
    assert courses[0]["id"] == "555_444"


def test_fallback_json_ids_without_name():
    """JSON-style pairing of courseId + clazzId with no name field nearby."""
    client = ChaoxingSigninClient()
    content = (
        '<script>var raw = {'
        '"courseId":"601","someField":"x","clazzId":"602"'
        '};</script>'
    )

    courses = client._parse_courses(content)

    assert len(courses) == 1
    assert courses[0]["courseId"] == "601"
    assert courses[0]["classId"] == "602"
    assert courses[0]["cpi"] == ""
    assert courses[0]["id"] == "601_602"
    # No name nearby => placeholder
    assert courses[0]["courseName"].lower() == "course 601"


def test_fallback_json_with_name_forward():
    """Forward JSON block with explicit courseName within 220 chars of classId."""
    client = ChaoxingSigninClient()
    content = (
        '<script>var data = ['
        '{"courseId":"701","other":"y","classId":"702","courseName":"Forward Named"}'
        '];</script>'
    )

    courses = client._parse_courses(content)

    assert len(courses) == 1
    assert courses[0]["courseId"] == "701"
    assert courses[0]["classId"] == "702"
    assert courses[0]["name"] == "Forward Named"
    assert courses[0]["courseName"] == "Forward Named"


def test_fallback_json_with_name_reverse():
    """Reverse JSON block: clazzId first, then courseId, then name."""
    client = ChaoxingSigninClient()
    content = (
        '<script>var data = {'
        '"clazzId":"802","courseId":"801","title":"Reverse Named"'
        '};</script>'
    )

    courses = client._parse_courses(content)

    assert len(courses) == 1
    assert courses[0]["courseId"] == "801"
    assert courses[0]["classId"] == "802"
    assert courses[0]["name"] == "Reverse Named"


def test_fallback_hidden_input_pair_with_cpi():
    """Hidden input courseId with clazzId within the 360/1400 window."""
    client = ChaoxingSigninClient()
    # Must NOT include a div with class='course' id='course_X_Y' (would trigger
    # structured parser) or the `course_<id>_<id>` primary marker. Use plain
    # inputs in a wrapper div.
    content = (
        '<div class="wrapper">'
        '<input class="courseId" value="911" />'
        '<span>filler</span>'
        '<input class="clazzId" value="912" />'
        '<a href="/foo?cpi=913">x</a>'
        '<span class="course-name" title="Hidden Course">Hidden Course</span>'
        '</div>'
    )

    courses = client._parse_courses(content)

    assert len(courses) == 1
    assert courses[0]["courseId"] == "911"
    assert courses[0]["classId"] == "912"
    assert courses[0]["cpi"] == "913"
    assert courses[0]["id"] == "911_912_913"
    assert courses[0]["name"] == "Hidden Course"


def test_multiple_distinct_pairs_dedup_and_order():
    """Two different courses via href fallback are appended in first-seen order."""
    client = ChaoxingSigninClient()
    content = (
        '<a href="/a?courseid=101&clazzid=102&cpi=103">A</a>'
        '<a href="/b?courseid=201&clazzid=202&cpi=203">B</a>'
        # Duplicate of first should be deduped
        '<a href="/c?courseid=101&clazzid=102&cpi=103">A again</a>'
    )

    courses = client._parse_courses(content)

    assert [(c["courseId"], c["classId"]) for c in courses] == [
        ("101", "102"),
        ("201", "202"),
    ]
