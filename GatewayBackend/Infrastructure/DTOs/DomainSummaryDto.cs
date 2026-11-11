namespace Infrastructure.DTOs
{
	public class DomainSummaryDto
	{
		public int TotalDomains { get; set; }
		public int WithMesh { get; set; }
		public int WithMetadata { get; set; }
		public int WithoutMetadata { get; set; }
		public int ParticleCount { get; set; }
		public int PoreCount { get; set; }
	}
}
