namespace Infrastructure.DTOs
{
	public class ParticlePropertyBaseDto
	{
		public string? Shape { get; set; }
		public string? Stiffness { get; set; }
		public string Dispersity { get; set;} = null!;
		public string? SizeDistributionType { get; set; }
		public double MeanSize { get; set; } 
		public double? StandardDeviationSize { get; set; }
		public double? Proportion { get; set; }
	}
}