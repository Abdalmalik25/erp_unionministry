// Sample Power Query M queries for the National Labor Platform
// Copy and paste these into Power BI's Advanced Editor to get started

// ============================================================================
// Query 1: All Active Workers with Salary Analysis
// ============================================================================
let
    BaseUrl = "https://api.yourplatform.ye",
    ApiKey = "YOUR_API_KEY_HERE",
    
    // Build OData query
    Url = BaseUrl & "/api/odata/v4/Workers?" &
          "$filter=status eq 'active'" &
          "&$select=id,full_name_ar,full_name_en,national_id,profession,governorate,monthly_salary,contract_type" &
          "&$expand=employer($select=name_ar,registration_number)" &
          "&$orderby=monthly_salary desc" &
          "&$top=1000",
    
    Response = Json.Document(
        Web.Contents(
            Url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json",
                    #"OData-MaxVersion" = "4.0"
                ]
            ]
        )
    ),
    
    Values = Response[value],
    AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(AsTable, "Column1", 
        {"id", "full_name_ar", "full_name_en", "national_id", "profession", "governorate", "monthly_salary", "contract_type", "employer"},
        {"id", "full_name_ar", "full_name_en", "national_id", "profession", "governorate", "monthly_salary", "contract_type", "employer"}),
    
    // Expand employer
    ExpandedEmployer = Table.ExpandRecordColumn(Expanded, "employer",
        {"name_ar", "registration_number"},
        {"employer_name", "employer_registration"}),
    
    // Data type conversions
    Typed = Table.TransformColumnTypes(ExpandedEmployer, {
        {"id", Int64.Type},
        {"monthly_salary", Number.Type},
        {"national_id", type text}
    })
in
    Typed


// ============================================================================
// Query 2: Monthly Inspection Trends (Last 12 Months)
// ============================================================================
let
    BaseUrl = "https://api.yourplatform.ye",
    ApiKey = "YOUR_API_KEY_HERE",
    
    // Calculate date 12 months ago
    StartDate = Date.AddMonths(DateTime.Date(DateTime.LocalNow()), -12),
    StartDateStr = Date.ToText(StartDate, "yyyy-MM-dd"),
    
    Url = BaseUrl & "/api/odata/v4/Inspections?" &
          "$filter=scheduled_date ge " & StartDateStr &
          "&$select=id,inspection_type,status,scheduled_date,completed_date,governorate,findings_count,violations_count" &
          "&$orderby=scheduled_date desc" &
          "&$count=true&$top=5000",
    
    Response = Json.Document(
        Web.Contents(
            Url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json"
                ]
            ]
        )
    ),
    
    Values = Response[value],
    AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(AsTable, "Column1",
        {"id", "inspection_type", "status", "scheduled_date", "completed_date", "governorate", "findings_count", "violations_count"},
        {"id", "inspection_type", "status", "scheduled_date", "completed_date", "governorate", "findings_count", "violations_count"}),
    
    Typed = Table.TransformColumnTypes(Expanded, {
        {"id", Int64.Type},
        {"scheduled_date", type date},
        {"completed_date", type date},
        {"findings_count", Int64.Type},
        {"violations_count", Int64.Type}
    })
in
    Typed


// ============================================================================
// Query 3: Employer Compliance Dashboard
// ============================================================================
let
    BaseUrl = "https://api.yourplatform.ye",
    ApiKey = "YOUR_API_KEY_HERE",
    
    Url = BaseUrl & "/api/odata/v4/Employers?" &
          "$filter=status ne 'deleted'" &
          "&$select=id,name_ar,name_en,registration_number,license_expiry,employee_count,governorate,economic_activity,status" &
          "&$expand=violations($select=id,severity,status),inspections($select=id,result,completed_date)" &
          "&$top=2000",
    
    Response = Json.Document(
        Web.Contents(
            Url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json"
                ]
            ]
        )
    ),
    
    Values = Response[value],
    AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(AsTable, "Column1",
        {"id", "name_ar", "name_en", "registration_number", "license_expiry", "employee_count", "governorate", "economic_activity", "status", "violations", "inspections"},
        {"id", "name_ar", "name_en", "registration_number", "license_expiry", "employee_count", "governorate", "economic_activity", "status", "violations", "inspections"}),
    
    // Add calculated columns
    WithDays = Table.AddColumn(Expanded, "days_until_expiry", each 
        Duration.Days([license_expiry] - DateTime.Date(DateTime.LocalNow())), Int64.Type),
    
    WithCompliance = Table.AddColumn(WithDays, "is_compliant", each
        [status] = "active" and [days_until_expiry] > 30, type logical),
    
    Typed = Table.TransformColumnTypes(WithCompliance, {
        {"id", Int64.Type},
        {"license_expiry", type date},
        {"employee_count", Int64.Type}
    })
