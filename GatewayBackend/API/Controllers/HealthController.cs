using Microsoft.AspNetCore.Mvc;
using Data;


namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
		private readonly DataContext _context;
		private readonly ILogger<HealthController> _logger;


        public HealthController(DataContext context, ILogger<HealthController> logger)
        {
            _context = context;
			_logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetHealth()
        {
            try
            {
                var canConnect = await _context.Database.CanConnectAsync();
                if (!canConnect)
                    return StatusCode(503, "Cannot connect to database");

                return Ok("Healthy");
            }
            catch (Exception ex)
            {
				_logger.LogError(ex, "Unhealthy");
                return StatusCode(500, "Unhealthy");
            }
        }
    }
}