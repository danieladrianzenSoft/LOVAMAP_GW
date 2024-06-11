<h1>LOVAMAP Gateway</h1>

<h2>Overview</h2>

LOVAMAP_GW (LOVAMAP Gateway) is a full-stack web application that provides accessibility to the data (and, coming soon, functionality) of LOVAMAP, a computational tool developed by the Segura Lab at Duke University to analyze granular materials.

<h2>Dependencies</h2>

<h3>Backend</h3>

The backend is a web api in .NET 8.0, using Entity Framework (EF) as the ORM interacting with a PosgtgreSQL relational database. Migrations are included for quick database setup. All package dependencies are listed in API/API.csproj.

Addition of appsettings.json and appsettings.Development.json files are needed to run the backend properly. These file should have the following structure: 

<pre>
	<code>
	{
		"ConnectionStrings": {
			"LOVAMAP_DB": {PostgreSQL connection string}
		},
		"Jwt": {
			"Issuer": {Token user},
			"Key": {512 bit token key}
		},
		"AllowedHosts": "*"
	} 
	</code>
</pre>

	
To initiate, after adding the appsettings files and customizing with a valid database connection string, run:

<pre>
	<code>
		dotnet watch run --project API
	</code>
</pre>


<h3>Frontend</h3>
The frontend consists of a React v18.3.1 applciation with Typescript v5.4.5. TailwindCSS is used for styling, MobX for state management, Axios for http requests to the backend, Formik for forms, and Yup for validation. History is also used for navigation and xlsx for generation of custom scaffold descriptor download files. All dependencies and corresponding versions are listed in GatewayUI/react-ui/package.json. To initiate, run:

<pre>
	<code>
		npm install
		npm start
	</code>
</pre>
