
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Repositories.IRepositories;
using Services.IServices;
using Microsoft.Extensions.Logging;

namespace Services.Services
{	public class DownloadService : IDownloadService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IDownloadRepository _downloadRepository;
		private readonly ILogger<DownloadService> _logger;


		public DownloadService(DataContext context, IModelMapper modelMapper, IDownloadRepository downloadRepository, ILogger<DownloadService> logger)
		{
			_context = context;
			_modelMapper = modelMapper;
			_downloadRepository = downloadRepository;
			_logger = logger;
		}

		public async Task CreateDownloadRecord(string downloaderId, IEnumerable<int> scaffoldIds, IEnumerable<int> descriptorTypeIds)
		{
			try
			{
				var download = new Download
				{
					DownloaderId = downloaderId,
					CreatedAt = DateTime.UtcNow,
					ScaffoldDownloads = scaffoldIds.Select(id => new ScaffoldDownload { ScaffoldId = id }).ToList(),
					DescriptorTypeDownloads = descriptorTypeIds.Select(id => new DescriptorTypeDownload { DescriptorTypeId = id }).ToList()
				};

				_downloadRepository.Add(download);
				await _context.SaveChangesAsync();
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to create download record for user {UserId}", downloaderId);
			}
			
		}

	}
}


