using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IDescriptorService
	{
		Task<DescriptorType?> GetDescriptorByName(string descriptorName);
		Task CreateDescriptorType(DescriptorTypeToCreateDto descriptorType);
		Task<ICollection<DescriptorTypeDto>> GetAllDescriptorTypes();
		Task<(IEnumerable<GlobalDescriptor>, IEnumerable<PoreDescriptor>, IEnumerable<OtherDescriptor>)> GetFilteredDescriptorsForScaffolds(IEnumerable<int> scaffoldIds, ScaffoldFilter filter);
		Task<List<ScaffoldBaseDto>> GetScaffoldsWithDescriptorsFromScaffoldIds(List<int> scaffoldIds, ScaffoldFilter? filter);
		Task<(bool Succeeded, string ErrorMessage, PoreInfoDto? poreInfo)> GetPoreInfo(int scaffoldGroupId, int? scaffoldId = null);
		Task<(bool Succeeded, string ErrorMessage, PoreInfoScaffoldGroupDto? poreInfo)> GetPoreDescriptorInfoScaffoldGroup(int scaffoldGroupId, List<int> descriptorTypeIds);
		// Task<(Dictionary<int, List<ScaffoldBaseDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>)> GetScaffoldsAndDescriptorsFromScaffoldGroupIds(IEnumerable<int> scaffoldGroupIds);
		// Task<(Dictionary<int, List<ScaffoldBaseDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>)>
		// 	GetScaffoldsAndDescriptorsFromScaffoldIds(List<int> scaffoldIds, ScaffoldFilter filter);

	}
}