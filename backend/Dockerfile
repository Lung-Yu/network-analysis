# Stage 1: Base image with dependencies
FROM python:3.9-slim

# Install Suricata, tshark, sudo and other necessary tools
#hadolint ignore=DL3008
RUN apt-get update && apt-get install -y \
    suricata \
    tshark \
    procps \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Update Suricata rules
#hadolint ignore=DL3008
RUN suricata-update

# Set up working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app /app/app

# Create a non-root user and grant sudo permissions for suricata
RUN useradd -m appuser && \
    usermod -aG sudo appuser && \
    echo 'appuser ALL=(ALL) NOPASSWD: /usr/bin/suricata' >> /etc/sudoers

# Grant permissions to the log and config directories
RUN mkdir -p /var/log/suricata && chown -R appuser:appuser /var/log/suricata
RUN chown -R appuser:appuser /etc/suricata

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8000