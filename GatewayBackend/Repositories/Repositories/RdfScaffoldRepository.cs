using System.Globalization;
using System.Text.Json;
using Infrastructure.DTOs;
using Infrastructure.IHelpers;
using Repositories.IRepositories;

namespace Repositories.Repositories
{
	public sealed class RdfScaffoldRepository : IRdfScaffoldRepository
	{
		private readonly IFusekiClient _client;

		public RdfScaffoldRepository(IFusekiClient client)
		{
			_client = client;
		}

		public Task<string> GetScaffoldsRawAsync(
			IDictionary<string, string>? filters = null,
			CancellationToken ct = default)
		{
			var sparql = BuildScaffoldQueryFiltered(filters);
			return _client.QueryAsync(sparql, ct);
		}

		public async Task<List<RdfScaffoldMeasurementDto>> GetScaffoldsAsync(
			IDictionary<string, string>? filters = null,
			CancellationToken ct = default)
		{
			var sparql = BuildScaffoldQueryFiltered(filters);
			var json = await _client.QueryAsync(sparql, ct);
			return ParseScaffoldResults(json);
		}

		public async Task AddScaffoldAsync(RdfScaffoldCreateDto scaffold, CancellationToken ct = default)
		{
			if (scaffold.ScaffoldId <= 0)
			{
				throw new ArgumentException("ScaffoldId must be positive.", nameof(scaffold.ScaffoldId));
			}

			if (string.IsNullOrWhiteSpace(scaffold.ParticleShape))
			{
				throw new ArgumentException("ParticleShape is required.", nameof(scaffold.ParticleShape));
			}

			if (scaffold.ParticleSizeUm <= 0)
			{
				throw new ArgumentException("ParticleSizeUm must be positive.", nameof(scaffold.ParticleSizeUm));
			}

			var scaffoldUri = $"https://lovamap.com/scaffold/{scaffold.ScaffoldId}";
			var insertTriples = BuildInsertTriples(scaffoldUri, scaffold);

			var sparql = $@"
				PREFIX ex: <https://lovamap.com/ontology#>
				INSERT DATA {{
				{insertTriples}}}";

			await _client.UpdateAsync(sparql, ct);
		}

		public async Task UpdateScaffoldAsync(
			int scaffoldId,
			RdfScaffoldCreateDto scaffold,
			CancellationToken ct = default)
		{
			if (scaffoldId <= 0)
			{
				throw new ArgumentException("scaffoldId must be positive.", nameof(scaffoldId));
			}

			if (string.IsNullOrWhiteSpace(scaffold.ParticleShape))
			{
				throw new ArgumentException("ParticleShape is required.", nameof(scaffold.ParticleShape));
			}

			if (scaffold.ParticleSizeUm <= 0)
			{
				throw new ArgumentException("ParticleSizeUm must be positive.", nameof(scaffold.ParticleSizeUm));
			}

			var scaffoldUri = $"https://lovamap.com/scaffold/{scaffoldId}";
			var insertTriples = BuildInsertTriples(scaffoldUri, scaffold);

			var sparql = $@"
				PREFIX ex: <https://lovamap.com/ontology#>
				DELETE WHERE {{ <{scaffoldUri}> ?p ?o . }};
				INSERT DATA {{
				{insertTriples}}}";

			await _client.UpdateAsync(sparql, ct);
		}

		public async Task DeleteScaffoldAsync(int scaffoldId, CancellationToken ct = default)
		{
			if (scaffoldId <= 0)
			{
				throw new ArgumentException("scaffoldId must be positive.", nameof(scaffoldId));
			}

			var scaffoldUri = $"https://lovamap.com/scaffold/{scaffoldId}";
			var sparql = $@"
				DELETE WHERE {{
				<{scaffoldUri}> ?p ?o .
			}}";

			await _client.UpdateAsync(sparql, ct);
		}

		public Task<string> GetAllScaffoldsRawAsync(CancellationToken ct = default)
		{
			var sparql = @"
			PREFIX ex: <https://lovamap.com/ontology#>
			CONSTRUCT {
				?s ?p ?o .
			}
			WHERE {
				?s a ex:Scaffold .
				?s ?p ?o .
			}";

			return _client.QueryRawAsync(sparql, "text/turtle", ct);
		}

