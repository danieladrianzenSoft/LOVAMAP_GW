using System.Text.Json;
using System.Text.Json.Serialization;

namespace Infrastructure.Helpers
{
	public class FlexibleBoolConverter : JsonConverter<bool>
	{
		public override bool Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
		{
			if (reader.TokenType == JsonTokenType.True)
				return true;

			if (reader.TokenType == JsonTokenType.False)
				return false;

			if (reader.TokenType == JsonTokenType.String)
			{
				var raw = reader.GetString()?.Trim();
				if (bool.TryParse(raw, out var parsed))
					return parsed;
			}

			throw new JsonException("Unable to parse boolean value.");
		}

		public override void Write(Utf8JsonWriter writer, bool value, JsonSerializerOptions options)
		{
			writer.WriteBooleanValue(value);
		}
	}
}
