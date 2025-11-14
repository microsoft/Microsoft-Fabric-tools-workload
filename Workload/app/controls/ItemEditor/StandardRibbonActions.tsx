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
  testId: 'ribbon-save-btn',
});

/**
 * Creates a standard Settings action
 * @param onClick - Settings handler
 * @param label - Custom label (defaults to "Settings")
 * @param disabled - Whether the settings button should be disabled
 * @param showDividerAfter - Whether to show a divider after this action (defaults to true)
 */
export const createSettingsAction = (
  onClick: () => void | Promise<void>,
  label: string = "Settings",
  disabled: boolean = false,
  showDividerAfter: boolean = true
): RibbonAction => ({
  key: 'settings',
  icon: Settings24Regular,
  label,
  onClick,
  disabled,
  testId: 'ribbon-settings-btn',
  showDividerAfter
});

/**
 * Creates a standard About/Info action
 * @param onClick - About handler
 * @param label - Custom label (defaults to "About")
 * @param disabled - Whether the about button should be disabled
 */
export const createAboutAction = (
  onClick: () => void | Promise<void>,
  label: string = "About",
  disabled: boolean = false
): RibbonAction => ({
  key: 'about',
  icon: Info24Regular,
  label,
  onClick,
  disabled,
  testId: 'ribbon-about-btn'
});
