import { IOneLakeExcelStrategy } from './strategies/IOneLakeExcelStrategy';
import { OneLakeTableExcelStrategy } from './strategies/OneLakeTableExcelStrategy';
import { OneLakeCSVExcelStrategy } from './strategies/OneLakeCSVExcelStrategy';
import { ContentReference } from './ExcelEditorItemModel';

/**
 * Factory class for creating appropriate OneLake Excel strategies
 * based on the data source type and properties.
 */
export class OneLakeExcelStrategyFactory {
  private static tableStrategy = new OneLakeTableExcelStrategy();
  private static csvStrategy = new OneLakeCSVExcelStrategy();

  /**
   * Gets the appropriate Excel strategy for the given data source
   * @param dataSource The OneLake data source to analyze
   * @returns The strategy that can handle this data source type
   * @throws Error if no strategy can handle the data source
   */
  public static getStrategy(dataSource: ContentReference): IOneLakeExcelStrategy {
    // Check table strategy first (structured data)
    if (this.tableStrategy.canHandle(dataSource)) {
      console.log('🏭 Factory: Using OneLakeTableExcelStrategy for', dataSource.contentType);
      return this.tableStrategy;
    }

    // Check CSV strategy (file-based data)
    if (this.csvStrategy.canHandle(dataSource)) {
      console.log('🏭 Factory: Using OneLakeCSVExcelStrategy for', dataSource.contentType);
      return this.csvStrategy;
    }

    // No strategy can handle this data source
    throw new Error(`No Excel strategy available for data source: ${dataSource.contentType})`);
  }

  /**
   * Gets all available Excel strategies
   * @returns Array of all registered Excel strategies
   */
  public static getAllStrategies(): IOneLakeExcelStrategy[] {
    return [this.tableStrategy, this.csvStrategy];
  }

}