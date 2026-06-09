#!/bin/bash
#
# Setup script for lovamap-proto-tools
# Installs dependencies and sets up the Python conversion tool
#

set -Eeuo pipefail

# Script directory detection
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

# Configuration
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# Detect color support
# Colors are disabled if:
# - stdout is not a terminal (e.g., piped to file)
# - TERM is "dumb" (no color support)
# - NO_COLOR environment variable is set (https://no-color.org/)
if [[ -t 1 ]] && [[ "${TERM:-}" != "dumb" ]] && [[ -z "${NO_COLOR:-}" ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly BLUE='\033[0;34m'
    readonly NC='\033[0m' # No Color
else
    readonly RED=''
    readonly GREEN=''
    readonly YELLOW=''
    readonly BLUE=''
    readonly NC=''
fi

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "[DEBUG] $*" >&2
    fi
}

# Run command (supports dry-run)
run_cmd() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would execute: $*"
        return 0
    fi

    log_debug "Executing: $*"
    "$@"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" &>/dev/null
}

# Install uv
install_uv() {
    if command_exists uv; then
        local version
        version=$(uv --version 2>/dev/null || echo "unknown")
        log_success "uv is already installed: $version"
        return 0
    fi

    log_info "Installing uv..."

    # UV has a universal installer script that works on all platforms
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would execute: curl -LsSf https://astral.sh/uv/install.sh | sh"
        return 0
    fi

    if ! command_exists curl; then
        log_error "curl is required but not installed"
        return 1
    fi

    # Download and run the UV installer
    if curl -LsSf https://astral.sh/uv/install.sh | sh; then
        log_success "uv installed successfully"
        log_warn "You may need to restart your shell or run: source ~/.bashrc (or ~/.zshrc)"

        # Try to add UV to current PATH for this session
        if [[ -d "$HOME/.cargo/bin" ]]; then
            export PATH="$HOME/.cargo/bin:$PATH"
        fi

        return 0
    else
        log_error "uv installation failed"
        return 1
    fi
}

# Install protoc
install_protoc() {
    local os
    os=$(detect_os)

    if command_exists protoc; then
        local version
        version=$(protoc --version 2>/dev/null || echo "unknown")
        log_success "protoc is already installed: $version"
        return 0
    fi

    log_info "Installing Protocol Buffer compiler (protoc)..."

    case "$os" in
        macos)
            if ! command_exists brew; then
                log_error "Homebrew is required but not installed"
                log_error "Install Homebrew from: https://brew.sh"
                return 1
            fi
            run_cmd brew install protobuf
            ;;
        linux)
            if command_exists apt-get; then
                log_info "Using apt-get to install protobuf-compiler"
                log_warn "This may require sudo privileges"
                run_cmd sudo apt-get update
                run_cmd sudo apt-get install -y protobuf-compiler
            elif command_exists yum; then
                log_info "Using yum to install protobuf-compiler"
                log_warn "This may require sudo privileges"
                run_cmd sudo yum install -y protobuf-compiler
            else
                log_error "Unable to install protoc automatically"
                log_error "Please install protobuf-compiler manually"
                return 1
            fi
            ;;
        *)
            log_error "Unsupported operating system: $OSTYPE"
            return 1
            ;;
    esac

    if [[ "$DRY_RUN" == "false" ]]; then
        if command_exists protoc; then
            local version
            version=$(protoc --version)
            log_success "protoc installed successfully: $version"
        else
            log_error "protoc installation failed"
            return 1
        fi
    fi

    return 0
}

# Generate Python bindings
generate_bindings() {
    local proto_file="$SCRIPT_DIR/schemas/Descriptors.proto"
    local output_file="$SCRIPT_DIR/Descriptors_pb2.py"

    if [[ ! -f "$proto_file" ]]; then
        log_error "Proto file not found: $proto_file"
        return 1
    fi

    if [[ -f "$output_file" ]]; then
        log_success "Python bindings already exist: $output_file"
        log_info "Regenerating to ensure they're up to date..."
    else
        log_info "Generating Python bindings from proto file..."
    fi

    if ! command_exists protoc; then
        log_error "protoc not found. Please install it first."
        return 1
    fi

    run_cmd protoc --python_out=. -I schemas schemas/Descriptors.proto

    if [[ "$DRY_RUN" == "false" ]]; then
        if [[ -f "$output_file" ]]; then
            log_success "Python bindings generated: $output_file"
        else
            log_error "Failed to generate Python bindings"
            return 1
        fi
    fi

    return 0
}

