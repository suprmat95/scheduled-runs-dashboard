"""Django settings for the Cargoful automation-monitoring backend."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Kept simple for the exercise — do not use this in production.
SECRET_KEY = "dev-only-not-secret-change-me"
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    # Local
    "automations",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Cache framework. Explicit in-process (local-memory) backend for the exercise.
#
# The application code talks only to Django's cache API (caches["default"]), so
# it's backend-agnostic: swapping to a shared store is config-only, no code
# changes. For a multi-worker deployment, replace BACKEND with a Redis backend,
# e.g.
#     "BACKEND": "django.core.cache.backends.redis.RedisCache",
#     "LOCATION": "redis://127.0.0.1:6379",
# which also makes cache invalidation effective across workers: with LocMemCache
# each process has its own cache, so a write on one worker only clears that
# worker's copy; a shared Redis store is cleared once for all of them.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "cargoful-automations",
        "TIMEOUT": 300,  # default entry lifetime (seconds); overridable per call
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    # Paginate list endpoints so responses stay bounded at high row counts.
    # Clients get {count, next, previous, results} and page via ?page= / ?page_size=.
    "DEFAULT_PAGINATION_CLASS": "config.pagination.DefaultPagination",
    "PAGE_SIZE": 50,
}

# No auth required for the exercise: allow the React dev server.
CORS_ALLOW_ALL_ORIGINS = True
