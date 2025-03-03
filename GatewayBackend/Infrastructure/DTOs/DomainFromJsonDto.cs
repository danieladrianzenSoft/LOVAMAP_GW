
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class DomainFromJsonDto
	{
		public int bead_count { get; set; }
		// public int bead_voxel_count { get; set; }
		public string hip_file { get; set; }
		// public DateTime created { get; set; }
		public string data_type { get; set; }
		public List<int> domain_size { get; set; } = new();
		public int voxel_count { get; set; }
		public double voxel_size { get; set; }
		public Dictionary<string, List<List<int>>> bead_data { get; set; } = [];
	}
}