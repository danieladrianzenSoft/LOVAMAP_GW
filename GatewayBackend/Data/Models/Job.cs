
using System.Text.Json;

namespace Data.Models
{
	public class Job
	{
		public Guid Id { get; set; }
		public int ScaffoldId { get; set; }
    	public Scaffold Scaffold { get; set; } = null!;
		public int InputDomainId { get; set; }
    	public Domain InputDomain { get; set; } = null!;
		public DateTime SubmittedAt { get; set; }
		public DateTime? CompletedAt { get; set; }
		public string? LovamapCoreVersion { get; set; }
		public string? FinalHeartbeatMessage { get; set; }
		public ICollection<Domain> OutputDomains { get; set; } = new List<Domain>(); // Usually Pore, Other
		public virtual ICollection<GlobalDescriptor> GlobalDescriptors { get; set; } = new List<GlobalDescriptor>();
		public virtual ICollection<PoreDescriptor> PoreDescriptors { get; set; } = new List<PoreDescriptor>();
		public virtual ICollection<OtherDescriptor> OtherDescriptors { get; set; } = new List<OtherDescriptor>();

	}
}
