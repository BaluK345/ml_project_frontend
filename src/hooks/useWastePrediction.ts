import { useState, useEffect } from 'react';
import { WastePredictionModel, WastePredictionInput } from '../ml/WastePredictionModel';

export const useWastePrediction = (initialData?: { inputs: WastePredictionInput[], outputs: number[] }) => {
  const [model, setModel] = useState<WastePredictionModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainingData, setTrainingData] = useState(initialData);

  useEffect(() => {
    const initializeModel = async () => {
      try {
        const newModel = new WastePredictionModel();
        if (trainingData) {
          await newModel.train(trainingData.inputs, trainingData.outputs);
        }
        setModel(newModel);
      } catch (err) {
        setError('Failed to initialize waste prediction model');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    initializeModel();
  }, []);

  const updateModel = async (newData: { inputs: WastePredictionInput[], outputs: number[] }) => {
    if (!model) return;
    
    setLoading(true);
    try {
      await model.updateModel(newData.inputs, newData.outputs);
      setTrainingData(newData);
    } catch (err) {
      setError('Failed to update model with new data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const predictWaste = (input: WastePredictionInput) => {
    if (!model) {
      throw new Error('Model not initialized');
    }
    return model.predict(input);
  };

  return { predictWaste, updateModel, loading, error };
};