		public async Task<List<RdfScaffoldAllDto>> GetAllScaffoldsAsync(CancellationToken ct = default)
		{
			var sparql = @"
				PREFIX ex: <https://lovamap.com/ontology#>
				SELECT ?s ?particleShape ?particleSizeUm ?voidVolumeFraction ?bioMeasurementX ?bioMeasurementY WHERE {
				?s a ex:Scaffold .
				OPTIONAL { ?s ex:particleShape ?particleShape . }
				OPTIONAL { ?s ex:particleSizeUm ?particleSizeUm . }
				OPTIONAL { ?s ex:voidVolumeFraction ?voidVolumeFraction . }
				OPTIONAL { ?s ex:bioMeasurementX ?bioMeasurementX . }
				OPTIONAL { ?s ex:bioMeasurementY ?bioMeasurementY . }
			}";

			var json = await _client.QueryAsync(sparql, ct);
			return ParseAllScaffoldsResults(json);
		}

		private static string BuildScaffoldQueryFiltered(IDictionary<string, string>? filters)
		{
			var filterTriples = BuildFilterTriples(filters);
			return $@"
				PREFIX ex: <https://lovamap.com/ontology#>
				SELECT ?s ?particleShape ?particleSizeUm ?voidVolumeFraction ?bioMeasurementX ?bioMeasurementY WHERE {{
				?s a ex:Scaffold .
				{filterTriples}  ?s ex:voidVolumeFraction ?voidVolumeFraction .
				?s ex:bioMeasurementX ?bioMeasurementX .
				OPTIONAL {{ ?s ex:particleShape ?particleShape . }}
				OPTIONAL {{ ?s ex:particleSizeUm ?particleSizeUm . }}
				OPTIONAL {{ ?s ex:bioMeasurementY ?bioMeasurementY . }}
			}}";
		}

		private static string BuildInsertTriples(string scaffoldUri, RdfScaffoldCreateDto scaffold)
		{
			var bioYTriple = scaffold.BioMeasurementY.HasValue
				? $"  <{scaffoldUri}> ex:bioMeasurementY {FormatDecimal(scaffold.BioMeasurementY.Value)} .\n"
				: string.Empty;

			return
				$"  <{scaffoldUri}> a ex:Scaffold .\n" +
				$"  <{scaffoldUri}> ex:particleShape {ToLiteral(scaffold.ParticleShape)} .\n" +
				$"  <{scaffoldUri}> ex:particleSizeUm {scaffold.ParticleSizeUm} .\n" +
				$"  <{scaffoldUri}> ex:voidVolumeFraction {FormatDecimal(scaffold.VoidVolumeFraction)} .\n" +
				$"  <{scaffoldUri}> ex:bioMeasurementX {FormatDecimal(scaffold.BioMeasurementX)} .\n" +
				bioYTriple;
		}

		private static string BuildFilterTriples(IDictionary<string, string>? filters)
		{
			if (filters == null || filters.Count == 0)
			{
				return string.Empty;
			}

			var lines = new List<string>();
			foreach (var pair in filters)
			{
				if (!TryBuildFilterTriple(pair.Key, pair.Value, out var line))
				{
					throw new KeyNotFoundException($"Unknown filter property '{pair.Key}'.");
				}

				lines.Add(line);
			}

			return string.Join("\n", lines) + "\n";
		}

		private static bool TryBuildFilterTriple(string property, string rawValue, out string line)
		{
			line = string.Empty;
			if (string.IsNullOrWhiteSpace(property))
			{
				return false;
			}

			if (rawValue == null)
			{
				return false;
			}

			switch (property)
			{
				case "particleShape":
					line = $"  ?s ex:particleShape {ToLiteral(rawValue)} .";
					return true;
				case "particleSizeUm":
					if (!int.TryParse(rawValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var size))
					{
						throw new ArgumentException("particleSizeUm must be an integer.");
					}
					line = $"  ?s ex:particleSizeUm {size} .";
					return true;
				case "voidVolumeFraction":
					line = $"  ?s ex:voidVolumeFraction {ParseDecimalLiteral(rawValue, "voidVolumeFraction")} .";
					return true;
				case "bioMeasurementX":
					line = $"  ?s ex:bioMeasurementX {ParseDecimalLiteral(rawValue, "bioMeasurementX")} .";
					return true;
				case "bioMeasurementY":
					line = $"  ?s ex:bioMeasurementY {ParseDecimalLiteral(rawValue, "bioMeasurementY")} .";
					return true;
				default:
					return false;
			}
		}

