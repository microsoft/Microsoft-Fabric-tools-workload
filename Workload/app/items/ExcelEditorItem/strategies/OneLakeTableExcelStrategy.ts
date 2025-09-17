import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ContentReference, ExcelApiRequestBody} from "../ExcelEditorItemModel";
import { ExcelData, IOneLakeExcelStrategy, LoadingOptions, OneLakeSaveResult, SaveOptions } from "./IOneLakeExcelStrategy";


export class OneLakeTableExcelStrategy implements IOneLakeExcelStrategy {
    canHandle(dataSource: ContentReference): boolean {
        throw new Error("Method not implemented.");
    }
    loadData(workloadClient: WorkloadClientAPI, dataSource: ContentReference, options?: LoadingOptions): Promise<ExcelData> {
        throw new Error("Method not implemented.");
    }
    buildExcelApiRequestBody(workloadClient: WorkloadClientAPI, content: ContentReference): ExcelApiRequestBody {
        throw new Error("Method not implemented.");
    }
    supportsSaving(dataSource: ContentReference): boolean {
        throw new Error("Method not implemented.");
    }
    saveData(workloadClient: WorkloadClientAPI, data: ExcelData, options?: SaveOptions): Promise<OneLakeSaveResult> {
        throw new Error("Method not implemented.");
    }

}