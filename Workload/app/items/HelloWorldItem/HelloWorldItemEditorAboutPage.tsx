import React from 'react';
import { PageProps } from '../../App';
import { useTranslation } from 'react-i18next';
import '../../styles.scss'; // Import generic settings panel styles
import './HelloWorldItem.scss'; // Import HelloWorld-specific overrides

export function HelloWorldItemEditorAboutPage(props: PageProps) {
    const { t } = useTranslation();
    
    return (
        <div className="item-settings-panel-container hello-world-settings-panel-container">
            <div className="item-settings-panel-content">
                <span className="item-settings-placeholder-text">
                {t('About_PlaceholderText', 'Your content will appear here')}
                </span>
            </div>
        </div>
    );
}

export default HelloWorldItemEditorAboutPage;