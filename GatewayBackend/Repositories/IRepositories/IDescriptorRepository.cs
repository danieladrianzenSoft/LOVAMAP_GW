using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
	public interface IDescriptorRepository
	{
		bool HasChanges();
		void Add(DescriptorType descriptor);
		Task<DescriptorType?> GetDescriptorById(int id);
		Task<DescriptorType?> GetDescriptorByName(string name);
		Task<ICollection<DescriptorType>> GetAllDescriptorTypes();
		Task<ICollection<GlobalDescriptor>> GetGlobalDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter);
		Task<ICollection<PoreDescriptor>> GetPoreDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter);
		Task<ICollection<OtherDescriptor>> GetOtherDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter);		Task<List<ScaffoldBaseDto>> GetScaffoldsWithDescriptorsFromScaffoldIds(List<int> scaffoldIds, ScaffoldFilter? filter);
		Task<PoreInfoDto?> GetPoreInfo(int scaffoldId);
		Task<PoreInfoScaffoldGroupDto?> GetPoreInfoForScaffoldGroup(int scaffoldGroupId);


	}
}