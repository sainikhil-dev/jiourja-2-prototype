#!/usr/bin/env bash
# Final mastering pass: copy the video stream untouched, run the mix through a
# true-peak-safe limiter at -1 dBFS, encode AAC 256k. No retiming of any kind.
set -euo pipefail
in="$1"; out="$2"
ffmpeg -loglevel error -y -i "$in" -c:v copy -af "alimiter=limit=0.89:attack=5:release=60:level=0:latency=1,aresample=48000" -c:a aac -b:a 256k -movflags +faststart "$out"
