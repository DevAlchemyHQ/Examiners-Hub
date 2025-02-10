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
      return <Circle className="text-indigo-500" size={24} />;
    case 'triangle':
      return <Triangle className="text-indigo-500" size={24} />;
    default:
      return <Square className="text-indigo-500" size={24} />;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <ShapeIcon shape={shape} />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Area Calculator
        </h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-base font-semibold text-slate-700 dark:text-gray-300 mb-2">
            Select Shape:
          </label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as Shape)}
            className="w-full p-3 text-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
          >
            <option value="rectangle">Rectangle / Square</option>
            <option value="circle">Circle</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-semibold text-slate-700 dark:text-gray-300 mb-2">
              {shape === 'circle' ? 'Diameter' : 'Length'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder={`Enter ${shape === 'circle' ? 'diameter' : 'length'}`}
              className="w-full p-3 text-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          {shape !== 'circle' && (
            <div>
              <label className="block text-base font-semibold text-slate-700 dark:text-gray-300 mb-2">
                {shape === 'triangle' ? 'Height' : 'Width'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder={`Enter ${shape === 'triangle' ? 'height' : 'width'}`}
                className="w-full p-3 text-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={calculateArea}
            className="w-full py-3 text-lg bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Calculate
          </button>
          <button
            onClick={clearCalculator}
            className="w-full py-3 text-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Results:</h3>
            <div className="space-y-2 text-lg">
              <p className="text-slate-700 dark:text-gray-300">
                Area: <span className="font-semibold">{result.area.toFixed(2)}</span> square units
              </p>
              <p className="text-slate-700 dark:text-gray-300">
                Perimeter: <span className="font-semibold">{result.perimeter.toFixed(2)}</span> units
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};