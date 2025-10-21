import React, { ReactNode } from "react";
import { Stack, IStackTokens } from "@fluentui/react";
import { Button, Text } from "@fluentui/react-components";
import { BaseItemEditorView } from "./BaseItemEditorView";
import "../styles.scss";

/**
 * Task/Step interface for onboarding actions
 */
export interface EmptyStateTask {
  /** Unique identifier for the task */
  id: string;
  /** Task label/title */
  label: string;
  /** Task description (optional) */
  description?: string;
  /** Click handler for the task */
  onClick: () => void;
  /** Button appearance - default is 'primary' for first task, 'secondary' for others */
  appearance?: "primary" | "secondary" | "outline" | "subtle" | "transparent";
  /** Custom icon (optional) - Fluent UI icon slot or JSX element */
  icon?: React.ReactElement | { children: React.ReactElement };
}

/**
 * BaseItemEditorEmptyView Props Interface
 */
export interface BaseItemEditorEmptyViewProps {
  /** Title displayed in the empty state */
  title: string;
  /** Description text below the title */
  description: string;
  /** Optional image/illustration to display */
  imageSrc?: string;
  /** Alt text for the image */
  imageAlt?: string;
  /** List of tasks/actions for the user to complete */
  tasks?: EmptyStateTask[];
  /** Optional custom content to display instead of tasks */
  customContent?: ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Maximum width for the content container (default: 600px) */
  maxWidth?: number;
}

/**
 * BaseItemEditorEmptyView Component
 * 
 * A reusable empty state component following Microsoft Fabric UX System guidelines.
 * Provides a consistent onboarding experience with customizable tasks.
 * 
 * **Built on BaseItemEditorView**: This component uses BaseItemEditorView internally,
 * displaying the empty state content in the center panel. This ensures consistent
 * layout and styling with other view components.
 * 
 * ## Design Principles
 * - Clear visual hierarchy with title, description, and actions
 * - Optional illustration to reduce cognitive load
 * - Task-based onboarding with clear call-to-actions
 * - Responsive design with proper spacing tokens
 * - Accessibility-first with proper ARIA labels and semantic HTML
 * - Consistent layout using BaseItemEditorView architecture
 * 
 * ## Usage Example
 * 
 * ```tsx
 * import { BaseItemEditorEmptyView } from "../../controls";
 * 
 * const tasks = [
 *   {
 *     id: 'start',
 *     label: 'Get Started',
 *     description: 'Learn the basics',
 *     onClick: () => navigate('getting-started'),
 *     appearance: 'primary'
 *   },
 *   {
 *     id: 'docs',
 *     label: 'View Documentation',
 *     onClick: () => openDocs(),
 *     appearance: 'secondary'
 *   }
 * ];
 * 
 * <BaseItemEditorEmptyView
 *   title="Welcome to MyItem!"
 *   description="Get started by completing the tasks below"
 *   imageSrc="/assets/items/MyItem/empty.svg"
 *   imageAlt="Empty state"
 *   tasks={tasks}
 * />
 * ```
 * 
 * ## Fabric UX Compliance
 * - Uses Fabric design tokens for spacing, colors, typography
 * - Minimum 32px touch targets for all buttons
 * - Proper color contrast (WCAG 2.1 AA)
 * - Responsive layout with max-width constraint
 * - Semantic HTML structure
 * 
 * @see {@link https://react.fluentui.dev/} Fluent UI v9 Documentation
 */
export function BaseItemEditorEmptyView({
  title,
  description,
  imageSrc,
  imageAlt = "Empty state illustration",
  tasks = [],
  customContent,
  className = "",
  maxWidth = 600
}: BaseItemEditorEmptyViewProps) {
  
  // Stack tokens for consistent spacing using Fabric design tokens
  const containerTokens: IStackTokens = { childrenGap: 24 };
  const headerTokens: IStackTokens = { childrenGap: 8 };
  const tasksTokens: IStackTokens = { childrenGap: 12 };

  // Build the empty state content
  const emptyStateContent = (
    <Stack 
      className={`item-editor-view-empty ${className}`.trim()}
      horizontalAlign="center" 
      verticalAlign="center"
      role="main"
      aria-label="Empty state"
    >
      <Stack 
        className="empty-state-content" 
        tokens={containerTokens} 
        horizontalAlign="center"
        style={{ maxWidth: `${maxWidth}px` }}
      >
        {/* Illustration/Image Section */}
        {imageSrc && (
          <Stack.Item>
            <img
              src={imageSrc}
              alt={imageAlt}
              className="empty-state-image"
              aria-hidden={imageAlt ? "false" : "true"}
            />
          </Stack.Item>
        )}

        {/* Text Content Section */}
        <Stack 
          className="empty-state-text-container" 
          tokens={headerTokens} 
          horizontalAlign="center"
        >
          <div className="empty-state-header">
            <h2>{title}</h2>
            <Text className="empty-state-description">
              {description}
            </Text>
          </div>
        </Stack>

        {/* Tasks/Actions Section or Custom Content */}
        {customContent ? (
          <Stack.Item>
            {customContent}
          </Stack.Item>
        ) : tasks.length > 0 ? (
          <Stack tokens={tasksTokens} horizontalAlign="center">
            {tasks.map((task, index) => (
              <Stack.Item key={task.id}>
                <Stack tokens={{ childrenGap: 4 }} horizontalAlign="center">
                  <Button 
                    appearance={task.appearance || (index === 0 ? "primary" : "secondary")}
                    onClick={task.onClick}
                    icon={task.icon as any}
                    aria-label={task.description || task.label}
                    style={{ minWidth: '140px' }}
                  >
                    {task.label}
                  </Button>
                  {task.description && (
                    <Text 
                      size={200} 
                      style={{ 
                        color: 'var(--colorNeutralForeground3, #616161)',
                        textAlign: 'center',
                        maxWidth: '300px'
                      }}
                    >
                      {task.description}
                    </Text>
                  )}
                </Stack>
              </Stack.Item>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );

  // Use BaseItemEditorView with empty state in the center
  return (
    <BaseItemEditorView
      center={emptyStateContent}
    />
  );
}

export default BaseItemEditorEmptyView;
