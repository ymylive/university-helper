"""智慧树课程路由"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import base64
from app.services.course.zhihuishu.adapter import ZhihuishuAdapter

router = APIRouter(prefix="/zhihuishu", tags=["zhihuishu"])

# 全局适配器实例
adapter: Optional[ZhihuishuAdapter] = None


class LoginRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    use_qr: bool = True


class CourseRequest(BaseModel):
    course_id: str


class QuestionRequest(BaseModel):
    question: Dict


@router.post("/login")
async def login(request: LoginRequest):
    """登录智慧树"""
    global adapter
    adapter = ZhihuishuAdapter()

    try:
        if request.use_qr:
            qr_data = None

            def qr_callback(img_bytes: bytes):
                nonlocal qr_data
                qr_data = base64.b64encode(img_bytes).decode()

            result = adapter.login_with_qr(qr_callback)
            result["qr_code"] = qr_data
            return result
        else:
            if not request.username or not request.password:
                raise HTTPException(status_code=400, detail="Username and password required")
            return adapter.login_with_password(request.username, request.password)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses")
async def get_courses():
    """获取课程列表"""
    if not adapter:
        raise HTTPException(status_code=401, detail="Not logged in")

    try:
        courses = adapter.get_courses()
        return {"courses": courses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/course/start")
async def start_course(request: CourseRequest):
    """开始学习课程"""
    if not adapter:
        raise HTTPException(status_code=401, detail="Not logged in")

    try:
        result = adapter.start_course(request.course_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/answer")
async def answer_question(request: QuestionRequest):
    """AI 答题"""
    if not adapter:
        raise HTTPException(status_code=401, detail="Not logged in")

    try:
        answer = adapter.answer_question(request.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