# Install the Python tool
install_tool() {
    if ! command_exists uv; then
        log_error "uv not found. Please install it first."
        return 1
    fi

    log_info "Installing lovamap-proto-tools with uv..."

    # Check if already installed
    if uv tool list 2>/dev/null | grep -q "lovamap-proto-tools"; then
        log_warn "lovamap-proto-tools is already installed"
        log_info "Reinstalling to ensure it's up to date..."
        run_cmd uv tool install --force "$SCRIPT_DIR"
    else
        run_cmd uv tool install "$SCRIPT_DIR"
    fi

    if [[ "$DRY_RUN" == "false" ]]; then
        if command_exists lvmp-pb2json; then
            log_success "lovamap-proto-tools installed successfully"
            log_success "Command 'lvmp-pb2json' is now available"
        else
            log_error "Installation succeeded but command not found"
            log_error "You may need to restart your shell or add uv tools to your PATH"
            return 1
        fi
    fi

    return 0
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."

    local all_good=true

    # Check uv
    if command_exists uv; then
        local version
        version=$(uv --version)
        log_success "✅ uv is installed: $version"
    else
        log_error "❌ uv is not installed"
        all_good=false
    fi

    # Check protoc
    if command_exists protoc; then
        local version
        version=$(protoc --version)
        log_success "✅ protoc is installed: $version"
    else
        log_error "❌ protoc is not installed"
        all_good=false
    fi

    # Check Python bindings
    if [[ -f "$SCRIPT_DIR/Descriptors_pb2.py" ]]; then
        log_success "✅ Python bindings generated"
    else
        log_error "❌ Python bindings not found"
        all_good=false
    fi

    # Check pb2json tool
    if command_exists lvmp-pb2json; then
        log_success "🚀 lvmp-pb2json command is available"
    else
        log_error "❌ lvmp-pb2json command not found"
        all_good=false
    fi

    # Check json2pb tool
    if command_exists lvmp-json2pb; then
        log_success "🚀 lvmp-json2pb command is available"
    else
        log_error "❌ lvmp-json2pb command not found"
        all_good=false
    fi

    if [[ "$all_good" == "true" ]]; then
        log_success "All checks passed!"
        return 0
    else
        log_error "Some checks failed"
        return 1
    fi
}

# Display usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Setup script for lovamap-proto-tools. Installs all dependencies and sets up
the Python conversion tool.

Options:
    -d, --dry-run       Show what would be done without executing
    -v, --verbose       Enable verbose output
    -h, --help          Show this help message

Components installed:
    - uv (Fast Python package manager)
    - protoc (Protocol Buffer compiler)
    - lovamap-proto-tools (Python conversion tool)
    - Python bindings from Descriptors.proto

Example:
    $0                  # Run full setup
    $0 --dry-run        # Preview what would be installed
    $0 --verbose        # Show detailed output

EOF
    exit "${1:-0}"
}

# Main function
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -d|--dry-run)
                DRY_RUN=true
                log_warn "DRY RUN MODE - No changes will be made"
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage 1
                ;;
        esac
    done

    log_info "Starting lovamap-proto-tools setup..."
    log_info "OS detected: $(detect_os)"

    # Install components
    install_uv || exit 1
    install_protoc || exit 1
    generate_bindings || exit 1
    install_tool || exit 1
    verify_installation || exit 1
    log_success "Setup complete!"
    log_info "You can now use the tool:"
    log_info "  lvmp-pb2json input.pb output.json"
    log_info "Run from the directory containing Descriptors_pb2.py (usually this repo root)"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "This was a DRY RUN - no changes were made"
        log_info "Run without --dry-run to perform actual installation"
    fi
}

# Run main
main "$@"
