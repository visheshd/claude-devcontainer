#!/bin/bash
# Master build script for all Claude DevContainer images
# Builds all Docker images in the correct dependency order

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default options
FORCE_REBUILD=false
NO_CACHE=""
PARALLEL_BUILD=false
SELECTED_IMAGES=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if image exists
image_exists() {
    docker images -q "$1" >/dev/null 2>&1
}

# Function to build a single image
build_image() {
    local image_dir="$1"
    local image_name="$2"
    local base_image="$3"
    
    print_status "Building $image_name..."
    
    # Check if image already exists and force rebuild is not set
    if [ "$FORCE_REBUILD" != true ] && image_exists "$image_name"; then
        print_warning "$image_name already exists. Use --rebuild to force rebuild."
        return 0
    fi
    
    # Change to image directory
    cd "$SCRIPT_DIR/dockerfiles/$image_dir"
    
    # Build arguments
    build_args=""
    if [ -n "$base_image" ]; then
        build_args="--base-image $base_image"
    fi
    
    # Run the build script
    if ./build.sh $build_args $NO_CACHE; then
        print_success "✓ Built $image_name"
    else
        print_error "✗ Failed to build $image_name"
        return 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --rebuild         Force rebuild all images (ignore existing)"
    echo "  --no-cache        Build without using Docker cache"
    echo "  --parallel        Build stack images in parallel (after base)"
    echo "  --images <list>   Build only specific images (comma-separated)"
    echo "                    Available: claude-base,python-ml,rust-tauri,nextjs"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Build all images"
    echo "  $0 --rebuild                 # Force rebuild all images"
    echo "  $0 --images claude-base      # Build only base image"
    echo "  $0 --images python-ml,nextjs # Build specific images"
    echo "  $0 --parallel --no-cache     # Fast parallel build without cache"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --parallel)
            PARALLEL_BUILD=true
            shift
            ;;
        --images)
            SELECTED_IMAGES="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

echo "========================================"
echo "Claude DevContainer Image Builder"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Determine which images to build
if [ -n "$SELECTED_IMAGES" ]; then
    IFS=',' read -ra IMAGES_TO_BUILD <<< "$SELECTED_IMAGES"
else
    IMAGES_TO_BUILD=("claude-base" "python-ml" "rust-tauri" "nextjs")
fi

print_status "Images to build: ${IMAGES_TO_BUILD[*]}"
print_status "Force rebuild: $FORCE_REBUILD"
print_status "Use cache: $([ -n "$NO_CACHE" ] && echo "No" || echo "Yes")"
print_status "Parallel build: $PARALLEL_BUILD"
echo ""

# Build claude-base first (required by all others)
if [[ " ${IMAGES_TO_BUILD[*]} " =~ " claude-base " ]]; then
    print_status "=== Building Foundation Image ==="
    if ! build_image "claude-base" "claude-base:latest" ""; then
        print_error "Failed to build claude-base. Cannot continue."
        exit 1
    fi
    echo ""
fi

# Build stack images
STACK_IMAGES=()
for image in "${IMAGES_TO_BUILD[@]}"; do
    case $image in
        "python-ml")
            STACK_IMAGES+=("python-ml:claude-python-ml:latest")
            ;;
        "rust-tauri")
            STACK_IMAGES+=("rust-tauri:claude-rust-tauri:latest")
            ;;
        "nextjs")
            STACK_IMAGES+=("nextjs:claude-nextjs:latest")
            ;;
    esac
done

if [ ${#STACK_IMAGES[@]} -gt 0 ]; then
    print_status "=== Building Stack Images ==="
    
    if [ "$PARALLEL_BUILD" = true ] && [ ${#STACK_IMAGES[@]} -gt 1 ]; then
        print_status "Building stack images in parallel..."
        
        # Start builds in background
        pids=()
        for stack_def in "${STACK_IMAGES[@]}"; do
            IFS=':' read -r dir_name image_name <<< "$stack_def"
            (
                print_status "Starting parallel build of $image_name..."
                if build_image "$dir_name" "$image_name" "claude-base:latest"; then
                    print_success "✓ Parallel build completed: $image_name"
                else
                    print_error "✗ Parallel build failed: $image_name"
                    exit 1
                fi
            ) &
            pids+=($!)
        done
        
        # Wait for all builds to complete
        failed=false
        for pid in "${pids[@]}"; do
            if ! wait $pid; then
                failed=true
            fi
        done
        
        if [ "$failed" = true ]; then
            print_error "One or more parallel builds failed"
            exit 1
        fi
        
    else
        # Sequential build
        for stack_def in "${STACK_IMAGES[@]}"; do
            IFS=':' read -r dir_name image_name <<< "$stack_def"
            if ! build_image "$dir_name" "$image_name" "claude-base:latest"; then
                exit 1
            fi
            echo ""
        done
    fi
fi

echo "========================================"
print_success "All requested images built successfully!"
echo "========================================"

# Show built images
echo ""
print_status "Built images:"
for image in "${IMAGES_TO_BUILD[@]}"; do
    case $image in
        "claude-base")
            if image_exists "claude-base:latest"; then
                print_success "  ✓ claude-base:latest"
            fi
            ;;
        "python-ml")
            if image_exists "claude-python-ml:latest"; then
                print_success "  ✓ claude-python-ml:latest"
            fi
            ;;
        "rust-tauri")
            if image_exists "claude-rust-tauri:latest"; then
                print_success "  ✓ claude-rust-tauri:latest"
            fi
            ;;
        "nextjs")
            if image_exists "claude-nextjs:latest"; then
                print_success "  ✓ claude-nextjs:latest"
            fi
            ;;
    esac
done

echo ""
print_status "Next steps:"
echo "  1. Test images: docker run -it <image-name> --help"
echo "  2. Generate DevContainer config: claude-devcontainer init"
echo "  3. Open in VS Code: 'Dev Containers: Reopen in Container'"