		private static string ParseDecimalLiteral(string rawValue, string fieldName)
		{
			if (!decimal.TryParse(rawValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var value))
			{
				throw new ArgumentException($"{fieldName} must be a decimal number.");
			}

			return FormatDecimal(value);
		}

		private static List<RdfScaffoldAllDto> ParseAllScaffoldsResults(string json)
		{
			var results = new Dictionary<string, RdfScaffoldAllDto>(StringComparer.OrdinalIgnoreCase);
			if (string.IsNullOrWhiteSpace(json))
			{
				return new List<RdfScaffoldAllDto>();
			}

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
			{
				return new List<RdfScaffoldAllDto>();
			}

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (!TryGetValue(binding, "s", out var scaffoldUri))
				{
					continue;
				}

				if (!results.TryGetValue(scaffoldUri, out var dto))
				{
					dto = new RdfScaffoldAllDto { ScaffoldUri = scaffoldUri };
					results[scaffoldUri] = dto;
				}

				if (TryGetValue(binding, "particleShape", out var particleShape))
				{
					dto.ParticleShape = particleShape;
				}

				if (TryGetValue(binding, "particleSizeUm", out var particleSizeUm) &&
					int.TryParse(particleSizeUm, NumberStyles.Any, CultureInfo.InvariantCulture, out var size))
				{
					dto.ParticleSizeUm = size;
				}

				if (TryGetValue(binding, "voidVolumeFraction", out var voidValue) &&
					decimal.TryParse(voidValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var voidFraction))
				{
					dto.VoidVolumeFraction = voidFraction;
				}

				if (TryGetValue(binding, "bioMeasurementX", out var bioXValue) &&
					decimal.TryParse(bioXValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var bioX))
				{
					dto.BioMeasurementX = bioX;
				}

				if (TryGetValue(binding, "bioMeasurementY", out var bioYValue) &&
					decimal.TryParse(bioYValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var bioY))
				{
					dto.BioMeasurementY = bioY;
				}
			}

			return results.Values.ToList();
		}

		private static List<RdfScaffoldMeasurementDto> ParseScaffoldResults(string json)
		{
			var results = new List<RdfScaffoldMeasurementDto>();
			if (string.IsNullOrWhiteSpace(json))
			{
				return results;
			}

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
			{
				return results;
			}

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (!TryGetValue(binding, "s", out var scaffoldUri) ||
					!TryGetValue(binding, "voidVolumeFraction", out var voidValue) ||
					!TryGetValue(binding, "bioMeasurementX", out var bioValue))
				{
					continue;
				}

				if (!decimal.TryParse(voidValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var voidFraction))
				{
					continue;
				}

				if (!decimal.TryParse(bioValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var bioX))
				{
					continue;
				}

				var dto = new RdfScaffoldMeasurementDto
				{
					ScaffoldUri = scaffoldUri,
					VoidVolumeFraction = voidFraction,
					BioMeasurementX = bioX
				};

				if (TryGetValue(binding, "particleShape", out var particleShape))
				{
					dto.ParticleShape = particleShape;
				}

				if (TryGetValue(binding, "particleSizeUm", out var particleSizeUm) &&
					int.TryParse(particleSizeUm, NumberStyles.Any, CultureInfo.InvariantCulture, out var size))
				{
					dto.ParticleSizeUm = size;
				}

				if (TryGetValue(binding, "bioMeasurementY", out var bioYValue) &&
					decimal.TryParse(bioYValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var bioY))
				{
					dto.BioMeasurementY = bioY;
				}

				results.Add(dto);
			}

			return results;
		}

		private static bool TryGetValue(JsonElement binding, string key, out string value)
		{
			value = string.Empty;
			if (!binding.TryGetProperty(key, out var element) ||
				!element.TryGetProperty("value", out var valueElement))
			{
				return false;
			}

			value = valueElement.GetString() ?? string.Empty;
			return !string.IsNullOrWhiteSpace(value);
		}

		private static string ToLiteral(string value)
		{
			var escaped = value.Replace("\\", "\\\\").Replace("\"", "\\\"");
			return $"\"{escaped}\"";
		}

		private static string FormatDecimal(decimal value)
		{
			return value.ToString("0.#############################", CultureInfo.InvariantCulture);
		}
	}
}
