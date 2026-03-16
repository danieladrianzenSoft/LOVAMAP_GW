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

		public async Task<RdfGraphDto> GetGraphAsync(int? limit = null, CancellationToken ct = default)
		{
			var limitClause = limit.HasValue ? $"LIMIT {limit.Value}" : string.Empty;
			var sparql = $@"
				SELECT ?s ?p ?o WHERE {{
					?s ?p ?o .
				}}
				{limitClause}";

			var json = await _client.QueryAsync(sparql, ct);
			return ParseGraphResults(json);
		}

		public async Task<RdfOntologySummaryDto> GetOntologySummaryAsync(CancellationToken ct = default)
		{
			var summary = new RdfOntologySummaryDto();

			var classSparql = @"
				SELECT ?class (COUNT(?instance) AS ?count) WHERE {
					?instance a ?class .
				} GROUP BY ?class";

			var propertySparql = @"
				SELECT ?property (COUNT(*) AS ?usageCount) (SAMPLE(DATATYPE(?o)) AS ?datatype) WHERE {
					?s ?property ?o .
					FILTER(?property != <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>)
				} GROUP BY ?property";

			var countSparql = @"
				SELECT (COUNT(*) AS ?tripleCount) WHERE { ?s ?p ?o . }";

			var instanceCountSparql = @"
				SELECT (COUNT(DISTINCT ?s) AS ?instanceCount) WHERE {
					?s a ?class .
				}";

			var classJson = await _client.QueryAsync(classSparql, ct);
			var propertyJson = await _client.QueryAsync(propertySparql, ct);
			var countJson = await _client.QueryAsync(countSparql, ct);
			var instanceCountJson = await _client.QueryAsync(instanceCountSparql, ct);

			summary.Classes = ParseClassSummary(classJson);
			summary.Properties = await ParsePropertySummary(propertyJson, ct);
			summary.TotalTriples = ParseSingleCount(countJson, "tripleCount");
			summary.TotalInstances = ParseSingleCount(instanceCountJson, "instanceCount");

			return summary;
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

		private static RdfGraphDto ParseGraphResults(string json)
		{
			var graph = new RdfGraphDto();
			if (string.IsNullOrWhiteSpace(json))
			{
				return graph;
			}

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
			{
				return graph;
			}

			var nodeMap = new Dictionary<string, RdfGraphNodeDto>(StringComparer.Ordinal);
			var edgeSet = new HashSet<string>(StringComparer.Ordinal);
			var subjectTypes = new Dictionary<string, string>(StringComparer.Ordinal);

			const string rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

			// First pass: collect rdf:type info
			foreach (var binding in bindingsElement.EnumerateArray())
			{
				var (sVal, _, _) = GetBindingInfo(binding, "s");
				var (pVal, _, _) = GetBindingInfo(binding, "p");
				var (oVal, _, _) = GetBindingInfo(binding, "o");

				if (string.IsNullOrEmpty(sVal) || string.IsNullOrEmpty(pVal))
				{
					continue;
				}

				if (pVal == rdfType && !string.IsNullOrEmpty(oVal))
				{
					subjectTypes[sVal] = oVal;
				}
			}

			// Second pass: build nodes and edges
			foreach (var binding in bindingsElement.EnumerateArray())
			{
				var (sVal, sType, _) = GetBindingInfo(binding, "s");
				var (pVal, _, _) = GetBindingInfo(binding, "p");
				var (oVal, oType, oDatatype) = GetBindingInfo(binding, "o");

				if (string.IsNullOrEmpty(sVal) || string.IsNullOrEmpty(pVal) || string.IsNullOrEmpty(oVal))
				{
					continue;
				}

				// Ensure subject node exists
				if (!nodeMap.ContainsKey(sVal))
				{
					var subjectLabel = BuildNodeLabel(sVal, subjectTypes);
					nodeMap[sVal] = new RdfGraphNodeDto
					{
						Id = sVal,
						Label = subjectLabel,
						Type = "instance",
						Group = subjectTypes.TryGetValue(sVal, out var typeUri) ? ExtractLocalName(typeUri) : null
					};
				}

				if (pVal == rdfType)
				{
					// Class node
					if (!nodeMap.ContainsKey(oVal))
					{
						nodeMap[oVal] = new RdfGraphNodeDto
						{
							Id = oVal,
							Label = ExtractLocalName(oVal),
							Type = "class"
						};
					}

					AddEdge(graph, edgeSet, sVal, oVal, "rdf:type");
				}
				else if (oType == "uri" || oType == "bnode")
				{
					// URI or blank node object → separate node + edge
					if (!nodeMap.ContainsKey(oVal))
					{
						var objLabel = BuildNodeLabel(oVal, subjectTypes);
						nodeMap[oVal] = new RdfGraphNodeDto
						{
							Id = oVal,
							Label = objLabel,
							Type = "instance",
							Group = subjectTypes.TryGetValue(oVal, out var objType) ? ExtractLocalName(objType) : null
						};
					}

					AddEdge(graph, edgeSet, sVal, oVal, ExtractLocalName(pVal));
				}
				else
				{
					// Literal object
					if (IsNumericDatatype(oDatatype))
					{
						// Numeric → property on subject node
						var propName = ExtractLocalName(pVal);
						nodeMap[sVal].Properties[propName] = ParseNumericValue(oVal);
					}
					else
					{
						// String/other → shared literal node + edge
						var predLabel = ExtractLocalName(pVal);
						var literalNodeId = $"literal:{predLabel}:{oVal}";

						if (!nodeMap.ContainsKey(literalNodeId))
						{
							nodeMap[literalNodeId] = new RdfGraphNodeDto
							{
								Id = literalNodeId,
								Label = oVal,
								Type = "literal",
								Group = predLabel
							};
						}

						AddEdge(graph, edgeSet, sVal, literalNodeId, predLabel);
					}
				}
			}

			graph.Nodes = nodeMap.Values.ToList();
			return graph;
		}

		private static (string value, string type, string? datatype) GetBindingInfo(JsonElement binding, string key)
		{
			if (!binding.TryGetProperty(key, out var element))
			{
				return (string.Empty, string.Empty, null);
			}

			var value = element.TryGetProperty("value", out var v) ? v.GetString() ?? string.Empty : string.Empty;
			var type = element.TryGetProperty("type", out var t) ? t.GetString() ?? string.Empty : string.Empty;
			string? datatype = element.TryGetProperty("datatype", out var d) ? d.GetString() : null;

			return (value, type, datatype);
		}

		private static string ExtractLocalName(string uri)
		{
			var hashIndex = uri.LastIndexOf('#');
			if (hashIndex >= 0 && hashIndex < uri.Length - 1)
			{
				return uri[(hashIndex + 1)..];
			}

			var slashIndex = uri.LastIndexOf('/');
			if (slashIndex >= 0 && slashIndex < uri.Length - 1)
			{
				return uri[(slashIndex + 1)..];
			}

			return uri;
		}

		private static string BuildNodeLabel(string uri, Dictionary<string, string> subjectTypes)
		{
			var localName = ExtractLocalName(uri);
			if (subjectTypes.TryGetValue(uri, out var typeUri))
			{
				var typeName = ExtractLocalName(typeUri);
				return $"{typeName} {localName}";
			}

			return localName;
		}

		private static bool IsNumericDatatype(string? datatype)
		{
			if (string.IsNullOrEmpty(datatype))
			{
				return false;
			}

			return datatype == "http://www.w3.org/2001/XMLSchema#integer" ||
				   datatype == "http://www.w3.org/2001/XMLSchema#decimal" ||
				   datatype == "http://www.w3.org/2001/XMLSchema#double" ||
				   datatype == "http://www.w3.org/2001/XMLSchema#float" ||
				   datatype == "http://www.w3.org/2001/XMLSchema#int" ||
				   datatype == "http://www.w3.org/2001/XMLSchema#long" ||
				   datatype == "http://www.w3.org/2001/XMLSchema#short";
		}

		private static object? ParseNumericValue(string value)
		{
			if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var dec))
			{
				return dec;
			}

			return value;
		}

		private static void AddEdge(RdfGraphDto graph, HashSet<string> edgeSet, string source, string target, string label)
		{
			var key = $"{source}|{label}|{target}";
			if (edgeSet.Add(key))
			{
				graph.Edges.Add(new RdfGraphEdgeDto
				{
					Source = source,
					Target = target,
					Label = label
				});
			}
		}

		private static List<RdfClassSummaryDto> ParseClassSummary(string json)
		{
			var classes = new List<RdfClassSummaryDto>();
			if (string.IsNullOrWhiteSpace(json))
			{
				return classes;
			}

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
			{
				return classes;
			}

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (!TryGetValue(binding, "class", out var classUri))
				{
					continue;
				}

				var count = 0;
				if (TryGetValue(binding, "count", out var countStr))
				{
					int.TryParse(countStr, NumberStyles.Any, CultureInfo.InvariantCulture, out count);
				}

				classes.Add(new RdfClassSummaryDto
				{
					Uri = classUri,
					Label = ExtractLocalName(classUri),
					InstanceCount = count
				});
			}

			return classes;
		}

		private async Task<List<RdfPropertySummaryDto>> ParsePropertySummary(string json, CancellationToken ct)
		{
			var properties = new List<RdfPropertySummaryDto>();
			if (string.IsNullOrWhiteSpace(json))
			{
				return properties;
			}

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
			{
				return properties;
			}

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (!TryGetValue(binding, "property", out var propertyUri))
				{
					continue;
				}

				var usageCount = 0;
				if (TryGetValue(binding, "usageCount", out var countStr))
				{
					int.TryParse(countStr, NumberStyles.Any, CultureInfo.InvariantCulture, out usageCount);
				}

				TryGetValue(binding, "datatype", out var datatype);

				var distinctValues = new List<string>();
				if (!IsNumericDatatype(datatype))
				{
					distinctValues = await GetDistinctValuesForProperty(propertyUri, ct);
				}

				properties.Add(new RdfPropertySummaryDto
				{
					Uri = propertyUri,
					Label = ExtractLocalName(propertyUri),
					UsageCount = usageCount,
					Datatype = datatype,
					DistinctValues = distinctValues
				});
			}

			return properties;
		}

		private async Task<List<string>> GetDistinctValuesForProperty(string propertyUri, CancellationToken ct)
		{
			var sparql = $@"
				SELECT DISTINCT ?value WHERE {{
					?s <{propertyUri}> ?value .
					FILTER(isLiteral(?value))
				}}
				LIMIT 50";

			var json = await _client.QueryAsync(sparql, ct);
			var values = new List<string>();

			if (string.IsNullOrWhiteSpace(json))
			{
				return values;
			}

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
			{
				return values;
			}

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (TryGetValue(binding, "value", out var value))
				{
					values.Add(value);
				}
			}

			return values;
		}

		private static int ParseSingleCount(string json, string variableName)
		{
			if (string.IsNullOrWhiteSpace(json))
			{
				return 0;
			}

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
			{
				return 0;
			}

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (TryGetValue(binding, variableName, out var countStr) &&
					int.TryParse(countStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var count))
				{
					return count;
				}
			}

			return 0;
		}
	}
}
