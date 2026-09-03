using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using KnowledgeBaseApi.Helpers;

namespace KnowledgeBaseApi.Services;

public sealed class QueryService
{
	private readonly IFusekiClient _fuseki;
	private readonly HttpClient _http;
	private readonly IConfiguration _config;
	private readonly ILogger<QueryService> _logger;

	public QueryService(IFusekiClient fuseki, IHttpClientFactory httpFactory, IConfiguration config, ILogger<QueryService> logger)
	{
		_fuseki = fuseki;
		_http = httpFactory.CreateClient("OpenAI");
		_config = config;
		_logger = logger;
	}

	// All standard prefixes — prepended to every query so the LLM doesn't need to get them right
	private const string AllPrefixes = """
		PREFIX lova:   <https://lovamap.com/ontology#>
		PREFIX dc:     <http://purl.org/dc/terms/>
		PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
		PREFIX schema: <https://schema.org/>
		PREFIX rdfs:   <http://www.w3.org/2000/01/rdf-schema#>
		PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
		PREFIX xsd:    <http://www.w3.org/2001/XMLSchema#>
		""";

	// ── Public API ──

	public async Task<QueryResult> AskAsync(string question, CancellationToken ct)
	{
		var apiKey = _config["OpenAI:ApiKey"]
			?? Environment.GetEnvironmentVariable("OPENAI_API_KEY")
			?? throw new InvalidOperationException("OpenAI API key is not configured.");

		var model = _config["OpenAI:Model"] ?? "gpt-4o";

		var requestBody = new
		{
			model,
			messages = new object[]
			{
				new { role = "system", content = BuildSystemPrompt() },
				new { role = "user", content = question },
			},
			temperature = 0.0,
		};

		var json = JsonSerializer.Serialize(requestBody);
		var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
		{
			Content = new StringContent(json, Encoding.UTF8, "application/json"),
		};
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

		var response = await _http.SendAsync(request, ct);
		var responseBody = await response.Content.ReadAsStringAsync(ct);

		if (!response.IsSuccessStatusCode)
		{
			_logger.LogError("OpenAI API error {Status}: {Body}", response.StatusCode, responseBody);
			throw new InvalidOperationException($"OpenAI API returned {response.StatusCode}.");
		}

		var doc = JsonDocument.Parse(responseBody);
		var content = doc.RootElement
			.GetProperty("choices")[0]
			.GetProperty("message")
			.GetProperty("content")
			.GetString() ?? "";

		_logger.LogInformation("OpenAI raw response:\n{Content}", content);

		var (sparql, explanation) = ParseLlmResponse(content);

		_logger.LogInformation("Parsed SPARQL:\n{Sparql}", sparql);

		sparql = NormalizePrefixes(sparql);
		sparql = EnsureLimit(sparql);
		ValidateSelectOnly(sparql);

		var (columns, rows) = await ExecuteRawSparqlAsync(sparql, ct);

		// Summarize results into a readable answer
		string? answer = null;
		if (rows.Count > 0)
		{
			answer = await SummarizeResultsAsync(question, columns, rows, apiKey, model, ct);
		}

		return new QueryResult(sparql, explanation, answer, columns, rows);
	}

	public async Task<QueryResult> ExecuteSparqlAsync(string sparql, CancellationToken ct)
	{
		sparql = NormalizePrefixes(sparql.Trim());
		sparql = EnsureLimit(sparql);
		ValidateSelectOnly(sparql);

		var (columns, rows) = await ExecuteRawSparqlAsync(sparql, ct);

		return new QueryResult(sparql, null, null, columns, rows);
	}

	// ── Internals ──

	// DOI slug pattern: e.g. "10.1002-adhm.202300823" embedded in any ontology URI path
	// Trailing slash is optional so it matches both paper URIs and entity URIs with sub-paths
	private static readonly Regex DoiSlugPattern = new(
		@"lovamap\.com/ontology#[^/]+/(10\.\d{4,}[^/]+?)(?:/|$)",
		RegexOptions.Compiled);

