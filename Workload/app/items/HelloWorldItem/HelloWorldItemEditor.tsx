import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { Warning20Filled } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { BaseItemEditor, ItemEditorLoadingProgressBar } from "../../controls";
import { HelloWorldItemDefinition} from "./HelloWorldItemModel";
import { HelloWorldItemEmptyView } from "./HelloWorldItemEmptyView";
import { HelloWorldItemDefaultView } from "./HelloWorldItemDefaultView";
import { HelloWorldItemRibbon } from "./HelloWorldItemRibbon";
import "../../styles.scss";

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
              state: undefined,
            }
          };
        }
        else {
          console.log('LoadedItem definition: ', LoadedItem.definition);
        }

        setItem(LoadedItem);

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
        state: new Date().toISOString()
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
      if (!item?.definition?.state) {
        return true;
      }
      return false;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <ItemEditorLoadingProgressBar
        message={t("HelloWorldItemEditor_Loading", "Loading item...")}
      />
    );
  }

  // Render with view registration
  // BaseItemEditor manages the view state internally
  return (
    <BaseItemEditor
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
        currentView === EDITOR_VIEW_TYPES.DEFAULT ? (
          <MessageBar intent="warning" icon={<Warning20Filled />}>
            <MessageBarBody>
              {t('GettingStarted_Warning', 'You can delete the content on this page at any time.')}
            </MessageBarBody>
          </MessageBar>
        ) : undefined
      }
      views={(setCurrentView) => [
        {
          name: EDITOR_VIEW_TYPES.EMPTY,
          component: (
            <HelloWorldItemEmptyView
              workloadClient={workloadClient}
              item={item}
              onNavigateToGettingStarted={() => setCurrentView(EDITOR_VIEW_TYPES.DEFAULT)}
            />
          )
        },
        {
          name: EDITOR_VIEW_TYPES.DEFAULT,
          component: (
            <HelloWorldItemDefaultView
              workloadClient={workloadClient}
              item={item}
            />
          )
        }
      ]}
      initialView={!item?.definition?.state ? EDITOR_VIEW_TYPES.EMPTY : EDITOR_VIEW_TYPES.DEFAULT}
    />
  );
}