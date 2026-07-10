# Dev-oriented image for the Django backend.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install deps first so they're cached across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code (shadowed by the bind mount under docker-compose, but kept so the
# image also runs standalone).
COPY . .

EXPOSE 8000

# Migrate, seed only if the DB is empty (preserves data across restarts), then
# serve. Bind 0.0.0.0 so the port is reachable from outside the container.
CMD ["sh", "-c", "python manage.py migrate && python manage.py seed --if-empty && python manage.py runserver 0.0.0.0:8000"]
