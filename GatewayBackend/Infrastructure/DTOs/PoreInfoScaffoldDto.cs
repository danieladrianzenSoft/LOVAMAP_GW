
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class PoreInfoScaffoldDto
	{
		public int ScaffoldId { get; set; }
		public List<DescriptorValueDto> Descriptors { get; set; } = [];
	}

	public class DescriptorValueDto
	{
		public int DescriptorTypeId { get; set; }
    	public List<double> Values { get; set; } = [];
	}
}