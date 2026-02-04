using Microsoft.AspNetCore.Mvc;
using Infrastructure.DTOs;
using Services.IServices;

namespace API.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public sealed class RDFTestController : ControllerBase
	{
		private readonly IRdfScaffoldService _rdfScaffoldService;

		public RDFTestController(IRdfScaffoldService rdfScaffoldService)
		{
			_rdfScaffoldService = rdfScaffoldService;
		}

		[HttpGet("scaffolds")]
		public async Task<IActionResult> GetScaffolds(
			[FromQuery] int? particleSizeUm = null,
			[FromQuery] string? particleShape = null,
			[FromQuery] decimal? voidVolumeFraction = null,
			[FromQuery] decimal? bioMeasurementX = null,
			[FromQuery] decimal? bioMeasurementY = null)
		{
			try
			{
				var parsed = BuildStandardFilters(
					particleSizeUm,
					particleShape,
					voidVolumeFraction,
					bioMeasurementX,
					bioMeasurementY
				);
				var results = await _rdfScaffoldService.GetScaffoldsAsync(
					parsed,
					HttpContext.RequestAborted
				);
				return Ok(results);
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(ex.Message);
			}
			catch (ArgumentException ex)
			{
				return BadRequest(ex.Message);
			}
		}

		[HttpGet("scaffolds/raw")]
		public async Task<IActionResult> GetScaffoldsRaw(
			[FromQuery] int? particleSizeUm = null,
			[FromQuery] string? particleShape = null,
			[FromQuery] decimal? voidVolumeFraction = null,
			[FromQuery] decimal? bioMeasurementX = null,
			[FromQuery] decimal? bioMeasurementY = null)
		{
			try
			{
				var parsed = BuildStandardFilters(
					particleSizeUm,
					particleShape,
					voidVolumeFraction,
					bioMeasurementX,
					bioMeasurementY
				);
				var json = await _rdfScaffoldService.GetScaffoldsRawAsync(
					parsed,
					HttpContext.RequestAborted
				);
				return Content(json, "application/sparql-results+json");
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(ex.Message);
			}
			catch (ArgumentException ex)
			{
				return BadRequest(ex.Message);
			}
		}

		[HttpPost("scaffolds")]
		public async Task<IActionResult> AddScaffold([FromBody] RdfScaffoldCreateDto scaffold)
		{
			if (scaffold == null)
			{
				return BadRequest("Payload is required.");
			}

			await _rdfScaffoldService.AddScaffoldAsync(scaffold, HttpContext.RequestAborted);
			return Ok();
		}

		[HttpPut("scaffolds/{scaffoldId:int}")]
		public async Task<IActionResult> UpdateScaffold(
			[FromRoute] int scaffoldId,
			[FromBody] RdfScaffoldCreateDto scaffold)
		{
			if (scaffold == null)
			{
				return BadRequest("Payload is required.");
			}

			if (scaffoldId <= 0)
			{
				return BadRequest("scaffoldId must be positive.");
			}

			scaffold.ScaffoldId = scaffoldId;
			await _rdfScaffoldService.UpdateScaffoldAsync(scaffoldId, scaffold, HttpContext.RequestAborted);
			return Ok();
		}

		[HttpDelete("scaffolds/{scaffoldId:int}")]
		public async Task<IActionResult> DeleteScaffold([FromRoute] int scaffoldId)
		{
			if (scaffoldId <= 0)
			{
				return BadRequest("scaffoldId must be positive.");
			}

			await _rdfScaffoldService.DeleteScaffoldAsync(scaffoldId, HttpContext.RequestAborted);
			return Ok();
		}

		[HttpGet("scaffolds/all")]
		public async Task<IActionResult> GetAllScaffolds()
		{
			var results = await _rdfScaffoldService.GetAllScaffoldsAsync(HttpContext.RequestAborted);
			return Ok(results);
		}

		[HttpGet("scaffolds/all/raw")]
		public async Task<IActionResult> GetAllScaffoldsRaw()
		{
			var turtle = await _rdfScaffoldService.GetAllScaffoldsRawAsync(HttpContext.RequestAborted);
			return Content(turtle, "text/turtle");
		}

		private static Dictionary<string, string> BuildStandardFilters(
			int? particleSizeUm,
			string? particleShape,
			decimal? voidVolumeFraction,
			decimal? bioMeasurementX,
			decimal? bioMeasurementY)
		{
			var parsed = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

			if (particleSizeUm.HasValue)
			{
				parsed["particleSizeUm"] = particleSizeUm.Value.ToString();
			}

			if (!string.IsNullOrWhiteSpace(particleShape))
			{
				parsed["particleShape"] = particleShape;
			}

			if (voidVolumeFraction.HasValue)
			{
				parsed["voidVolumeFraction"] = voidVolumeFraction.Value.ToString();
			}

			if (bioMeasurementX.HasValue)
			{
				parsed["bioMeasurementX"] = bioMeasurementX.Value.ToString();
			}

			if (bioMeasurementY.HasValue)
			{
				parsed["bioMeasurementY"] = bioMeasurementY.Value.ToString();
			}

			return parsed;
		}
	}
}
