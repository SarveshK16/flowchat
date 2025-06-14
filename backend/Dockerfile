# ---- Stage 1: Builder ----
FROM python:3.10-slim-buster AS builder

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    libpq-dev \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

# Collect static files only if you need them
RUN python manage.py collectstatic --noinput

# ---- Stage 2: Final Image ----
FROM python:3.10-slim-buster

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app /app

EXPOSE 8000

RUN adduser --system --group appuser
USER appuser

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "core.wsgi:application"]
