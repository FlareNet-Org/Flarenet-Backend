FROM clickhouse/clickhouse-server:latest

# Add basic configuration that matches your docker-compose settings
ENV CLICKHOUSE_USER=default
ENV CLICKHOUSE_PASSWORD=default
ENV CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1
ENV CLICKHOUSE_USER_ADMIN=admin
ENV CLICKHOUSE_PASSWORD_ADMIN=admin

# Configure ClickHouse for better stability
RUN mkdir -p /etc/clickhouse-server/config.d
COPY config-custom.xml /etc/clickhouse-server/config.d/

EXPOSE 8123 9000

# Healthcheck to verify ClickHouse is running
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8123/ping || exit 1
