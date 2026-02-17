import React, { useState, useEffect } from 'react';
import { brandConfig } from '../config';
import { HistoryItem } from '../types';

interface HomeProps {
    setMode: (mode: any) => void;
    setSelectedImageId: (id: string | null) => void;
}

export const Home: React.FC<HomeProps> = ({ setMode, setSelectedImageId }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-20">
            <h1 className="text-3xl md:text-4xl font-normal text-gray-900 mb-6">
                Welcome to the Marketing Portal!
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Please use the menu on the left to select the utility you would like to use.
                This is an evolving portal with new functionality being rolled out over time.
                For questions about current and upcoming capabilities, please reach out to
                the MarTech Product team.
            </p>
        </div>
    );
};
