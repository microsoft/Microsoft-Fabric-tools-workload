import React from 'react';
import { PageProps } from '../../App';
import { useTranslation } from 'react-i18next';
import { Text } from '@fluentui/react-components';
import './HelloWorldItem.scss';

export function HelloWorldItemAboutView(props: PageProps) {
    const { t } = useTranslation();
    
    return (
        <div className="hello-world-view">
            <Text as="h1" size={600} weight="semibold" className="hello-world-section-title">
                {t('HelloWorldItem_About_Title', 'About Hello World')}
            </Text>
            
            <div style={{ marginTop: '24px' }}>
                <Text size={400}>
                    {t('HelloWorldItem_About_Description', 
                        'This item is designed to demonstrate how Microsoft Fabric extensibility works. ' +
                        'It serves as a sample implementation showing best practices for creating custom workload items, ' +
                        'including proper architecture patterns, user interface design, and integration with the Fabric platform.'
                    )}
                </Text>
            </div>
        </div>
    );
}

export default HelloWorldItemAboutView;