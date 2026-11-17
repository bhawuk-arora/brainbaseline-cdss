FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specifications
COPY pyproject.toml /app/
COPY apps/api/requirements.txt /app/apps/api/

# Install python dependencies and root package
RUN pip install --no-cache-dir -r apps/api/requirements.txt
RUN pip install --no-cache-dir -e .

# Copy application code and reference data
COPY data /app/data
COPY packages /app/packages
COPY sim /app/sim
COPY apps/api /app/apps/api

EXPOSE 8000

CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
