# Use official lightweight Python image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project source code
COPY . /app/

# Expose port
EXPOSE 8000

# Run collectstatic at build time if SECRET_KEY dummy exists
RUN python manage.py collectstatic --noinput

# Run production WSGI server
CMD exec gunicorn server.wsgi:application --bind 0.0.0.0:${PORT} --workers 3 --timeout 120 --access-logfile - --error-logfile -
