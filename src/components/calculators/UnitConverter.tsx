import React, { useState, useEffect } from 'react';
import { Ruler } from 'lucide-react';

interface UnitConversion {
  value: string;
  unit: string;
  convert: (value: number) => number;
  convertBack: (value: number) => number;
}

const units: UnitConversion[] = [
  { 
    value: '', 
    unit: 'Meters (m)', 
    convert: (v) => v,
    convertBack: (v) => v 
  },
  { 
    value: '', 
    unit: 'Millimeters (mm)', 
    convert: (v) => v * 1000,
    convertBack: (v) => v / 1000 
  },
  { 
    value: '', 
    unit: 'Feet (ft)', 
    convert: (v) => v * 3.28084,
    convertBack: (v) => v / 3.28084 
  },
  { 
    value: '', 
    unit: 'Centimeters (cm)', 
    convert: (v) => v * 100,
    convertBack: (v) => v / 100 
  },
  { 
    value: '', 
    unit: 'Inches (in)', 
    convert: (v) => v * 39.3701,
    convertBack: (v) => v / 39.3701 
  }
];

export const UnitConverter: React.FC = () => {
  const [conversions, setConversions] = useState<UnitConversion[]>(units);

  const handleInputChange = (index: number, value: string) => {
    // Clear all values if input is empty
    if (!value) {
      setConversions(units.map(unit => ({ ...unit, value: '' })));
      return;
    }

    // Only allow numbers and decimal points
    if (!/^\d*\.?\d*$/.test(value)) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // Convert the input value to meters (base unit)
    const metersValue = conversions[index].convertBack(numValue);

    // Update all other values based on the meters value
    const newConversions = conversions.map(unit => ({
      ...unit,
      value: unit.convert(metersValue).toFixed(4).replace(/\.?0+$/, '')
    }));

    setConversions(newConversions);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Ruler className="text-blue-500" size={20} />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Unit Converter
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Convert between different length units instantly
          </p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Supported Units:
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {units.map(({ unit }) => (
            <div key={unit} className="text-gray-600 dark:text-gray-400">
              {unit}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {conversions.map((unit, index) => (
          <div key={unit.unit}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {unit.unit}
            </label>
            <input
              type="text"
              value={unit.value}
              onChange={(e) => handleInputChange(index, e.target.value)}
              placeholder="Enter value"
              className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
};