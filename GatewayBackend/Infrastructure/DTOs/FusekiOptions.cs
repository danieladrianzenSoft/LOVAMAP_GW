namespace Infrastructure.DTOs
{
	public sealed class FusekiOptions
	{
		public string BaseUrl { get; set; } = string.Empty;
		public string Dataset { get; set; } = string.Empty;
		public string QueryPath { get; set; } = "query";
		public string UpdatePath { get; set; } = "update";
		public string DataPath { get; set; } = "data";
		public string Username { get; set; } = string.Empty;
		public string Password { get; set; } = string.Empty;
	}
}
