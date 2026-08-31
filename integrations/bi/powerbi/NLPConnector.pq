// Power Query M connector for the Yemen National Labor Platform
// This connector provides direct access to OData v4 endpoints
// Compatible with Power BI Desktop, Power BI Service, Excel, and Power Query Online

[Version = "1.0.0"]
section NLPConnector;

[DataSource.Kind="NLPConnector", Publish="NLPConnector.Publish"]
shared NLPConnector.Impl = (optional baseUrl as text, optional apiKey as text) =>
    let
        // Configuration
        BaseUrl = if baseUrl = null then "https://api.yourplatform.ye" else baseUrl,
        ApiKey = if apiKey = null then "" else apiKey,
        
        // Default headers
        DefaultHeaders = [
            #"Authorization" = "Bearer " & ApiKey,
            #"Accept" = "application/json",
            #"User-Agent" = "PowerBI-NLPConnector/1.0"
        ],
        
        // OData service document
        ServiceDocument = OData.Feed(
            BaseUrl & "/api/odata/v4/",
            null,
            [
                Headers = DefaultHeaders,
                ManualCredentials = false,
                ODataVersion = 4,
                OmitValues = ODataOmitValues.Nulls,
                IncludeAnnotations = "OData.Community.Display.V1.FormattedValue"
            ]
        ),
        
        // Get available entity sets
        EntitySets = ServiceDocument[value],
        EntitySetNames = List.Transform(EntitySets, each _[name])
    in
        EntitySetNames;

[DataSource.Kind="NLPConnector"]
shared NLPConnector.Publish = [
    // UI Publishing Information
    Category = "Online Services",
    ButtonText = { "National Labor Platform" },
    Description = "Connect to the Yemen National Labor Platform BI endpoints",
    
    // Authentication
    Authentication = [
        UsernamePassword = [
            UsernameLabel = "API Client ID",
            PasswordLabel = "API Client Secret"
        ],
        Key = [
            KeyLabel = "API Key"
        ]
    ],
    
    // Icon
    IconSource = (extension as text) as text =>
        let
            icon = "data:image/svg+xml;utf8," & Uri.EscapeDataString("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#1976d2'/><text x='50' y='65' font-size='60' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'>NLP</text></svg>")
        in
            icon
];

// Function to load a specific entity set
[DataSource.Kind="NLPConnector"]
shared NLPConnector.LoadEntitySet = (entitySet as text, optional filter as text, optional select as text, optional top as number) =>
    let
        BaseUrl = "https://api.yourplatform.ye",
        ApiKey = Extension.CurrentCredential()[Key],
        
        // Build query string
        QueryParts = {},
        AddPart = (parts as list, key as text, value as text) as list =>
            if value <> null and value <> "" then
                List.Combine({parts, {key & "=" & Uri.EscapeDataString(value)}})
            else parts,
        
        QueryString = Text.Combine(
            List.Select(
                [
                    if filter <> null then "filter=" & Uri.EscapeDataString(filter) else "",
                    if select <> null then "select=" & Uri.EscapeDataString(select) else "",
                    if top <> null then "top=" & Text.From(top) else "",
                    "count=true"
                ],
                each _ <> ""
            ),
            "&"
        ),
        
        // Fetch data
        Url = BaseUrl & "/api/odata/v4/" & entitySet & 
              (if QueryString <> "" then "?" & QueryString else ""),
        
        Response = Json.Document(
            Web.Contents(
                Url,
                [
                    Headers = [
                        #"Authorization" = "Bearer " & ApiKey,
                        #"Accept" = "application/json",
                        #"OData-MaxVersion" = "4.0",
                        #"OData-Version" = "4.0"
                    ],
                    ManualStatusHandling = {404, 500}
                ]
            )
        ),
        
        // Extract values
        Values = if Record.HasFields(Response, "value") then Response[value] else {},
        AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error)
    in
        AsTable;

// Function to get entity schema
[DataSource.Kind="NLPConnector"]
shared NLPConnector.GetEntitySchema = (entitySet as text) =>
    let
        BaseUrl = "https://api.yourplatform.ye",
        ApiKey = Extension.CurrentCredential()[Key],
        
        MetadataUrl = BaseUrl & "/api/odata/v4/$metadata",
        
        Response = Web.Contents(
            MetadataUrl,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/xml"
                ]
            ]
        ),
        
        Xml = Xml.Tables(Response),
        EntityTypes = Table.SelectRows(Xml, each [Name] = "EntityType" and [Namespace] = "NLP.Models"),
        Schema = if Table.RowCount(EntityTypes) > 0 then EntityTypes{0} else null
    in
        Schema;

// Workers data with full schema
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Workers = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Workers", filter, null, 10000),
        
        // Expand columns if present
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Employers data
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Employers = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Employers", filter, null, 10000),
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Inspections data
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Inspections = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Inspections", filter, null, 10000),
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Violations data
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Violations = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Violations", filter, null, 10000),
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Licenses data
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Licenses = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Licenses", filter, null, 10000),
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Contracts data
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Contracts = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Contracts", filter, null, 10000),
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Payments data
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Payments = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Payments", filter, null, 10000),
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Disputes data
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Disputes = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Disputes", filter, null, 10000),
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Training data
[DataSource.Kind="NLPConnector"]
shared NLPConnector.Training = (optional filter as text) =>
    let
        Data = NLPConnector.LoadEntitySet("Training", filter, null, 10000),
        Expanded = if Table.HasColumns(Data, "Column1") and Record.HasFields(Data{0}[Column1]? ?? [], "id") then
            let
                FirstRow = Data{0}[Column1],
                Fields = Record.FieldNames(FirstRow),
                ExpandedTable = Table.ExpandRecordColumn(Data, "Column1", Fields, Fields)
            in
                ExpandedTable
        else Data
    in
        Expanded;

// Test connection
[DataSource.Kind="NLPConnector"]
shared NLPConnector.TestConnection = () =>
    let
        BaseUrl = "https://api.yourplatform.ye",
        ApiKey = Extension.CurrentCredential()[Key],
        
        Response = Web.Contents(
            BaseUrl & "/api/odata/v4/",
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json"
                ],
                ManualStatusHandling = {401, 403, 500}
            ]
        ),
        
        Json = Json.Document(Response),
        EntityCount = List.Count(Json[value] ?? {}),
        
        Result = if EntityCount > 0 then
            "Connected successfully. " & Text.From(EntityCount) & " entity sets available."
        else
            "Connection successful but no entity sets found."
    in
        Result;
