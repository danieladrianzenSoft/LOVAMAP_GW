using Microsoft.AspNetCore.Mvc;
using Services.IServices;

namespace API.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public sealed class RDFVisualizationController : ControllerBase
	{
		private readonly IRdfScaffoldService _rdfScaffoldService;

		public RDFVisualizationController(IRdfScaffoldService rdfScaffoldService)
		{
			_rdfScaffoldService = rdfScaffoldService;
		}

		[HttpGet("graph")]
		public async Task<IActionResult> GetGraph([FromQuery] int? limit = null)
		{
			var graph = await _rdfScaffoldService.GetGraphAsync(limit, HttpContext.RequestAborted);
			return Ok(graph);
		}

		[HttpGet("graph/summary")]
		public async Task<IActionResult> GetGraphSummary()
		{
			var summary = await _rdfScaffoldService.GetOntologySummaryAsync(HttpContext.RequestAborted);
			return Ok(summary);
		}
	}
}
