
using System.Text.Json;

namespace Data.Models
{
	public class Job
	{
		public Guid Id { get; set; }
		public int? CoreJobId { get; set; }
		public int? ScaffoldId { get; set; }
		public Scaffold? Scaffold { get; set; }
		public int? InputDomainId { get; set; }
		public Domain? InputDomain { get; set; }
		public JobStatus Status { get; set; } = 0;
		public DateTime SubmittedAt { get; set; }
		public DateTime? CompletedAt { get; set; }
		public string? CreatorId { get; set; }
		public User? Creator { get; set; }
		public string? LovamapCoreVersion { get; set; }
		public string? FinalHeartbeatMessage { get; set; }
		public int RetryCount { get; set; } = 0;
		public string? ErrorMessage { get; set; }
		public ICollection<Domain> OutputDomains { get; set; } = new List<Domain>(); // Usually Pore, Other
		public virtual ICollection<GlobalDescriptor> GlobalDescriptors { get; set; } = new List<GlobalDescriptor>();
		public virtual ICollection<PoreDescriptor> PoreDescriptors { get; set; } = new List<PoreDescriptor>();
		public virtual ICollection<OtherDescriptor> OtherDescriptors { get; set; } = new List<OtherDescriptor>();

	}
	
	public enum JobStatus 
	{
		Pending,
		Running,
		Completed,
		Failed,
		Stopped
	}
}
