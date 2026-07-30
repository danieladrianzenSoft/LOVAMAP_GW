using System.Text.Json;
using Infrastructure.Helpers;

namespace API.Extensions
{
	public static class HttpExtensions
	{
		public static void AddPaginationHeader(this HttpResponse response, Pagination pagination)
		{
			var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
			response.Headers.Append("Pagination", JsonSerializer.Serialize(pagination, options));
		}
	}
}
