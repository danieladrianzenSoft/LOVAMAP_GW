cmake_minimum_required(VERSION 3.24)
project(lovamap-proto VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT TARGET protobuf::libprotobuf)
    find_package(protobuf REQUIRED)
endif()

set(PROTO_FILES
    schemas/Descriptors.proto
)

# Output directory for generated files
set(PROTO_OUTPUT_DIR ${CMAKE_CURRENT_BINARY_DIR}/lovamap-proto)
file(MAKE_DIRECTORY ${PROTO_OUTPUT_DIR})

# Create library first
add_library(lovamap-proto STATIC)

# Generate with explicit proto path to strip "schemas/"
protobuf_generate(
    TARGET lovamap-proto
    PROTOS ${PROTO_FILES}
    PROTOC_OUT_DIR ${PROTO_OUTPUT_DIR}
    IMPORT_DIRS ${CMAKE_CURRENT_SOURCE_DIR}/schemas  # This strips "schemas/" prefix
)

add_library(lovamap::proto ALIAS lovamap-proto)

# Include the build directory so users include "lovamap-proto/Descriptors.pb.h"
target_include_directories(lovamap-proto
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(lovamap-proto
    PUBLIC
        protobuf::libprotobuf
)
