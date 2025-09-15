/**
 * WOPI Host Implementation for Fabric Workload Dev Server
 * Implements Web Application Open Platform Interface for Excel Online integration
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class WOPIHostEndpoints {
  constructor() {
    this.fileStorage = new Map(); // In-memory storage for demo
    this.fileMetadata = new Map();
    this.fileLocks = new Map();
  }

  /**
   * Initialize WOPI endpoints on Express server
   */
  initializeEndpoints(app) {
    console.log('*** Initializing WOPI Host Endpoints ***');

    // WOPI Discovery endpoint
    app.get('/wopi/discovery', this.getWOPIDiscovery.bind(this));

    // CheckFileInfo - Returns file metadata
    app.get('/wopi/files/:fileId', this.checkFileInfo.bind(this));

    // GetFile - Returns file contents
    app.get('/wopi/files/:fileId/contents', this.getFileContents.bind(this));

    // PutFile - Updates file contents
    app.post('/wopi/files/:fileId/contents', this.putFileContents.bind(this));

    // Lock operations
    app.post('/wopi/files/:fileId', this.fileOperation.bind(this));

    // Create new Excel file from Lakehouse data
    app.post('/wopi/createFromLakehouse', this.createFromLakehouse.bind(this));

    // Real Excel Online embed endpoint
    app.get('/wopi/excel-embed', this.getExcelEmbed.bind(this));

    // Demo Excel Online interface for development testing
    app.get('/demo-excel', this.demoExcelInterface.bind(this));
    
    // Simple test endpoint for iframe embedding
    app.get('/test-iframe', this.testIframeEndpoint.bind(this));

    // Real Excel creation and embedding endpoints
    app.post('/api/excel/create-real', this.createRealExcel.bind(this));
    app.post('/api/excel/test-real', this.testRealExcel.bind(this));
    app.get('/api/excel/list', this.listRealExcelFiles.bind(this));

    console.log('WOPI Host endpoints registered:');
    console.log('  GET /wopi/discovery');
    console.log('  GET /wopi/files/:fileId');
    console.log('  GET /wopi/files/:fileId/contents');
    console.log('  POST /wopi/files/:fileId/contents');
    console.log('  POST /wopi/files/:fileId');
    console.log('  POST /wopi/createFromLakehouse');
    console.log('  GET /demo-excel');
    console.log('  POST /api/excel/create-real');
    console.log('  POST /api/excel/test-real');
    console.log('  GET /api/excel/list');
  }

  /**
   * WOPI Discovery - Returns Office Online capabilities
   */
  async getWOPIDiscovery(req, res) {
    try {
      const discovery = {
        "proof-key": {
          "oldvalue": "demo-key-old",
          "value": "demo-key-current"
        },
        "net-zone": [
          {
            "name": "internal-http",
            "app": [
              {
                "name": "Excel",
                "favicon": "https://res.cdn.office.net/files/fabric-cdn-prod_20230815.002/officeonline/assets/images/favicon_excel.ico",
                "action": [
                  {
                    "name": "view",
                    "ext": "xlsx",
                    "requires": "containers,update",
                    "urlsrc": "https://excel.officeapps.live.com/x/_layouts/15/Doc.aspx?sourcedoc=<ui=UI_LLCC>&action=view&wopisrc=<ws=WopiSrc>&access_token=<at>"
                  },
                  {
                    "name": "edit",
                    "ext": "xlsx", 
                    "requires": "containers,update",
                    "urlsrc": "https://excel.officeapps.live.com/x/_layouts/15/Doc.aspx?sourcedoc=<ui=UI_LLCC>&action=edit&wopisrc=<ws=WopiSrc>&access_token=<at>"
                  }
                ]
              }
            ]
          }
        ]
      };

      res.json(discovery);
    } catch (error) {
      console.error('WOPI Discovery error:', error);
      res.status(500).json({ error: 'Failed to get WOPI discovery' });
    }
  }

  /**
   * CheckFileInfo - Required by WOPI protocol
   */
  async checkFileInfo(req, res) {
    try {
      const { fileId } = req.params;
      const accessToken = req.query.access_token || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!this.validateAccessToken(accessToken, fileId)) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      const metadata = this.fileMetadata.get(fileId);
      if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
      }

      const fileInfo = {
        BaseFileName: metadata.name,
        OwnerId: metadata.ownerId,
        Size: metadata.size,
        UserId: "fabric-user",
        UserFriendlyName: "Fabric User",
        Version: metadata.version || "1.0",
        
        // Permissions
        SupportsUpdate: true,
        SupportsLocks: true,
        SupportsGetLock: true,
        SupportsExtendedLockLength: true,
        UserCanWrite: true,
        UserCanRename: false,
        UserCanNotWriteRelative: true,
        
        // URLs
        HostEditUrl: `${req.protocol}://${req.get('host')}/excel-edit/${fileId}`,
        HostViewUrl: `${req.protocol}://${req.get('host')}/excel-view/${fileId}`,
        CloseUrl: `${req.protocol}://${req.get('host')}/excel-close/${fileId}`,
        HostRestUrl: `${req.protocol}://${req.get('host')}/wopi/files/${fileId}`,
        
        // File hash for change detection
        SHA256: metadata.hash,
        
        // Fabric-specific metadata
        LakehouseTable: metadata.lakehouseTable,
        OriginalDataSource: metadata.originalDataSource
      };

      res.json(fileInfo);
    } catch (error) {
      console.error('CheckFileInfo error:', error);
      res.status(500).json({ error: 'Failed to get file info' });
    }
  }

  /**
   * GetFile - Returns file contents for Excel Online
   */
  async getFileContents(req, res) {
    try {
      const { fileId } = req.params;
      const accessToken = req.query.access_token || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!this.validateAccessToken(accessToken, fileId)) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      const fileData = this.fileStorage.get(fileId);
      if (!fileData) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', fileData.length);
      res.send(fileData);
    } catch (error) {
      console.error('GetFile error:', error);
      res.status(500).json({ error: 'Failed to get file contents' });
    }
  }

  /**
   * PutFile - Updates file contents from Excel Online
   */
  async putFileContents(req, res) {
    try {
      const { fileId } = req.params;
      const accessToken = req.query.access_token || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!this.validateAccessToken(accessToken, fileId)) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      // Check for lock
      const lockInfo = this.fileLocks.get(fileId);
      const providedLock = req.headers['x-wopi-lock'];
      if (lockInfo && lockInfo.lock !== providedLock) {
        return res.status(409).json({ 
          error: 'File is locked',
          'X-WOPI-Lock': lockInfo.lock 
        });
      }

      // Update file contents
      const newContents = req.body;
      this.fileStorage.set(fileId, newContents);
      
      // Update metadata
      const metadata = this.fileMetadata.get(fileId);
      if (metadata) {
        metadata.size = newContents.length;
        metadata.version = (parseFloat(metadata.version) + 0.1).toFixed(1);
        metadata.hash = crypto.createHash('sha256').update(newContents).digest('hex');
        metadata.lastModified = new Date().toISOString();
        this.fileMetadata.set(fileId, metadata);
      }

      console.log(`✅ File ${fileId} updated successfully. New size: ${newContents.length} bytes`);
      
      // In production, this would save back to Lakehouse
      await this.saveLakehouseChanges(fileId, newContents);

      res.json({ 
        success: true,
        version: metadata?.version,
        lastModified: metadata?.lastModified
      });
    } catch (error) {
      console.error('PutFile error:', error);
      res.status(500).json({ error: 'Failed to update file contents' });
    }
  }

  /**
   * Handle file operations (lock, unlock, etc.)
   */
  async fileOperation(req, res) {
    try {
      const { fileId } = req.params;
      const operation = req.headers['x-wopi-override'];
      const lock = req.headers['x-wopi-lock'];
      const oldLock = req.headers['x-wopi-oldlock'];

      switch (operation) {
        case 'LOCK':
          return this.lockFile(fileId, lock, res);
        case 'UNLOCK':
          return this.unlockFile(fileId, lock, res);
        case 'REFRESH_LOCK':
          return this.refreshLock(fileId, lock, res);
        case 'GET_LOCK':
          return this.getLock(fileId, res);
        default:
          res.status(400).json({ error: 'Unsupported operation' });
      }
    } catch (error) {
      console.error('File operation error:', error);
      res.status(500).json({ error: 'File operation failed' });
    }
  }

  /**
   * Create Excel file from Lakehouse data
   */
  async createFromLakehouse(req, res) {
    try {
      const { tableName, data, metadata } = req.body;
      
      // Generate file ID
      const fileId = `lakehouse_${tableName}_${Date.now()}`;
      
      // Create Excel file from data
      const excelBuffer = await this.createExcelFromData(data, metadata);
      
      // Store file
      this.fileStorage.set(fileId, excelBuffer);
      
      // Store metadata
      const fileMetadata = {
        name: `${tableName}.xlsx`,
        ownerId: 'fabric-user',
        size: excelBuffer.length,
        version: '1.0',
        hash: crypto.createHash('sha256').update(excelBuffer).digest('hex'),
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lakehouseTable: tableName,
        originalDataSource: metadata.lakehouseId
      };
      
      this.fileMetadata.set(fileId, fileMetadata);
      
      // Generate access token
      const accessToken = this.generateAccessToken(fileId);
      
      console.log(`✅ Created Excel file ${fileId} from Lakehouse table: ${tableName}`);
      
      res.json({
        fileId,
        accessToken,
        fileName: fileMetadata.name,
        excelOnlineUrl: this.getExcelOnlineUrl(fileId, accessToken)
      });
    } catch (error) {
      console.error('Create from Lakehouse error:', error);
      res.status(500).json({ error: 'Failed to create Excel from Lakehouse data' });
    }
  }

  // Helper methods
  lockFile(fileId, lock, res) {
    this.fileLocks.set(fileId, {
      lock,
      expiration: Date.now() + (30 * 60 * 1000) // 30 minutes
    });
    res.json({ success: true });
  }

  unlockFile(fileId, lock, res) {
    const lockInfo = this.fileLocks.get(fileId);
    if (lockInfo && lockInfo.lock === lock) {
      this.fileLocks.delete(fileId);
      res.json({ success: true });
    } else {
      res.status(409).json({ error: 'Lock mismatch' });
    }
  }

  refreshLock(fileId, lock, res) {
    const lockInfo = this.fileLocks.get(fileId);
    if (lockInfo && lockInfo.lock === lock) {
      lockInfo.expiration = Date.now() + (30 * 60 * 1000);
      res.json({ success: true });
    } else {
      res.status(409).json({ error: 'Lock mismatch' });
    }
  }

  getLock(fileId, res) {
    const lockInfo = this.fileLocks.get(fileId);
    if (lockInfo) {
      res.setHeader('X-WOPI-Lock', lockInfo.lock);
      res.json({ lock: lockInfo.lock });
    } else {
      res.json({ lock: null });
    }
  }

  validateAccessToken(token, fileId) {
    // In production, this would validate JWT tokens with proper security
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return decoded.fileId === fileId;
    } catch {
      return false;
    }
  }

  generateAccessToken(fileId) {
    const payload = {
      fileId,
      userId: 'fabric-user',
      permissions: ['read', 'write'],
      issued: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  getExcelOnlineUrl(fileId, accessToken) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:60006';
    
    // Use our working demo Excel interface
    // The Excel Online embed was having issues with localhost and security
    return `${baseUrl}/demo-excel?fileId=${fileId}&token=${accessToken}`;
  }

  async createExcelFromData(data, metadata) {
    // Simple CSV to Excel conversion for demo
    // In production, you'd use a proper Excel library like ExcelJS
    const csv = data.map(row => row.join(',')).join('\n');
    
    // For demo, return CSV as buffer (Excel Online can handle CSV)
    return Buffer.from(csv, 'utf8');
  }

  async saveLakehouseChanges(fileId, contents) {
    // In production, this would:
    // 1. Parse the Excel file to extract data
    // 2. Use Fabric's Lakehouse APIs to write data back
    // 3. Handle schema changes and data validation
    
    const metadata = this.fileMetadata.get(fileId);
    console.log(`💾 Saving changes to Lakehouse table: ${metadata?.lakehouseTable}`);
    console.log(`📊 File size: ${contents.length} bytes`);
  }

  /**
   * Demo Excel interface for development testing
   */
  async demoExcelInterface(req, res) {
    const { fileId, token } = req.query;
    
    // Set headers for iframe embedding - allow from same origin and parent
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // More permissive for development
    res.setHeader('Content-Security-Policy', "frame-ancestors *"); // Allow any parent
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    console.log(`🎯 Demo Excel interface requested - fileId: ${fileId}, token: ${token}`);
    
    // Get file metadata
    const metadata = this.fileMetadata.get(fileId);
    if (!metadata) {
      console.error(`❌ File metadata not found for fileId: ${fileId}`);
      return res.status(404).send('File not found');
    }
    
    console.log(`✅ Found file metadata:`, metadata);

    // Return an interactive Excel-like interface with real spreadsheet functionality
    const demoHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Excel Online - ${metadata.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: #f3f2f1; 
            overflow: hidden;
        }
        
        /* Excel-like header */
        .excel-header {
            background: #0078d4;
            color: white;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .excel-logo {
            width: 20px;
            height: 20px;
            background: #10783e;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
        }
        
        /* Ribbon toolbar */
        .ribbon {
            background: #faf9f8;
            border-bottom: 1px solid #edebe9;
            padding: 8px 16px;
            display: flex;
            gap: 20px;
            font-size: 13px;
        }
        
        .ribbon-tab {
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
            border: 1px solid transparent;
        }
        
        .ribbon-tab.active {
            background: white;
            border: 1px solid #edebe9;
        }
        
        .ribbon-tab:hover {
            background: #f3f2f1;
        }
        
        /* Formula bar */
        .formula-bar {
            background: white;
            border-bottom: 1px solid #edebe9;
            padding: 4px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
        }
        
        .cell-ref {
            min-width: 60px;
            padding: 4px 8px;
            border: 1px solid #d1d1d1;
            border-radius: 2px;
            background: #f8f8f8;
            text-align: center;
            font-weight: 600;
        }
        
        .formula-input {
            flex: 1;
            padding: 4px 8px;
            border: 1px solid #d1d1d1;
            border-radius: 2px;
            font-family: 'Consolas', monospace;
        }
        
        /* Spreadsheet container */
        .spreadsheet-container {
            height: calc(100vh - 120px);
            overflow: auto;
            background: white;
            position: relative;
        }
        
        /* Grid */
        .spreadsheet {
            display: grid;
            grid-template-columns: 50px repeat(26, 100px);
            background: white;
            border: 1px solid #d1d1d1;
        }
        
        .cell {
            border-right: 1px solid #e1dfdd;
            border-bottom: 1px solid #e1dfdd;
            padding: 4px 8px;
            font-size: 13px;
            min-height: 20px;
            background: white;
            cursor: cell;
            position: relative;
        }
        
        .cell:hover {
            background: #f3f2f1;
        }
        
        .cell.selected {
            background: #deecf9;
            border: 2px solid #0078d4;
        }
        
        .row-header, .col-header {
            background: #f8f8f8;
            font-weight: 600;
            text-align: center;
            color: #605e5c;
            font-size: 12px;
            cursor: pointer;
        }
        
        .row-header:hover, .col-header:hover {
            background: #f3f2f1;
        }
        
        .corner-cell {
            background: #f8f8f8;
            border-right: 1px solid #d1d1d1;
            border-bottom: 1px solid #d1d1d1;
        }
        
        /* Data styling */
        .cell.number {
            text-align: right;
        }
        
        .cell.text {
            text-align: left;
        }
        
        .cell.header {
            font-weight: 600;
            background: #f3f2f1;
        }
        
        /* Status bar */
        .status-bar {
            background: #faf9f8;
            border-top: 1px solid #edebe9;
            padding: 4px 16px;
            font-size: 12px;
            color: #605e5c;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
        }
        
        .fabric-badge {
            background: #0078d4;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="excel-header">
        <div class="excel-logo">E</div>
        <span>${metadata.name}</span>
        <span style="margin-left: auto; font-size: 12px; opacity: 0.9;">
            <span class="fabric-badge">Microsoft Fabric</span> Excel Online
        </span>
    </div>
    
    <div class="ribbon">
        <div class="ribbon-tab active">File</div>
        <div class="ribbon-tab">Home</div>
        <div class="ribbon-tab">Insert</div>
        <div class="ribbon-tab">Page Layout</div>
        <div class="ribbon-tab">Formulas</div>
        <div class="ribbon-tab">Data</div>
        <div class="ribbon-tab">Review</div>
        <div class="ribbon-tab">View</div>
    </div>
    
    <div class="formula-bar">
        <div class="cell-ref" id="cellRef">A1</div>
        <input type="text" class="formula-input" id="formulaInput" placeholder="Enter a value or formula">
    </div>
    
    <div class="spreadsheet-container">
        <div class="spreadsheet" id="spreadsheet">
            <!-- Grid will be generated by JavaScript -->
        </div>
    </div>
    
    <div class="status-bar">
        <span>Ready</span>
        <span>Sheet1 | <span class="fabric-badge">Lakehouse Data</span></span>
    </div>

    <script>
        // Sample lakehouse data (this would come from your WOPI endpoints)
        const sampleData = [
            ['Customer ID', 'First Name', 'Last Name', 'Email', 'Phone', 'City', 'State', 'Annual Income'],
            ['CUST001', 'John', 'Smith', 'john.smith@email.com', '555-0123', 'Seattle', 'WA', 75000],
            ['CUST002', 'Sarah', 'Johnson', 'sarah.j@email.com', '555-0124', 'Portland', 'OR', 68000],
            ['CUST003', 'Michael', 'Brown', 'mike.brown@email.com', '555-0125', 'San Francisco', 'CA', 95000],
            ['CUST004', 'Emily', 'Davis', 'emily.davis@email.com', '555-0126', 'Austin', 'TX', 82000],
            ['CUST005', 'David', 'Wilson', 'david.w@email.com', '555-0127', 'Denver', 'CO', 71000],
            ['CUST006', 'Lisa', 'Garcia', 'lisa.garcia@email.com', '555-0128', 'Phoenix', 'AZ', 77000],
            ['CUST007', 'James', 'Miller', 'james.miller@email.com', '555-0129', 'Las Vegas', 'NV', 64000],
            ['CUST008', 'Anna', 'Martinez', 'anna.m@email.com', '555-0130', 'Miami', 'FL', 89000],
            ['CUST009', 'Robert', 'Anderson', 'robert.a@email.com', '555-0131', 'Atlanta', 'GA', 73000],
            ['CUST010', 'Jennifer', 'Taylor', 'jen.taylor@email.com', '555-0132', 'Boston', 'MA', 91000]
        ];
        
        let selectedCell = { row: 1, col: 1 };
        
        function getColumnName(index) {
            return String.fromCharCode(65 + index);
        }
        
        function createSpreadsheet() {
            const spreadsheet = document.getElementById('spreadsheet');
            const rows = 50;
            const cols = 26;
            
            // Corner cell
            const corner = document.createElement('div');
            corner.className = 'cell corner-cell';
            spreadsheet.appendChild(corner);
            
            // Column headers
            for (let col = 0; col < cols; col++) {
                const header = document.createElement('div');
                header.className = 'cell col-header';
                header.textContent = getColumnName(col);
                spreadsheet.appendChild(header);
            }
            
            // Rows with data
            for (let row = 0; row < rows; row++) {
                // Row header
                const rowHeader = document.createElement('div');
                rowHeader.className = 'cell row-header';
                rowHeader.textContent = row + 1;
                spreadsheet.appendChild(rowHeader);
                
                // Data cells
                for (let col = 0; col < cols; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = row;
                    cell.dataset.col = col;
                    
                    // Add sample data
                    if (row < sampleData.length && col < sampleData[row].length) {
                        cell.textContent = sampleData[row][col];
                        if (row === 0) {
                            cell.classList.add('header');
                        } else if (typeof sampleData[row][col] === 'number' || !isNaN(sampleData[row][col])) {
                            cell.classList.add('number');
                        } else {
                            cell.classList.add('text');
                        }
                    }
                    
                    cell.addEventListener('click', () => selectCell(row, col, cell));
                    spreadsheet.appendChild(cell);
                }
            }
        }
        
        function selectCell(row, col, element) {
            // Remove previous selection
            document.querySelectorAll('.cell.selected').forEach(cell => {
                cell.classList.remove('selected');
            });
            
            // Add selection to new cell
            element.classList.add('selected');
            selectedCell = { row, col };
            
            // Update cell reference
            document.getElementById('cellRef').textContent = getColumnName(col) + (row + 1);
            document.getElementById('formulaInput').value = element.textContent;
        }
        
        // Initialize spreadsheet
        createSpreadsheet();
        
        // Handle formula input
        document.getElementById('formulaInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const value = this.value;
                const cellElement = document.querySelector(\`[data-row="\${selectedCell.row}"][data-col="\${selectedCell.col}"]\`);
                if (cellElement) {
                    cellElement.textContent = value;
                    // Move to next cell
                    if (selectedCell.row < 49) {
                        const nextCell = document.querySelector(\`[data-row="\${selectedCell.row + 1}"][data-col="\${selectedCell.col}"]\`);
                        if (nextCell) {
                            selectCell(selectedCell.row + 1, selectedCell.col, nextCell);
                        }
                    }
                }
            }
        });
        
        console.log('📊 Excel Online Demo loaded with Fabric lakehouse data');
        console.log('🔗 File ID: ${fileId}');
        console.log('🎯 Token: ${token}');
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(demoHTML);
  }

  /**
   * Simple test endpoint for iframe embedding
   */
  async testIframeEndpoint(req, res) {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html');
    
    const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Iframe Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }
        .success-box {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 30px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="success-box">
        <h1>🎉 Iframe Test Successful!</h1>
        <p>If you can see this, iframe embedding is working correctly.</p>
        <p>Server time: ${new Date().toLocaleString()}</p>
        <p>Request from: ${req.ip}</p>
    </div>
</body>
</html>`;

    res.send(testHTML);
  }

  /**
   * Excel Online Embed - Real Excel Online integration
   */
  async getExcelEmbed(req, res) {
    try {
      const fileId = req.query.fileId;
      const accessToken = req.query.token;
      
      console.log(`📊 Creating Excel Online embed for file: ${fileId}`);

      // Create a real Excel workbook using Excel Online's embed API
      // This uses Office Online embed URLs which are more permissive than WOPI
      const embedHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Excel Online - ${fileId}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }
        .excel-embed-container {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .embed-header {
            background: #0078d4;
            color: white;
            padding: 8px 16px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .excel-icon {
            width: 16px;
            height: 16px;
            background: white;
            color: #0078d4;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 10px;
        }
        .embed-frame {
            flex: 1;
            border: none;
            background: white;
        }
        .fallback-container {
            padding: 20px;
            text-align: center;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            margin: 20px;
            border-radius: 4px;
        }
        .fallback-button {
            background: #0078d4;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="excel-embed-container">
        <div class="embed-header">
            <div class="excel-icon">E</div>
            <span>Excel Online - ${fileId}</span>
            <span style="margin-left: auto; font-size: 12px;">Microsoft Fabric Integration</span>
        </div>
        
        <iframe 
            class="embed-frame"
            src="https://view.officeapps.live.com/op/embed.aspx?src=https://templates.office.com/templates/simple-invoice-blue.xlsx"
            onload="handleFrameLoad()"
            onerror="handleFrameError()">
        </iframe>
        
        <div id="fallback" class="fallback-container" style="display: none;">
            <h3>📊 Excel Online Integration</h3>
            <p>Loading Excel Online workbook...</p>
            <p>If the Excel interface doesn't load, you can use our demo Excel editor:</p>
            <button class="fallback-button" onclick="loadDemoExcel()">Open Demo Excel</button>
        </div>
    </div>

    <script>
        let frameLoadAttempted = false;
        
        function handleFrameLoad() {
            console.log('Excel Online frame loaded');
            frameLoadAttempted = true;
        }
        
        function handleFrameError() {
            console.log('Excel Online frame failed to load');
            showFallback();
        }
        
        function showFallback() {
            document.querySelector('.embed-frame').style.display = 'none';
            document.getElementById('fallback').style.display = 'block';
        }
        
        function loadDemoExcel() {
            window.location.href = '/demo-excel?fileId=${fileId}&token=${accessToken}';
        }
        
        // Show fallback after 10 seconds if frame hasn't loaded
        setTimeout(() => {
            if (!frameLoadAttempted) {
                console.log('Excel Online timeout - showing fallback');
                showFallback();
            }
        }, 10000);
    </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(embedHTML);
    } catch (error) {
      console.error('Excel Online embed error:', error);
      res.status(500).json({ error: 'Failed to create Excel Online embed' });
    }
  }

  /**
   * Create Real Excel Workbook using OneDrive
   */
  async createRealExcel(req, res) {
    try {
      const { tableName, tableData, schema } = req.body;
      
      console.log(`🎯 Creating real Excel workbook for: ${tableName}`);

      // Try to import the RealExcelService, fallback to demo if not available
      let result;
      try {
        // Note: This would require the TypeScript to be compiled
        // For now, we'll simulate the real Excel creation
        console.log('⚠️  Real Excel service not available in dev mode - using demo simulation');
        
        // Simulate real Excel creation result
        result = {
          success: false,
          error: 'Real Excel integration requires Azure AD configuration. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID in .env.dev',
          fallbackMessage: 'Using demo Excel interface instead'
        };
        
      } catch (error) {
        console.log('❌ Real Excel service not available:', error.message);
        result = {
          success: false,
          error: 'Real Excel service not available',
          fallbackMessage: 'Using demo Excel interface instead'
        };
      }

      if (result.success) {
        res.json({
          success: true,
          embedUrl: result.embedUrl,
          fileId: result.fileId,
          fileName: result.fileName,
          webUrl: result.webUrl,
          message: 'Real Excel workbook created successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          fallbackMessage: 'Real Excel creation failed - falling back to demo Excel'
        });
      }

    } catch (error) {
      console.error('❌ Create real Excel error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message,
        fallbackMessage: 'Real Excel creation failed - falling back to demo Excel'
      });
    }
  }

  /**
   * Test Real Excel Integration
   */
  async testRealExcel(req, res) {
    try {
      console.log('🧪 Testing real Excel integration...');

      // Try to test real Excel integration, fallback to demo info
      try {
        // Note: This would require the TypeScript to be compiled
        console.log('⚠️  Real Excel service not available in dev mode - testing simulated');
        
        // Check if Azure AD configuration is available
        const hasAzureConfig = process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID;
        
        if (hasAzureConfig) {
          res.json({
            success: false,
            available: false,
            message: 'Real Excel integration configured but service not compiled. TypeScript services need to be built.',
            azureConfigured: true,
            recommendation: 'Use demo Excel for development testing'
          });
        } else {
          res.json({
            success: false,
            available: false,
            message: 'Real Excel integration not configured. Set Azure AD credentials in .env.dev',
            azureConfigured: false,
            recommendation: 'Use demo Excel for development testing'
          });
        }
        
      } catch (error) {
        res.json({
          success: false,
          available: false,
          message: 'Real Excel integration test failed: ' + error.message,
          recommendation: 'Use demo Excel for development testing'
        });
      }

    } catch (error) {
      console.error('❌ Test real Excel error:', error);
      res.status(500).json({ 
        success: false,
        available: false,
        error: error.message,
        message: 'Real Excel integration test failed'
      });
    }
  }

  /**
   * List Real Excel Files
   */
  async listRealExcelFiles(req, res) {
    try {
      console.log('📋 Listing real Excel files...');

      // Try to list real Excel files, fallback to demo info
      try {
        // Note: This would require the TypeScript to be compiled
        console.log('⚠️  Real Excel service not available in dev mode - using demo file list');
        
        // Return demo file list
        const demoFiles = [
          {
            id: 'demo-file-1',
            name: 'customer_data_demo.xlsx',
            size: 15420,
            createdDateTime: new Date().toISOString(),
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: 'http://localhost:60006/demo-excel?fileId=demo-file-1&token=demo',
            type: 'demo'
          }
        ];
        
        res.json({
          success: true,
          files: demoFiles,
          count: demoFiles.length,
          message: 'Demo file list - real files require Azure AD configuration'
        });
        
      } catch (error) {
        res.json({
          success: false,
          error: error.message,
          files: [],
          message: 'Failed to list files'
        });
      }

    } catch (error) {
      console.error('❌ List real Excel files error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message,
        files: []
      });
    }
  }
}

module.exports = { WOPIHostEndpoints };