"""Tests for pb2json CLI module."""

import pytest

from lovamap_proto.pb2json import protobuf_to_json


def test_protobuf_to_json_requires_valid_input(temp_json_file):
    """Test that invalid protobuf file raises SystemExit."""
    # Create an empty file (invalid protobuf)
    invalid_pb = temp_json_file.parent / "invalid.pb"
    invalid_pb.write_bytes(b"not a valid protobuf")

    with pytest.raises(SystemExit) as exc_info:
        protobuf_to_json(str(invalid_pb), str(temp_json_file))

    assert exc_info.value.code == 1


def test_protobuf_to_json_nonexistent_file():
    """Test that non-existent file raises SystemExit."""
    with pytest.raises(SystemExit) as exc_info:
        protobuf_to_json("nonexistent.pb", "output.json")

    assert exc_info.value.code == 1
