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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Ruler className="text-indigo-500" size={24} />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Unit Converter
        </h2>
      </div>

      <div className="prose dark:prose-invert max-w-none mb-8">
        <div className="mt-4">
          <h3 className="text-lg font-medium text-slate-700 dark:text-gray-200">
            Supported Units:
          </h3>
          <ul className="list-disc list-inside text-slate-600 dark:text-gray-300">
            {units.map(({ unit }) => (
              <li key={unit}>{unit}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        {conversions.map((conversion, index) => (
          <div key={conversion.unit} className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="w-40 text-sm font-medium text-slate-700 dark:text-gray-300">
              {conversion.unit}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={conversion.value}
              onChange={(e) => handleInputChange(index, e.target.value)}
              placeholder="Enter value"
              className="flex-1 p-3 text-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
};