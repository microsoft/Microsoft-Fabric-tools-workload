import React, { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Text,
} from "@fluentui/react-components";
import {
  ChevronDown20Regular
} from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { callNavigationOpenInNewBrowserTab } from "../../controller/NavigationController";
import { HelloWorldItemDefinition } from "./HelloWorldItemModel";
import "./HelloWorldItem.scss";

interface HelloWorldItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<HelloWorldItemDefinition>;
}

/**
 * Getting Started component - shows helpful resources
 * Demonstrates various Fabric APIs and navigation patterns
 */
export function HelloWorldItemDefaultView({
  workloadClient,
  item,
}: HelloWorldItemDefaultViewProps) {
  const { t } = useTranslation();
  const [expandedItemDetails, setExpandedItemDetails] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const handleOpenResource = async (url: string) => {
    try {
      // Demonstrate external navigation API
      await callNavigationOpenInNewBrowserTab(workloadClient, url);
    } catch (error) {
      // Fallback to window.open
      window.open(url, '_blank');
    }
  };

  return (
    <div className="hello-world-getting-started-container">
      <div className="hello-world-content-wrapper">
        {/* Left Hero Section */}
        <div className="hello-world-hero-section">
          <div className="hello-world-hero-content">
            <div className="hello-world-hero-text">
              <h1 className="hello-world-hero-title">{t('GettingStarted_Title', 'Hello, Fabric!')}</h1>
              <p className="hello-world-hero-subtitle">
                {t('GettingStarted_Subtitle', 'Your new item is ready to use. Use the resources here to customize it and get started.')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Content Section */}
        <div className="hello-world-main-content">
          <div className="hello-world-content-inner">
            {/* Header */}
            <div className="hello-world-content-header">
              <h2 className="hello-world-section-title">{t('GettingStarted_SectionTitle', 'Start customizing your workload')}</h2>
              <p className="hello-world-section-subtitle">{t('GettingStarted_SectionSubtitle', 'These resources will help you take the next steps.')}</p>
            </div>

            {/* Item Details Expandable Section */}
            <div className="hello-world-item-details-section">
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
                      <span className="hello-world-detail-label">{t('Item_Name_Label', 'Item Name')}</span>
                      <span className="hello-world-detail-value">{item.displayName || 'Hello World'}</span>
                    </div>
                    <div className="hello-world-detail-row">
                      <span className="hello-world-detail-label">{t('Workspace_ID_Label', 'Workspace ID')}</span>
                      <span className="hello-world-detail-value">{item.workspaceId}</span>
                    </div>
                    <div className="hello-world-detail-row">
                      <span className="hello-world-detail-label">{t('Item_ID_Label', 'Item ID')}</span>
                      <span className="hello-world-detail-value">{item.id}</span>
                    </div>
                    <div className="hello-world-detail-row">
                      <span className="hello-world-detail-label">{t('GettingStarted_WorkspaceType', 'Item Type')}</span>
                      <span className="hello-world-detail-value">{item.type}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Steps */}
            <div className="hello-world-recommended-section">
              <h3 className="hello-world-recommended-title">{t('GettingStarted_RecommendedSteps', 'Recommended next steps')}</h3>

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
                      description={<Text >{t('GettingStarted_Card1_Description', 'See a step-by-step guide for customizing workloads.')}</Text>}
                    />
                  </div>
                  <div className="hello-world-card-body">
                    <ul className="hello-world-card-list">
                      <li className="hello-world-card-list-item">{t('GettingStarted_Card1_Bullet1', 'Review your workload\'s structure and file storage.')}</li>
                      <li className="hello-world-card-list-item">{t('GettingStarted_Card1_Bullet2', 'Learn how to set the required properties for publishing.')}</li>
                      <li className="hello-world-card-list-item">{t('GettingStarted_Card1_Bullet3', 'Explore adding optional features and custom settings.')}</li>
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
                      <li className="hello-world-card-list-item">{t('GettingStarted_Card2_Bullet1', 'Explore workload interaction in the sample calculator.')}</li>
                      <li className="hello-world-card-list-item">{t('GettingStarted_Card2_Bullet2', 'Test UI components in the Workload Playground.')}</li>
                      <li className="hello-world-card-list-item">{t('GettingStarted_Card2_Bullet3', 'Clone the repo to run and explore the sample workload.')}</li>
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
                      description={<Text >{t('GettingStarted_Card3_Description', 'Learn about design patterns and best practices.')}</Text>}
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
      </div>
    </div>
  );
}