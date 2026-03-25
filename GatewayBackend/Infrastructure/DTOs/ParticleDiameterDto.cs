using System.Collections.Generic;

namespace Infrastructure.DTOs
{
	public class ParticleDiameterDto
	{
		public int ScaffoldGroupId { get; set; }
		public int ScaffoldId { get; set; }
		public List<double> Values { get; set; } = new();
	}
}
