namespace Infrastructure.DTOs
{
	public class MeshStatusDto
	{
		/// <summary>"Pending", "Running", "Completed", "Failed", "Stopped", "Unavailable" (Core unreachable), or null if not applicable</summary>
		public string? PoreMeshStatus { get; set; }

		/// <summary>"Pending", "Running", "Completed", "Failed", "Stopped", "Unavailable" (Core unreachable), or null if not applicable</summary>
		public string? ParticleMeshStatus { get; set; }
	}
}
