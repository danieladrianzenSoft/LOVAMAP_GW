using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using KnowledgeBaseApi.Helpers;

namespace KnowledgeBaseApi.Services
{
	public sealed class DataSeeder : IHostedService
	{
		private readonly IServiceProvider _sp;
		private readonly ILogger<DataSeeder> _log;

		private const string SeedSubject = "urn:lovamap:seed";
		private const string HashPredicate = "urn:lovamap:hash";

		public DataSeeder(IServiceProvider sp, ILogger<DataSeeder> log)
		{
			_sp = sp;
			_log = log;
		}

		public async Task StartAsync(CancellationToken ct)
		{
			try
			{
				await SeedIfChangedAsync(ct);
			}
			catch (Exception ex)
			{
				_log.LogError(ex, "DataSeeder failed — app will continue without seed data.");
			}
		}

		public Task StopAsync(CancellationToken ct) => Task.CompletedTask;

		/// <summary>Compare computed hash with stored hash; reseed only if different.</summary>
		private async Task SeedIfChangedAsync(CancellationToken ct)
		{
			using var scope = _sp.CreateScope();
			var client = scope.ServiceProvider.GetRequiredService<IFusekiClient>();

			var computedHash = ComputeSeedHash();
			var storedHash = await GetStoredHashAsync(client, ct);

			if (computedHash == storedHash)
			{
				_log.LogInformation("Seed data up to date (hash unchanged).");
				return;
			}

			_log.LogInformation("Seed hash changed — reseeding...");
			await SeedAllFilesAsync(client, computedHash, ct);
		}

		/// <summary>Force a full reseed regardless of hash. Called by admin endpoint.</summary>
		public async Task ForceReseedAsync(CancellationToken ct)
		{
			using var scope = _sp.CreateScope();
			var client = scope.ServiceProvider.GetRequiredService<IFusekiClient>();

			var computedHash = ComputeSeedHash();
			_log.LogInformation("Admin reseed requested — reseeding...");
			await SeedAllFilesAsync(client, computedHash, ct);
		}

		/// <summary>DROP ALL, upload every TTL file, store new hash, invalidate cache.</summary>
		private async Task SeedAllFilesAsync(IFusekiClient client, string hash, CancellationToken ct)
		{
			await client.UpdateAsync("DROP ALL", ct);

			var embedded = GetEmbeddedTtlResources();
			foreach (var (resourceName, shortName) in embedded)
			{
				var assembly = Assembly.GetExecutingAssembly();
				using var stream = assembly.GetManifestResourceStream(resourceName)!;
				using var reader = new StreamReader(stream);
				var turtle = SanitizeTurtle(await reader.ReadToEndAsync(ct));

				await client.UploadTurtleAsync(turtle, ct);
				_log.LogInformation("Loaded seed file: {File}", shortName);
			}

			await StoreHashAsync(client, hash, ct);
			RdfService.InvalidateCache();
			_log.LogInformation("Seeded {Count} file(s) — cache invalidated.", embedded.Count);
		}

		/// <summary>SHA256 of all embedded TTL contents sorted by resource name.</summary>
		private static string ComputeSeedHash()
		{
			var embedded = GetEmbeddedTtlResources();
			var assembly = Assembly.GetExecutingAssembly();

			using var sha = SHA256.Create();
			foreach (var (resourceName, _) in embedded)
			{
				using var stream = assembly.GetManifestResourceStream(resourceName)!;
				var buffer = new byte[stream.Length];
				stream.ReadExactly(buffer);
				sha.TransformBlock(buffer, 0, buffer.Length, null, 0);
			}
			sha.TransformFinalBlock([], 0, 0);
			return Convert.ToHexString(sha.Hash!).ToLowerInvariant();
		}

		private static async Task<string?> GetStoredHashAsync(IFusekiClient client, CancellationToken ct)
		{
			var sparql = $"SELECT ?hash WHERE {{ <{SeedSubject}> <{HashPredicate}> ?hash . }}";
			var json = await client.QueryAsync(sparql, ct);

			if (string.IsNullOrWhiteSpace(json)) return null;

			using var doc = JsonDocument.Parse(json);
			if (!doc.RootElement.TryGetProperty("results", out var r) ||
				!r.TryGetProperty("bindings", out var b) ||
				b.ValueKind != JsonValueKind.Array)
				return null;

			foreach (var binding in b.EnumerateArray())
			{
				if (binding.TryGetProperty("hash", out var h) &&
					h.TryGetProperty("value", out var v))
					return v.GetString();
			}

			return null;
		}

		private static async Task StoreHashAsync(IFusekiClient client, string hash, CancellationToken ct)
		{
			var sparql = $"INSERT DATA {{ <{SeedSubject}> <{HashPredicate}> \"{hash}\" . }}";
			await client.UpdateAsync(sparql, ct);
		}

		private static List<(string resourceName, string shortName)> GetEmbeddedTtlResources()
		{
			var assembly = Assembly.GetExecutingAssembly();
			return assembly.GetManifestResourceNames()
				.Where(n => n.EndsWith(".ttl", StringComparison.OrdinalIgnoreCase))
				.OrderBy(n => n)
				.Select(n => (n, ToShortName(n)))
				.ToList();
		}

		private static string ToShortName(string resourceName)
		{
			var parts = resourceName.Split('.');
			var seedIdx = Array.IndexOf(parts, "SeedData");
			if (seedIdx >= 0 && seedIdx < parts.Length - 1)
				return string.Join(".", parts[(seedIdx + 1)..]);
			return resourceName;
		}

		/// <summary>
		/// Expands any prefixed names that contain slashes (e.g. lova:journal/foo)
		/// into full &lt;URI&gt; form, since Turtle spec forbids '/' in local names.
		/// Files that already use full URIs or have no slashes pass through unchanged.
		/// </summary>
		private static string SanitizeTurtle(string turtle)
		{
			var prefixes = new Dictionary<string, string>(StringComparer.Ordinal);
			var prefixPattern = new Regex(
				@"@prefix\s+(\w+):\s+<([^>]+)>\s*\.",
				RegexOptions.Compiled);

			foreach (Match m in prefixPattern.Matches(turtle))
				prefixes[m.Groups[1].Value] = m.Groups[2].Value;

			if (prefixes.Count == 0)
				return turtle;

			var prefixAlts = string.Join("|", prefixes.Keys.Select(Regex.Escape));
			var localNameWithSlash = new Regex(
				$@"(?<!\w)(?<prefix>{prefixAlts}):(?<local>[A-Za-z0-9_.\-]+/[A-Za-z0-9_./%\-]+)",
				RegexOptions.Compiled);

			return localNameWithSlash.Replace(turtle, match =>
			{
				var prefix = match.Groups["prefix"].Value;
				var local = match.Groups["local"].Value;
				if (prefixes.TryGetValue(prefix, out var ns))
					return $"<{ns}{local}>";
				return match.Value;
			});
		}
	}
}
