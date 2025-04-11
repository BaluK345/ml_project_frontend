import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Leaf, Trash2, AlertTriangle, Plus, Loader2, TrendingUp, IndianRupee, Scale } from 'lucide-react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { MLPredictionCard } from './components/MLPredictionCard';
import { useWastePrediction } from './hooks/useWastePrediction';

// Types
interface WasteData {
  date: string;
  amount: number;
  category: string;
  cost: number;
}

interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string;
  category: string;
  costPerKg: number;
}

// Enhanced Mock Data with costs
const mockWasteData: WasteData[] = [
  { date: '2024-03-01', amount: 150, category: 'Produce', cost: 4500 },
  { date: '2024-03-02', amount: 120, category: 'Dairy', cost: 6000 },
  { date: '2024-03-03', amount: 180, category: 'Meat', cost: 18000 },
  { date: '2024-03-04', amount: 90, category: 'Bakery', cost: 2700 },
  { date: '2024-03-05', amount: 200, category: 'Produce', cost: 6000 },
  { date: '2024-03-06', amount: 160, category: 'Dairy', cost: 8000 },
  { date: '2024-03-07', amount: 140, category: 'Meat', cost: 14000 },
];

const mockInventory: FoodItem[] = [
  {
    id: '1',
    name: 'Organic Apples',
    quantity: 100,
    expiryDate: '2024-03-20',
    category: 'Produce',
    costPerKg: 80
  },
  {
    id: '2',
    name: 'Fresh Milk',
    quantity: 50,
    expiryDate: '2024-03-15',
    category: 'Dairy',
    costPerKg: 60
  },
  {
    id: '3',
    name: 'Chicken Breast',
    quantity: 30,
    expiryDate: '2024-03-12',
    category: 'Meat',
    costPerKg: 280
  },
  {
    id: '4',
    name: 'Whole Grain Bread',
    quantity: 25,
    expiryDate: '2024-03-10',
    category: 'Bakery',
    costPerKg: 100
  },
];

const API_BASE_URL = 'http://localhost:8000/api';

const formatCurrency = (value: number) => {
  return `₹${value.toLocaleString('en-IN')}`;
};


