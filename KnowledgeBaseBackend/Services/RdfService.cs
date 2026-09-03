using System.Globalization;
using System.Text.Json;
using KnowledgeBaseApi.DTOs;
using KnowledgeBaseApi.Helpers;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace KnowledgeBaseApi.Services
{
	public sealed class RdfService : IRdfService
	{
		private readonly IFusekiClient _client;
		private readonly IMemoryCache _cache;
		private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);

		// Shared token: cancel to evict all cached ontology data at once
		private static CancellationTokenSource _cacheEvictionSource = new();

		private const string Prefixes = @"
			PREFIX lova:   <https://lovamap.com/ontology#>
			PREFIX dc:     <http://purl.org/dc/terms/>
			PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
			PREFIX schema: <https://schema.org/>
			PREFIX rdfs:   <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX xsd:    <http://www.w3.org/2001/XMLSchema#>
		";

		public RdfService(IFusekiClient client, IMemoryCache cache)
		{
			_client = client;
			_cache = cache;
		}

		/// <summary>Called by DataSeeder after loading new data to flush all cached results.</summary>
		public static void InvalidateCache()
		{
			_cacheEvictionSource.Cancel();
			_cacheEvictionSource.Dispose();
			_cacheEvictionSource = new CancellationTokenSource();
		}

		private MemoryCacheEntryOptions CacheOptions() => new MemoryCacheEntryOptions()
			.SetAbsoluteExpiration(CacheDuration)
			.AddExpirationToken(new CancellationChangeToken(_cacheEvictionSource.Token));

		// ── Entity queries (cached) ──

		public Task<List<PaperDto>> GetPapersAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("papers", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchPapersAsync(ct);
			})!;

		public Task<List<AuthorDto>> GetAuthorsAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("authors", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchAuthorsAsync(ct);
			})!;

		public Task<List<JournalDto>> GetJournalsAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("journals", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchJournalsAsync(ct);
			})!;

		public Task<List<MaterialDto>> GetMaterialsAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("materials", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchMaterialsAsync(ct);
			})!;

		public Task<List<ExperimentDto>> GetExperimentsAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("experiments", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchExperimentsAsync(ct);
			})!;

		public Task<List<OutcomeDto>> GetOutcomesAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("outcomes", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchOutcomesAsync(ct);
			})!;

		public Task<List<FabricationMethodDto>> GetFabricationMethodsAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("fabrication-methods", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchFabricationMethodsAsync(ct);
			})!;

		public Task<List<GeometryProfileDto>> GetGeometryProfilesAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("geometry-profiles", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchGeometryProfilesAsync(ct);
			})!;

		// ── Fetch methods (hit Fuseki) ──

		private async Task<List<PaperDto>> FetchPapersAsync(CancellationToken ct)
		{
			var sparql = Prefixes + @"
				SELECT ?s ?title ?doi ?year ?journal ?journalTitle ?paperType ?focusMaterial ?hasLabData ?author ?authorName WHERE {
					?s a lova:Paper .
					OPTIONAL { ?s dc:title ?title . }
					OPTIONAL { ?s dc:identifier ?doi . }
					OPTIONAL { ?s dc:date ?year . }
					OPTIONAL { ?s schema:isPartOf ?journal .
					           OPTIONAL { ?journal dc:title ?journalTitle . } }
					OPTIONAL { ?s lova:paperType ?paperType . }
					OPTIONAL { ?s lova:focusMaterial ?focusMaterial . }
					OPTIONAL { ?s lova:hasLabData ?hasLabData . }
					OPTIONAL { ?s dc:creator ?author .
					           OPTIONAL { ?author foaf:name ?authorName . } }
				}";

			var json = await _client.QueryAsync(sparql, ct);
			var bindings = ParseBindings(json);
			var map = new Dictionary<string, PaperDto>(StringComparer.Ordinal);

			foreach (var b in bindings)
			{
				var uri = GetStr(b, "s");
				if (uri == null) continue;

				if (!map.TryGetValue(uri, out var dto))
				{
					dto = new PaperDto
					{
						Uri = uri,
						Title = GetStr(b, "title") ?? "",
						Doi = GetStr(b, "doi") ?? "",
						Year = GetStr(b, "year"),
						JournalUri = GetStr(b, "journal"),
						JournalTitle = GetStr(b, "journalTitle"),
						PaperType = GetStr(b, "paperType"),
						FocusMaterial = GetStr(b, "focusMaterial"),
						HasLabData = GetBool(b, "hasLabData"),
					};
					map[uri] = dto;
				}

				var authorUri = GetStr(b, "author");
				if (authorUri != null && !dto.AuthorUris.Contains(authorUri))
				{
					dto.AuthorUris.Add(authorUri);
					var authorName = GetStr(b, "authorName");
					if (authorName != null)
						dto.AuthorNames.Add(authorName);
				}
			}

			return map.Values.ToList();
		}

		private async Task<List<AuthorDto>> FetchAuthorsAsync(CancellationToken ct)
		{
			var sparql = Prefixes + @"
				SELECT ?s ?familyName ?givenName ?name ?affiliation WHERE {
					?s a lova:Author .
					OPTIONAL { ?s foaf:familyName ?familyName . }
					OPTIONAL { ?s foaf:givenName ?givenName . }
					OPTIONAL { ?s foaf:name ?name . }
					OPTIONAL { ?s schema:affiliation ?affiliation . }
				}";

			var json = await _client.QueryAsync(sparql, ct);
			var bindings = ParseBindings(json);
			var map = new Dictionary<string, AuthorDto>(StringComparer.Ordinal);

			foreach (var b in bindings)
			{
				var uri = GetStr(b, "s");
				if (uri == null || map.ContainsKey(uri)) continue;

				map[uri] = new AuthorDto
				{
					Uri = uri,
					FamilyName = GetStr(b, "familyName"),
					GivenName = GetStr(b, "givenName"),
					Name = GetStr(b, "name"),
					Affiliation = GetStr(b, "affiliation"),
				};
			}

			return map.Values.ToList();
		}

		private async Task<List<JournalDto>> FetchJournalsAsync(CancellationToken ct)
		{
			var sparql = Prefixes + @"
				SELECT ?s ?title WHERE {
					?s a lova:Journal .
					OPTIONAL { ?s dc:title ?title . }
				}";

			var json = await _client.QueryAsync(sparql, ct);
			var bindings = ParseBindings(json);
			var map = new Dictionary<string, JournalDto>(StringComparer.Ordinal);

			foreach (var b in bindings)
			{
				var uri = GetStr(b, "s");
				if (uri == null || map.ContainsKey(uri)) continue;

				map[uri] = new JournalDto
				{
					Uri = uri,
					Title = GetStr(b, "title") ?? "",
				};
			}

			return map.Values.ToList();
		}

		private async Task<List<MaterialDto>> FetchMaterialsAsync(CancellationToken ct)
		{
			var sparql = Prefixes + @"
				SELECT ?s ?label ?paper ?shape ?mat ?sizeMin ?sizeMax ?sizeUnit
				       ?sizeDist ?stiffness ?fab ?geo ?packing ?poreSize WHERE {
					?s a lova:Material .
					OPTIONAL { ?s rdfs:label ?label . }
					OPTIONAL { ?s lova:describedIn ?paper . }
					OPTIONAL { ?s lova:particleShape ?shape . }
					OPTIONAL { ?s lova:particleMaterial ?mat . }
					OPTIONAL { ?s lova:particleSizeMin ?sizeMin . }
					OPTIONAL { ?s lova:particleSizeMax ?sizeMax . }
					OPTIONAL { ?s lova:particleSizeUnit ?sizeUnit . }
					OPTIONAL { ?s lova:sizeDistribution ?sizeDist . }
					OPTIONAL { ?s lova:stiffnessQualitative ?stiffness . }
					OPTIONAL { ?s lova:hasFabricationMethod ?fab . }
					OPTIONAL { ?s lova:hasGeometryProfile ?geo . }
					OPTIONAL { ?s lova:packingConfiguration ?packing . }
					OPTIONAL { ?s lova:reportedPoreSize ?poreSize . }
				}";

			var json = await _client.QueryAsync(sparql, ct);
			var bindings = ParseBindings(json);
			var map = new Dictionary<string, MaterialDto>(StringComparer.Ordinal);

			foreach (var b in bindings)
			{
				var uri = GetStr(b, "s");
				if (uri == null || map.ContainsKey(uri)) continue;

				map[uri] = new MaterialDto
				{
					Uri = uri,
					Label = GetStr(b, "label") ?? "",
					PaperUri = GetStr(b, "paper"),
					ParticleShape = GetStr(b, "shape"),
					ParticleMaterial = GetStr(b, "mat"),
					ParticleSizeMin = GetDouble(b, "sizeMin"),
					ParticleSizeMax = GetDouble(b, "sizeMax"),
					ParticleSizeUnit = GetStr(b, "sizeUnit"),
					SizeDistribution = GetStr(b, "sizeDist"),
					StiffnessQualitative = GetStr(b, "stiffness"),
					FabricationMethodUri = GetStr(b, "fab"),
					GeometryProfileUri = GetStr(b, "geo"),
					PackingConfiguration = GetStr(b, "packing"),
					ReportedPoreSize = GetStr(b, "poreSize"),
				};
			}

			return map.Values.ToList();
		}

		private async Task<List<ExperimentDto>> FetchExperimentsAsync(CancellationToken ct)
		{
			var sparql = Prefixes + @"
				SELECT ?s ?label ?paper ?category ?type ?assay ?cellType ?cellSource
				       ?duration ?equipment ?temp ?material WHERE {
					?s a lova:Experiment .
					OPTIONAL { ?s rdfs:label ?label . }
					OPTIONAL { ?s lova:describedIn ?paper . }
					OPTIONAL { ?s lova:experimentCategory ?category . }
					OPTIONAL { ?s lova:experimentType ?type . }
					OPTIONAL { ?s lova:assayOrMethod ?assay . }
					OPTIONAL { ?s lova:cellType ?cellType . }
					OPTIONAL { ?s lova:cellSource ?cellSource . }
					OPTIONAL { ?s lova:cultureDuration ?duration . }
					OPTIONAL { ?s lova:equipment ?equipment . }
					OPTIONAL { ?s lova:temperature ?temp . }
					OPTIONAL { ?s lova:usedMaterial ?material . }
				}";

			var json = await _client.QueryAsync(sparql, ct);
			var bindings = ParseBindings(json);
			var map = new Dictionary<string, ExperimentDto>(StringComparer.Ordinal);

			foreach (var b in bindings)
			{
				var uri = GetStr(b, "s");
				if (uri == null) continue;

				if (!map.TryGetValue(uri, out var dto))
				{
					dto = new ExperimentDto
					{
						Uri = uri,
						Label = GetStr(b, "label") ?? "",
						PaperUri = GetStr(b, "paper"),
						ExperimentCategory = GetStr(b, "category"),
						ExperimentType = GetStr(b, "type"),
						AssayOrMethod = GetStr(b, "assay"),
						CellType = GetStr(b, "cellType"),
						CellSource = GetStr(b, "cellSource"),
						CultureDuration = GetStr(b, "duration"),
						Equipment = GetStr(b, "equipment"),
						Temperature = GetStr(b, "temp"),
					};
					map[uri] = dto;
				}

				var matUri = GetStr(b, "material");
				if (matUri != null && !dto.UsedMaterialUris.Contains(matUri))
					dto.UsedMaterialUris.Add(matUri);
			}

			return map.Values.ToList();
		}

		private async Task<List<OutcomeDto>> FetchOutcomesAsync(CancellationToken ct)
		{
			var sparql = Prefixes + @"
				SELECT ?s ?label ?paper ?experiment ?measCat ?measType ?value ?unit
				       ?scope ?significant ?direction ?comparedTo ?dataSource WHERE {
					?s a lova:Outcome .
					OPTIONAL { ?s rdfs:label ?label . }
					OPTIONAL { ?s lova:describedIn ?paper . }
					OPTIONAL { ?s lova:fromExperiment ?experiment . }
					OPTIONAL { ?s lova:measurementCategory ?measCat . }
					OPTIONAL { ?s lova:measurementType ?measType . }
					OPTIONAL { ?s lova:value ?value . }
					OPTIONAL { ?s lova:unit ?unit . }
					OPTIONAL { ?s lova:scope ?scope . }
					OPTIONAL { ?s lova:significant ?significant . }
					OPTIONAL { ?s lova:direction ?direction . }
					OPTIONAL { ?s lova:comparedTo ?comparedTo . }
					OPTIONAL { ?s lova:dataSource ?dataSource . }
				}";

			var json = await _client.QueryAsync(sparql, ct);
			var bindings = ParseBindings(json);
			var map = new Dictionary<string, OutcomeDto>(StringComparer.Ordinal);

			foreach (var b in bindings)
			{
				var uri = GetStr(b, "s");
				if (uri == null || map.ContainsKey(uri)) continue;

				map[uri] = new OutcomeDto
				{
					Uri = uri,
					Label = GetStr(b, "label") ?? "",
					PaperUri = GetStr(b, "paper"),
					ExperimentUri = GetStr(b, "experiment"),
					MeasurementCategory = GetStr(b, "measCat"),
					MeasurementType = GetStr(b, "measType"),
					Value = GetDouble(b, "value"),
					Unit = GetStr(b, "unit"),
					Scope = GetStr(b, "scope"),
					Significant = GetBool(b, "significant"),
					Direction = GetStr(b, "direction"),
					ComparedTo = GetStr(b, "comparedTo"),
					DataSource = GetStr(b, "dataSource"),
				};
			}

			return map.Values.ToList();
		}

		private async Task<List<FabricationMethodDto>> FetchFabricationMethodsAsync(CancellationToken ct)
		{
			var sparql = Prefixes + @"
				SELECT ?s ?label ?paper ?chemistry ?mfg ?annealChem ?annealCond
				       ?monomer ?crosslinker ?surfactant ?enzyme ?peptide ?reagent WHERE {
					?s a lova:FabricationMethod .
					OPTIONAL { ?s rdfs:label ?label . }
					OPTIONAL { ?s lova:describedIn ?paper . }
					OPTIONAL { ?s lova:chemistry ?chemistry . }
					OPTIONAL { ?s lova:manufacturingMethod ?mfg . }
					OPTIONAL { ?s lova:annealingChemistry ?annealChem . }
					OPTIONAL { ?s lova:annealingConditions ?annealCond . }
					OPTIONAL { ?s lova:monomer ?monomer . }
					OPTIONAL { ?s lova:crosslinker ?crosslinker . }
					OPTIONAL { ?s lova:surfactant ?surfactant . }
					OPTIONAL { ?s lova:enzyme ?enzyme . }
					OPTIONAL { ?s lova:peptide ?peptide . }
					OPTIONAL { ?s lova:additionalReagent ?reagent . }
				}";

			var json = await _client.QueryAsync(sparql, ct);
			var bindings = ParseBindings(json);
			var map = new Dictionary<string, FabricationMethodDto>(StringComparer.Ordinal);

			foreach (var b in bindings)
			{
				var uri = GetStr(b, "s");
				if (uri == null) continue;

				if (!map.TryGetValue(uri, out var dto))
				{
					dto = new FabricationMethodDto
					{
						Uri = uri,
						Label = GetStr(b, "label") ?? "",
						PaperUri = GetStr(b, "paper"),
						Chemistry = GetStr(b, "chemistry"),
						ManufacturingMethod = GetStr(b, "mfg"),
						AnnealingChemistry = GetStr(b, "annealChem"),
						AnnealingConditions = GetStr(b, "annealCond"),
						Monomer = GetStr(b, "monomer"),
						Crosslinker = GetStr(b, "crosslinker"),
						Surfactant = GetStr(b, "surfactant"),
						Enzyme = GetStr(b, "enzyme"),
					};
					map[uri] = dto;
				}

				var peptide = GetStr(b, "peptide");
				if (peptide != null && !dto.Peptides.Contains(peptide))
					dto.Peptides.Add(peptide);

				var reagent = GetStr(b, "reagent");
				if (reagent != null && !dto.AdditionalReagents.Contains(reagent))
					dto.AdditionalReagents.Add(reagent);
			}

			return map.Values.ToList();
		}

		private async Task<List<GeometryProfileDto>> FetchGeometryProfilesAsync(CancellationToken ct)
		{
			var sparql = Prefixes + @"
				SELECT ?s ?label ?matchType ?matchDesc ?matchMat ?sizeMin ?sizeMax ?count WHERE {
					?s a lova:GeometryProfile .
					OPTIONAL { ?s rdfs:label ?label . }
					OPTIONAL { ?s lova:matchType ?matchType . }
					OPTIONAL { ?s lova:matchDescription ?matchDesc . }
					OPTIONAL { ?s lova:matchMaterial ?matchMat . }
					OPTIONAL { ?s lova:matchSizeMin ?sizeMin . }
					OPTIONAL { ?s lova:matchSizeMax ?sizeMax . }
					OPTIONAL { ?s lova:scaffoldCount ?count . }
				}";

			var json = await _client.QueryAsync(sparql, ct);
			var bindings = ParseBindings(json);
			var map = new Dictionary<string, GeometryProfileDto>(StringComparer.Ordinal);

			foreach (var b in bindings)
			{
				var uri = GetStr(b, "s");
				if (uri == null || map.ContainsKey(uri)) continue;

				map[uri] = new GeometryProfileDto
				{
					Uri = uri,
					Label = GetStr(b, "label") ?? "",
					MatchType = GetStr(b, "matchType"),
					MatchDescription = GetStr(b, "matchDesc"),
					MatchMaterial = GetStr(b, "matchMat"),
					MatchSizeMin = GetDouble(b, "sizeMin"),
					MatchSizeMax = GetDouble(b, "sizeMax"),
					ScaffoldCount = GetInt(b, "count"),
				};
			}

			return map.Values.ToList();
		}

		// ── Graph methods (unchanged) ──

		public async Task<RdfGraphDto> GetGraphAsync(int? limit = null, CancellationToken ct = default)
		{
			var limitClause = limit.HasValue ? $"LIMIT {limit.Value}" : string.Empty;
			var sparql = $@"
				SELECT ?s ?p ?o WHERE {{
					?s ?p ?o .
					FILTER(?s != <urn:lovamap:seed>)
				}}
				{limitClause}";

			var json = await _client.QueryAsync(sparql, ct);
			return ParseGraphResults(json);
		}

		public Task<RdfOntologySummaryDto> GetOntologySummaryAsync(CancellationToken ct = default) =>
			_cache.GetOrCreateAsync("ontology-summary", async entry =>
			{
				entry.SetOptions(CacheOptions());
				return await FetchOntologySummaryAsync(ct);
			})!;

		private async Task<RdfOntologySummaryDto> FetchOntologySummaryAsync(CancellationToken ct)
		{
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

			// Fire all 4 queries in parallel
			var classTask = _client.QueryAsync(classSparql, ct);
			var propertyTask = _client.QueryAsync(propertySparql, ct);
			var countTask = _client.QueryAsync(countSparql, ct);
			var instanceCountTask = _client.QueryAsync(instanceCountSparql, ct);

			await Task.WhenAll(classTask, propertyTask, countTask, instanceCountTask);

			return new RdfOntologySummaryDto
			{
				Classes = ParseClassSummary(classTask.Result),
				Properties = await ParsePropertySummary(propertyTask.Result, ct),
				TotalTriples = ParseSingleCount(countTask.Result, "tripleCount"),
				TotalInstances = ParseSingleCount(instanceCountTask.Result, "instanceCount"),
			};
		}

		// ── Shared binding helpers ──

		private static List<JsonElement> ParseBindings(string json)
		{
			if (string.IsNullOrWhiteSpace(json))
				return new List<JsonElement>();

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var r) ||
				!r.TryGetProperty("bindings", out var b) ||
				b.ValueKind != JsonValueKind.Array)
				return new List<JsonElement>();

			// Must clone since JsonDocument will be disposed
			return b.EnumerateArray().Select(e => e.Clone()).ToList();
		}

		private static string? GetStr(JsonElement binding, string key)
		{
			if (!binding.TryGetProperty(key, out var el) ||
				!el.TryGetProperty("value", out var v))
				return null;

			var s = v.GetString();
			return string.IsNullOrWhiteSpace(s) ? null : s;
		}

		private static double? GetDouble(JsonElement binding, string key)
		{
			var s = GetStr(binding, key);
			if (s == null) return null;
			return double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : null;
		}

		private static int? GetInt(JsonElement binding, string key)
		{
			var s = GetStr(binding, key);
			if (s == null) return null;
			return int.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var i) ? i : null;
		}

		private static bool? GetBool(JsonElement binding, string key)
		{
			var s = GetStr(binding, key);
			if (s == null) return null;
			return s == "true" || s == "1";
		}

		// ── Graph parsing helpers (kept from original) ──

		private static RdfGraphDto ParseGraphResults(string json)
		{
			var graph = new RdfGraphDto();
			if (string.IsNullOrWhiteSpace(json))
				return graph;

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
				return graph;

			var nodeMap = new Dictionary<string, RdfGraphNodeDto>(StringComparer.Ordinal);
			var edgeSet = new HashSet<string>(StringComparer.Ordinal);
			var subjectTypes = new Dictionary<string, string>(StringComparer.Ordinal);

			const string rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				var (sVal, _, _) = GetBindingInfo(binding, "s");
				var (pVal, _, _) = GetBindingInfo(binding, "p");
				var (oVal, _, _) = GetBindingInfo(binding, "o");

				if (string.IsNullOrEmpty(sVal) || string.IsNullOrEmpty(pVal))
					continue;

				if (pVal == rdfType && !string.IsNullOrEmpty(oVal))
					subjectTypes[sVal] = oVal;
			}

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				var (sVal, sType, _) = GetBindingInfo(binding, "s");
				var (pVal, _, _) = GetBindingInfo(binding, "p");
				var (oVal, oType, oDatatype) = GetBindingInfo(binding, "o");

				if (string.IsNullOrEmpty(sVal) || string.IsNullOrEmpty(pVal) || string.IsNullOrEmpty(oVal))
					continue;

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
					// Skip class nodes — type is already captured in each node's Group
				}
				else if (oType == "uri" || oType == "bnode")
				{
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
					// Store all literals (numeric and string) as properties on the subject node
					var propName = ExtractLocalName(pVal);
					if (IsNumericDatatype(oDatatype))
					{
						nodeMap[sVal].Properties[propName] = ParseNumericValue(oVal);
					}
					else
					{
						// Append to existing property if multiple values (e.g. multiple authors)
						if (nodeMap[sVal].Properties.TryGetValue(propName, out var existing))
							nodeMap[sVal].Properties[propName] = $"{existing}, {oVal}";
						else
							nodeMap[sVal].Properties[propName] = oVal;
					}
				}
			}

			graph.Nodes = nodeMap.Values.ToList();
			return graph;
		}

		private static (string value, string type, string? datatype) GetBindingInfo(JsonElement binding, string key)
		{
			if (!binding.TryGetProperty(key, out var element))
				return (string.Empty, string.Empty, null);

			var value = element.TryGetProperty("value", out var v) ? v.GetString() ?? string.Empty : string.Empty;
			var type = element.TryGetProperty("type", out var t) ? t.GetString() ?? string.Empty : string.Empty;
			string? datatype = element.TryGetProperty("datatype", out var d) ? d.GetString() : null;

			return (value, type, datatype);
		}

		private static string ExtractLocalName(string uri)
		{
			var hashIndex = uri.LastIndexOf('#');
			if (hashIndex >= 0 && hashIndex < uri.Length - 1)
				return uri[(hashIndex + 1)..];

			var slashIndex = uri.LastIndexOf('/');
			if (slashIndex >= 0 && slashIndex < uri.Length - 1)
				return uri[(slashIndex + 1)..];

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
				return false;

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
				return dec;
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
				return classes;

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
				return classes;

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (!TryGetValue(binding, "class", out var classUri))
					continue;

				var count = 0;
				if (TryGetValue(binding, "count", out var countStr))
					int.TryParse(countStr, NumberStyles.Any, CultureInfo.InvariantCulture, out count);

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
				return properties;

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
				return properties;

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (!TryGetValue(binding, "property", out var propertyUri))
					continue;

				var usageCount = 0;
				if (TryGetValue(binding, "usageCount", out var countStr))
					int.TryParse(countStr, NumberStyles.Any, CultureInfo.InvariantCulture, out usageCount);

				TryGetValue(binding, "datatype", out var datatype);

				var distinctValues = new List<string>();
				if (!IsNumericDatatype(datatype))
					distinctValues = await GetDistinctValuesForProperty(propertyUri, ct);

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
				return values;

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
				return values;

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (TryGetValue(binding, "value", out var value))
					values.Add(value);
			}

			return values;
		}

		private static bool TryGetValue(JsonElement binding, string key, out string value)
		{
			value = string.Empty;
			if (!binding.TryGetProperty(key, out var element) ||
				!element.TryGetProperty("value", out var valueElement))
				return false;

			value = valueElement.GetString() ?? string.Empty;
			return !string.IsNullOrWhiteSpace(value);
		}

		private static int ParseSingleCount(string json, string variableName)
		{
			if (string.IsNullOrWhiteSpace(json))
				return 0;

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var resultsElement) ||
				!resultsElement.TryGetProperty("bindings", out var bindingsElement) ||
				bindingsElement.ValueKind != JsonValueKind.Array)
				return 0;

			foreach (var binding in bindingsElement.EnumerateArray())
			{
				if (TryGetValue(binding, variableName, out var countStr) &&
					int.TryParse(countStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var count))
					return count;
			}

			return 0;
		}
	}
}
