using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
    public interface IDomainRepository
    {
		bool HasChanges();
		void Add(Domain domain);
		void Update(Domain domain);
		void Delete(Domain domain);
		Task<Domain?> GetById(int domainId);
		Task<Domain?> GetByScaffoldIdAndCategory(int scaffoldId, DomainCategory category);
		Task<int?> GetRandomDomainIdWithMeshAsync();
		Task<JsonDocument?> GetDomainMetadataById(int domainId);
	}
}