import React from "react";
import { Toolbar, ToolbarDivider } from '@fluentui/react-toolbar';
import { RibbonButton, FluentIconComponent } from './RibbonButton';

/**
 * Configuration for a ribbon action button
 */
export interface RibbonAction {
  /**
   * Unique identifier for the action
   */
  key: string;
  
  /**
   * The icon to display in the button
   */
  icon: FluentIconComponent;
  
  /**
   * The label/tooltip text for the button
   */
  label: string;
  
  /**
   * Click handler for the action
   */
  onClick: () => void | Promise<void>;
  
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  
  /**
   * Optional test ID for the button
   */
  testId?: string;
  
  /**
   * Optional tooltip text for the button (defaults to label)
   */
  tooltip?: string;
  
  /**
   * Optional appearance variant
   */
  appearance?: 'primary' | 'subtle' | 'transparent';
  
  /**
   * Optional custom aria-label (defaults to label)
   */
  ariaLabel?: string;
  
  /**
   * Whether to show a divider after this action
   */
  showDividerAfter?: boolean;
  
  /**
   * Whether this action should be hidden
   */
  hidden?: boolean;
}

/**
 * Props for the BaseRibbonToolbar component
 */
export interface BaseRibbonToolbarProps {
  /**
   * Array of actions to display in the toolbar
   */
  actions: RibbonAction[];
  
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * BaseRibbonToolbar - Reusable toolbar component for ribbons
 * 
 * This component provides:
 * - Consistent action rendering with full tooltip support
 * - Support for dividers between action groups
 * - Conditional action visibility
 * - Proper spacing and alignment
 * - Integration with RibbonAction interface
 * 
 * ## Action Configuration
 * 
 * Actions support comprehensive configuration:
 * - **Tooltip Support**: Both `tooltip` and `label` properties
 * - **Appearance**: 'primary', 'subtle', 'transparent'
 * - **Accessibility**: Automatic aria-label and tooltip mapping
 * - **Dividers**: Optional separators between action groups
 * - **Visibility**: Hide/show actions conditionally
 * 
 * @example
 * ```tsx
 * const actions: RibbonAction[] = [
 *   {
 *     key: 'save',
 *     label: 'Save',
 *     icon: Save24Regular,
 *     tooltip: 'Save your current changes',
 *     onClick: handleSave,
 *     disabled: !hasChanges,
 *     appearance: 'primary'
 *   },
 *   {
 *     key: 'settings',
 *     label: 'Settings',
 *     icon: Settings24Regular,
 *     tooltip: 'Open application settings',
 *     onClick: handleSettings,
 *     showDividerAfter: true
 *   }
 * ];
 * 
 * <BaseRibbonToolbar actions={actions} />
 * ```
 */
export const BaseRibbonToolbar: React.FC<BaseRibbonToolbarProps> = ({
  actions,
  className = ''
}) => {
  // Filter out hidden actions
  const visibleActions = actions.filter(action => !action.hidden);
  
  return (
    <Toolbar className={className}>
      {visibleActions.map((action, index) => (
        <React.Fragment key={action.key}>
          <RibbonButton
            icon={action.icon}
            label={action.label}
            tooltip={action.tooltip}
            onClick={action.onClick}
            disabled={action.disabled}
            testId={action.testId}
            appearance={action.appearance}
            ariaLabel={action.ariaLabel}
          />
          
          {/* Show divider if specified and not the last item */}
          {action.showDividerAfter && index < visibleActions.length - 1 && (
            <ToolbarDivider />
          )}
        </React.Fragment>
      ))}
    </Toolbar>
  );
};
