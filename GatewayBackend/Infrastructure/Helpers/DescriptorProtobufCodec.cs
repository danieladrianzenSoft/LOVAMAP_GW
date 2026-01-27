using Google.Protobuf.WellKnownTypes;
using Google.Protobuf;
using Google.Protobuf.Reflection;
using Lovamap;
using Infrastructure.IHelpers;

namespace Infrastructure.Helpers
{
	public class DescriptorProtobufCodec : IDescriptorProtobufCodec
	{
		public string ProtobufToJson(byte[] data, bool compact = false)
		{
			var descriptors = Descriptors.Parser.ParseFrom(data);
			// Default formatter pretty-prints; you can control settings if needed
			var formatter = JsonFormatter.Default;

			return formatter.Format(descriptors);
		}

		public byte[] JsonToProtobuf(string json)
		{
			var parser = new JsonParser(JsonParser.Settings.Default);
			var descriptors = parser.Parse<Descriptors>(json);
			return descriptors.ToByteArray();
		}
	}
}