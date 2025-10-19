import React from "react";
import { ToolbarButton, Tooltip } from '@fluentui/react-components';

/**
 * Type for Fluent UI icon components
 */
export type FluentIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

/**
 * Props for the RibbonButton component
 */
export interface RibbonButtonProps {
  /**
   * The icon to display in the button
   */
  icon: FluentIconComponent;
  
  /**
   * The label/tooltip text for the button
   */
  label: string;
  
  /**
   * Click handler for the button
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
   * Optional appearance variant
   */
  appearance?: 'primary' | 'subtle' | 'transparent';
  
  /**
   * Optional custom aria-label (defaults to label)
   */
  ariaLabel?: string;
}

/**
 * RibbonButton - Standardized ribbon button component following Fabric guidelines
 * 
 * This component provides:
 * - Consistent Tooltip + ToolbarButton pattern (mandatory for accessibility)
 * - Proper icon sizing (24px Regular icons)
 * - Accessibility attributes
 * - Standardized styling with 'subtle' appearance (neutral colors, not brand colors)
 * 
 * Fabric UX Guideline: Toolbar buttons should use 'subtle' appearance for neutral styling.
 * Never use 'primary' appearance in toolbars - that's reserved for dialog CTAs.
 * 
 * @example
 * ```tsx
 * <RibbonButton
 *   icon={Save24Regular}
 *   label="Save"
 *   onClick={handleSave}
 *   disabled={!hasChanges}
 *   testId="save-btn"
 * />
 * ```
 */
export const RibbonButton: React.FC<RibbonButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  testId,
  appearance = 'subtle',
  ariaLabel
}) => {
  const IconComponent = icon;
  
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await onClick();
    } catch (error) {
      console.error(`Error in RibbonButton onClick handler for ${label}:`, error);
    }
  };
  
  return (
    <Tooltip
      content={label}
      relationship="label"
    >
      <ToolbarButton
        aria-label={ariaLabel || label}
        appearance={appearance}
        disabled={disabled}
        data-testid={testId}
        icon={<IconComponent />}
        onClick={handleClick}
      />
    </Tooltip>
  );
};
