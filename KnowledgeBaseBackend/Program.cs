using KnowledgeBaseApi.Data;
using KnowledgeBaseApi.Helpers;
using KnowledgeBaseApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Fuseki
builder.Services.Configure<FusekiOptions>(builder.Configuration.GetSection("Fuseki"));
builder.Services.AddHttpClient<IFusekiClient, FusekiClient>();

// Caching + RdfService
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IRdfService, RdfService>();

// DataSeeder (auto-loads TTL on first run, hash-based change detection)
builder.Services.AddSingleton<DataSeeder>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<DataSeeder>());

// NL → SPARQL query service
builder.Services.AddSingleton<QueryService>();

// Optional PostgreSQL (read-only)
var kbDbConnection = builder.Configuration.GetConnectionString("KbReadOnly")
	?? Environment.GetEnvironmentVariable("KB_DB_READONLY");

if (!string.IsNullOrWhiteSpace(kbDbConnection))
{
	builder.Services.AddDbContext<KbReadOnlyDbContext>(options =>
		options.UseNpgsql(kbDbConnection)
			.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));
}

// CORS
builder.Services.AddCors(options =>
{
	options.AddDefaultPolicy(policy =>
	{
		policy.WithOrigins(
				"http://localhost:5173",
				"http://localhost:3001",
				"https://kb.lovamap.com"
			)
			.AllowAnyHeader()
			.AllowAnyMethod();
	});
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
	app.UseDeveloperExceptionPage();
	app.UseSwagger();
	app.UseSwaggerUI();
}

app.UseCors();

// ── Endpoints ──

app.MapGet("/api/health", () => Results.Ok("Healthy"))
	.WithTags("Health");

app.MapPost("/api/admin/reseed", async (DataSeeder seeder, CancellationToken ct) =>
{
	await seeder.ForceReseedAsync(ct);
	return Results.Ok(new { message = "Reseed completed successfully." });
}).WithTags("Admin");

app.MapGet("/api/graph", async (IRdfService svc, int? limit, CancellationToken ct) =>
	Results.Ok(await svc.GetGraphAsync(limit, ct)))
	.WithTags("Graph");

app.MapGet("/api/graph/summary", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetOntologySummaryAsync(ct)))
	.WithTags("Graph");

app.MapGet("/api/papers", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetPapersAsync(ct)))
	.WithTags("Ontology");

app.MapGet("/api/authors", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetAuthorsAsync(ct)))
	.WithTags("Ontology");

app.MapGet("/api/journals", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetJournalsAsync(ct)))
	.WithTags("Ontology");

app.MapGet("/api/materials", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetMaterialsAsync(ct)))
	.WithTags("Ontology");

app.MapGet("/api/experiments", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetExperimentsAsync(ct)))
	.WithTags("Ontology");

app.MapGet("/api/outcomes", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetOutcomesAsync(ct)))
	.WithTags("Ontology");

app.MapGet("/api/fabrication-methods", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetFabricationMethodsAsync(ct)))
	.WithTags("Ontology");

app.MapGet("/api/geometry-profiles", async (IRdfService svc, CancellationToken ct) =>
	Results.Ok(await svc.GetGeometryProfilesAsync(ct)))
	.WithTags("Ontology");

// ── NL → SPARQL Query ──

app.MapPost("/api/query", async (QueryService svc, QueryRequest req, CancellationToken ct) =>
{
	try
	{
		var result = await svc.AskAsync(req.Question, ct);
		return Results.Ok(result);
	}
	catch (InvalidOperationException ex)
	{
		return Results.BadRequest(new { error = ex.Message });
	}
}).WithTags("Query");

app.MapPost("/api/query/sparql", async (QueryService svc, SparqlRequest req, CancellationToken ct) =>
{
	try
	{
		var result = await svc.ExecuteSparqlAsync(req.Sparql, ct);
		return Results.Ok(result);
	}
	catch (InvalidOperationException ex)
	{
		return Results.BadRequest(new { error = ex.Message });
	}
}).WithTags("Query");

app.Run();

// ── Request DTOs ──
record QueryRequest(string Question);
record SparqlRequest(string Sparql);
