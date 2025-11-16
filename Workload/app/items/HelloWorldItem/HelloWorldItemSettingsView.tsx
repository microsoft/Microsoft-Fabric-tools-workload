import React from 'react';
import { PageProps } from '../../App';
import { useTranslation } from 'react-i18next';
import './HelloWorldItem.scss';

export function HelloWorldItemSettingsView(props: PageProps) {
  const { t } = useTranslation();
  console.log("HelloWorldItemSettingsView rendered with props:", props);
  
  return (
    <div className="hello-world-view">
      <span className="hello-world-section-title">
        {t('Settings_PlaceholderText', 'Your content will appear here')}
      </span>
    </div>
  );
}

export default HelloWorldItemSettingsView;