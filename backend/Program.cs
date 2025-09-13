var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello, CATS!");

app.MapGet("/data", () =>
{
    var file = Path.Combine(AppContext.BaseDirectory, "sample-data.csv");
    if (!File.Exists(file))
    {
        return Results.Problem("Data file not found.");
    }

    var records = File.ReadAllLines(file)
        .Skip(1)
        .Select(line =>
        {
            var parts = line.Split(',');
            return new DataRecord(int.Parse(parts[0]), parts[1], parts[2]);
        });

    return Results.Json(records);
});

app.Run();

record DataRecord(int Id, string Name, string Value);
