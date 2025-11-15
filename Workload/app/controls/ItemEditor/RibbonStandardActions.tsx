import {
  Save24Regular,
  Settings24Regular,
  Info24Regular
} from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import { RibbonAction } from './RibbonToolbar';

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
 * 
 * Translation: All actions use default translation keys with fallbacks for internationalization.
 */

/**
 * Creates a standard Save action with automatic translation
 * @param onClick - Save handler
 * @param disabled - Whether the save button should be disabled
 * @param label - Custom label (if not provided, will use translation key "ItemEditor_Ribbon_Save_Label")
 */
export const createSaveAction = (
  onClick: () => void | Promise<void>,
  disabled: boolean = false,
  label?: string
): RibbonAction => {
  const { t } = useTranslation();
  
  return {
    key: 'save',
    icon: Save24Regular,
    label: label || t("ItemEditor_Ribbon_Save_Label", "Save"),
    onClick,
    disabled,
    testId: 'ribbon-save-btn',
  };
};

/**
 * Creates a standard Settings action with automatic translation
 * @param onClick - Settings handler
 * @param label - Custom label (if not provided, will use translation key "ItemEditor_Ribbon_Settings_Label")
 * @param disabled - Whether the settings button should be disabled
 * @param showDividerAfter - Whether to show a divider after this action (defaults to true)
 */
export const createSettingsAction = (
  onClick: () => void | Promise<void>,
  label?: string,
  disabled: boolean = false,
  showDividerAfter: boolean = true
): RibbonAction => {
  const { t } = useTranslation();
  
  return {
    key: 'settings',
    icon: Settings24Regular,
    label: label || t("ItemEditor_Ribbon_Settings_Label", "Settings"),
    onClick,
    disabled,
    testId: 'ribbon-settings-btn',
    showDividerAfter
  };
};

/**
 * Creates a standard About/Info action with automatic translation
 * @param onClick - About handler
 * @param label - Custom label (if not provided, will use translation key "ItemEditor_Ribbon_About_Label")
 * @param disabled - Whether the about button should be disabled
 */
export const createAboutAction = (
  onClick: () => void | Promise<void>,
  label?: string,
  disabled: boolean = false
): RibbonAction => {
  const { t } = useTranslation();
  
  return {
    key: 'about',
    icon: Info24Regular,
    label: label || t("ItemEditor_Ribbon_About_Label", "About"),
    onClick,
    disabled,
    testId: 'ribbon-about-btn'
  };
};