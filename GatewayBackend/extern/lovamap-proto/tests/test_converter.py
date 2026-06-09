"""Tests for the converter shared utilities module."""

from lovamap_proto.converter import ensure_protobuf_available, get_descriptors_module


def test_ensure_protobuf_available():
    """Test that protobuf library can be imported."""
    json_format = ensure_protobuf_available()
    assert json_format is not None
    assert hasattr(json_format, "Parse")
    assert hasattr(json_format, "MessageToJson")


def test_get_descriptors_module():
    """Test that Descriptors_pb2 module can be imported."""
    Descriptors_pb2 = get_descriptors_module()
    assert Descriptors_pb2 is not None
    assert hasattr(Descriptors_pb2, "Descriptors")

    # Verify we can instantiate the message
    descriptors = Descriptors_pb2.Descriptors()
    assert descriptors is not None
