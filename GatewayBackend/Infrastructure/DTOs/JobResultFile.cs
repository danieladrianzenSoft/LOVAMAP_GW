
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class JobResultFile
	{
		public string FullPath { get; set; } = default!;
		public string DownloadFileName { get; set; } = default!;
		public string ContentType { get; set; } = default!;
	}
}

