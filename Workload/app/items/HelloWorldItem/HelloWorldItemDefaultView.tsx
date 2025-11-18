import React, { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Textarea,
  Text,
  Tooltip,
} from "@fluentui/react-components";
import {
  ChevronDown20Regular
} from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { callNavigationOpenInNewBrowserTab } from "../../controller/NavigationController";
import { HelloWorldItemDefinition } from "./HelloWorldItemDefinition";
import { ItemEditorDefaultView } from "../../controls/ItemEditor";
import "./HelloWorldItem.scss";

interface HelloWorldItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<HelloWorldItemDefinition>;
  messageValue?: string;
  onMessageChange?: (newValue: string) => void;
}

/**
 * Getting Started component - shows helpful resources
 * Demonstrates various Fabric APIs and navigation patterns
 */
export function HelloWorldItemDefaultView({
  workloadClient,
  item,
  messageValue,
  onMessageChange,
}: HelloWorldItemDefaultViewProps) {
  const { t } = useTranslation();
  const [expandedItemDetails, setExpandedItemDetails] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const handleOpenResource = async (url: string) => {
    try {
      // Demonstrate external navigation API
      await callNavigationOpenInNewBrowserTab(workloadClient, url);
    } catch (error) {
      // Log the error
      console.error('Failed to open resource via Fabric navigation API:', error);
    }
  };

  // Left panel content - Hero section with welcome message
  const gettingStartedSection = (
    <div className="hello-world-view">
      
      <div className="hello-world-next">
        <div className="hello-world-section-header">
          <h2 className="hello-world-section-title">Getting started</h2>
          <p className="hello-world-section-subtitle">{t('GettingStarted_SectionSubtitle', 'Use the steps below to save your Fabric item.')}</p>
        </div>
        <div className="hello-world-section-body">
          <ol className="hello-world-next-list">
            <li className="hello-world-next-item">
              {t('GettingStarted_Card1_Bullet1', 'Change the item definition on the right.')}
            </li>
            <li className="hello-world-next-item">
              {t('GettingStarted_Card1_Bullet2', 'Save the item, to store the state in Fabric.')}
            </li>                    
          </ol>
        </div>
        {/* Separator line between learning and building */}
        <hr className="hello-world-separator-line" />
        <div className="hello-world-section-header">
          <h2 className="hello-world-section-title">Bring your ideas to life</h2>
          <p className="hello-world-section-subtitle">{t('GettingStarted_SectionSubtitle', 'Use the steps below to build your Fabric item.')}</p>
        </div>
        <div className="hello-world-section-body">
          <ol className="hello-world-next-list">            
            <li className="hello-world-next-item">
              {t('GettingStarted_Card1_Bullet3', 'Use the content on the right to learn more.')}
            </li>
            <li className="hello-world-next-item">
              {t('GettingStarted_Card1_Bullet4', 'Create your own Fabric item.')}
              <div className="hello-world-step-button">
                <Button
                  appearance="outline"
                  size="small"
                  onClick={() => handleOpenResource("https://aka.ms/fabric-item-development-guide")}
                >
                  {t('GettingStarted_OpenTutorial', 'Open Tutorial')}
                </Button>
              </div>
            </li>
            <li className="hello-world-next-item">
              {t('GettingStarted_Card1_Bullet5', 'Publish your workload.')}
              <div className="hello-world-step-button">
                <Button
                  appearance="outline"
                  size="small"
                  onClick={() => handleOpenResource("https://aka.ms/fabric-workload-publishing-guide")}
                >
                  {t('GettingStarted_OpenTutorial', 'Open Tutorial')}
                </Button>
              </div>
            </li>
          </ol>
          <hr className="hello-world-separator-line" />
        </div>
      </div>
    </div>
  );  
  
  // Center panel content - Main content with item details and resources
  const itemDetailSection = (
    <div className="hello-world-view">
      <div className="hello-world-content-inner">       

        {/* Item Details Expandable Section */}
        <div className="hello-world-section-body">
          <div className="hello-world-expandable-card">
            <button
              className="hello-world-expand-button"
              onClick={() => setExpandedItemDetails(!expandedItemDetails)}
              aria-expanded={expandedItemDetails}
            >
              <ChevronDown20Regular
                className={`hello-world-expand-icon ${expandedItemDetails ? 'expanded' : 'collapsed'}`}
              />
              <Text className="hello-world-expand-title">{t('GettingStarted_ItemDetails', 'Item details')}</Text>
            </button>

            {expandedItemDetails && (
              <div className="hello-world-expand-content">
                <div className="hello-world-detail-row">
                  <Tooltip content="The display name of this Fabric item" relationship="label">
                    <span className="hello-world-detail-label">{t('Item_Name_Label', 'Item Name')}</span>
                  </Tooltip>
                  <span className="hello-world-detail-value">{item.displayName || 'Hello World'}</span>
                </div>
                <div className="hello-world-detail-row">
                  <Tooltip content="Unique identifier for the workspace containing this item" relationship="label">
                    <span className="hello-world-detail-label">{t('Workspace_ID_Label', 'Workspace ID')}</span>
                  </Tooltip>
                  <span className="hello-world-detail-value">{item.workspaceId}</span>
                </div>
                <div className="hello-world-detail-row">
                  <Tooltip content="Unique identifier for this specific Fabric item" relationship="label">
                    <span className="hello-world-detail-label">{t('Item_ID_Label', 'Item ID')}</span>
                  </Tooltip>
                  <span className="hello-world-detail-value">{item.id}</span>
                </div>
                <div className="hello-world-detail-row">
                  <Tooltip content="The type of Fabric item in the format [WorkloadName].[ItemName] (e.g., Org.MyWorkload.HelloWorld)" relationship="label">
                    <span className="hello-world-detail-label">{t('GettingStarted_WorkspaceType', 'Item Type')}</span>
                  </Tooltip>
                  <span className="hello-world-detail-value">{item.type}</span>
                </div>
                <div className="hello-world-detail-row">
                  <Tooltip content="The definition is stored as part of the item in Fabric. HelloWorld uses a message to demonstrate the behaviour." relationship="label">
                    <span className="hello-world-detail-label">{t('Item_Definition_Label', 'Item Definition')}</span>
                  </Tooltip>
                  <div className="hello-world-hero-input">
                    <Textarea
                      id="message-input"
                      value={messageValue || item?.definition?.message || ""}
                      onChange={(e, data) => onMessageChange?.(data.value)}
                      placeholder={t('Item_Message_Placeholder', 'Enter a message...')}
                      rows={2}
                      resize="vertical"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="hello-world-section-header">
          <h2 className="hello-world-section-title">{t('GettingStarted_SectionTitle', 'Learn more about your workload')}</h2>
          <p className="hello-world-section-subtitle">{t('GettingStarted_SectionSubtitle', 'These resources will help you take the next steps.')}</p>
        </div>

        {/* Resources */}
        <div className="hello-world-resources-section">
          <div className="hello-world-cards-grid">
            {/* Card 1: Getting to know your workload */}
            <Card 
              className={`hello-world-resource-card ${hoveredCard === 1 ? 'hover' : ''}`}
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="hello-world-card-header-section">
                <div className="hello-world-card-image-container">
                  <img src="/assets/items/HelloWorldItem/card_1.svg" alt="Getting started" className="hello-world-card-image" />
                </div>
                <CardHeader
                  header={<Text weight="semibold">{t('GettingStarted_Card1_Title', 'Getting to know your workload')}</Text>}
                  description={<Text >{t('GettingStarted_Card1_Description', 'See a step-by-step guide for understanding your workload.')}</Text>}
                />
              </div>
              <div className="hello-world-card-body">
                <ul className="hello-world-card-list">
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card1_Bullet1', 'Review your workload\'s structure and components.')}</li>
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card1_Bullet3', 'Explore adding optional features and custom settings.')}</li>
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card1_Bullet2', 'Learn how to build your own item.')}</li>
                </ul>
              </div>
              <div className="hello-world-card-footer">
                <Button
                  appearance="outline"
                  onClick={() => handleOpenResource("https://aka.ms/getting-to-know-your-workload")}
                >
                  {t('GettingStarted_OpenButton', 'Open')}
                </Button>
              </div>
            </Card>

            {/* Card 2: Explore samples and playground */}
            <Card 
              className={`hello-world-resource-card ${hoveredCard === 2 ? 'hover' : ''}`}
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="hello-world-card-header-section">
                <div className="hello-world-card-image-container">
                  <img src="/assets/items/HelloWorldItem/card_2.svg" alt="Playground" className="hello-world-card-image" />
                </div>
                <CardHeader
                  header={<Text weight="semibold">{t('GettingStarted_Card2_Title', 'Explore samples and playground')}</Text>}
                  description={<Text >{t('GettingStarted_Card2_Description', 'Try available UI components in an interactive environment.')}</Text>}
                />
              </div>
              <div className="hello-world-card-body">
                <ul className="hello-world-card-list">
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card2_Bullet1', 'Explore other workloads.')}</li>
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card2_Bullet2', 'Test UI components in the Workload.')}</li>
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card2_Bullet3', 'Run and explore the sample workload.')}</li>
                </ul>
              </div>
              <div className="hello-world-card-footer">
                <Button
                  appearance="outline"
                  onClick={() => handleOpenResource('https://aka.ms/explore-samples-and-playground')}
                >
                  {t('GettingStarted_OpenButton', 'Open')}
                </Button>
              </div>
            </Card>

            {/* Card 3: Use the Fabric UX system */}
            <Card 
              className={`hello-world-resource-card ${hoveredCard === 3 ? 'hover' : ''}`}
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="hello-world-card-header-section">
                <div className="hello-world-card-image-container">
                  <img src="/assets/items/HelloWorldItem/card_3.svg" alt="Fabric UX" className="hello-world-card-image" />
                </div>
                <CardHeader
                  header={<Text weight="semibold">{t('GettingStarted_Card3_Title', 'Use the Fabric UX system')}</Text>}
                  description={<Text >{t('GettingStarted_Card3_Description', 'Learn about design patterns and best practices of the platform.')}</Text>}
                />
              </div>
              <div className="hello-world-card-body">
                <ul className="hello-world-card-list">
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card3_Bullet1', 'Build a consistent UI with official components and patterns.')}</li>
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card3_Bullet2', 'Use design tokens and layouts to accelerate development.')}</li>
                  <li className="hello-world-card-list-item">{t('GettingStarted_Card3_Bullet3', 'Apply our accessibility guidelines for an inclusive experience.')}</li>
                </ul>
              </div>
              <div className="hello-world-card-footer">
                <Button
                  appearance="outline"
                  onClick={() => handleOpenResource("https://aka.ms/use-fabric-ux-system")}
                >
                  {t('GettingStarted_OpenButton', 'Open')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ItemEditorDefaultView
      //Add left control if you want to split the center content in the editor
      left={{
        content: gettingStartedSection,
        width: 400,
        minWidth: 350,
        title: t('Item_GettingStarted_Label', 'Next Steps'),
        enableUserResize: true,
        collapsible: true
      }}
      center={{
        content: itemDetailSection
      }}
    />
  );
}