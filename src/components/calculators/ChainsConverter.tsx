import React, { useState } from 'react';
import { ArrowLeftRight, Ruler, User } from 'lucide-react';

const CHAIN_TO_METERS = 20.1168;
const METERS_TO_YARDS = 1.09361;
const WALKING_SPEED_KMH = 4; // Average walking speed in km/h

export const ChainsConverter: React.FC = () => {
  const [chains, setChains] = useState('');
  const [meters, setMeters] = useState('');
  const [yards, setYards] = useState('');
  const [walkingTime, setWalkingTime] = useState('');

  const calculateFromChains = (chainValue: string) => {
    const chainNum = parseFloat(chainValue);
    if (!isNaN(chainNum)) {
      const metersValue = chainNum * CHAIN_TO_METERS;
      const yardsValue = metersValue * METERS_TO_YARDS;
      const timeInMinutes = (metersValue / 1000) * (60 / WALKING_SPEED_KMH);
      
      setMeters(metersValue.toFixed(2));
      setYards(yardsValue.toFixed(2));
      setWalkingTime(timeInMinutes.toFixed(1));
    } else {
      setMeters('');
      setYards('');
      setWalkingTime('');
    }
  };

  const calculateFromMeters = (meterValue: string) => {
    const meterNum = parseFloat(meterValue);
    if (!isNaN(meterNum)) {
      const chainValue = meterNum / CHAIN_TO_METERS;
      const yardsValue = meterNum * METERS_TO_YARDS;
      const timeInMinutes = (meterNum / 1000) * (60 / WALKING_SPEED_KMH);
      
      setChains(chainValue.toFixed(2));
      setYards(yardsValue.toFixed(2));
      setWalkingTime(timeInMinutes.toFixed(1));
    } else {
      setChains('');
      setYards('');
      setWalkingTime('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight className="text-blue-500" size={20} />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Distance Converter
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Convert between chains, meters, and yards with walking time
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chains:
          </label>
          <input
            type="number"
            value={chains}
            onChange={(e) => {
              setChains(e.target.value);
              calculateFromChains(e.target.value);
            }}
            placeholder="Enter chains"
            className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Meters:
          </label>
          <input
            type="number"
            value={meters}
            onChange={(e) => {
              setMeters(e.target.value);
              calculateFromMeters(e.target.value);
            }}
            placeholder="Enter meters"
            className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
          />
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="text-blue-500" size={16} />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Distance
            </h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Chains:</span>
              <span className="font-medium text-gray-900 dark:text-white">{chains || '0'} chains</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Meters:</span>
              <span className="font-medium text-gray-900 dark:text-white">{meters || '0'} meters</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Yards:</span>
              <span className="font-medium text-gray-900 dark:text-white">{yards || '0'} yards</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <User className="text-blue-500" size={16} />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Walking Time
            </h3>
          </div>
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Time: </span>
            <span className="font-medium text-gray-900 dark:text-white">{walkingTime || '0'} minutes</span>
          </div>
        </div>
      </div>
    </div>
  );
};