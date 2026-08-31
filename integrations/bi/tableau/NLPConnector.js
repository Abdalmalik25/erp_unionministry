// Tableau Web Data Connector for the Yemen National Labor Platform
// This WDC provides access to OData v4 endpoints from Tableau Desktop and Server
// Compatible with Tableau 2019.4+

(function() {
    'use strict';
    
    // Connector definition
    var myConnector = tableau.makeConnector();
    
    // Configuration
    var BASE_URL = 'https://api.yourplatform.ye';
    var API_VERSION = 'v4';
    
    // Connection parameters
    var connectionParams = {
        apiKey: '',
        filter: '',
        pageSize: 1000
    };
    
    // Table definitions matching the TACO file
    var tableDefinitions = {
        Workers: {
            endpoint: '/api/odata/' + API_VERSION + '/Workers',
            fields: [
                { id: 'id', alias: 'Worker ID', dataType: 'int' },
                { id: 'full_name_ar', alias: 'Full Name (Arabic)', dataType: 'string' },
                { id: 'full_name_en', alias: 'Full Name (English)', dataType: 'string' },
                { id: 'national_id', alias: 'National ID', dataType: 'string' },
                { id: 'date_of_birth', alias: 'Date of Birth', dataType: 'date' },
                { id: 'gender', alias: 'Gender', dataType: 'string' },
                { id: 'nationality', alias: 'Nationality', dataType: 'string' },
                { id: 'profession', alias: 'Profession', dataType: 'string' },
                { id: 'qualification', alias: 'Qualification', dataType: 'string' },
                { id: 'years_experience', alias: 'Years of Experience', dataType: 'int' },
                { id: 'monthly_salary', alias: 'Monthly Salary', dataType: 'float' },
                { id: 'contract_type', alias: 'Contract Type', dataType: 'string' },
                { id: 'governorate', alias: 'Governorate', dataType: 'string' },
                { id: 'district', alias: 'District', dataType: 'string' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'employer_id', alias: 'Employer ID', dataType: 'int' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        },
        Employers: {
            endpoint: '/api/odata/' + API_VERSION + '/Employers',
            fields: [
                { id: 'id', alias: 'Employer ID', dataType: 'int' },
                { id: 'name_ar', alias: 'Name (Arabic)', dataType: 'string' },
                { id: 'name_en', alias: 'Name (English)', dataType: 'string' },
                { id: 'registration_number', alias: 'Registration Number', dataType: 'string' },
                { id: 'commercial_record', alias: 'Commercial Record', dataType: 'string' },
                { id: 'tax_number', alias: 'Tax Number', dataType: 'string' },
                { id: 'economic_activity', alias: 'Economic Activity', dataType: 'string' },
                { id: 'sector', alias: 'Sector', dataType: 'string' },
                { id: 'employee_count', alias: 'Employee Count', dataType: 'int' },
                { id: 'yemeni_count', alias: 'Yemeni Employees', dataType: 'int' },
                { id: 'expatriate_count', alias: 'Expatriate Employees', dataType: 'int' },
                { id: 'governorate', alias: 'Governorate', dataType: 'string' },
                { id: 'district', alias: 'District', dataType: 'string' },
                { id: 'phone', alias: 'Phone', dataType: 'string' },
                { id: 'email', alias: 'Email', dataType: 'string' },
                { id: 'license_number', alias: 'License Number', dataType: 'string' },
                { id: 'license_expiry', alias: 'License Expiry', dataType: 'date' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        },
        Inspections: {
            endpoint: '/api/odata/' + API_VERSION + '/Inspections',
            fields: [
                { id: 'id', alias: 'Inspection ID', dataType: 'int' },
                { id: 'inspection_type', alias: 'Inspection Type', dataType: 'string' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'scheduled_date', alias: 'Scheduled Date', dataType: 'datetime' },
                { id: 'completed_date', alias: 'Completed Date', dataType: 'datetime' },
                { id: 'inspector_id', alias: 'Inspector ID', dataType: 'int' },
                { id: 'employer_id', alias: 'Employer ID', dataType: 'int' },
                { id: 'governorate', alias: 'Governorate', dataType: 'string' },
                { id: 'findings_count', alias: 'Findings Count', dataType: 'int' },
                { id: 'violations_count', alias: 'Violations Count', dataType: 'int' },
                { id: 'result', alias: 'Result', dataType: 'string' },
                { id: 'notes', alias: 'Notes', dataType: 'string' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        },
        Violations: {
            endpoint: '/api/odata/' + API_VERSION + '/Violations',
            fields: [
                { id: 'id', alias: 'Violation ID', dataType: 'int' },
                { id: 'violation_code', alias: 'Violation Code', dataType: 'string' },
                { id: 'violation_type', alias: 'Violation Type', dataType: 'string' },
                { id: 'severity', alias: 'Severity', dataType: 'string' },
                { id: 'description', alias: 'Description', dataType: 'string' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'detected_date', alias: 'Detected Date', dataType: 'date' },
                { id: 'resolved_date', alias: 'Resolved Date', dataType: 'date' },
                { id: 'fine_amount', alias: 'Fine Amount', dataType: 'float' },
                { id: 'currency', alias: 'Currency', dataType: 'string' },
                { id: 'inspection_id', alias: 'Inspection ID', dataType: 'int' },
                { id: 'employer_id', alias: 'Employer ID', dataType: 'int' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        },
        Licenses: {
            endpoint: '/api/odata/' + API_VERSION + '/Licenses',
            fields: [
                { id: 'id', alias: 'License ID', dataType: 'int' },
                { id: 'license_number', alias: 'License Number', dataType: 'string' },
                { id: 'type', alias: 'Type', dataType: 'string' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'issue_date', alias: 'Issue Date', dataType: 'date' },
                { id: 'expiry_date', alias: 'Expiry Date', dataType: 'date' },
                { id: 'holder_name', alias: 'Holder Name', dataType: 'string' },
                { id: 'holder_id', alias: 'Holder ID', dataType: 'int' },
                { id: 'issuer', alias: 'Issuer', dataType: 'string' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        },
        Contracts: {
            endpoint: '/api/odata/' + API_VERSION + '/Contracts',
            fields: [
                { id: 'id', alias: 'Contract ID', dataType: 'int' },
                { id: 'contract_number', alias: 'Contract Number', dataType: 'string' },
                { id: 'contract_type', alias: 'Contract Type', dataType: 'string' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'start_date', alias: 'Start Date', dataType: 'date' },
                { id: 'end_date', alias: 'End Date', dataType: 'date' },
                { id: 'monthly_salary', alias: 'Monthly Salary', dataType: 'float' },
                { id: 'currency', alias: 'Currency', dataType: 'string' },
                { id: 'worker_id', alias: 'Worker ID', dataType: 'int' },
                { id: 'employer_id', alias: 'Employer ID', dataType: 'int' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        },
        Payments: {
            endpoint: '/api/odata/' + API_VERSION + '/Payments',
            fields: [
                { id: 'id', alias: 'Payment ID', dataType: 'int' },
                { id: 'payment_type', alias: 'Payment Type', dataType: 'string' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'amount', alias: 'Amount', dataType: 'float' },
                { id: 'currency', alias: 'Currency', dataType: 'string' },
                { id: 'due_date', alias: 'Due Date', dataType: 'date' },
                { id: 'paid_date', alias: 'Paid Date', dataType: 'date' },
                { id: 'employer_id', alias: 'Employer ID', dataType: 'int' },
                { id: 'reference_number', alias: 'Reference Number', dataType: 'string' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        },
        Disputes: {
            endpoint: '/api/odata/' + API_VERSION + '/Disputes',
            fields: [
                { id: 'id', alias: 'Dispute ID', dataType: 'int' },
                { id: 'dispute_number', alias: 'Dispute Number', dataType: 'string' },
                { id: 'dispute_type', alias: 'Dispute Type', dataType: 'string' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'filed_date', alias: 'Filed Date', dataType: 'date' },
                { id: 'resolution_date', alias: 'Resolution Date', dataType: 'date' },
                { id: 'resolution_type', alias: 'Resolution Type', dataType: 'string' },
                { id: 'amount_claimed', alias: 'Amount Claimed', dataType: 'float' },
                { id: 'amount_awarded', alias: 'Amount Awarded', dataType: 'float' },
                { id: 'worker_id', alias: 'Worker ID', dataType: 'int' },
                { id: 'employer_id', alias: 'Employer ID', dataType: 'int' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        },
        Training: {
            endpoint: '/api/odata/' + API_VERSION + '/Training',
            fields: [
                { id: 'id', alias: 'Training ID', dataType: 'int' },
                { id: 'program_name', alias: 'Program Name', dataType: 'string' },
                { id: 'program_type', alias: 'Program Type', dataType: 'string' },
                { id: 'status', alias: 'Status', dataType: 'string' },
                { id: 'start_date', alias: 'Start Date', dataType: 'date' },
                { id: 'end_date', alias: 'End Date', dataType: 'date' },
                { id: 'enrolled_count', alias: 'Enrolled Count', dataType: 'int' },
                { id: 'completed_count', alias: 'Completed Count', dataType: 'int' },
                { id: 'certificate_issued', alias: 'Certificate Issued', dataType: 'bool' },
                { id: 'provider', alias: 'Provider', dataType: 'string' },
                { id: 'governorate', alias: 'Governorate', dataType: 'string' },
                { id: 'created_at', alias: 'Created At', dataType: 'datetime' }
            ]
        }
    };
    
    // ============================================
    // Tableau WDC Required Functions
    // ============================================
    
    /**
     * Initialize the connector
     */
    myConnector.init = function(initCallback) {
        tableau.authType = tableau.authTypeEnum.custom;
        initCallback();
    };
    
    /**
     * Get the connection data - called when user clicks "Get Data"
     */
    myConnector.getSchema = function(schemaCallback) {
        var schemas = [];
        
        // Build schema for each table
        Object.keys(tableDefinitions).forEach(function(tableName) {
            var tableDef = tableDefinitions[tableName];
            var tableSchema = {
                id: tableName,
                alias: tableName,
                columns: tableDef.fields.map(function(field) {
                    return {
                        id: field.id,
                        alias: field.alias,
                        dataType: getTableauDataType(field.dataType)
                    };
                })
            };
            schemas.push(tableSchema);
        });
        
        schemaCallback(schemas);
    };
    
    /**
     * Get the actual data
     */
    myConnector.getData = function(table, doneCallback) {
        var tableName = table.tableInfo.id;
        var tableDef = tableDefinitions[tableName];
        
        if (!tableDef) {
            tableau.abortWithError('Unknown table: ' + tableName);
            return;
        }
        
        // Build the OData query
        var queryParams = [];
        queryParams.push('$top=' + connectionParams.pageSize);
        queryParams.push('$count=true');
        
        // Add filter if specified
        if (connectionParams.filter && connectionParams.filter.trim() !== '') {
            queryParams.push('$filter=' + encodeURIComponent(connectionParams.filter));
        }
        
        var url = BASE_URL + tableDef.endpoint + '?' + queryParams.join('&');
        
        // Make the request
        $.ajax({
            url: url,
            type: 'GET',
            headers: {
                'Authorization': 'Bearer ' + connectionParams.apiKey,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            },
            success: function(data) {
                var rows = [];
                var records = data.value || [];
                
                records.forEach(function(record) {
                    var row = {};
                    tableDef.fields.forEach(function(field) {
                        row[field.id] = record[field.id] || null;
                    });
                    rows.push(row);
                });
                
                table.appendRows(rows);
                doneCallback();
            },
            error: function(xhr, status, error) {
                tableau.abortWithError('Error fetching data: ' + error);
            }
        });
    };
    
    // ============================================
    // Helper Functions
    // ============================================
    
    /**
     * Map our data types to Tableau data types
     */
    function getTableauDataType(type) {
        var typeMap = {
            'string': tableau.dataTypeEnum.string,
            'int': tableau.dataTypeEnum.int,
            'float': tableau.dataTypeEnum.float,
            'bool': tableau.dataTypeEnum.bool,
            'date': tableau.dataTypeEnum.date,
            'datetime': tableau.dataTypeEnum.datetime
        };
        return typeMap[type] || tableau.dataTypeEnum.string;
    }
    
    /**
     * Validate the connection credentials
     */
    function validateCredentials(apiKey, callback) {
        $.ajax({
            url: BASE_URL + '/api/odata/' + API_VERSION + '/',
            type: 'GET',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Accept': 'application/json'
            },
            success: function(data) {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    }
    
    // ============================================
    // Register the connector
    // ============================================
    tableau.registerConnector(myConnector);
    
    // ============================================
    // UI Event Handlers
    // ============================================
    
    $(document).ready(function() {
        // Submit button handler
        $('#submit-button').click(function() {
            var apiKey = $('#api-key-input').val().trim();
            
            if (!apiKey) {
                $('#error-message').text('API Key is required');
                $('#error-message').show();
                return;
            }
            
            // Store credentials
            connectionParams.apiKey = apiKey;
            connectionParams.filter = $('#filter-input').val().trim();
            connectionParams.pageSize = parseInt($('#page-size-input').val()) || 1000;
            
            // Validate before connecting
            validateCredentials(apiKey, function(valid) {
                if (valid) {
                    tableau.connectionName = 'National Labor Platform';
                    tableau.submit();
                } else {
                    $('#error-message').text('Invalid API Key');
                    $('#error-message').show();
                }
            });
        });
    });
    
})();
