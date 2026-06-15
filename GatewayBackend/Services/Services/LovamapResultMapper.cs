using System.Text.Json;
using Infrastructure.DTOs;

namespace Services.Services
{
	/// <summary>
	/// Maps LOVAMAP Core result JSON into scaffold descriptor DTOs.
	/// Handles naming discrepancies between LOVAMAP output keys and DescriptorType names.
	/// </summary>
	public static class LovamapResultMapper
	{
		// Keys in LOVAMAP output that differ from DescriptorType names
		private static readonly Dictionary<string, string> GlobalKeyMap = new()
		{
			{ "NumIntPaths", "NumPaths" },
			{ "MaxNumEquidistantParticles", "MaxNumEquidistParticles" },
		};

		private static readonly Dictionary<string, string> OtherKeyMap = new()
		{
			{ "TouchingParticle", "TouchingParticleCoord" },
		};

		// Keys to skip entirely (no matching DescriptorType)
		private static readonly HashSet<string> PoreKeysToSkip = new()
		{
		};

		private static readonly HashSet<string> OtherKeysToSkip = new()
		{
			"xParticleCOM",
			"yParticleCOM",
			"zParticleCOM",
		};

		/// <summary>
		/// Parses LOVAMAP result JSON and produces a ScaffoldToCreateDto
		/// with all descriptors mapped to their DescriptorType names.
		/// </summary>
		public static ScaffoldToCreateDto MapResultToScaffold(JsonDocument resultsJson, int replicateNumber = 1)
		{
			var root = resultsJson.RootElement;

			var globalDescriptors = new List<GlobalDescriptorToCreateDto>();
			var poreDescriptors = new List<PoreDescriptorToCreateDto>();
			var otherDescriptors = new List<OtherDescriptorToCreateDto>();

			// Map global descriptors (scalar values)
			if (root.TryGetProperty("globalDescriptors", out var globalEl))
			{
				foreach (var prop in globalEl.EnumerateObject())
				{
					var descriptorName = ResolveGlobalName(prop.Name);
					if (descriptorName == null) continue;

					globalDescriptors.Add(new GlobalDescriptorToCreateDto
					{
						Name = descriptorName,
						Value = ParseDouble(prop.Value)
					});
				}
			}

			// Map pore descriptors (array values)
			if (root.TryGetProperty("poreDescriptors", out var poreEl))
			{
				foreach (var prop in poreEl.EnumerateObject())
				{
					if (PoreKeysToSkip.Contains(prop.Name)) continue;

					var valuesArray = GetValuesArray(prop.Value);
					if (valuesArray == null) continue;

					poreDescriptors.Add(new PoreDescriptorToCreateDto
					{
						Name = prop.Name, // Pore keys are 1:1 (except skipped ones)
						Values = valuesArray
					});
				}
			}

			// Map other descriptors (array values)
			if (root.TryGetProperty("otherDescriptors", out var otherEl))
			{
				foreach (var prop in otherEl.EnumerateObject())
				{
					if (OtherKeysToSkip.Contains(prop.Name)) continue;

					var descriptorName = ResolveOtherName(prop.Name);

					var valuesArray = GetValuesArray(prop.Value);
					if (valuesArray == null) continue;

					otherDescriptors.Add(new OtherDescriptorToCreateDto
					{
						Name = descriptorName,
						Values = valuesArray
					});
				}
			}

			return new ScaffoldToCreateDto
			{
				ReplicateNumber = replicateNumber,
				GlobalDescriptors = globalDescriptors,
				PoreDescriptors = poreDescriptors,
				OtherDescriptors = otherDescriptors,
			};
		}

		/// <summary>
		/// Extracts the Dx value from LOVAMAP results.
		/// </summary>
		public static int GetDx(JsonDocument resultsJson)
		{
			var root = resultsJson.RootElement;
			if (root.TryGetProperty("globalDescriptors", out var globalEl) &&
				globalEl.TryGetProperty("Dx", out var dxEl))
			{
				return (int)ParseDouble(dxEl);
			}
			return 1; // default
		}

