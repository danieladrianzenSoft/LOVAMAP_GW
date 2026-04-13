#!/usr/bin/env python3
"""
Convert JSON files to protobuf binary format.

This script reads a JSON file conforming to the Descriptors.proto
schema and converts it to binary protobuf format.
"""

import sys
import argparse

from .converter import ensure_protobuf_available, get_descriptors_module


def json_to_protobuf(
    input_file: str, output_file: str = None, validate_only: bool = False
) -> None:
    """
    Convert a JSON file to protobuf binary.

    Args:
        input_file: Path to the input JSON file
        output_file: Path to the output protobuf binary file (optional)
        validate_only: If True, only validate without writing output
    """
    json_format = ensure_protobuf_available()
    Descriptors_pb2 = get_descriptors_module()

    # Read the JSON file
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            json_data = f.read()
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading input file: {e}", file=sys.stderr)
        sys.exit(1)

    # Parse JSON into protobuf message
    descriptors = Descriptors_pb2.Descriptors()
    try:
        json_format.Parse(json_data, descriptors)
    except json_format.ParseError as e:
        print(f"Error: JSON validation failed: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        sys.exit(1)

    if validate_only:
        print(f"Validation successful: '{input_file}' is valid Descriptors JSON")
        return

    # Serialize to binary
    try:
        binary_data = descriptors.SerializeToString()
    except Exception as e:
        print(f"Error serializing to protobuf: {e}", file=sys.stderr)
        sys.exit(1)

    # Write output
    if output_file:
        try:
            with open(output_file, "wb") as f:
                f.write(binary_data)
            print(f"Successfully converted '{input_file}' to '{output_file}'")
        except Exception as e:
            print(f"Error writing output file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Write binary to stdout
        sys.stdout.buffer.write(binary_data)


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="Convert JSON files to protobuf binary format.",
        epilog="Example: lvmp-json2pb input.json output.pb",
    )
    parser.add_argument("input_file", help="Path to the input JSON file")
    parser.add_argument(
        "output_file",
        nargs="?",
        help="Path to the output protobuf binary file (optional, writes to stdout if not specified)",
    )
    parser.add_argument(
        "--validate", action="store_true", help="Validate JSON without writing output"
    )

    args = parser.parse_args()

    json_to_protobuf(args.input_file, args.output_file, validate_only=args.validate)


if __name__ == "__main__":
    main()
