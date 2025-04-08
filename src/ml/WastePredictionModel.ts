import * as tf from '@tensorflow/tfjs';
import MLR from 'ml-regression-multivariate-linear';

export interface WastePredictionInput {
  dayOfWeek: number;
  temperature: number;
  humidity: number;
  stockLevel: number;
  previousDayWaste: number;
  category?: string;
}

export class WastePredictionModel {
  private model: tf.Sequential | null = null;
  private mlr: MLR | null = null;
  private categoryModels: Map<string, tf.Sequential> = new Map();

  async train(historicalData: WastePredictionInput[], wasteAmounts: number[]) {
    const X = historicalData.map(data => [
      data.dayOfWeek,
      data.temperature,
      data.humidity,
      data.stockLevel,
      data.previousDayWaste
    ]);
    const y = wasteAmounts.map(amount => [amount]); // Ensure y is a 2D array

    this.mlr = new MLR(X, y);

    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1 })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });

    const xs = tf.tensor2d(X);
    const ys = tf.tensor2d(y);

    await this.model.fit(xs, ys, {
      epochs: 150,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true
    });

    xs.dispose();
    ys.dispose();
  }

  async trainCategoryModel(category: string, data: WastePredictionInput[], wasteAmounts: number[]) {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 12, activation: 'relu' }),
        tf.layers.dense({ units: 6, activation: 'relu' }),
        tf.layers.dense({ units: 1 })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError'
    });

    const X = data.map(d => [
      d.dayOfWeek,
      d.temperature,
      d.humidity,
      d.stockLevel,
      d.previousDayWaste
    ]);
    const xs = tf.tensor2d(X);
    const ys = tf.tensor2d(wasteAmounts.map(v => [v]));

    await model.fit(xs, ys, {
      epochs: 100,
      batchSize: 16,
      validationSplit: 0.2
    });

    this.categoryModels.set(category, model);
    xs.dispose();
    ys.dispose();
  }

  predict(input: WastePredictionInput): {
    nnPrediction: number;
    mlrPrediction: number;
    categoryPrediction?: number;
    confidence: number;
  } {
    if (!this.model || !this.mlr) {
      throw new Error('Model not trained');
    }

    const inputArray = [
      input.dayOfWeek,
      input.temperature,
      input.humidity,
      input.stockLevel,
      input.previousDayWaste
    ];

    const tensorInput = tf.tensor2d([inputArray]);
    const nnPrediction = this.model.predict(tensorInput) as tf.Tensor;
    const nnResult = nnPrediction.dataSync()[0];

    const mlrPredictionArray = this.mlr.predict([inputArray]);
    const mlrResult = Array.isArray(mlrPredictionArray[0])
      ? mlrPredictionArray[0][0]
      : mlrPredictionArray[0];

    let categoryResult: number | undefined;
    if (input.category && this.categoryModels.has(input.category)) {
      const categoryModel = this.categoryModels.get(input.category)!;
      const categoryTensor = categoryModel.predict(tensorInput) as tf.Tensor;
      categoryResult = categoryTensor.dataSync()[0];
      categoryTensor.dispose();
    }

    const predictions: number[] = [nnResult, mlrResult];
    if (categoryResult !== undefined) predictions.push(categoryResult);

    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / predictions.length;
    const confidence = Math.max(0, 100 - variance * 10);

    tensorInput.dispose();
    nnPrediction.dispose();

    return {
      nnPrediction: nnResult,
      mlrPrediction: mlrResult,
      categoryPrediction: categoryResult,
      confidence
    };
  }

  async updateModel(newData: WastePredictionInput[], newWasteAmounts: number[]) {
    await this.train([...newData], [...newWasteAmounts]);

    const categories = new Set(newData.map(d => d.category).filter(Boolean));
    for (const category of categories) {
      if (!category) continue;
      const categoryData = newData.filter(d => d.category === category);
      const categoryWaste = categoryData.map((_, i) =>
        newWasteAmounts[newData.findIndex(nd => nd === categoryData[i])]
      );
      await this.trainCategoryModel(category, categoryData, categoryWaste);
    }
  }
}