	/// <summary>
	/// Extracts DOIs embedded in any entity URI in the results (materials, experiments, outcomes, etc.)
	/// and fetches real paper metadata from Fuseki. Scalable: only queries papers actually referenced.
	/// </summary>
	private async Task<string> BuildSourcesBlockAsync(List<string> columns, List<Dictionary<string, string>> rows)
	{
		// Extract unique DOI slugs from ALL URIs in the results (not just paper URIs)
		var doiSlugs = new HashSet<string>();
		foreach (var row in rows)
		{
			foreach (var v in row.Values)
			{
				var match = DoiSlugPattern.Match(v);
				if (match.Success)
					doiSlugs.Add(match.Groups[1].Value);
			}
		}

		if (doiSlugs.Count == 0) return "";

		// Build paper URIs from DOI slugs
		var uriFilter = string.Join(" ",
			doiSlugs.Select(slug => $"<https://lovamap.com/ontology#paper/{slug}>"));

		var sparql = AllPrefixes + $@"
			SELECT ?paper ?title ?doi ?year ?firstAuthor WHERE {{
			  VALUES ?paper {{ {uriFilter} }}
			  ?paper dc:title ?title ;
			         dc:identifier ?doi .
			  OPTIONAL {{ ?paper dc:date ?year }}
			  OPTIONAL {{ ?paper dc:creator ?author . ?author foaf:familyName ?firstAuthor }}
			}}";

		try
		{
			var json = await _fuseki.QueryAsync(sparql);
			var doc = JsonDocument.Parse(json);
			var bindings = doc.RootElement.GetProperty("results").GetProperty("bindings");

			// Group by paper URI to collect authors
			var papers = new Dictionary<string, (string Title, string Doi, string Year, List<string> Authors)>();
			foreach (var b in bindings.EnumerateArray())
			{
				var uri = b.GetProperty("paper").GetProperty("value").GetString()!;
				var title = b.GetProperty("title").GetProperty("value").GetString() ?? "";
				var doi = b.GetProperty("doi").GetProperty("value").GetString() ?? "";
				var year = b.TryGetProperty("year", out var y) ? y.GetProperty("value").GetString() ?? "" : "";
				var author = b.TryGetProperty("firstAuthor", out var a) ? a.GetProperty("value").GetString() ?? "" : "";

				if (!papers.ContainsKey(uri))
					papers[uri] = (title, doi, year, new List<string>());
				if (!string.IsNullOrEmpty(author) && !papers[uri].Authors.Contains(author))
					papers[uri].Authors.Add(author);
			}

			var sb = new StringBuilder();
			sb.AppendLine("\n\nSOURCES (use ONLY these when referencing papers — do NOT invent author names):");
			foreach (var (uri, (title, doi, year, authors)) in papers)
			{
				var authorStr = authors.Count > 0
					? (authors.Count == 1 ? authors[0] : $"{authors[0]} et al.")
					: "Unknown";
				var yearStr = string.IsNullOrEmpty(year) ? "" : $" {year}";
				sb.AppendLine($"- {authorStr}{yearStr}: \"{title}\" → link as [{authorStr}{yearStr}](https://doi.org/{doi})");
			}
			return sb.ToString();
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "Failed to fetch paper metadata for sources");
			return "";
		}
	}

	private async Task<string?> SummarizeResultsAsync(
		string question, List<string> columns, List<Dictionary<string, string>> rows,
		string apiKey, string model, CancellationToken ct)
	{
		try
		{
			// Build a compact table representation (limit rows to keep prompt small)
			var sb = new StringBuilder();
			sb.AppendLine(string.Join(" | ", columns));
			sb.AppendLine(new string('-', columns.Count * 20));
			foreach (var row in rows.Take(50))
			{
				var values = columns.Select(c =>
				{
					var v = row.GetValueOrDefault(c, "");
					if (v.StartsWith("http"))
					{
						var hash = v.LastIndexOf('#');
						if (hash >= 0) v = v[(hash + 1)..];
						else { var slash = v.LastIndexOf('/'); if (slash >= 0) v = v[(slash + 1)..]; }
					}
					return v;
				});
				sb.AppendLine(string.Join(" | ", values));
			}
			if (rows.Count > 50)
				sb.AppendLine($"... and {rows.Count - 50} more rows");

			// Fetch real paper metadata for grounded citations
			var sourcesBlock = await BuildSourcesBlockAsync(columns, rows);
			_logger.LogInformation("Sources block for summarizer: {Sources}", sourcesBlock);

			var requestBody = new
			{
				model,
				messages = new object[]
				{
					new { role = "system", content = """
						You are a scientific data analyst for a biomaterials research knowledge base.
						The user asked a question and a SPARQL query returned tabular results.
						Synthesize the data into a clear, concise answer (2-5 sentences).
						Highlight key findings, patterns, and comparisons.
						Use specific numbers from the data. Be direct and scientific.
						Do NOT describe the table structure — just answer the question.

						IMPORTANT: A SOURCES section is provided with the exact papers and how to cite them.
						You MUST ONLY reference papers listed in SOURCES. NEVER invent or guess author names.
						Use the exact markdown link format provided in SOURCES.
						""" },
					new { role = "user", content = $"Question: {question}\n\nResults ({rows.Count} rows):\n{sb}{sourcesBlock}" },
				},
				temperature = 0.0,
				max_tokens = 400,
			};

			var json = JsonSerializer.Serialize(requestBody);
			var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json"),
			};
			request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

			var response = await _http.SendAsync(request, ct);
			if (!response.IsSuccessStatusCode)
			{
				var errBody = await response.Content.ReadAsStringAsync(ct);
				_logger.LogWarning("OpenAI summarize call failed {Status}: {Body}", response.StatusCode, errBody);
				return null;
			}

			var responseBody = await response.Content.ReadAsStringAsync(ct);
			var doc = JsonDocument.Parse(responseBody);
			return doc.RootElement
				.GetProperty("choices")[0]
				.GetProperty("message")
				.GetProperty("content")
				.GetString();
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "Failed to summarize results — returning without answer");
			return null;
		}
	}

	private async Task<(List<string> Columns, List<Dictionary<string, string>> Rows)> ExecuteRawSparqlAsync(string sparql, CancellationToken ct)
	{
		string resultJson;
		try
		{
			resultJson = await _fuseki.QueryAsync(sparql);
		}
		catch (HttpRequestException ex)
		{
			_logger.LogError(ex, "Fuseki rejected SPARQL query");
			throw new InvalidOperationException(
				$"Fuseki rejected the query (possibly invalid SPARQL syntax). Details: {ex.Message}");
		}
		return ParseSparqlResults(resultJson);
	}

	private static (List<string>, List<Dictionary<string, string>>) ParseSparqlResults(string json)
	{
		var doc = JsonDocument.Parse(json);
		var vars = doc.RootElement
			.GetProperty("head")
			.GetProperty("vars")
			.EnumerateArray()
			.Select(v => v.GetString()!)
			.ToList();

		var rows = new List<Dictionary<string, string>>();
		foreach (var binding in doc.RootElement.GetProperty("results").GetProperty("bindings").EnumerateArray())
		{
			var row = new Dictionary<string, string>();
			foreach (var v in vars)
			{
				if (binding.TryGetProperty(v, out var val))
					row[v] = val.GetProperty("value").GetString() ?? "";
				else
					row[v] = "";
			}
			rows.Add(row);
		}

		return (vars, rows);
	}

	private static (string Sparql, string? Explanation) ParseLlmResponse(string content)
	{
		// Extract SPARQL from markdown code block if present
		var codeBlockMatch = Regex.Match(content, @"```(?:sparql)?\s*\n([\s\S]*?)```", RegexOptions.IgnoreCase);
		string sparql;
		string? explanation = null;

		if (codeBlockMatch.Success)
		{
			sparql = codeBlockMatch.Groups[1].Value.Trim();

			// Everything outside the code block is the explanation
			var before = content[..codeBlockMatch.Index].Trim();
			var after = content[(codeBlockMatch.Index + codeBlockMatch.Length)..].Trim();
			explanation = string.Join("\n", new[] { before, after }.Where(s => !string.IsNullOrEmpty(s))).TrimEnd();
			if (string.IsNullOrWhiteSpace(explanation)) explanation = null;
		}
		else
		{
			// No code block — try to extract SPARQL starting from first PREFIX or SELECT
			var sparqlStart = Regex.Match(content, @"(?=PREFIX\s|SELECT\s)", RegexOptions.IgnoreCase);
			if (sparqlStart.Success)
			{
				explanation = content[..sparqlStart.Index].Trim();
				sparql = content[sparqlStart.Index..].Trim();
				if (string.IsNullOrWhiteSpace(explanation)) explanation = null;
			}
			else
			{
				sparql = content.Trim();
			}
		}

		return (sparql, explanation);
	}

	private static string NormalizePrefixes(string sparql)
	{
		// Strip any PREFIX lines the LLM included, then prepend our canonical set
		var withoutPrefixes = Regex.Replace(sparql, @"^\s*PREFIX\s+\S+\s+<[^>]+>\s*\.?\s*$",
			"", RegexOptions.IgnoreCase | RegexOptions.Multiline).TrimStart();
		return AllPrefixes + "\n" + withoutPrefixes;
	}

	private static void ValidateSelectOnly(string sparql)
	{
		if (Regex.IsMatch(sparql, @"\b(INSERT|DELETE|DROP|CLEAR|LOAD|CREATE|COPY|MOVE|ADD)\b", RegexOptions.IgnoreCase))
			throw new InvalidOperationException("Only SELECT queries are allowed.");
	}

	private static string EnsureLimit(string sparql)
	{
		if (!Regex.IsMatch(sparql, @"\bLIMIT\s+\d+", RegexOptions.IgnoreCase))
			sparql = sparql.TrimEnd().TrimEnd(';') + "\nLIMIT 200";
		return sparql;
	}

	private static string BuildSystemPrompt() => """
		You are a SPARQL query generator for the LOVAMAP Knowledge Base, an ontology about biomaterials research.

		## Prefixes (always include the ones you use)
		PREFIX lova:   <https://lovamap.com/ontology#>
		PREFIX dc:     <http://purl.org/dc/terms/>
		PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
		PREFIX schema: <https://schema.org/>
		PREFIX rdfs:   <http://www.w3.org/2000/01/rdf-schema#>
		PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
		PREFIX xsd:    <http://www.w3.org/2001/XMLSchema#>

		## Ontology Schema

		### Classes and their properties:

		**lova:Paper**
		- dc:title (string) — paper title
		- dc:identifier (string) — DOI
		- dc:date (xsd:gYear) — publication year
		- schema:isPartOf → lova:Journal
		- dc:creator → lova:Author (multiple)
		- lova:paperType (string) — e.g. "Research Article"
		- lova:focusMaterial (string) — description of focus material
		- lova:hasLabData (boolean)

		**lova:Author**
		- foaf:familyName, foaf:givenName, foaf:name (strings)
		- schema:affiliation (string)

		**lova:Journal**
		- dc:title (string)

		**lova:Material**
		- rdfs:label (string)
		- lova:describedIn → lova:Paper
		- lova:particleShape, lova:particleMaterial (strings)
		- lova:particleSizeMin, lova:particleSizeMax (doubles, in units of lova:particleSizeUnit)
		- lova:particleSizeUnit (string, e.g. "μm")
		- lova:sizeDistribution, lova:stiffnessQualitative, lova:packingConfiguration, lova:reportedPoreSize (strings)
		- lova:hasFabricationMethod → lova:FabricationMethod
		- lova:hasGeometryProfile → lova:GeometryProfile

		**lova:Experiment**
		- rdfs:label (string)
		- lova:describedIn → lova:Paper
		- lova:experimentCategory, lova:experimentType, lova:assayOrMethod (strings)
		- lova:cellType, lova:cellSource, lova:cultureDuration (strings)
		- lova:equipment, lova:temperature (strings)
		- lova:usedMaterial → lova:Material (multiple)

		**lova:Outcome**
		- rdfs:label (string)
		- lova:describedIn → lova:Paper
		- lova:fromExperiment → lova:Experiment
		- lova:measurementCategory, lova:measurementType (strings)
		- lova:value (double), lova:unit (string)
		- lova:scope, lova:direction, lova:comparedTo, lova:dataSource (strings)
		- lova:significant (boolean)

		**lova:FabricationMethod**
		- rdfs:label (string)
		- lova:describedIn → lova:Paper
		- lova:chemistry, lova:manufacturingMethod (strings)
		- lova:annealingChemistry, lova:annealingConditions (strings)
		- lova:monomer, lova:crosslinker, lova:surfactant, lova:enzyme (strings)
		- lova:peptide (string, multiple), lova:additionalReagent (string, multiple)

		**lova:GeometryProfile**
		- rdfs:label (string)
		- lova:matchType, lova:matchDescription, lova:matchMaterial (strings)
		- lova:matchSizeMin, lova:matchSizeMax (doubles)
		- lova:scaffoldCount (integer)

		## Key Relationships
		- Paper → Author: dc:creator
		- Paper → Journal: schema:isPartOf
		- Material → Paper: lova:describedIn
		- Material → FabricationMethod: lova:hasFabricationMethod
		- Material → GeometryProfile: lova:hasGeometryProfile
		- Experiment → Paper: lova:describedIn
		- Experiment → Material: lova:usedMaterial
		- Outcome → Paper: lova:describedIn
		- Outcome → Experiment: lova:fromExperiment

		## Example Queries

		Q: "List all papers"
		```sparql
		PREFIX lova: <https://lovamap.com/ontology#>
		PREFIX dc:   <http://purl.org/dc/terms/>
		SELECT ?paper ?title ?doi WHERE {
		  ?paper a lova:Paper ;
		         dc:title ?title ;
		         dc:identifier ?doi .
		}
		```

		Q: "Which materials showed cell viability above 90%?"
		```sparql
		PREFIX lova: <https://lovamap.com/ontology#>
		PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
		SELECT ?material ?materialLabel ?outcomeLabel ?value ?unit WHERE {
		  ?outcome a lova:Outcome ;
		           lova:measurementType ?mtype ;
		           lova:value ?value ;
		           lova:unit ?unit ;
		           rdfs:label ?outcomeLabel ;
		           lova:fromExperiment ?exp .
		  ?exp lova:usedMaterial ?material .
		  ?material rdfs:label ?materialLabel .
		  FILTER(CONTAINS(LCASE(?mtype), "viability") && ?value > 90)
		}
		```

		Q: "What fabrication methods used photopolymerization?"
		```sparql
		PREFIX lova: <https://lovamap.com/ontology#>
		PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
		SELECT ?fm ?label ?chemistry ?method WHERE {
		  ?fm a lova:FabricationMethod ;
		      rdfs:label ?label .
		  OPTIONAL { ?fm lova:chemistry ?chemistry }
		  OPTIONAL { ?fm lova:manufacturingMethod ?method }
		  FILTER(
		    CONTAINS(LCASE(?chemistry), "photopolymerization") ||
		    CONTAINS(LCASE(?method), "photopolymerization") ||
		    CONTAINS(LCASE(?label), "photopolymerization")
		  )
		}
		```

		Q: "Find experiments with MC3T3 cells and their outcomes"
		```sparql
		PREFIX lova: <https://lovamap.com/ontology#>
		PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
		SELECT ?exp ?expLabel ?cellType ?outcome ?outcomeLabel ?value ?unit WHERE {
		  ?exp a lova:Experiment ;
		       rdfs:label ?expLabel ;
		       lova:cellType ?cellType .
		  FILTER(CONTAINS(LCASE(?cellType), "mc3t3"))
		  OPTIONAL {
		    ?outcome a lova:Outcome ;
		             lova:fromExperiment ?exp ;
		             rdfs:label ?outcomeLabel .
		    OPTIONAL { ?outcome lova:value ?value }
		    OPTIONAL { ?outcome lova:unit ?unit }
		  }
		}
		```

		## Instructions
		- Only generate SELECT queries (never INSERT, DELETE, DROP, etc.)
		- Always include relevant prefixes
		- Use OPTIONAL for properties that might not exist on every instance
		- Use FILTER with CONTAINS(LCASE(...)) for text matching
		- Keep queries focused and efficient
		- Return ONLY a SPARQL query inside a ```sparql code block
		- Before the code block, include a one-sentence explanation of what the query does
		""";
}

public sealed record QueryResult(
	string Sparql,
	string? Explanation,
	string? Answer,
	List<string> Columns,
	List<Dictionary<string, string>> Rows
);
