
namespace Infrastructure.IHelpers
{
	public interface IDescriptorProtobufCodec
	{
		string ProtobufToJson(byte[] data, bool compact = false);
		byte[] JsonToProtobuf(string json);
	}

}