in
    Typed


// ============================================================================
// Query 4: Salary Analysis by Governorate and Sector
// ============================================================================
let
    BaseUrl = "https://api.yourplatform.ye",
    ApiKey = "YOUR_API_KEY_HERE",
    
    Url = BaseUrl & "/api/odata/v4/Workers?" &
          "$filter=status eq 'active' and monthly_salary gt 0" &
          "&$apply=groupby((governorate,profession),aggregate(monthly_salary with average as avg_salary,id with count as worker_count))" &
          "&$top=500",
    
    Response = Json.Document(
        Web.Contents(
            Url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json"
                ]
            ]
        )
    ),
    
    Values = Response[value],
    AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(AsTable, "Column1",
        {"governorate", "profession", "avg_salary", "worker_count"},
        {"governorate", "profession", "avg_salary", "worker_count"}),
    
    Typed = Table.TransformColumnTypes(Expanded, {
        {"avg_salary", Number.Type},
        {"worker_count", Int64.Type}
    })
in
    Typed


// ============================================================================
// Query 5: License Expiry Tracker (Next 90 Days)
// ============================================================================
let
    BaseUrl = "https://api.yourplatform.ye",
    ApiKey = "YOUR_API_KEY_HERE",
    
    Today = DateTime.Date(DateTime.LocalNow()),
    FutureDate = Date.AddDays(Today, 90),
    TodayStr = Date.ToText(Today, "yyyy-MM-dd"),
    FutureStr = Date.ToText(FutureDate, "yyyy-MM-dd"),
    
    Url = BaseUrl & "/api/odata/v4/Licenses?" &
          "$filter=expiry_date ge " & TodayStr & " and expiry_date le " & FutureStr &
          "&$select=id,license_number,type,status,issue_date,expiry_date,holder_name" &
          "&$orderby=expiry_date asc" &
          "&$top=1000",
    
    Response = Json.Document(
        Web.Contents(
            Url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json"
                ]
            ]
        )
    ),
    
    Values = Response[value],
    AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(AsTable, "Column1",
        {"id", "license_number", "type", "status", "issue_date", "expiry_date", "holder_name"},
        {"id", "license_number", "type", "status", "issue_date", "expiry_date", "holder_name"}),
    
    WithDaysLeft = Table.AddColumn(Expanded, "days_until_expiry", each
        Duration.Days([expiry_date] - Today), Int64.Type),
    
    WithUrgency = Table.AddColumn(WithDaysLeft, "urgency", each
        if [days_until_expiry] <= 7 then "Critical"
        else if [days_until_expiry] <= 30 then "High"
        else if [days_until_expiry] <= 60 then "Medium"
        else "Low", type text),
    
    Typed = Table.TransformColumnTypes(WithUrgency, {
        {"id", Int64.Type},
        {"issue_date", type date},
        {"expiry_date", type date}
    })
in
    Typed


// ============================================================================
// Query 6: Dispute Resolution Performance
// ============================================================================
let
    BaseUrl = "https://api.yourplatform.ye",
    ApiKey = "YOUR_API_KEY_HERE",
    
    Url = BaseUrl & "/api/odata/v4/Disputes?" &
          "$filter=filed_date ge 2024-01-01T00:00:00Z" &
          "&$select=id,dispute_type,status,filed_date,resolution_date,resolution_type,amount_claimed,amount_awarded" &
          "&$orderby=filed_date desc" &
          "&$top=2000",
    
    Response = Json.Document(
        Web.Contents(
            Url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json"
                ]
            ]
        )
    ),
    
    Values = Response[value],
    AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(AsTable, "Column1",
        {"id", "dispute_type", "status", "filed_date", "resolution_date", "resolution_type", "amount_claimed", "amount_awarded"},
        {"id", "dispute_type", "status", "filed_date", "resolution_date", "resolution_type", "amount_claimed", "amount_awarded"}),
    
    WithResolutionDays = Table.AddColumn(Expanded, "resolution_days", each
        if [resolution_date] <> null then 
            Duration.Days([resolution_date] - [filed_date])
        else null, Int64.Type),
    
    Typed = Table.TransformColumnTypes(WithResolutionDays, {
        {"id", Int64.Type},
        {"filed_date", type date},
        {"resolution_date", type date},
        {"amount_claimed", Number.Type},
        {"amount_awarded", Number.Type}
    })
in
    Typed


