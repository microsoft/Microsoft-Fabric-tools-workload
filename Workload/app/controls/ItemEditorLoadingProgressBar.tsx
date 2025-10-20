import React from 'react';
import '../styles.scss';

/**
 * Props for the ItemEditorLoadingProgressBar component
 */
export interface ItemEditorLoadingProgressBarProps {
    /** The loading message to display */
    message: string;
    /** Optional icon to display above the progress indicator (can be a Fluent UI icon component or image src). Defaults to fabric-icon.png if not provided. */
    icon?: React.ReactNode | string;
}

/**
 * ItemEditorLoadingProgressBar - Displays an indeterminate progress indicator
 * 
 * Follows Fabric UX System guidelines for Progress components:
 * - Indeterminate state (duration unknown)
 * - Non-blocking interaction pattern
 * - Accessible with proper ARIA labels
 * - Uses design tokens for consistent theming
 * - Optional icon display for branding (defaults to Fabric icon)
 * 
 * Styles are defined in styles.scss as part of the global Fabric UX System patterns.
 * 
 * @param message - The loading message to display
 * @param icon - Optional icon (Fluent UI icon component or image src string). Defaults to /assets/fabric-icon.png
 */
export const ItemEditorLoadingProgressBar = ({ message, icon }: ItemEditorLoadingProgressBarProps) => {
    // Default to Fabric icon if no icon is provided
    const displayIcon = icon || '/assets/fabric-icon.png';
    
    const renderIcon = () => {
        // If icon is a string, treat it as an image src
        if (typeof displayIcon === 'string') {
            return (
                <div className="item-editor-loading-icon">
                    <img src={displayIcon} alt="" />
                </div>
            );
        }
        
        // Otherwise, render it as a React component (Fluent UI icon)
        return (
            <div className="item-editor-loading-icon">
                {displayIcon}
            </div>
        );
    };
    
    return (
        <div className="item-editor-loading-container" role="progressbar" aria-label={message} aria-busy="true">
            {renderIcon()}
            <div className="item-editor-loading-text">{message}</div>
            <div className="item-editor-loading-progress">
                <div className="item-editor-loading-progress-fill" />
            </div>
        </div>
    );
};

export default ItemEditorLoadingProgressBar;
