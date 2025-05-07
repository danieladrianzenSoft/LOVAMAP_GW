using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IEmailService
	{
		Task<(bool Succeeded, string ErrorMessage)> SendEmailAsync(string toEmail, string subject, string templateId, Dictionary<string, string> variables);
	}
}