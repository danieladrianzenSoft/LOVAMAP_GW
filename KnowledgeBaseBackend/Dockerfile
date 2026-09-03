FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

COPY KnowledgeBaseApi.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .

EXPOSE 8080

ENV ASPNETCORE_ENVIRONMENT=${ASPNETCORE_ENVIRONMENT}

ENTRYPOINT ["dotnet", "KnowledgeBaseApi.dll"]
