import { AccessToken, WorkloadClientAPI } from "@ms-fabric/workload-client";
import { callAcquireFrontendAccessToken } from "../controller/AuthenticationController";
import { EnvironmentConstants } from "../constants";
import { FABRIC_BASE_SCOPES } from "./FabricPlatformScopes";

//TODO error handling needs to improve for all functions

export async function checkIfFileExists(workloadClient: WorkloadClientAPI, filePath: string): Promise<boolean> {
    const url = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${filePath}?resource=file`;
    try {
        const accessToken: AccessToken = await callAcquireFrontendAccessToken(workloadClient, 
                                                                            FABRIC_BASE_SCOPES.ONELAKE_STORAGE);
        const response = await fetch(url, {
            method: "HEAD",
            headers: { Authorization: `Bearer ${accessToken.token}` }
        });
        if (response.status === 200) {
            return true;
        } else if (response.status === 404) {
            return false;
        } else {
            console.warn(`checkIfFileExists received unexpected status code: ${response.status}`);
            return false;
        }
    } catch (ex: any) {
        console.error(`checkIfFileExists failed for filePath: ${filePath}. Error: ${ex.message}`);
        return false;
    }
}

/**
 * Write content to a OneLake file
 * @param workloadClient The WorkloadClientAPI instance
 * @param filePath The OneLake file path
 * @param content The content to write that is in base64 encoded string
 */
export async function writeToOneLakeFileAsBase64(workloadClient: WorkloadClientAPI, filePath: string, content: string): Promise<void> {
    const url = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${filePath}?resource=file`;
    let accessToken: AccessToken
    try {
        accessToken = await callAcquireFrontendAccessToken(workloadClient,
            FABRIC_BASE_SCOPES.ONELAKE_STORAGE);
        
        // First, create an empty file
        const response = await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken.token}` },
            body: "" // Create empty file
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        console.log(`writeToOneLakeFileAsBase64: Creating a new file succeeded for filePath: ${filePath}`);
    } catch (ex: any) {
        console.error(`writeToOneLakeFileAsBase64: Creating a new file failed for filePath: ${filePath}. Error: ${ex.message}`);
        throw ex;
    }
    
    // Then append the base64 content as binary data
    await appendBinaryToOneLakeFile(accessToken.token, filePath, content);
}

export async function readOneLakeFileAsBase64(workloadClient: WorkloadClientAPI, filePath: string): Promise<string> {
    // This function reads a file from OneLake as a base64 encoded string.
    const url = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${filePath}`;
    try {
        const accessToken: AccessToken = await callAcquireFrontendAccessToken(workloadClient,
            FABRIC_BASE_SCOPES.ONELAKE_STORAGE);
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken.token}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const content = await response.text();
        console.log(`readOneLakeFileAsBase64 succeeded for filePath: ${filePath}`);
        return Buffer.from(content, "base64").toString("utf8");
    } catch (ex: any) {
        console.error(`readOneLakeFileAsBase64 failed for filePath: ${filePath}. Error: ${ex.message}`);
        return "";
    }
}

export async function writeToOneLakeFileAsText(workloadClient: WorkloadClientAPI, filePath: string, content: string): Promise<void> {
    const url = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${filePath}?resource=file`;
    let accessToken: AccessToken
    try {
        accessToken = await callAcquireFrontendAccessToken(workloadClient, 
                                                            FABRIC_BASE_SCOPES.ONELAKE_STORAGE);
        const response = await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken.token}` },
            body: "" // Create empty file
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        console.log(`writeToOneLakeFile: Creating a new file succeeded for filePath: ${filePath}`);
    } catch (ex: any) {
        console.error(`writeToOneLakeFile: Creating a new file failed for filePath: ${filePath}. Error: ${ex.message}`);
        return;
    }
    await appendToOneLakeFile(accessToken.token, filePath, content);
}

