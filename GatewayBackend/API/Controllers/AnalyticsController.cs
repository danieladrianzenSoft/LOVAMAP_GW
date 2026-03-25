using API.Models;
using Infrastructure.DTOs;
using Microsoft.AspNetCore.Mvc;
using Services.IServices;

namespace API.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public sealed class AnalyticsController : ControllerBase
	{
		private readonly IAnalyticsService _analyticsService;

		public AnalyticsController(IAnalyticsService analyticsService)
		{
			_analyticsService = analyticsService;
		}

		[HttpGet("dashboard")]
		public async Task<IActionResult> GetDashboardAnalytics()
		{
			var data = await _analyticsService.GetDashboardAnalyticsAsync(HttpContext.RequestAborted);
			return Ok(new ApiResponse<DashboardAnalyticsDto>(200, "Dashboard analytics retrieved", data));
		}
	}
}
