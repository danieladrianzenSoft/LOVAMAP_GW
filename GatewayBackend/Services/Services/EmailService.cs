using Services.IServices;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using System.Text;

namespace Services.Services
{
	public class EmailService : IEmailService
	{
		private readonly HttpClient _httpClient;
		private readonly IConfiguration _configuration;
		private readonly ILogger<EmailService> _logger;


		public EmailService(HttpClient httpClient, IConfiguration configuration, ILogger<EmailService> logger)
		{
			_httpClient = httpClient;
			_configuration = configuration;
			_logger = logger;
		}

		public async Task<(bool Succeeded, string ErrorMessage)> SendEmailAsync(string toEmail, string subject, string templateId, Dictionary<string, string> variables)
		{
			var apiKey = _configuration["MailerSend:ApiKey"];
			var senderEmail = _configuration["MailerSend:SenderEmail"];
			var senderName = _configuration["MailerSend:SenderName"];

			var request = new HttpRequestMessage(HttpMethod.Post, "https://api.mailersend.com/v1/email");

			request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

			// var toName = variables.TryGetValue("name", out var extractedName) ? extractedName : "user";

			var payload = new
			{
				from = new { email = senderEmail, name = senderName },
				to = new[] { new { email = toEmail } },
				subject = subject,
				template_id = templateId,
				personalization = new object[]
				{
					new
					{
						email = toEmail,
						data = variables
					}
				}
			};

			request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

			try
			{
				var response = await _httpClient.SendAsync(request);
				var responseBody = await response.Content.ReadAsStringAsync();
				_logger.LogInformation("MailerSend Response: {StatusCode} - {Body}", response.StatusCode, responseBody);

				// try to get x-message-id header specifically
				if (response.Headers.TryGetValues("x-message-id", out var vals))
				{
					var messageId = string.Join(",", vals);
					_logger.LogInformation("MailerSend x-message-id: {MessageId}", messageId);
				}

				if (!response.IsSuccessStatusCode)
				{
					return (false, $"MailerSend API returned {response.StatusCode}: {responseBody}");
				}

				return (true, "");

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error sending test email");
				return (false, ex.Message);
				
			}
		}
	}
}
