# Use the official .NET SDK image to build the project
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy solution and project files
COPY *.sln ./
COPY API/API.csproj ./API/
COPY Data/Data.csproj ./Data/
COPY Infrastructure/Infrastructure.csproj ./Infrastructure/
COPY Repositories/Repositories.csproj ./Repositories/
COPY Services/Services.csproj ./Services/

# Restore dependencies
RUN dotnet restore

# Copy the entire application source code
COPY . .

# Ensure SeedData is copied before publish
RUN mkdir -p ./Data/SeedData
COPY ./Data/SeedData ./Data/SeedData

# Publish the application
RUN dotnet publish -c Release -o /out

# Create the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .

# Ensure SeedData is copied into the final runtime image
COPY --from=build /app/Data/SeedData ./Data/SeedData

# Expose necessary ports
EXPOSE 5000

# Ensure the app runs in production mode
ENV ASPNETCORE_ENVIRONMENT=${ASPNETCORE_ENVIRONMENT}

# Set the entry point for the application
ENTRYPOINT ["dotnet", "API.dll"]