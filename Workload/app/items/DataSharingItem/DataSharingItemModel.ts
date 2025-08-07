/**
 * Model definitions for the Data Sharing Item
 * Handles external data shares creation and acceptance
 */

export interface DataSharingItemDefinition {
    title?: string;
    description?: string;
    createdShares?: CreatedShare[];
    receivedShares?: ReceivedShare[];
    configuration?: DataSharingConfiguration;
    lastSyncDate?: Date;
}

export interface DataSharingConfiguration {
    allowExternalSharing?: boolean;
    autoAcceptShares?: boolean;
    defaultShareExpiration?: number; // days
    allowedDomains?: string[];
    sharePrefixNaming?: string;
}

export interface CreatedShare {
    id: string;
    name: string;
    description?: string;
    status: ShareStatus;
    shareType: ShareType;
    createdDate: Date;
    lastModifiedDate?: Date;
    expirationDate?: Date;
    recipientEmail?: string;
    recipientDomain?: string;
    dataLocation: string; // OneLake path or external path
    permissions: SharePermissions;
    accessUrl?: string;
    downloadCount?: number;
    lastAccessDate?: Date;
}

export interface ReceivedShare {
    id: string;
    name: string;
    description?: string;
    status: ReceivedShareStatus;
    shareType: ShareType;
    receivedDate: Date;
    acceptedDate?: Date;
    senderEmail?: string;
    senderDomain?: string;
    dataLocation?: string; // Where it's stored in OneLake after acceptance
    originalLocation?: string; // Original external location
    permissions: SharePermissions;
    estimatedSize?: string;
    fileCount?: number;
    lastSyncDate?: Date;
}

export type ShareStatus = 
    | 'creating' 
    | 'active' 
    | 'pending' 
    | 'expired' 
    | 'revoked' 
    | 'failed';

export type ReceivedShareStatus = 
    | 'pending' 
    | 'accepted' 
    | 'declined' 
    | 'expired' 
    | 'syncing' 
    | 'synced' 
    | 'failed';

export type ShareType = 
    | 'folder' 
    | 'file' 
    | 'table' 
    | 'dataset' 
    | 'lakehouse' 
    | 'warehouse';

export interface SharePermissions {
    canRead: boolean;
    canWrite: boolean;
    canDownload: boolean;
    canShare: boolean;
    expirationDate?: Date;
}

export interface ShareInvitation {
    recipientEmail: string;
    message?: string;
    permissions: SharePermissions;
    expirationDate?: Date;
}

export interface AcceptShareRequest {
    shareId: string;
    targetLocation: string; // Where to store in OneLake
    acceptedName?: string; // Custom name for the accepted share
}

// Default values
export const DEFAULT_SHARE_PREFIX = "DataShare_";
export const DEFAULT_EXPIRATION_DAYS = 30;
export const DEFAULT_PERMISSIONS: SharePermissions = {
    canRead: true,
    canWrite: false,
    canDownload: true,
    canShare: false
};
