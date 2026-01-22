FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone whisper.cpp
RUN git clone https://github.com/ggerganov/whisper.cpp.git .

# Build with disabled FP16 vector arithmetic (not supported in Docker VM)
RUN cmake -B build \
    -DGGML_CPU_ARM_ARCH=armv8-a \
    -DGGML_NATIVE=OFF \
    && cmake --build build --config Release -j$(nproc)

# Copy binaries to /app root
RUN cp build/bin/* . 2>/dev/null || true

EXPOSE 8080

CMD ["./whisper-server", "--host", "0.0.0.0", "--port", "8080"]
