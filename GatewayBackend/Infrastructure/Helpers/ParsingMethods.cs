using System.Text.Json;

namespace Infrastructure.Helpers
{
	public static class ParsingMethods
	{
		public static string JsonDocumentToString(JsonDocument jsonDocument)
		{
			if (jsonDocument == null)
				return "N/A";

			try
			{
				var root = jsonDocument.RootElement;

				// Ensure the JSON is an array
				if (root.ValueKind != JsonValueKind.Array)
					return "N/A";

				// Check if it's an array of numbers (single-column format)
				if (root.EnumerateArray().All(e => e.ValueKind == JsonValueKind.Number))
				{
					var values = root.EnumerateArray()
									.Select(e => e.GetDouble().ToString())
									.ToList();
					return string.Join(", ", values);
				}

				// Check if it's an array of objects with "id" and "value" keys (two-column format)
				if (root.EnumerateArray().All(e =>
						e.ValueKind == JsonValueKind.Object &&
						e.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.String &&
						e.TryGetProperty("value", out var valueProp) && valueProp.ValueKind == JsonValueKind.Number))
				{
					var values = root.EnumerateArray()
									.Select(e => $"{e.GetProperty("id").GetString()}, {e.GetProperty("value").GetDouble()}")
									.ToList();
					return string.Join("; ", values); // Separate rows with "; "
				}

				return "N/A"; // If format is unexpected
			}
			catch (JsonException)
			{
				return "N/A"; // Handle JSON parsing errors
			}
			catch (Exception)
			{
				return "N/A"; // Handle any unexpected errors
			}
		}
	}
}