import React from "react";
import { Text } from "@fluentui/react-components";

export interface WizardStep {
    id: string;
    title: string;
    description?: string;
    completed?: boolean;
}

export interface WizardControlProps {
    steps: WizardStep[];
    currentStepId: string;
    onStepChange?: (stepId: string) => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    style?: React.CSSProperties;
}

export function WizardControl({ steps, currentStepId, onStepChange, children, footer, style }: WizardControlProps) {
    const currentStepIndex = steps.findIndex(step => step.id === currentStepId);

    const getStepStatus = (stepIndex: number) => {
        if (stepIndex < currentStepIndex) return 'completed';
        if (stepIndex === currentStepIndex) return 'current';
        return 'upcoming';
    };

    const getStepColor = (status: string) => {
        switch (status) {
            case 'completed':
                return '#018574'; // Bright green for completed
            case 'current':
                return '#018574'; // Fabric teal for current
            default:
                return '#E1DFDD'; // Gray for upcoming
        }
    };

    const getStepTextColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'current':
                return 'white';
            default:
                return '#616161';
        }
    };

    const handleStepClick = (step: WizardStep, stepIndex: number) => {
        // Only allow navigation to completed steps or current step
        if (stepIndex <= currentStepIndex && onStepChange) {
            onStepChange(step.id);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px', minWidth: '800px', ...style }}>
            {/* Main Content Area */}
            <div style={{ display: 'flex', flex: 1 }}>
                {/* Left Panel - Steps */}
            <div style={{ 
                width: '180px', 
                backgroundColor: '#FAFAFA', 
                borderRight: '1px solid #E1DFDD',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div>
                    {steps.map((step, index) => {
                        const status = getStepStatus(index);
                        const backgroundColor = getStepColor(status);
                        const textColor = getStepTextColor(status);
                        const isClickable = index <= currentStepIndex;

                        return (
                            <div key={step.id}>
                                <div 
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                        maxWidth: '280px',
                                        cursor: isClickable ? 'pointer' : 'default',
                                        opacity: isClickable ? 1 : 0.6
                                    }}
                                    onClick={() => handleStepClick(step, index)}
                                >
                                    {/* Step Circle */}
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: '2px'
                                    }}>
                                        {status === 'completed' ? (
                                            <div style={{
                                                width: '12px',
                                                height: '8px',
                                                borderLeft: '2px solid white',
                                                borderBottom: '2px solid white',
                                                transform: 'rotate(-45deg)',
                                                marginTop: '-2px'
                                            }} />
                                        ) : (
                                            <Text 
                                                size={200} 
                                                weight="semibold" 
                                                style={{ color: textColor, lineHeight: '1' }}
                                            >
                                                {index + 1}
                                            </Text>
                                        )}
                                    </div>

                                    {/* Step Content */}
                                    <div style={{ flex: 1, paddingBottom: '20px' }}>
                                        <Text 
                                            weight={status === 'current' ? 'semibold' : 'medium'}
                                            style={{ 
                                                display: 'block',
                                                color: status === 'current' ? '#018574' : '#323130',
                                                marginBottom: step.description ? '4px' : '0'
                                            }}
                                        >
                                            {step.title}
                                        </Text>
                                        {step.description && (
                                            <Text 
                                                size={200} 
                                                style={{ 
                                                    color: '#616161',
                                                    display: 'block',
                                                    lineHeight: '1.3'
                                                }}
                                            >
                                                {step.description}
                                            </Text>
                                        )}
                                    </div>
                                </div>

                                {/* Connecting Line */}
                                {index < steps.length - 1 && (
                                    <div style={{
                                        width: '2px',
                                        height: '20px',
                                        backgroundColor: index < currentStepIndex ? '#107C10' : '#E1DFDD',
                                        marginLeft: '11px',
                                        marginTop: '-20px',
                                        marginBottom: '0px'
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right Panel - Content */}
            <div style={{ 
                flex: 1, 
                padding: '20px',
                backgroundColor: 'white',
                overflow: 'auto'
            }}>
                {children}
            </div>
            </div>

            {/* Footer */}
            {footer && (
                <div style={{ 
                    borderTop: '1px solid #e1dfdd',
                    backgroundColor: 'white'
                }}>
                    {footer}
                </div>
            )}
        </div>
    );
}
