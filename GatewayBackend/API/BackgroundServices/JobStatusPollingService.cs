using API.Hubs;
using Data.Models;
using Microsoft.AspNetCore.SignalR;
using Services.IServices;

namespace API.BackgroundServices
{
	public class JobStatusPollingService : BackgroundService
	{
		private readonly IServiceScopeFactory _scopeFactory;
		private readonly IHubContext<JobStatusHub> _hubContext;
		private readonly ILogger<JobStatusPollingService> _logger;
		private readonly TimeSpan _interval = TimeSpan.FromSeconds(3);
		private static readonly TimeSpan StaleJobThreshold = TimeSpan.FromHours(24);

		public JobStatusPollingService(
			IServiceScopeFactory scopeFactory,
			IHubContext<JobStatusHub> hubContext,
			ILogger<JobStatusPollingService> logger)
		{
			_scopeFactory = scopeFactory;
			_hubContext = hubContext;
			_logger = logger;
		}

		protected override async Task ExecuteAsync(CancellationToken stoppingToken)
		{
			_logger.LogInformation("JobStatusPollingService started");

			while (!stoppingToken.IsCancellationRequested)
			{
				try
				{
					await PollJobStatusesAsync(stoppingToken);
				}
				catch (Exception ex)
				{
					_logger.LogError(ex, "Error during job status polling");
				}

				await Task.Delay(_interval, stoppingToken);
			}
		}

		private async Task PollJobStatusesAsync(CancellationToken ct)
		{
			using var scope = _scopeFactory.CreateScope();
			var jobService = scope.ServiceProvider.GetRequiredService<ILovamapCoreJobService>();
			var modelMapper = scope.ServiceProvider.GetRequiredService<IModelMapper>();

			var activeJobs = await jobService.GetActiveJobsAsync();
			var jobList = activeJobs.ToList();

			if (jobList.Count == 0) return;

			_logger.LogDebug("Polling {Count} active jobs", jobList.Count);

			foreach (var job in jobList)
			{
				if (ct.IsCancellationRequested) break;

				// Auto-fail stale jobs that have been active for too long
				if (DateTime.UtcNow - job.SubmittedAt > StaleJobThreshold)
				{
					_logger.LogWarning("Job {JobId} has been {Status} for over {Hours}h — marking as Failed",
						job.Id, job.Status, StaleJobThreshold.TotalHours);
					var timedOutJob = await jobService.TimeoutJobAsync(job.Id);
					if (timedOutJob != null)
					{
						var failDto = modelMapper.MapToJobToReturnDto(timedOutJob);
						await _hubContext.Clients.All.SendAsync("JobStatusUpdated", failDto, ct);
					}
					continue;
				}

				var (statusChanged, updatedJob) = await jobService.SyncJobStatusAsync(job.Id);

				if (statusChanged && updatedJob != null)
				{
					var dto = modelMapper.MapToJobToReturnDto(updatedJob);
					await _hubContext.Clients.All.SendAsync("JobStatusUpdated", dto, ct);
				}
			}
		}
	}
}
