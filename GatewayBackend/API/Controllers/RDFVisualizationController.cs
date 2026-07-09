using Microsoft.AspNetCore.Mvc;
using API.Models;
using Services.IServices;

namespace API.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public sealed class RDFVisualizationController : ControllerBase
	{
		private readonly IRdfScaffoldService _rdfScaffoldService;
		private readonly ILogger<RDFVisualizationController> _logger;

		public RDFVisualizationController(IRdfScaffoldService rdfScaffoldService, ILogger<RDFVisualizationController> logger)
		{
			_rdfScaffoldService = rdfScaffoldService;
			_logger = logger;
		}

		[HttpGet("graph")]
		public async Task<IActionResult> GetGraph([FromQuery] int? limit = null)
		{
			try
			{
				var graph = await _rdfScaffoldService.GetGraphAsync(limit, HttpContext.RequestAborted);
				return Ok(graph);
			}
			catch (HttpRequestException ex)
			{
				_logger.LogError(ex, "Failed to connect to Fuseki for RDF graph query");
				return StatusCode(503, new ApiResponse<string>(503, $"RDF database unavailable: {ex.Message}"));
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "RDF graph query failed");
				return StatusCode(500, new ApiResponse<string>(500, $"RDF query error: {ex.Message}"));
			}
		}

		[HttpGet("graph/summary")]
		public async Task<IActionResult> GetGraphSummary()
		{
			try
			{
				var summary = await _rdfScaffoldService.GetOntologySummaryAsync(HttpContext.RequestAborted);
				return Ok(summary);
			}
			catch (HttpRequestException ex)
			{
				_logger.LogError(ex, "Failed to connect to Fuseki for RDF ontology summary");
				return StatusCode(503, new ApiResponse<string>(503, $"RDF database unavailable: {ex.Message}"));
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "RDF ontology summary query failed");
				return StatusCode(500, new ApiResponse<string>(500, $"RDF query error: {ex.Message}"));
			}
		}
	}
}
