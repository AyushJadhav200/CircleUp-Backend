from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import traceback
from datetime import datetime

load_dotenv() # Load variables from .env
from database import engine, Base
import auth
import tools
import karma
import websocket
import messages
import expansion
import shop
import payments

# 1. Initialize App
app = FastAPI(
    title="CircleUp Backend MVP",
    description="FastAPI backend for CircleUp community tool sharing app.",
    version="1.0.0"
)

# 2. CORS Middleware - CRITICAL: Must be defined BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 2. Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    err_msg = f"[GLOBAL ERROR] {datetime.now()} - {request.url}\n{traceback.format_exc()}"
    print(err_msg)
    with open("global_error.log", "a") as f:
        f.write(err_msg + "\n" + "="*50 + "\n")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )

# 3. Database Initialization
import auto_migrate
auto_migrate.run_migration()
Base.metadata.create_all(bind=engine)

# 4. Middleware & Routes

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/admin")
def serve_admin():
    from fastapi.responses import FileResponse
    return FileResponse("static/admin/index.html")

app.include_router(auth.router, prefix="/auth")
app.include_router(tools.router, prefix="/tools")
app.include_router(karma.router, prefix="/karma")
app.include_router(websocket.router, prefix="/ws")
app.include_router(messages.router, prefix="/chats")
app.include_router(expansion.router, prefix="/expansion")
app.include_router(shop.router, prefix="/shop")
app.include_router(payments.router, prefix="/payments")

@app.api_route("/", methods=["GET", "HEAD", "POST", "OPTIONS"])
def read_root():
    return {
        "message": "Welcome to CircleUp API",
        "legal": "/static/legal/index.html"
    }
