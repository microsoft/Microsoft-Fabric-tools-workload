import { ContentReference, TableSchema } from "../ExcelEditorItemModel";

/**
 * WOPI Excel Service for integrating with Excel Online using WOPI protocol
 * Provides Excel Online iframe embedding without Office.js dependencies
 */
export class WOPIExcelService {
  private static instance: WOPIExcelService;
  private isInitialized = false;

  public static getInstance(): WOPIExcelService {
    if (!WOPIExcelService.instance) {
      WOPIExcelService.instance = new WOPIExcelService();
    }
    return WOPIExcelService.instance;
  }

  /**
   * Initialize the WOPI Excel service
   */
  public async initialize(): Promise<boolean> {
    try {
      this.isInitialized = true;
      console.log('✅ WOPI Excel service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize WOPI Excel service:', error);
      return false;
    }
  }

  /**
   * Generate Excel Online URL for embedding via WOPI
   */
  public generateExcelOnlineUrl(fileUrl: string, options: {
    accessToken?: string;
    action?: 'view' | 'edit' | 'embedview' | 'interactivepreview';
    corsProxyUrl?: string;
  } = {}): string {
    try {
      // Excel Online base URL for Office Web Apps
      const wopiBase = 'https://excel.officeapps.live.com/x/_layouts/15/Doc.aspx';
      
      // Build parameters for WOPI
      const params = new URLSearchParams();
      params.append('sourcedoc', encodeURIComponent(fileUrl));
      params.append('action', options.action || 'embedview');
      params.append('activeCell', 'A1');
      params.append('wdHideGridlines', 'False');
      params.append('wdHideHeaders', 'False');
      params.append('wdAllowInteractivity', 'True');
      params.append('wdInConfigurator', 'True');
      
      // Add access token if provided
      if (options.accessToken) {
        params.append('access_token', options.accessToken);
      }

      const fullUrl = `${wopiBase}?${params.toString()}`;
      console.log('✅ Generated Excel Online WOPI URL');
      return fullUrl;
    } catch (error) {
      console.error('❌ Failed to generate Excel Online URL:', error);
      throw error;
    }
  }

  /**
   * Create Excel Online embedding from content reference
   */
  public async createExcelFromContentReference(contentRef: ContentReference): Promise<string | null> {
    try {
      if (!contentRef.displayName || !contentRef.path) {
        throw new Error('Content reference must include displayName and path');
      }

      // For demo/development: Log that we're falling back to table view
      console.warn('⚠️ No valid Excel file URL available, Excel Online will not be used');
      console.log('📋 Content reference path:', contentRef.path);
      console.log('💡 To use Excel Online, provide a valid SharePoint/OneDrive file URL');
      
      // Return null to indicate Excel Online is not available
      return null;
    } catch (error) {
      console.error('❌ Failed to create Excel from content reference:', error);
      return null;
    }
  }

  /**
   * Create Excel Online URL from data array
   */
  public async createExcelFromData(data: {
    headers: string[];
    rows: string[][];
  }, filename: string = 'data.xlsx'): Promise<string | null> {
    try {
      // In a real implementation, you would:
      // 1. Convert data to Excel format
      // 2. Upload to file storage
      // 3. Get public URL
      // 4. Return WOPI embed URL
      
      console.warn('⚠️ createExcelFromData: No file storage configured, Excel Online unavailable');
      console.log('💡 To use Excel Online, implement file upload to SharePoint/OneDrive');
      
      // Return null to indicate Excel Online is not available
      return null;
    } catch (error) {
      console.error('❌ Failed to create Excel from data:', error);
      return null;
    }
  }

  /**
   * Generate Excel Online embed iframe properties
   */
  public generateEmbedIframeProps(excelUrl: string, options: {
    width?: string;
    height?: string;
    allowFullscreen?: boolean;
  } = {}) {
    return {
      src: excelUrl,
      width: options.width || '100%',
      height: options.height || '600px',
      frameBorder: '0',
      scrolling: 'no' as const,
      allowFullScreen: options.allowFullscreen !== false,
      style: { border: 'none' }
    };
  }

  /**
   * Check if service is initialized
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Generate fallback table HTML when Excel Online is not available
   */
  public generateFallbackTable(data: {
    headers: string[];
    rows: string[][];
  }): string {
    if (!data || !data.headers || !data.rows) {
      return '<div>No data available</div>';
    }

    let html = `<div style="overflow: auto; max-height: 500px;">
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
        <thead>
          <tr>`;
    
    // Add headers
    data.headers.forEach(header => {
      html += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; font-weight: bold;">${header}</th>`;
    });
    
    html += `</tr>
        </thead>
        <tbody>`;
    
    // Add rows
    data.rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td style="border: 1px solid #ddd; padding: 8px;">${cell || ''}</td>`;
      });
      html += '</tr>';
    });
    
    html += `</tbody>
      </table>
    </div>`;
    
    return html;
  }

  /**
   * Convert table schema to Excel-compatible headers
   */
  public convertSchemaToHeaders(schema: TableSchema[]): string[] {
    return schema.map(col => col.name);
  }

  /**
   * Check if WOPI embedding is supported (always true for web browsers)
   */
  public isWOPISupported(): boolean {
    return typeof window !== 'undefined';
  }
}

// Export singleton instance
export const wopiExcelService = WOPIExcelService.getInstance();