		/// <summary>
		/// Extracts particle diameter statistics from LOVAMAP results.
		/// </summary>
		public static (double Mean, double StdDev) GetParticleDiameterStats(JsonDocument resultsJson)
		{
			var root = resultsJson.RootElement;
			if (root.TryGetProperty("otherDescriptors", out var otherEl) &&
				otherEl.TryGetProperty("ParticleDiam", out var particleDiam) &&
				particleDiam.TryGetProperty("values", out var valuesEl))
			{
				var values = new List<double>();
				foreach (var v in valuesEl.EnumerateArray())
				{
					values.Add(ParseDouble(v));
				}

				if (values.Count > 0)
				{
					var mean = values.Average();
					var variance = values.Sum(v => (v - mean) * (v - mean)) / values.Count;
					var stdDev = Math.Sqrt(variance);
					return (mean, stdDev);
				}
			}
			return (0, 0);
		}

		private static string? ResolveGlobalName(string lovamapKey)
		{
			if (GlobalKeyMap.TryGetValue(lovamapKey, out var mapped))
				return mapped;
			return lovamapKey; // 1:1 by default
		}

		private static string ResolveOtherName(string lovamapKey)
		{
			if (OtherKeyMap.TryGetValue(lovamapKey, out var mapped))
				return mapped;
			return lovamapKey; // 1:1 by default
		}

		/// <summary>
		/// Extracts the "values" array from a descriptor object like { "values": [...] }
		/// and returns it as a JsonDocument. Returns null if the array is empty.
		/// Boolean arrays are converted to int arrays (true→1, false→0) for consistent storage.
		/// </summary>
		private static JsonDocument? GetValuesArray(JsonElement descriptorObject)
		{
			if (descriptorObject.TryGetProperty("values", out var valuesEl) &&
				valuesEl.ValueKind == JsonValueKind.Array)
			{
				// Skip empty arrays
				if (valuesEl.GetArrayLength() == 0)
					return null;

				// Check if this is a boolean array and convert to int (0/1)
				var firstElement = valuesEl.EnumerateArray().FirstOrDefault();
				if (firstElement.ValueKind == JsonValueKind.True || firstElement.ValueKind == JsonValueKind.False)
				{
					var intValues = valuesEl.EnumerateArray()
						.Select(v => v.ValueKind == JsonValueKind.True ? 1 : 0)
						.ToArray();
					var json = JsonSerializer.Serialize(intValues);
					return JsonDocument.Parse(json);
				}

				return JsonDocument.Parse(valuesEl.GetRawText());
			}
			return null;
		}

		/// <summary>
		/// Builds pore domain metadata JSON from LOVAMAP results for 3D visualization.
		/// Output: { "ids": [0,1,...], "metadata": { "0": { volume, surfArea, charLength, avgDoorDiam, largestDoorDiam, edge }, ... } }
		/// </summary>
		public static JsonDocument? BuildPoreDomainMetadata(JsonDocument resultsJson)
		{
			var root = resultsJson.RootElement;
			if (!root.TryGetProperty("poreDescriptors", out var poreEl))
				return null;

			var volumes = GetDoubleArray(poreEl, "Volume");
			var surfAreas = GetDoubleArray(poreEl, "SA");
			var charLengths = GetDoubleArray(poreEl, "CharacteristicLength");
			var avgDoorDiams = GetDoubleArray(poreEl, "AvgInternalDiam");
			var largestDoorDiams = GetDoubleArray(poreEl, "LargestDoorDiam");
			var isInterior = GetBoolArray(poreEl, "IsInterior");

			if (volumes == null) return null;

			var count = volumes.Length;
			var ids = new int[count];
			for (int i = 0; i < count; i++) ids[i] = i;

			var metadata = new Dictionary<string, object>();
			for (int i = 0; i < count; i++)
			{
				var poreData = new Dictionary<string, object>
				{
					["volume"] = volumes[i],
					["surfArea"] = surfAreas != null && i < surfAreas.Length ? surfAreas[i] : 0,
					["charLength"] = charLengths != null && i < charLengths.Length ? charLengths[i] : 0,
					["avgDoorDiam"] = avgDoorDiams != null && i < avgDoorDiams.Length ? avgDoorDiams[i] : 0,
					["largestDoorDiam"] = largestDoorDiams != null && i < largestDoorDiams.Length ? largestDoorDiams[i] : 0,
					["edge"] = isInterior != null && i < isInterior.Length ? (isInterior[i] ? 0 : 1) : 1,
				};
				metadata[i.ToString()] = poreData;
			}

			var result = new Dictionary<string, object>
			{
				["ids"] = ids,
				["metadata"] = metadata,
			};

			var json = JsonSerializer.Serialize(result);
			return JsonDocument.Parse(json);
		}

