using Microsoft.AspNetCore.Mvc;

namespace Infrastructure.DTOs
{
	public class DescriptorSeedResultDto
	{
		public int Attempted { get; set; }
		public int Succeeded { get; set; }
		public List<int> FailedScaffoldIds { get; set; } = [];
	}
}