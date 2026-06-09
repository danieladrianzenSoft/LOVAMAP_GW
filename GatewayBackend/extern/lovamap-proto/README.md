# lovamap-proto

Protocol Buffer definitions for lovamap project.

## Using as a Git Submodule

### 1. Add as submodule in your main project

```bash
git submodule add <your-repo-url> extern/lovamap-proto
git submodule update --init --recursive
```

### 2. In your main project's CMakeLists.txt

```cmake
# Add the submodule
add_subdirectory(extern/lovamap-proto)

# Link against your target
target_link_libraries(your_target
    PRIVATE
        lovamap::proto
)
```

### 3. Use in your C++ code

```cpp
#include "Descriptors.pb.h"

lovamap::Descriptors descriptors;
descriptors.set_job_id("job123");
descriptors.set_version("1.0");

auto* global_desc = descriptors.add_global_descriptors();
global_desc->set_name("example");
global_desc->set_int_value(42);
```

## Alternative Dependency Methods

### Option 1: Git Submodule (Current approach)
**Pros:**
- Simple integration
- Version control tracks exact commit
- No external dependency manager needed

**Cons:**
- Requires manual updates
- All users need to remember `git submodule update`

### Option 2: CMake FetchContent
Add to your main project's CMakeLists.txt:

```cmake
include(FetchContent)

FetchContent_Declare(
    lovamap-proto
    GIT_REPOSITORY <your-repo-url>
    GIT_TAG main  # or specific version tag
)

FetchContent_MakeAvailable(lovamap-proto)

target_link_libraries(your_target PRIVATE lovamap::proto)
```

**Pros:**
- Automatic fetching
- Easier version management
- Cleaner repository (no submodule clutter)

**Cons:**
- Downloads every configure (can use CPM.cmake to cache)
- Less control over exact version

### Option 3: Install and find_package
Install this library system-wide:

```bash
mkdir build && cd build
cmake ..
cmake --build .
sudo cmake --install .
```

Then in your main project:

```cmake
find_package(lovamap-proto REQUIRED)
target_link_libraries(your_target PRIVATE lovamap::proto)
```

**Pros:**
- Clean separation
- Shared between projects
- Professional approach

**Cons:**
- Requires installation step
- Version management per machine

## Requirements

- CMake 3.20 or higher
- Protocol Buffers compiler and libraries
- C++17 compatible compiler

## Building Standalone

```bash
mkdir build && cd build
cmake ..
cmake --build .
```

## Python Tools

### Bidirectional Conversion: Protobuf ↔ JSON

Command-line tools are provided to convert between binary protobuf files and JSON format in both directions.

#### Option 1: For Developers

If you're developing or contributing to this project:

1. **Install uv** (modern Python package manager):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Setup development environment**:
   ```bash
   cd /path/to/lovamap-proto

   # Generate Python bindings
   protoc --python_out=. -I schemas schemas/Descriptors.proto

   # Install dependencies and tools
   uv sync
   uv tool install .
   ```

3. **Use the tools**:
   ```bash
   lvmp-pb2json input.pb output.json
   lvmp-json2pb input.json output.pb
   ```

#### Option 2: For End Users (setup.sh)

Run the automated setup script to install all dependencies:

```bash
cd /path/to/lovamap-proto
./setup.sh
```

The script will:
- Install `pipx` (if not already installed)
- Install `protoc` (Protocol Buffer compiler)
- Generate Python bindings from the proto file
- Install the `lvmp-pb2json` and `lvmp-json2pb` conversion tools

**Options:**
```bash
./setup.sh --dry-run    # Preview what would be installed
./setup.sh --verbose    # Show detailed output
./setup.sh --help       # Show all options
```

#### Option 3: Manual Installation (pipx)

If you prefer to install manually with pipx:

1. Install `pipx` if you don't have it:
   ```bash
   # macOS
   brew install pipx
   pipx ensurepath

   # Linux
   python3 -m pip install --user pipx
   python3 -m pipx ensurepath
   ```

2. Install the Protocol Buffer compiler (`protoc`):

   **macOS:**
   ```bash
   brew install protobuf
   ```

   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt-get install protobuf-compiler
   ```

3. Install the proto-to-json tool with pipx:
   ```bash
   pipx install /path/to/lovamap-proto
   ```

4. Generate Python bindings from the proto file (one-time setup):
   ```bash
   cd /path/to/lovamap-proto
   protoc --python_out=. -I src src/Descriptors.proto
   ```

   This creates `Descriptors_pb2.py` in the root directory.

#### Usage: Protobuf to JSON

Once installed, the `lvmp-pb2json` command is available globally:

```bash
# Convert to JSON and print to stdout
lvmp-pb2json input.pb

# Convert to JSON file
lvmp-pb2json input.pb output.json

# Compact JSON output (no pretty-printing)
lvmp-pb2json input.pb output.json --compact
```

**Note:** Run `lvmp-pb2json` from the lovamap-proto directory (where `Descriptors_pb2.py` is located).

#### Usage: JSON to Protobuf

The `lvmp-json2pb` command converts JSON files back to protobuf binary format:

```bash
# Convert JSON to protobuf binary and print to stdout
lvmp-json2pb input.json

# Convert JSON to protobuf binary file
lvmp-json2pb input.json output.pb

# Validate JSON without converting
lvmp-json2pb input.json --validate
```

**JSON Format:**
The input JSON must conform to the Descriptors.proto schema. Example:

```json
{
  "jobId": "job123",
  "version": "1.0",
  "globalDescriptors": {
    "Dx": 1.5,
    "NumVoxels": 1000,
    "NumParticles": 50
  },
  "poreDescriptors": {
    "Volume": {
      "values": [1.0, 2.0, 3.0]
    }
  }
}
```

**Note:** Run `lvmp-json2pb` from the lovamap-proto directory (where `Descriptors_pb2.py` is located).

#### Alternative: Manual Installation

If you prefer not to use pipx:

1. Install dependencies:
   ```bash
   pip install protobuf
   ```

2. Generate Python bindings:
   ```bash
   protoc --python_out=. -I src src/Descriptors.proto
   ```

3. Run the script directly:
   ```bash
   python proto_to_json.py input.pb output.json
   ```
