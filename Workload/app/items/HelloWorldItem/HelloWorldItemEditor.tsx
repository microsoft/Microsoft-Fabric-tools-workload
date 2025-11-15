import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { MessageBar, MessageBarBody, MessageBarActions, Button } from "@fluentui/react-components";
import { Warning20Filled, Dismiss20Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ItemEditor } from "../../controls/ItemEditor";
import { HelloWorldItemDefinition } from "./HelloWorldItemModel";
import { HelloWorldItemEmptyView } from "./HelloWorldItemEmptyView";
import { HelloWorldItemDefaultView } from "./HelloWorldItemDefaultView";
import { HelloWorldItemRibbon } from "./HelloWorldItemRibbon";
import "../../styles.scss";
import "./HelloWorldItem.scss";

/**
 * Different views that are available for the HelloWorld item
 */
export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
} as const;


export function HelloWorldItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<HelloWorldItemDefinition>>();
  const [hasBeenSaved, setHasBeenSaved] = useState<boolean>(false);
  const [currentDefinition, setCurrentDefinition] = useState<HelloWorldItemDefinition>({});
  const [showWarning, setShowWarning] = useState(true);
  const [currentViewSetter, setCurrentViewSetter] = useState<((view: string) => void) | null>(null);

  const { pathname } = useLocation();

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var LoadedItem: ItemWithDefinition<HelloWorldItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      // for Edit scenario we get the itemObjectId and then load the item via the workloadClient SDK
      try {
        LoadedItem = await getWorkloadItem<HelloWorldItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Ensure item definition is properly initialized without mutation
        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              message: undefined,
            }
          };
        }
        else {
          console.log('LoadedItem definition: ', LoadedItem.definition);
        }

        setItem(LoadedItem);
        
        // Initialize current definition
        setCurrentDefinition(LoadedItem.definition || {});

      } catch (error) {
        setItem(undefined);
      }
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    setHasBeenSaved(false);
  }, [item?.id]);

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Effect to set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && currentViewSetter) {
      // Determine the correct view based on item state
      const correctView = !item?.definition?.message ? EDITOR_VIEW_TYPES.EMPTY : EDITOR_VIEW_TYPES.DEFAULT;
      currentViewSetter(correctView);
    }
  }, [isLoading, item, currentViewSetter]);

  const handleOpenSettings = async () => {
    if (item) {
      try {
        const item_res = await callGetItem(workloadClient, item.id);
        await callOpenSettings(workloadClient, item_res.item, 'About');
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  };

  async function SaveItem() {
    var successResult = await saveItemDefinition<HelloWorldItemDefinition>(
      workloadClient,
      item.id,
      {
        ...currentDefinition,
        message: currentDefinition.message || new Date().toISOString()
      });
    const wasSaved = Boolean(successResult);
    setHasBeenSaved(wasSaved);
    callNotificationOpen(
      props.workloadClient,
      t("ItemEditor_Saved_Notification_Title"),
      t("ItemEditor_Saved_Notification_Text", { itemName: item.displayName }),
      undefined,
      undefined
    );
  }

  const isSaveEnabled = (currentView: string) => {
    if (currentView === EDITOR_VIEW_TYPES.EMPTY) {
      return false;
    } else {
      if (hasBeenSaved) {
        return false;
      }
      // Enable save if message has changed or if no message exists yet
      const originalMessage = item?.definition?.message || "";
      const currentMessage = currentDefinition.message || "";
      return originalMessage !== currentMessage || !item?.definition?.message;
    }
  };

  // Render with view registration
  // BaseItemEditor manages the view state internally and handles loading
  return (
    <ItemEditor
      isLoading={isLoading}
      loadingMessage={t("HelloWorldItemEditor_Loading", "Loading item...")}
      ribbon={(context) => (
        <HelloWorldItemRibbon
          {...props}
          isSaveButtonEnabled={isSaveEnabled(context.currentView)}
          viewContext={context}
          saveItemCallback={SaveItem}
          openSettingsCallback={handleOpenSettings}
        />
      )}
      notification={(currentView) =>
        currentView === EDITOR_VIEW_TYPES.DEFAULT && showWarning ? (
          <MessageBar intent="warning" icon={<Warning20Filled />}>
            <MessageBarBody>
              {t('GettingStarted_Warning', 'You can delete the content on this page at any time.')}
            </MessageBarBody>
            <MessageBarActions
              containerAction={
                <Button
                  appearance="transparent"
                  icon={<Dismiss20Regular />}
                  aria-label={t('MessageBar_Dismiss', 'Dismiss')}
                  onClick={() => setShowWarning(false)}
                />
              }
            />
          </MessageBar>
        ) : undefined
      }
      views={(setCurrentView) => {
        // Store the setCurrentView function so we can use it after loading
        if (!currentViewSetter) {
          setCurrentViewSetter(() => setCurrentView);
        }
        
        return [
          {
            name: EDITOR_VIEW_TYPES.EMPTY,
            component: (
              <HelloWorldItemEmptyView
                workloadClient={workloadClient}
                item={item}
                onNavigateToGettingStarted={() => {
                  setCurrentDefinition(prev => ({ ...prev, message: "Hello Fabric Item!" }));
                  setHasBeenSaved(false);
                  setCurrentView(EDITOR_VIEW_TYPES.DEFAULT);
                }}
              />
            )
          },
          {
            name: EDITOR_VIEW_TYPES.DEFAULT,
            component: (
              <HelloWorldItemDefaultView
                workloadClient={workloadClient}
                item={item}
                messageValue={currentDefinition.message}
                onMessageChange={(newValue) => {
                  setCurrentDefinition(prev => ({ ...prev, message: newValue }));
                  setHasBeenSaved(false);
                }}
              />
            )
          }
        ];
      }}
      initialView={EDITOR_VIEW_TYPES.EMPTY}
    />
  );
}