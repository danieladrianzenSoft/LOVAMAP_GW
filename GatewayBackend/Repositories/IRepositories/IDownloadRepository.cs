using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
    public interface IDownloadRepository
    {
		bool HasChanges();
		void Add(Download download);	
	}
}