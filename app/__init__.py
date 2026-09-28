import os
import sys

_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

_backend_app = os.path.join(_backend_dir, "app")
if _backend_app not in __path__:
    __path__.insert(0, _backend_app)
