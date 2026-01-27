using Microsoft.AspNetCore.Mvc;

namespace Infrastructure.DTOs
{
	public class PublicationFilter
	{
		[FromQuery(Name = "search")]
		public string? Search { get; set; }
		[FromQuery(Name = "isMine")]
		public bool? IsMine { get; set; }
		[FromQuery(Name = "userId")]
		public string? UserId { get; set; }
	}
}