using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IPublicationService
	{
		Task CreatePublication(PublicationToCreateDto publicationToCreate);
	}
}