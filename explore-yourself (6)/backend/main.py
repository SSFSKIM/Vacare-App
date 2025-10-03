print("[STARTUP] Starting main.py import...")
import os
import pathlib
import json
print("[STARTUP] Basic imports done")

import dotenv
print("[STARTUP] dotenv imported")
from fastapi import FastAPI, APIRouter, Depends
print("[STARTUP] FastAPI imported")

print("[STARTUP] Loading .env file...")
dotenv.load_dotenv()
print("[STARTUP] .env loaded")

print("[STARTUP] Importing auth middleware...")
from databutton_app.mw.auth_mw import AuthConfig, get_authorized_user
print("[STARTUP] Auth middleware imported")


def get_router_config() -> dict:
    try:
        # Note: This file is not available to the agent
        cfg = json.loads(open("routers.json").read())
    except:
        return False
    return cfg


def is_auth_disabled(router_config: dict, name: str) -> bool:
    if not router_config:
        return False
    return router_config.get("routers", {}).get(name, {}).get("disableAuth", False)


def import_api_routers() -> APIRouter:
    """Create top level router including all user defined endpoints."""
    print("[STARTUP] Creating top-level router...")
    routes = APIRouter(prefix="/routes")

    print("[STARTUP] Getting router config...")
    router_config = get_router_config()
    print(f"[STARTUP] Router config loaded: {bool(router_config)}")

    src_path = pathlib.Path(__file__).parent
    print(f"[STARTUP] Source path: {src_path}")

    # Import API routers from "src/app/apis/*/__init__.py"
    apis_path = src_path / "app" / "apis"
    print(f"[STARTUP] APIs path: {apis_path}")

    print("[STARTUP] Discovering API modules...")
    api_names = [
        p.relative_to(apis_path).parent.as_posix()
        for p in apis_path.glob("*/__init__.py")
    ]
    print(f"[STARTUP] Found {len(api_names)} API modules: {api_names}")

    api_module_prefix = "app.apis."

    for name in api_names:
        print(f"[STARTUP] Importing API: {name}")
        try:
            api_module = __import__(api_module_prefix + name, fromlist=[name])
            print(f"[STARTUP] Successfully imported {name}")
            api_router = getattr(api_module, "router", None)
            if isinstance(api_router, APIRouter):
                routes.include_router(
                    api_router,
                    dependencies=(
                        []
                        if is_auth_disabled(router_config, name)
                        else [Depends(get_authorized_user)]
                    ),
                )
        except Exception as e:
            print(e)
            continue

    print(routes.routes)

    return routes


def get_firebase_config() -> dict | None:
    extensions = os.environ.get("DATABUTTON_EXTENSIONS", "[]")
    try:
        extensions = json.loads(extensions)
    except json.JSONDecodeError as e:
        print(f"Warning: Failed to parse DATABUTTON_EXTENSIONS: {e}")
        print(f"DATABUTTON_EXTENSIONS value: {repr(extensions[:200] if len(extensions) > 200 else extensions)}")
        return None

    for ext in extensions:
        if ext["name"] == "firebase-auth":
            return ext["config"]["firebaseConfig"]

    return None


def create_app() -> FastAPI:
    """Create the app. This is called by uvicorn with the factory option to construct the app object."""
    print("[STARTUP] Creating FastAPI app...")
    app = FastAPI()
    print("[STARTUP] FastAPI app created")

    print("[STARTUP] Including API routers...")
    app.include_router(import_api_routers())
    print("[STARTUP] API routers included")

    print("[STARTUP] Listing routes...")
    for route in app.routes:
        if hasattr(route, "methods"):
            for method in route.methods:
                print(f"{method} {route.path}")
    print("[STARTUP] Routes listed")

    print("[STARTUP] Getting Firebase config...")
    firebase_config = get_firebase_config()

    if firebase_config is None:
        print("[STARTUP] No firebase config found")
        app.state.auth_config = None
    else:
        print("[STARTUP] Firebase config found")
        auth_config = {
            "jwks_url": "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
            "audience": firebase_config["projectId"],
            "header": "authorization",
        }

        app.state.auth_config = AuthConfig(**auth_config)

    # Mount static files for Cloud Run (when nginx is not available)
    # Check if we're running without nginx (Cloud Run)
    print("[STARTUP] Checking for static files...")
    import os
    if os.path.exists("/app/frontend/dist"):
        print("[STARTUP] Frontend dist found, mounting static files...")
        from fastapi.staticfiles import StaticFiles
        from fastapi.responses import FileResponse

        # Serve static assets
        app.mount("/assets", StaticFiles(directory="/app/frontend/dist/assets"), name="static")

        # Serve index.html for all other routes (SPA support)
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            # Don't intercept API routes
            if full_path.startswith("routes/") or full_path.startswith("docs") or full_path.startswith("openapi"):
                return {"detail": "Not found"}

            # Serve index.html for all frontend routes
            return FileResponse("/app/frontend/dist/index.html")
        print("[STARTUP] Static files mounted")
    else:
        print("[STARTUP] No frontend dist found, skipping static files")

    print("[STARTUP] App creation complete!")
    return app


print("[STARTUP] Calling create_app()...")
app = create_app()
print("[STARTUP] App instance created successfully!")
