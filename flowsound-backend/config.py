import os
import socket


def _lan_addresses() -> list:
    """Best-effort list of this machine's LAN IPv4 addresses."""
    if os.environ.get("CORS_ALLOW_LAN", "1").lower() not in ("1", "true", "yes"):
        return []
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("8.8.8.8", 80))
        primary = probe.getsockname()[0]
        probe.close()
        return [primary]
    except Exception:
        return []


class Config:
    HOST = os.environ.get("FLOWSOUND_HOST", "127.0.0.1")
    PORT = int(os.environ.get("FLOWSOUND_PORT", "5000"))
    DEBUG = os.environ.get("FLOWSOUND_DEBUG", "0").lower() in ("1", "true", "yes")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://127.0.0.1:3000")
    CORS_LAN_PORTS = os.environ.get("CORS_LAN_PORTS", "3000").split(",")

    @staticmethod
    def cors_origins() -> list:
        """Frontend origins the API is allowed to answer.

        Always the canonical FRONTEND_URL plus any machine LAN addresses on the
        frontend dev ports, plus anything explicitly listed in
        EXTRA_FRONTEND_ORIGINS (comma-separated). In production set
        FRONTEND_URL and CORS_ALLOW_LAN=0 / EXTRA_FRONTEND_ORIGINS to pin the
        exact allowlist.
        """
        origins = [Config.FRONTEND_URL]
        for port in Config.CORS_LAN_PORTS:
            port = port.strip()
            if not port:
                continue
            for address in _lan_addresses():
                origins.append(f"http://{address}:{port}")
        for extra in os.environ.get("EXTRA_FRONTEND_ORIGINS", "").split(","):
            extra = extra.strip()
            if extra:
                origins.append(extra)
        # Alias 127.0.0.1 → localhost so the app also works when the dev
        # server is opened at http://localhost:3000 (the default URL npm/next
        # prints), not just http://127.0.0.1:3000.
        aliased = []
        for origin in origins:
            aliased.append(origin)
            if origin.startswith("http://127.0.0.1:"):
                aliased.append(origin.replace("http://127.0.0.1:", "http://localhost:", 1))
        return list(dict.fromkeys(aliased))