export async function readOneLakeFileAsText(workloadClient: WorkloadClientAPI, filePath: string): Promise<string> {
    const url = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${filePath}`;
    try {
        const accessToken: AccessToken = await callAcquireFrontendAccessToken(workloadClient, 
                                                                            FABRIC_BASE_SCOPES.ONELAKE_STORAGE);
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken.token}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const content = await response.text();
        console.log(`getOneLakeFile succeeded for source: ${filePath}`);
        return content;
    } catch (ex: any) {
        console.error(`getOneLakeFile failed for source: ${filePath}. Error: ${ex.message}`);
        return "";
    }
}

export async function deleteOneLakeFile(workloadClient: WorkloadClientAPI, filePath: string): Promise<void> {
    const url = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${filePath}?recursive=true`;
    try {
        const accessToken: AccessToken = await callAcquireFrontendAccessToken(workloadClient, 
                                                                            FABRIC_BASE_SCOPES.ONELAKE_STORAGE);        const response = await fetch(url, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken.token}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        console.log(`deleteOneLakeFile succeeded for filePath: ${filePath}`);
    } catch (ex: any) {
        console.error(`deleteOneLakeFile failed for filePath: ${filePath}. Error: ${ex.message}`);
    }
}

/**
 * Get the OneLake file path for a specific file in the Files folder within OneLake
 * @param workspaceId The ID of the workspace
 * @param itemId The ID of the item
 * @param fileName The name of the file
 * @returns The OneLake file path
 */
export function getOneLakeFilePath(workspaceId: string, itemId: string, fileName: string): string {
    return getOneLakePath(workspaceId, itemId, `Files/${fileName}`);
}

/**
 * Get the OneLake path for a specific file. This is a more generic version that can be used for any file including files in the Table folder
 * @param workspaceId 
 * @param itemId 
 * @param fileName 
 * @returns 
 */
export function getOneLakePath(workspaceId: string, itemId: string, fileName: string): string {
    return `${workspaceId}/${itemId}/${fileName}`;
}

async function appendToOneLakeFile(token: string, filePath: string, content: string): Promise<void> {
    const url = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${filePath}`;
    const appendQuery = buildAppendQueryParameters();
    const appendUrl = `${url}?${appendQuery}`;
    try {
        const appendResponse = await fetch(appendUrl, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: content
        });
        if (!appendResponse.ok) throw new Error(`HTTP ${appendResponse.status}`);

        // For Node.js: Buffer.byteLength, for browser: new TextEncoder().encode(content).length
        const contentLength = typeof Buffer !== "undefined"
            ? Buffer.byteLength(content, "utf8")
            : new TextEncoder().encode(content).length;

        const flushQuery = buildFlushQueryParameters(contentLength);
        const flushUrl = `${url}?${flushQuery}`;

        const flushResponse = await fetch(flushUrl, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!flushResponse.ok) throw new Error(`HTTP ${flushResponse.status}`);

        console.log(`appendToOneLakeFile succeeded for filePath: ${filePath}`);
    } catch (ex: any) {
        console.error(`appendToOneLakeFile failed for filePath: ${filePath}. Error: ${ex.message}`);
    }
    console.log(`appendToOneLakeFile completed for filePath: ${filePath}`);
}

function buildAppendQueryParameters(): string {
    return "position=0&action=append";
}

function buildFlushQueryParameters(contentLength: number): string {
    return `position=${contentLength}&action=flush`;
}

async function appendBinaryToOneLakeFile(token: string, filePath: string, base64Content: string): Promise<void> {
    const url = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${filePath}`;
    const appendQuery = buildAppendQueryParameters();
    const appendUrl = `${url}?${appendQuery}`;
    
    try {
        // Decode base64 string to binary data
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const appendResponse = await fetch(appendUrl, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: bytes
        });
        if (!appendResponse.ok) throw new Error(`HTTP ${appendResponse.status}`);

        // Flush with content length (bytes length, not string length)
        const contentLength = bytes.length;
        const flushQuery = buildFlushQueryParameters(contentLength);
        const flushUrl = `${url}?${flushQuery}`;

        const flushResponse = await fetch(flushUrl, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!flushResponse.ok) throw new Error(`HTTP ${flushResponse.status}`);

        console.log(`appendBinaryToOneLakeFile succeeded for filePath: ${filePath}`);
    } catch (ex: any) {
        console.error(`appendBinaryToOneLakeFile failed for filePath: ${filePath}. Error: ${ex.message}`);
        throw ex;
    }
}