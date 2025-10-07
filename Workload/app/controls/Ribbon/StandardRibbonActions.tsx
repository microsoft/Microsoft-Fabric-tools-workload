import {
  Save24Regular,
  Settings24Regular,
  Info24Regular
} from "@fluentui/react-icons";
import { RibbonAction } from './BaseRibbonToolbar';

/**
 * Standard ribbon action configurations following Fabric guidelines
 * 
 * These factory functions provide consistent action configurations that can be
 * reused across different item editors while maintaining the same look and feel.
 * 
 * Core Standard Actions:
 * - Save: Universal save action for persisting changes
 * - Settings: Common configuration/settings panel access
 * - About: Information and help action
 * 
 * Note: Other actions (Undo, Redo, Delete, Share, Print, Download, Upload, Add, Edit, Close)
 * should be implemented as custom actions specific to each item editor's needs.
 * See HelloWorldItemRibbon.tsx for examples of creating custom actions.
 */

/**
 * Creates a standard Save action
 * @param onClick - Save handler
 * @param disabled - Whether the save button should be disabled
 * @param label - Custom label (defaults to "Save")
 */
export const createSaveAction = (
  onClick: () => void | Promise<void>,
  disabled: boolean = false,
  label: string = "Save"
): RibbonAction => ({
  key: 'save',
  icon: Save24Regular,
  label,
  onClick,
  disabled,
  testId: 'item-editor-save-btn',
  appearance: 'primary'
});

/**
 * Creates a standard Settings action
 * @param onClick - Settings handler
 * @param label - Custom label (defaults to "Settings")
 */
export const createSettingsAction = (
  onClick: () => void | Promise<void>,
  label: string = "Settings"
): RibbonAction => ({
  key: 'settings',
  icon: Settings24Regular,
  label,
  onClick,
  testId: 'item-editor-settings-btn',
  showDividerAfter: true
});

/**
 * Creates a standard About/Info action
 * @param onClick - About handler
 * @param label - Custom label (defaults to "About")
 */
export const createAboutAction = (
  onClick: () => void | Promise<void>,
  label: string = "About"
): RibbonAction => ({
  key: 'about',
  icon: Info24Regular,
  label,
  onClick,
  testId: 'item-editor-about-btn'
});
