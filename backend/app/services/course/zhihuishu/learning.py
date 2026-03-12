"""智慧树自动学习模块"""
import time
import json
from typing import Optional, Dict, List
import requests
from .crypto import Cipher, WatchPoint, VIDEO_KEY


class ZhihuishuLearning:
    """智慧树自动学习服务"""

    def __init__(self, cookies: dict, proxies: Optional[dict] = None):
        self.cookies = cookies
        self.proxies = proxies or {}
        self.session = requests.Session()
        self.session.cookies.update(cookies)
        self.cipher = Cipher(VIDEO_KEY)

    def get_course_list(self) -> List[Dict]:
        """获取课程列表"""
        url = "https://onlineservice-api.zhihuishu.com/gateway/t/v1/student/course/share/queryShareCourseInfo"
        try:
            resp = self.session.post(url, proxies=self.proxies, timeout=10)
            data = resp.json()
            return data.get("rt", {}).get("courseOpenDtos", [])
        except Exception as e:
            raise Exception(f"Failed to get course list: {e}")

    def get_video_list(self, course_id: str) -> List[Dict]:
        """获取课程视频列表"""
        url = "https://studyservice-api.zhihuishu.com/gateway/t/v1/learning/queryStudyInfo"
        try:
            resp = self.session.post(url, json={"recruitAndCourseId": course_id},
                                    proxies=self.proxies, timeout=10)
            data = resp.json()
            return data.get("rt", {}).get("videoChapterDtos", [])
        except Exception as e:
            raise Exception(f"Failed to get video list: {e}")

    def watch_video(self, course_id: str, video_id: str, duration: int) -> bool:
        """
        观看视频

        Args:
            course_id: 课程ID
            video_id: 视频ID
            duration: 视频时长（秒）

        Returns:
            是否成功
        """
        url = "https://studyservice-api.zhihuishu.com/gateway/t/v1/learning/saveDatabaseIntervalTime"

        watch_point = WatchPoint()
        current_time = 0

        try:
            while current_time < duration:
                time.sleep(5)
                current_time += 5
                watch_point.add(current_time)

                data = {
                    "recruitAndCourseId": course_id,
                    "videoId": video_id,
                    "watchPoint": watch_point.get(),
                    "studyTime": current_time
                }

                encrypted = self.cipher.encrypt(json.dumps(data))
                resp = self.session.post(url, json={"data": encrypted},
                                       proxies=self.proxies, timeout=10)
                result = resp.json()

                if result.get("status") != 200:
                    return False

            return True

        except Exception as e:
            raise Exception(f"Failed to watch video: {e}")

    def complete_course(self, course_id: str) -> Dict:
        """
        完成整个课程

        Args:
            course_id: 课程ID

        Returns:
            完成统计信息
        """
        videos = self.get_video_list(course_id)
        completed = 0
        failed = 0

        for chapter in videos:
            for video in chapter.get("videoLearningDtos", []):
                video_id = video.get("videoId")
                duration = video.get("videoSec", 0)

                try:
                    if self.watch_video(course_id, video_id, duration):
                        completed += 1
                    else:
                        failed += 1
                except Exception:
                    failed += 1

        return {"completed": completed, "failed": failed, "total": completed + failed}
