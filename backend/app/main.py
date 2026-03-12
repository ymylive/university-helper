from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import RedirectResponse
from app.config import settings
from app.middleware.tenant_isolation import tenant_isolation_middleware
from app.api.v1 import auth, chaoxing

app = FastAPI(
    title="Unified Signin Platform API",
    description="Multi-tenant signin platform with database isolation",
    version="1.0.0"
)

# HTTPS enforcement middleware
@app.middleware("http")
async def https_redirect_middleware(request: Request, call_next):
    if settings.ENFORCE_HTTPS and request.url.scheme == "http":
        url = request.url.replace(scheme="https")
        return RedirectResponse(url, status_code=301)
    return await call_next(request)

# CSRF protection
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.CORS_ORIGINS)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tenant isolation middleware
app.middleware("http")(tenant_isolation_middleware)

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])

# Course routes
from app.api.v1 import course
app.include_router(course.router, prefix="/api/v1/course", tags=["course"])
app.include_router(chaoxing.router, prefix="/api/v1/chaoxing", tags=["chaoxing"])


@app.get("/")
async def root():
    return {"message": "Unified Signin Platform API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
