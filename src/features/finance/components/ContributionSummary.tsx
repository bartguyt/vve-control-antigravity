import React from 'react';
import { Card, Text, Title } from '@tremor/react';

interface ContributionSummaryProps {
    totalDue: number;
    totalPaid: number;
    progress: number;
}

export const ContributionSummary: React.FC<ContributionSummaryProps> = ({ totalDue, totalPaid, progress }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card decoration="top" decorationColor="indigo">
                <Text>Totaal Verwacht</Text>
                <Title>€ {totalDue.toFixed(2)}</Title>
            </Card>
            <Card decoration="top" decorationColor="emerald">
                <Text>Ontvangen</Text>
                <Title>€ {totalPaid.toFixed(2)}</Title>
            </Card>
            <Card decoration="top" decorationColor="blue">
                <Text>Voortgang</Text>
                <Title>{progress.toFixed(0)}%</Title>
            </Card>
        </div>
    );
};
