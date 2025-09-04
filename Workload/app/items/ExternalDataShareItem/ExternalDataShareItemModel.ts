/**
 * Model definitions for the External Data Share Item
 * Handles external data shares creation and acceptance
 */

import { ExternalDataShareInvitationDetails, ExternalDataShare } from "../../clients/FabricPlatformTypes";

export interface ExternalDataShareItemDefinition {
    title?: string;
    description?: string;
    createdShares?: CreatedShare[];
    receivedShares?: ReceivedShare[];
    configuration?: ExternalDataShareConfiguration;
    lastSyncDate?: Date;
}

export interface ExternalDataShareConfiguration {
    allowExternalSharing?: boolean;
    autoAcceptShares?: boolean;
    defaultShareExpiration?: number; // days
    allowedDomains?: string[];
    sharePrefixNaming?: string;
}

export interface CreatedShare extends ExternalDataShare {
    displayName: string,
    description?: string,
    creationDate: Date;
}

export interface ReceivedShare extends ExternalDataShareInvitationDetails {
    // Management properties
    id: string; // Uses invitationId as the primary identifier
    status: ReceivedShareStatus;
    receivedDate: Date;
    acceptedDate?: Date;
    // Optional overrides and additional data
    displayName?: string; // Human-readable name for the share
    description?: string; // Optional description for the share
    estimatedSize?: string;
    lastSyncDate?: Date;
}

// Helper functions for ReceivedShare
export const getReceivedShareDisplayName = (share: ReceivedShare): string => {
    return share.displayName || 
           share.pathsDetails?.[0]?.name || 
           `Share ${share.id.substring(0, 8)}`;
};

export const getReceivedShareSenderInfo = (share: ReceivedShare): string => {
    return share.providerTenantDetails?.displayName || 
           share.providerTenantDetails?.verifiedDomainName || 
           'Unknown sender';
};


export type ReceivedShareStatus = 
    | 'pending' 
    | 'accepted' 
    | 'declined' 
    | 'expired' 
    | 'syncing' 
    | 'synced' 
    | 'failed';

export interface AcceptShareRequest {
    shareId: string;
    targetPath: string; // Where to store in OneLake
    acceptedName?: string; // Custom name for the accepted share
}

// Default values
export const DEFAULT_SHARE_PREFIX = "DataShare_";
export const DEFAULT_EXPIRATION_DAYS = 30;
