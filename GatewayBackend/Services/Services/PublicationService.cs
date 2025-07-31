
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.Extensions.Logging;
using Repositories.IRepositories;
using Repositories.Repositories;
using Services.IServices;

namespace Services.Services
{	public class PublicationService : IPublicationService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IPublicationRepository _publicationRepository;
		private readonly ILogger<PublicationService> _logger;

		public PublicationService(DataContext context, IModelMapper modelMapper, IPublicationRepository publicationRepository, ILogger<PublicationService> logger)
		{
			_context = context;
			_modelMapper = modelMapper;
			_publicationRepository = publicationRepository;
			_logger = logger;
		}

		public async Task CreatePublication(PublicationToCreateDto publicationToCreate)
		{
			try
			{
				var publication = _modelMapper.MapToPublication(publicationToCreate);
				_publicationRepository.Add(publication);

				await _context.SaveChangesAsync();
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error saving publication");
			}

		}

		public async Task<(bool Succeeded, string ErrorMessage, IEnumerable<PublicationSummaryDto>? publications)> GetAllPublicationSummaries()
		{
			try
			{
				var publications = await _publicationRepository.GetAllPublicationSummariesAsync();
				return (true, "", publications);
			}
			catch (Exception ex)
			{
				return (false, ex.Message, null);
			}
		}
	}
}