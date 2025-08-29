#!/bin/bash
# Build script for Claude Rust Tauri Image

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Default values
PUSH=false
TAG="claude-rust-tauri:latest"
REGISTRY=""
BASE_IMAGE="claude-base:latest"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH=true
            shift
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --base-image)
            BASE_IMAGE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--push] [--tag custom-tag] [--registry registry-url] [--base-image base-image-tag]"
            exit 1
            ;;
    esac
done

if [ -n "$REGISTRY" ]; then
    FULL_TAG="$REGISTRY/$TAG"
else
    FULL_TAG="$TAG"
fi

echo "Building Claude Rust Tauri Image..."
echo "Tag: $FULL_TAG"
echo "Base Image: $BASE_IMAGE"
echo "Push: $PUSH"

# Build the image
docker build \
    --build-arg BASE_IMAGE="$BASE_IMAGE" \
    -t "$FULL_TAG" \
    -f "$SCRIPT_DIR/Dockerfile" \
    "$SCRIPT_DIR"

echo "✓ Build completed: $FULL_TAG"

if [ "$PUSH" = true ]; then
    echo "Pushing to registry..."
    docker push "$FULL_TAG"
    echo "✓ Push completed"
fi