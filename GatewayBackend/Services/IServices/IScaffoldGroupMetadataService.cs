using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IScaffoldGroupMetadataService
	{
		ScaffoldGroup SetScaffoldGroupNameAndComments(ScaffoldGroup scaffoldGroup);
		string GetDistributionType(ScaffoldGroup scaffoldGroup);
		PackingConfiguration ParsePackingConfiguration(object? input);
		string CapitalizeFirstLetter(string text);
	}
}
