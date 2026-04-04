# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM gradle:8-jdk17 AS builder
WORKDIR /app

# Copy source and build the executable fat jar.
# Tests are skipped — they run against H2 in CI, not during image build.
COPY . .
RUN chmod +x ./gradlew && \
    ./gradlew bootJar --no-daemon -x test && \
    cp $(find build/libs -name '*.jar' ! -name '*-plain.jar') build/libs/app.jar

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/app.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
