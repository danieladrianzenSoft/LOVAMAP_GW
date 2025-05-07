using System.Text.Json;
using Data.Models;

namespace Infrastructure.DTOs
{
	public class AISearchRequest
	{
		public required string Prompt { get; set; }
	}
}
