#!/usr/bin/env python3
"""
Shared utilities for protobuf conversion tools.
"""

import sys
from pathlib import Path

# Import error messages
PROTOBUF_IMPORT_ERROR = """Error: protobuf package is not installed.
Install it with: pip install protobuf
Or install this package with: pipx install lovamap-proto-tools"""

GENERATED_CODE_ERROR = """Error: Generated protobuf Python code not found.

You need to compile the proto file first:
  protoc --python_out=. -I schemas schemas/Descriptors.proto

This will generate Descriptors_pb2.py in the current directory.

Make sure you run this command from the lovamap-proto directory,
and run the conversion tools from the same directory."""


def ensure_protobuf_available():
    """
    Ensure protobuf library is available.

    Returns:
        The json_format module from google.protobuf

    Raises:
        SystemExit: If protobuf is not installed
    """
    try:
        from google.protobuf import json_format

        return json_format
    except ImportError:
        print(PROTOBUF_IMPORT_ERROR, file=sys.stderr)
        sys.exit(1)


def get_descriptors_module():
    """
    Import and return the generated Descriptors_pb2 module.

    Returns:
        The Descriptors_pb2 module

    Raises:
        SystemExit: If the generated module is not found
    """
    # Add current working directory to path
    cwd = Path.cwd()
    if str(cwd) not in sys.path:
        sys.path.insert(0, str(cwd))

    try:
        from lovamap_proto import Descriptors_pb2

        return Descriptors_pb2
    except ImportError:
        print(GENERATED_CODE_ERROR, file=sys.stderr)
        sys.exit(1)
