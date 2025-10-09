using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
	public interface ILovamapCoreJobRepository
	{
		bool HasChanges();
		void Add(Job job);
	}
}