		/// <summary>
		/// Builds particle domain metadata JSON from LOVAMAP results.
		/// Output: { "id_to_index": { "0": 0, "1": 1, ... } }
		/// </summary>
		public static JsonDocument? BuildParticleDomainMetadata(JsonDocument resultsJson)
		{
			var root = resultsJson.RootElement;
			if (!root.TryGetProperty("otherDescriptors", out var otherEl) ||
				!otherEl.TryGetProperty("ParticleDiam", out var particleDiam) ||
				!particleDiam.TryGetProperty("values", out var valuesEl) ||
				valuesEl.ValueKind != JsonValueKind.Array)
				return null;

			var count = valuesEl.GetArrayLength();
			if (count == 0) return null;

			var idToIndex = new Dictionary<string, int>();
			for (int i = 0; i < count; i++)
			{
				idToIndex[i.ToString()] = i;
			}

			var result = new Dictionary<string, object>
			{
				["id_to_index"] = idToIndex,
			};

			var json = JsonSerializer.Serialize(result);
			return JsonDocument.Parse(json);
		}

		/// <summary>
		/// Parses a JsonElement as a double, handling both Number and String types.
		/// </summary>
		private static double ParseDouble(JsonElement el)
		{
			if (el.ValueKind == JsonValueKind.Number)
				return el.GetDouble();
			if (el.ValueKind == JsonValueKind.String &&
				double.TryParse(el.GetString(), System.Globalization.NumberStyles.Float,
					System.Globalization.CultureInfo.InvariantCulture, out var d))
				return d;
			return 0;
		}

		/// <summary>
		/// Extracts a double[] from a pore descriptor like { "DescriptorName": { "values": [1.2, 3.4] } }
		/// </summary>
		private static double[]? GetDoubleArray(JsonElement poreEl, string key)
		{
			if (!poreEl.TryGetProperty(key, out var descriptor) ||
				!descriptor.TryGetProperty("values", out var valuesEl) ||
				valuesEl.ValueKind != JsonValueKind.Array)
				return null;

			var count = valuesEl.GetArrayLength();
			if (count == 0) return null;

			var result = new double[count];
			int i = 0;
			foreach (var v in valuesEl.EnumerateArray())
			{
				result[i++] = ParseDouble(v);
			}
			return result;
		}

		/// <summary>
		/// Extracts a bool[] from a pore descriptor like { "IsInterior": { "values": [true, false] } }
		/// Also handles int arrays where 1=true, 0=false.
		/// </summary>
		private static bool[]? GetBoolArray(JsonElement poreEl, string key)
		{
			if (!poreEl.TryGetProperty(key, out var descriptor) ||
				!descriptor.TryGetProperty("values", out var valuesEl) ||
				valuesEl.ValueKind != JsonValueKind.Array)
				return null;

			var count = valuesEl.GetArrayLength();
			if (count == 0) return null;

			var result = new bool[count];
			int i = 0;
			foreach (var v in valuesEl.EnumerateArray())
			{
				if (v.ValueKind == JsonValueKind.True || v.ValueKind == JsonValueKind.False)
					result[i] = v.GetBoolean();
				else if (v.ValueKind == JsonValueKind.Number)
					result[i] = v.GetInt32() != 0;
				i++;
			}
			return result;
		}
	}
}
