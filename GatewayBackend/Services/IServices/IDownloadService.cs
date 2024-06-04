using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IDownloadService
	{
		Task CreateDownloadRecord(string downloaderId, IEnumerable<int> scaffoldIds, IEnumerable<int> descriptorTypeIds);

	}
}