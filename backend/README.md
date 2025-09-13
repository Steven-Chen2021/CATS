# CATS Backend

ASP.NET Core minimal API targeting .NET 8.

Until the SQL Server database is available, a small CSV file is used as a
temporary data source. The `/data` endpoint reads from `database/sample-data.csv`
and returns its content as JSON.
