import React from 'react';
import { PageProps } from '../../App';
import { useTranslation } from 'react-i18next';
import '../../styles.scss'; // Import generic settings panel styles
import './HelloWorldItem.scss'; // Import HelloWorld-specific overrides

export function HelloWorldItemAboutView(props: PageProps) {
    const { t } = useTranslation();
    
    return (
        <div className="hello-world-view">
            <span className="hello-world-section-title">
                {t('About_PlaceholderText', 'Your content will appear here')}
            </span>
        </div>
    );
}

export default HelloWorldItemAboutView;