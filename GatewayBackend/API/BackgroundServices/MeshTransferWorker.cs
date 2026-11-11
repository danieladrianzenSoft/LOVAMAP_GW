using Data;
using Infrastructure.IHelpers;
using Microsoft.EntityFrameworkCore;

namespace API.BackgroundServices
{
	public class MeshTransferWorker : BackgroundService
	{
		private readonly IServiceScopeFactory _scopeFactory;
		private readonly IDomainFileService _domainFileService;
		private readonly ILogger<MeshTransferWorker> _logger;

		private static readonly TimeSpan NormalInterval = TimeSpan.FromSeconds(10);
		private static readonly TimeSpan BackoffInterval = TimeSpan.FromSeconds(60);
		private static readonly TimeSpan NormalDelay = TimeSpan.FromMilliseconds(200);
		private static readonly TimeSpan FailureDelay = TimeSpan.FromSeconds(1);
		private const int MaxConsecutiveFailsPerCycle = 5;

		public MeshTransferWorker(
			IServiceScopeFactory scopeFactory,
			IDomainFileService domainFileService,
			ILogger<MeshTransferWorker> logger)
		{
			_scopeFactory = scopeFactory;
			_domainFileService = domainFileService;
			_logger = logger;
		}

		protected override async Task ExecuteAsync(CancellationToken stoppingToken)
		{
			_logger.LogInformation("MeshTransferWorker started");

			// On startup, log any files already in staging (from before a restart)
			var stagedFiles = _domainFileService.GetStagedFiles().ToList();
			if (stagedFiles.Count > 0)
			{
				_logger.LogInformation("MeshTransferWorker found {Count} staged files from previous run", stagedFiles.Count);
			}

			var consecutiveFullFails = 0;

			while (!stoppingToken.IsCancellationRequested)
			{
				try
				{
					var (transferred, failed, skipped) = await TransferStagedFilesAsync(stoppingToken);

					if (transferred + failed + skipped == 0)
					{
						consecutiveFullFails = 0;
					}
					else if (transferred > 0)
					{
						consecutiveFullFails = 0;
					}
					else if (failed > 0)
					{
						consecutiveFullFails++;
					}
				}
				catch (Exception ex)
				{
					_logger.LogError(ex, "MeshTransferWorker: unhandled error during cycle");
					consecutiveFullFails++;
				}

				if (consecutiveFullFails >= 3)
				{
					_logger.LogWarning("MeshTransferWorker: {Count} consecutive full-fail cycles — backing off to {Seconds}s",
						consecutiveFullFails, BackoffInterval.TotalSeconds);
					await Task.Delay(BackoffInterval, stoppingToken);
				}
				else
				{
					await Task.Delay(NormalInterval, stoppingToken);
				}
			}
		}

		private async Task<(int Transferred, int Failed, int Skipped)> TransferStagedFilesAsync(CancellationToken ct)
		{
			var stagedFiles = _domainFileService.GetStagedFiles().ToList();
			if (stagedFiles.Count == 0) return (0, 0, 0);

			_logger.LogInformation("MeshTransferWorker: starting cycle with {Count} staged files", stagedFiles.Count);

			int transferred = 0;
			int failed = 0;
			int skipped = 0;
			int consecutiveFailsInCycle = 0;

			foreach (var stagingPath in stagedFiles)
			{
				if (ct.IsCancellationRequested) break;

				// Bail early if mount is clearly struggling
				if (consecutiveFailsInCycle >= MaxConsecutiveFailsPerCycle)
				{
					_logger.LogInformation("MeshTransferWorker: {Fails} consecutive failures — aborting cycle early, will retry next round",
						consecutiveFailsInCycle);
					break;
				}

				var fileName = Path.GetFileName(stagingPath);

				try
				{
					using var scope = _scopeFactory.CreateScope();
					var context = scope.ServiceProvider.GetRequiredService<DataContext>();

					var domain = await context.Domains
						.FirstOrDefaultAsync(d => d.MeshPendingTransfer && d.MeshFilePath != null && d.MeshFilePath.EndsWith(fileName), ct);

					if (domain == null)
					{
						skipped++;
						continue;
					}

					var finalPath = domain.MeshFilePath!;
					var success = await _domainFileService.TransferFromStaging(stagingPath, finalPath);

					if (success)
					{
						domain.MeshPendingTransfer = false;
						await context.SaveChangesAsync(ct);
						transferred++;
						consecutiveFailsInCycle = 0;
						_logger.LogInformation("MeshTransferWorker: transferred Domain {DomainId} ({FileName})", domain.Id, fileName);
						await Task.Delay(NormalDelay, ct);
					}
					else
					{
						failed++;
						consecutiveFailsInCycle++;
						await Task.Delay(FailureDelay, ct);
					}
				}
				catch (Exception ex)
				{
					failed++;
					consecutiveFailsInCycle++;
					_logger.LogError(ex, "MeshTransferWorker: error on {FileName}", fileName);
					await Task.Delay(FailureDelay, ct);
				}
			}

			_logger.LogInformation("MeshTransferWorker: cycle complete — {Transferred} transferred, {Failed} failed, {Skipped} skipped, {Remaining} remaining",
				transferred, failed, skipped, stagedFiles.Count - transferred);

			return (transferred, failed, skipped);
		}
	}
}
