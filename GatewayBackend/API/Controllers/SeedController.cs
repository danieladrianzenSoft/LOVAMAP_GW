using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

using Infrastructure.DTOs;
using Services.IServices;
using API.Models;
using Infrastructure;
using Data.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SeedController : ControllerBase
{
	private readonly ILogger<SeedController> _logger;
	private readonly ISeedingService _seedingService;

	public SeedController(ILogger<SeedController> logger,
		ISeedingService seedingService)
	{
		_seedingService = seedingService;
		_logger = logger;
	}

	[Authorize(Roles = "administrator")]
	[HttpGet("descriptors")]
	public async Task<IActionResult> GetEligibleScaffoldIdsForDescriptorSeeding([FromQuery] string name)
	{
		try
		{
			var result = await _seedingService.GetEligibleScaffoldIdsForDescriptorSeeding(name);
			return Ok(new ApiResponse<List<int>>(200, $"Found {result.Count} scaffolds eligible for '{name}'.", result));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex.Message, "Error getting eligible scaffold ids for descriptor seeding");
			return BadRequest(ex.Message);
		}
	}

	[Authorize(Roles = "administrator")]
	[HttpPost("descriptors")]
	public async Task<IActionResult> SeedDescriptor(DescriptorToSeedDto descriptorToSeed)
	{
		try
		{
			var scaffoldIds = descriptorToSeed.ScaffoldIds;
			var name = descriptorToSeed.DescriptorName;
			
			if (scaffoldIds == null || scaffoldIds.Count == 0)
				return BadRequest(new ApiResponse<string>(400, "No scaffold IDs provided."));

			var result = await _seedingService.SeedDescriptorAsync(name, scaffoldIds);
			return Ok(new ApiResponse<DescriptorSeedResultDto>(200, $"{name} seeded successfully.", result));
		}
		catch (Exception ex)
		{
			return BadRequest(ex.Message);
		}
	}
}