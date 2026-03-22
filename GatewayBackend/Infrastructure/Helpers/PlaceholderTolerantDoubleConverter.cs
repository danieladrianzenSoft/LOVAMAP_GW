using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Infrastructure.Helpers
{
	public class PlaceholderTolerantDoubleConverter : JsonConverter<double>
	{
		public override double Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
		{
			if (reader.TokenType == JsonTokenType.Number)
			{
				return reader.GetDouble();
			}

			if (reader.TokenType == JsonTokenType.String)
			{
				var raw = reader.GetString()?.Trim();

				if (string.IsNullOrWhiteSpace(raw))
					return double.NaN;

				if (raw.Contains('<') && raw.Contains('>'))
					return double.NaN;

				if (double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
					return parsed;
			}

			if (reader.TokenType == JsonTokenType.Null)
				return double.NaN;

			throw new JsonException($"Unable to parse '{reader.GetString()}' as a number.");
		}

		public override void Write(Utf8JsonWriter writer, double value, JsonSerializerOptions options)
		{
			if (double.IsNaN(value) || double.IsInfinity(value))
			{
				writer.WriteNullValue();
				return;
			}

			writer.WriteNumberValue(value);
		}
	}
}
