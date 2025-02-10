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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight className="text-indigo-500" size={24} />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Distance Converter
        </h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-base font-semibold text-slate-700 dark:text-gray-300 mb-2">
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
            className="w-full p-3 text-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-base font-semibold text-slate-700 dark:text-gray-300 mb-2">
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
            className="w-full p-3 text-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="text-indigo-500" size={20} />
              <span className="text-lg font-semibold text-slate-700 dark:text-gray-300">Distance</span>
            </div>
            <div className="space-y-2 text-right">
              <div className="text-lg text-slate-700 dark:text-gray-300">
                <span className="font-semibold">{chains || '0'}</span> chains
              </div>
              <div className="text-lg text-slate-700 dark:text-gray-300">
                <span className="font-semibold">{meters || '0'}</span> meters
              </div>
              <div className="text-lg text-slate-700 dark:text-gray-300">
                <span className="font-semibold">{yards || '0'}</span> yards
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <User className="text-indigo-500" size={20} />
              <span className="text-lg font-semibold text-slate-700 dark:text-gray-300">Walking Time</span>
            </div>
            <div className="text-lg text-slate-700 dark:text-gray-300">
              <span className="font-semibold">{walkingTime || '0'}</span> minutes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};