const StatCard = ({ icon: Icon, title, value, trend, description }: { icon: any, title: string, value: string, trend: string, description?: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-green-100 p-3 rounded-full">
        <Icon className="w-6 h-6 text-green-600" />
      </div>
      <span className={`text-sm font-medium ${trend.includes('+') ? 'text-green-500' : 'text-red-500'}`}>
        {trend}
      </span>
    </div>
    <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {description && <p className="text-sm text-gray-500 mt-2">{description}</p>}
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
    <p className="text-red-700">{message}</p>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [wasteData, setWasteData] = useState<WasteData[]>([]);
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { predictWaste } = useWastePrediction();
  
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [wasteRes, inventoryRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/waste-data/`),
          axios.get(`${API_BASE_URL}/inventory/inventory/`)
        ]);
        setWasteData(wasteRes.data);
        setInventory(inventoryRes.data);
      } catch (error) {
        console.warn('Using mock data due to backend connection error:', error);
        setWasteData(mockWasteData);
        setInventory(mockInventory);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const calculateTotalInventoryValue = () => {
    return inventory.reduce((total, item) => total + (item.quantity * item.costPerKg), 0);
  };

  const calculateTotalWasteCost = () => {
    return wasteData.reduce((total, item) => total + item.cost, 0);
  };

  const prepareInventoryTrendData = () => {
    const categoryTotals = inventory.reduce((acc, item) => {
      const existingCategory = acc.find(c => c.category === item.category);
      if (existingCategory) {
        existingCategory.quantity += item.quantity;
        existingCategory.value += item.quantity * item.costPerKg;
      } else {
        acc.push({
          category: item.category,
          quantity: item.quantity,
          value: item.quantity * item.costPerKg
        });
      }
      return acc;
    }, [] as { category: string; quantity: number; value: number }[]);

    return categoryTotals;
  };

  const prepareExpiryAnalysisData = () => {
    const now = new Date();
    const expiryRanges = inventory.reduce((acc, item) => {
      const daysUntilExpiry = Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const value = item.quantity * item.costPerKg;
      
      if (daysUntilExpiry <= 0) {
        acc.expired += value;
      } else if (daysUntilExpiry <= 3) {
        acc.critical += value;
      } else if (daysUntilExpiry <= 7) {
        acc.warning += value;
      } else {
        acc.safe += value;
      }
      
      return acc;
    }, { expired: 0, critical: 0, warning: 0, safe: 0 });

    return Object.entries(expiryRanges).map(([status, value]) => ({
      status,
      value
    }));
  };

  const onSubmit = async (data: any) => {
    try {
      setError(null);
      const newItem = {
        ...data,
        id: Date.now().toString(),
        date: format(new Date(), 'yyyy-MM-dd')
      };

      try {
        await axios.post(`${API_BASE_URL}/inventory/`, newItem);
        const inventoryRes = await axios.get(`${API_BASE_URL}/inventory/`);
        setInventory(inventoryRes.data);
        
        const predictionInput = {
          dayOfWeek: new Date().getDay(),
          temperature: 25,
          humidity: 60,
          stockLevel: inventoryRes.data.reduce((total: number, item: FoodItem) => total + item.quantity, 0),
          previousDayWaste: wasteData[wasteData.length - 1]?.amount || 0,
          category: newItem.category
        };
        
        const prediction = predictWaste(predictionInput);
        const newWasteData = [...wasteData, {
          date: format(new Date(), 'yyyy-MM-dd'),
          amount: prediction.nnPrediction,
          category: newItem.category,
          cost: prediction.nnPrediction * newItem.costPerKg
        }];
        setWasteData(newWasteData);
        
      } catch (error) {
        console.warn('Using mock data for inventory update:', error);
        setInventory([...inventory, newItem]);
      }

      setShowForm(false);
      reset();
    } catch (error) {
      setError('Failed to add inventory item. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Leaf className="h-8 w-8 text-green-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">FoodWaste Monitor</h1>
            </div>
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'dashboard'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'inventory'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Inventory
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <ErrorMessage message={error} />}
        
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={IndianRupee}
                title="Inventory Value"
                value={formatCurrency(calculateTotalInventoryValue())}
                trend="+2.5%"
                description="Total value of current stock"
              />
              <StatCard
              icon={Scale}
              title="Total Inventory"
              value={`${inventory.reduce((sum, item) => sum + Number(item.quantity), 0)} kg`}
              trend="+1.8%"
              description="Current stock weight"
              />
              <StatCard
                icon={Trash2}
                title="Waste Cost (Weekly)"
                value={formatCurrency(calculateTotalWasteCost())}
                trend="-12.3%"
                description="Total value of wasted items"
              />
              <StatCard
                icon={AlertTriangle}
                title="At Risk Value"
                value={formatCurrency(inventory
                  .filter(item => new Date(item.expiryDate) <= addDays(new Date(), 3))
                  .reduce((total, item) => total + (item.quantity * item.costPerKg), 0))}
                trend="+5.2%"
                description="Value of items near expiry"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Weekly Waste Trends</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={wasteData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => typeof value === 'number' ? `${value} kg` : value} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        name="Actual Waste"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={{ fill: '#059669' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Inventory by Category</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareInventoryTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis yAxisId="left" orientation="left" stroke="#059669" />
                      <YAxis yAxisId="right" orientation="right" stroke="#6366f1" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="quantity" name="Quantity (kg)" fill="#059669" />
                      <Bar yAxisId="right" dataKey="value" name="Value (₹)" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Expiry Analysis</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={prepareExpiryAnalysisData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis tickFormatter={(value) => `₹${value}`} />
                      <Tooltip formatter={(value) => `₹${value}`} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#059669"
                        fill="#059669"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <MLPredictionCard
                nnPrediction={150}
                mlrPrediction={145}
                confidence={85}
                category="Overall"
              />
            </div>
          </>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Inventory Management</h2>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>

            {showForm && (
              <div className="mb-8 p-6 border rounded-lg bg-gray-50">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Item Name</label>
                      <input
                        {...register('name', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select
                        {...register('category', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      >
                        <option value="produce">Produce</option>
                        <option value="dairy">Dairy</option>
                        <option value="meat">Meat</option>
                        <option value="bakery">Bakery</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity (kg)</label>
                      <input
                        type="number"
                        {...register('quantity', { required: true, min: 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cost per kg (₹)</label>
                      <input
                        type="number"
                        {...register('costPerKg', { required: true, min: 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                      <input
                        type="date"
                        {...register('expiryDate', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save Item
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost per kg</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventory.map((item) => {
                    const daysUntilExpiry = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    let statusColor = 'bg-green-100 text-green-800';
                    if (daysUntilExpiry <= 0) {
                      statusColor = 'bg-red-100 text-red-800';
                    } else if (daysUntilExpiry <= 3) {
                      statusColor = 'bg-yellow-100 text-yellow-800';
                    }
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity} kg</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.costPerKg)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.quantity * item.costPerKg)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.expiryDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                            {daysUntilExpiry <= 0 ? 'Expired' : daysUntilExpiry <= 3 ? 'Expiring Soon' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Financial Impact Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800">Monthly Savings</h3>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(12400)}</p>
                  <p className="text-sm text-green-700">15% improvement from last month</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Waste Reduction Value</h3>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(32000)}</p>
                  <p className="text-sm text-blue-700">Reduced waste cost by 25%</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800">Projected Savings</h3>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(45000)}</p>
                  <p className="text-sm text-purple-700">Next month forecast</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">AI-Powered Recommendations</h2>
              <div className="space-y-4">
                {[
                  {
                    title: "Reduce Bread Orders",
                    description: "Current bread waste is 15% above average. Consider reducing daily order by 10kg.",
                    impact: `Potential savings: ${formatCurrency(1200)}/week`
                  },
                  {
                    title: "Optimize Produce Storage",
                    description: "Lettuce showing early spoilage. Adjust cooler temperature to 4°C.",
                    impact: `Prevent ${formatCurrency(3000)} weekly loss`
                  },
                  {
                    title: "Special Promotion Needed",
                    description: "Excess dairy inventory approaching best-before date.",
                    impact: `Prevent ${formatCurrency(2000)} potential waste`
                  }
                ].map((rec, idx) => (
                  <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                    <h3 className="font-semibold text-gray-800">{rec.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{rec.description}</p>
                    <p className="text-green-600 text-sm font-medium mt-1">{rec.impact}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Predictive Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Expected Waste Reduction</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">25%</p>
                      <p className="text-sm text-gray-600">Next week forecast</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Optimal Stock Levels</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">-15%</p>
                      <p className="text-sm text-gray-600">Recommended reduction</p>
                    </div>
                    <Scale className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;