// ============================================================================
// Query 7: Training Program Completion Rates
// ============================================================================
let
    BaseUrl = "https://api.yourplatform.ye",
    ApiKey = "YOUR_API_KEY_HERE",
    
    Url = BaseUrl & "/api/odata/v4/Training?" &
          "$filter=start_date ge 2024-01-01T00:00:00Z" &
          "&$select=id,program_name,program_type,status,start_date,end_date,enrolled_count,completed_count" &
          "&$top=1000",
    
    Response = Json.Document(
        Web.Contents(
            Url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json"
                ]
            ]
        )
    ),
    
    Values = Response[value],
    AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(AsTable, "Column1",
        {"id", "program_name", "program_type", "status", "start_date", "end_date", "enrolled_count", "completed_count"},
        {"id", "program_name", "program_type", "status", "start_date", "end_date", "enrolled_count", "completed_count"}),
    
    WithCompletionRate = Table.AddColumn(Expanded, "completion_rate", each
        if [enrolled_count] > 0 then [completed_count] / [enrolled_count] else 0, Number.Type),
    
    WithDuration = Table.AddColumn(WithCompletionRate, "duration_days", each
        if [end_date] <> null and [start_date] <> null then
            Duration.Days([end_date] - [start_date])
        else null, Int64.Type),
    
    Typed = Table.TransformColumnTypes(WithDuration, {
        {"id", Int64.Type},
        {"start_date", type date},
        {"end_date", type date},
        {"enrolled_count", Int64.Type},
        {"completed_count", Int64.Type}
    })
in
    Typed


// ============================================================================
// Query 8: Payment Collection Rates
// ============================================================================
let
    BaseUrl = "https://api.yourplatform.ye",
    ApiKey = "YOUR_API_KEY_HERE",
    
    Url = BaseUrl & "/api/odata/v4/Payments?" &
          "$filter=due_date ge 2024-01-01T00:00:00Z" &
          "&$select=id,payment_type,status,amount,currency,due_date,paid_date,employer_id" &
          "&$orderby=due_date desc" &
          "&$top=5000",
    
    Response = Json.Document(
        Web.Contents(
            Url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & ApiKey,
                    #"Accept" = "application/json"
                ]
            ]
        )
    ),
    
    Values = Response[value],
    AsTable = Table.FromList(Values, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(AsTable, "Column1",
        {"id", "payment_type", "status", "amount", "currency", "due_date", "paid_date", "employer_id"},
        {"id", "payment_type", "status", "amount", "currency", "due_date", "paid_date", "employer_id"}),
    
    WithDaysToPay = Table.AddColumn(Expanded, "days_to_pay", each
        if [paid_date] <> null and [due_date] <> null then
            Duration.Days([paid_date] - [due_date])
        else null, Int64.Type),
    
    WithOnTime = Table.AddColumn(WithDaysToPay, "is_on_time", each
        if [paid_date] <> null and [due_date] <> null then
            [paid_date] <= [due_date]
        else null, type logical),
    
    Typed = Table.TransformColumnTypes(WithOnTime, {
        {"id", Int64.Type},
        {"amount", Number.Type},
        {"due_date", type date},
        {"paid_date", type date}
    })
in
    Typed


// ============================================================================
// Helper Function: Build OData Filter
// ============================================================================
(conditions as list) as text =>
    let
        Combine = (list as list, separator as text) as text =>
            if List.Count(list) = 0 then ""
            else if List.Count(list) = 1 then list{0}
            else list{0} & separator & @Combine(List.Skip(list), separator),
        
        Combined = Combine(conditions, " and ")
    in
        if Combined <> "" then "$filter=" & Uri.EscapeDataString(Combined) else ""


// ============================================================================
// Helper Function: Safe API Call
// ============================================================================
(url as text, apiKey as text) as any =>
    let
        Response = Web.Contents(
            url,
            [
                Headers = [
                    #"Authorization" = "Bearer " & apiKey,
                    #"Accept" = "application/json",
                    #"OData-MaxVersion" = "4.0"
                ],
                ManualStatusHandling = {401, 403, 404, 429, 500, 502, 503, 504}
            ]
        ),
        
        Status = Value.Metadata(Response)[Response.Status],
        Result = if Status = 200 then
            Json.Document(Response)
        else if Status = 401 then
            error Error.Record("Authentication Failed", "Invalid API key or expired token", Status)
        else if Status = 403 then
            error Error.Record("Permission Denied", "Insufficient permissions for this resource", Status)
        else if Status = 404 then
            error Error.Record("Not Found", "The requested resource was not found", Status)
        else if Status = 429 then
            error Error.Record("Rate Limited", "Too many requests, please try again later", Status)
        else
            error Error.Record("Server Error", "An unexpected error occurred", Status)
    in
        Result
