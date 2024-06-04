using Microsoft.AspNetCore.Mvc;

namespace Infrastructure.DTOs
{
	public class DescriptorFilter
	{
		[FromQuery(Name = "descriptorIds")]
		public ICollection<int>? DescriptorIds { get; set; }
		
		[FromQuery(Name = "descriptors")]
    	public ICollection<string>? Descriptors { get; set; }
	}
}