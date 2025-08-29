#!/bin/bash
# Build script for Claude Base Image
# Usage: ./build.sh [--push] [--tag custom-tag]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Default values
PUSH=false
TAG="claude-base:latest"
REGISTRY=""

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
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--push] [--tag custom-tag] [--registry registry-url]"
            exit 1
            ;;
    esac
done

if [ -n "$REGISTRY" ]; then
    FULL_TAG="$REGISTRY/$TAG"
else
    FULL_TAG="$TAG"
fi

echo "Building Claude Base Image..."
echo "Tag: $FULL_TAG"
echo "Push: $PUSH"

# Get git user info if available
GIT_USER_NAME=$(git config --global user.name 2>/dev/null || echo "")
GIT_USER_EMAIL=$(git config --global user.email 2>/dev/null || echo "")

# Build the image
docker build \
    --build-arg GIT_USER_NAME="$GIT_USER_NAME" \
    --build-arg GIT_USER_EMAIL="$GIT_USER_EMAIL" \
    --build-arg USER_UID="$(id -u)" \
    --build-arg USER_GID="$(id -g)" \
    -t "$FULL_TAG" \
    -f "$SCRIPT_DIR/Dockerfile" \
    "$PROJECT_ROOT"

echo "✓ Build completed: $FULL_TAG"

if [ "$PUSH" = true ]; then
    echo "Pushing to registry..."
    docker push "$FULL_TAG"
    echo "✓ Push completed"
fi