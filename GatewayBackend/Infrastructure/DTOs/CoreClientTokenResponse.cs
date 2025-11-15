public record CoreClientConnectRequest(string ClientId, string ClientSecret, string? Scope = null);

public sealed class CoreClientTokenResponse
{
    public string access_token { get; set; } = null!;
    public string token_type { get; set; } = "Bearer";
    public int expires_in { get; set; } = 3600;
}