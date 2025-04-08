import React from 'react';
import { Brain, TrendingUp, AlertCircle } from 'lucide-react';

interface MLPredictionCardProps {
  nnPrediction: number;
  mlrPrediction: number;
  categoryPrediction?: number;
  confidence: number;
  category?: string;
}

export const MLPredictionCard: React.FC<MLPredictionCardProps> = ({
  nnPrediction,
  mlrPrediction,
  categoryPrediction,
  confidence,
  category
}) => {
  const predictions = [nnPrediction, mlrPrediction];
  if (categoryPrediction !== undefined) predictions.push(categoryPrediction);
  const averagePrediction = predictions.reduce((a, b) => a + b) / predictions.length;

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'text-green-600';
    if (conf >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="bg-purple-100 p-3 rounded-full">
          <Brain className="w-6 h-6 text-purple-600" />
        </div>
        <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
          {confidence.toFixed(1)}% confidence
        </span>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        ML-Powered Predictions
        {category && <span className="text-sm text-gray-500 ml-2">({category})</span>}
      </h3>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Neural Network</p>
              <p className="text-xl font-bold text-gray-900">{nnPrediction.toFixed(1)} kg</p>
            </div>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Linear Regression</p>
              <p className="text-xl font-bold text-gray-900">{mlrPrediction.toFixed(1)} kg</p>
            </div>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        {categoryPrediction !== undefined && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Category-Specific</p>
                <p className="text-xl font-bold text-gray-900">{categoryPrediction.toFixed(1)} kg</p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ensemble Prediction</p>
              <p className="text-2xl font-bold text-purple-600">{averagePrediction.toFixed(1)} kg</p>
              <p className="text-xs text-gray-500 mt-1">Expected waste for tomorrow</p>
            </div>
            {confidence < 70 && (
              <div className="flex items-center text-yellow-600">
                <AlertCircle className="w-5 h-5 mr-1" />
                <span className="text-xs">Low Confidence</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};