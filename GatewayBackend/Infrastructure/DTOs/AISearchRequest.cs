using System.Text.Json;
using Data.Models;

namespace Infrastructure.DTOs
{
	public class AISearchRequest
	{
		public required string Prompt { get; set; }
		public bool? IsSimulated { get; set; }
		public List<string>? ShapeTagNames { get; set; }
	}
}
