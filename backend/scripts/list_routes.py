import sys, os
os.environ.setdefault('SECRET_KEY', 'test-secret-key-for-dev-only')
os.environ.setdefault('DATABASE_URL', 'sqlite+aiosqlite:///./data/test_supportpilot.db')
sys.path.insert(0, '.')

from app.main import app
print('OK: FastAPI app created')
print('Routes:', len(app.routes))
for route in app.routes:
    if hasattr(route, 'path'):
        methods = getattr(route, 'methods', set())
        m = ",".join(methods) if methods else "MOUNT"
        print(f'  {m} {route.path}')
