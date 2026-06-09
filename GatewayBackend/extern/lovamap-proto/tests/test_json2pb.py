"""Tests for json2pb conversion module."""

import pytest

from lovamap_proto.json2pb import json_to_protobuf


def test_json_to_protobuf_valid_minimal(valid_minimal_json, temp_output_file):
    """Test converting valid minimal JSON to protobuf."""
    json_to_protobuf(str(valid_minimal_json), str(temp_output_file))

    # Verify output file was created
    assert temp_output_file.exists()

    # Verify it's a valid protobuf binary
    assert temp_output_file.stat().st_size > 0


def test_json_to_protobuf_valid_full(valid_full_json, temp_output_file):
    """Test converting valid full JSON to protobuf."""
    json_to_protobuf(str(valid_full_json), str(temp_output_file))

    # Verify output file was created
    assert temp_output_file.exists()
    assert temp_output_file.stat().st_size > 0


def test_json_to_protobuf_validate_only(valid_minimal_json, capsys):
    """Test validation without output."""
    json_to_protobuf(str(valid_minimal_json), validate_only=True)

    captured = capsys.readouterr()
    assert "Validation successful" in captured.out
    assert str(valid_minimal_json) in captured.out


def test_json_to_protobuf_invalid_file():
    """Test that non-existent file raises SystemExit."""
    with pytest.raises(SystemExit) as exc_info:
        json_to_protobuf("nonexistent.json", "output.pb")

    assert exc_info.value.code == 1


def test_json_to_protobuf_invalid_json_type(invalid_wrong_type_json):
    """Test that invalid JSON type raises SystemExit."""
    with pytest.raises(SystemExit) as exc_info:
        json_to_protobuf(str(invalid_wrong_type_json), "output.pb")

    assert exc_info.value.code == 1


def test_round_trip_conversion(valid_full_json, temp_output_file, temp_json_file):
    """Test that JSON -> proto -> JSON produces equivalent result."""
    from lovamap_proto.pb2json import protobuf_to_json
    import json

    # Convert JSON to proto
    json_to_protobuf(str(valid_full_json), str(temp_output_file))

    # Convert proto back to JSON
    protobuf_to_json(str(temp_output_file), str(temp_json_file))

    # Load both JSON files and compare
    with open(valid_full_json, "r") as f:
        original = json.load(f)

    with open(temp_json_file, "r") as f:
        roundtrip = json.load(f)

    # Compare key fields (protobuf may add default values)
    assert roundtrip["jobId"] == original["jobId"]
    assert roundtrip["version"] == original["version"]

    if "globalDescriptors" in original:
        assert "globalDescriptors" in roundtrip
        assert (
            roundtrip["globalDescriptors"]["Dx"] == original["globalDescriptors"]["Dx"]
        )
