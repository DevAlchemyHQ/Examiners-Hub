import React, { useState } from 'react';
import { Square, Circle, Triangle } from 'lucide-react';

interface CalculationResult {
  area: number;
  perimeter: number;
}

type Shape = 'rectangle' | 'circle' | 'triangle';

const ShapeIcon = ({ shape }: { shape: Shape }) => {
  switch (shape) {
    case 'circle':
      return <Circle className="text-blue-500" size={20} />;
    case 'triangle':
      return <Triangle className="text-blue-500" size={20} />;
    default:
      return <Square className="text-blue-500" size={20} />;
  }
};

export const AreaCalculator: React.FC = () => {
  const [shape, setShape] = useState<Shape>('rectangle');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculateArea = () => {
    const l = parseFloat(length);
    const w = parseFloat(width);

    if (isNaN(l) || (shape !== 'circle' && isNaN(w))) {
      return;
    }

    let area = 0;
    let perimeter = 0;

    switch (shape) {
      case 'rectangle':
        area = l * w;
        perimeter = 2 * (l + w);
        break;
      case 'circle':
        area = Math.PI * Math.pow(l / 2, 2);
        perimeter = Math.PI * l;
        break;
      case 'triangle':
        area = (l * w) / 2;
        perimeter = l + w + Math.sqrt(Math.pow(l, 2) + Math.pow(w, 2));
        break;
    }

    setResult({ area, perimeter });
  };

  const clearCalculator = () => {
    setLength('');
    setWidth('');
    setResult(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <ShapeIcon shape={shape} />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Area Calculator
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Calculate area and perimeter for various shapes
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Shape:
          </label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as Shape)}
            className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
          >
            <option value="rectangle">Rectangle / Square</option>
            <option value="circle">Circle</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {shape === 'circle' ? 'Diameter' : 'Length'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder={`Enter ${shape === 'circle' ? 'diameter' : 'length'}`}
              className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
            />
          </div>

          {shape !== 'circle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {shape === 'triangle' ? 'Height' : 'Width'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder={`Enter ${shape === 'triangle' ? 'height' : 'width'}`}
                className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={calculateArea}
            className="w-full py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Calculate
          </button>
          <button
            onClick={clearCalculator}
            className="w-full py-2 text-sm font-medium bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Results
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Area:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {result.area.toFixed(2)} square units
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Perimeter:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {result.perimeter.toFixed(2)} units
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};