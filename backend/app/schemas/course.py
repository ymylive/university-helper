from pydantic import BaseModel, Field
from typing import Optional


class Course(BaseModel):
    """Course model"""
    courseId: str = Field(..., description="Course ID")
    clazzId: str = Field(..., description="Class ID")
    cpi: str = Field(..., description="Course participation ID")
    name: Optional[str] = Field(None, description="Course name")


class Point(BaseModel):
    """Course point/chapter model"""
    id: str = Field(..., description="Point ID")
    name: Optional[str] = Field(None, description="Point name")


class Job(BaseModel):
    """Job/task model"""
    jobid: str = Field(..., description="Job ID")
    objectid: str = Field(..., description="Object ID")
    otherinfo: str = Field(..., description="Other information")
    name: Optional[str] = Field(None, description="Job name")
    playTime: Optional[int] = Field(0, description="Play time in milliseconds")
    rt: Optional[str] = Field(None, description="Rate parameter")
    videoFaceCaptureEnc: Optional[str] = Field(None, description="Video face capture encryption")
    attDuration: Optional[str] = Field(None, description="Attention duration")
    attDurationEnc: Optional[str] = Field(None, description="Attention duration encryption")
    enc: Optional[str] = Field(None, description="Encryption parameter")


class JobInfo(BaseModel):
    """Job information model"""
    knowledgeid: str = Field(..., description="Knowledge ID")
    ktoken: str = Field(..., description="Knowledge token")
    cpi: str = Field(..., description="Course participation ID")
    notOpen: bool = Field(False, description="Whether the chapter is not open")
