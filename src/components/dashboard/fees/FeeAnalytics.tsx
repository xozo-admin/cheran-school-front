// components/fees/FeeAnalytics.tsx
'use client';

import { useState, useEffect } from 'react';
import { FaChartLine, FaChartBar, FaChartPie, FaCalendarAlt, FaDownload } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { toast } from 'react-toastify';

interface AnalyticsData {
  month: string;
  collected: number;
  pending: number;
  target: number;
}

interface FeeAnalyticsProps {
  academicYear: string;
}

export default function FeeAnalytics({ academicYear }: FeeAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('monthly');
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => {
    fetchAnalyticsData();
  }, [academicYear, timeRange, selectedClass]);

  const fetchAnalyticsData = async () => {
    try {
      // Mock data - in real app, fetch from API
      const mockData: AnalyticsData[] = [
        { month: 'Jan', collected: 450000, pending: 120000, target: 500000 },
        { month: 'Feb', collected: 520000, pending: 80000, target: 500000 },
        { month: 'Mar', collected: 480000, pending: 150000, target: 500000 },
        { month: 'Apr', collected: 550000, pending: 70000, target: 500000 },
        { month: 'May', collected: 600000, pending: 50000, target: 500000 },
        { month: 'Jun', collected: 520000, pending: 90000, target: 500000 },
      ];
      
      setAnalytics(mockData);
    } catch (error) {
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const totalCollected = analytics.reduce((sum, item) => sum + item.collected, 0);
  const totalPending = analytics.reduce((sum, item) => sum + item.pending, 0);
  const achievementRate = Math.round((totalCollected / (totalCollected + totalPending)) * 100);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fee Analytics</h2>
          <p className="text-gray-600">Detailed analysis of fee collection trends</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Classes</option>
            <option value="10">Class 10</option>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Collected</p>
              <h3 className="text-3xl font-bold mt-2">₹{totalCollected.toLocaleString()}</h3>
            </div>
            <FaChartLine className="text-2xl opacity-80" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-blue-400 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-blue-100 text-sm mt-2">85% of target achieved</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Pending Dues</p>
              <h3 className="text-3xl font-bold mt-2">₹{totalPending.toLocaleString()}</h3>
            </div>
            <FaChartBar className="text-2xl opacity-80" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-orange-400 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: '15%' }}></div>
            </div>
            <p className="text-orange-100 text-sm mt-2">15% pending collection</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Achievement Rate</p>
              <h3 className="text-3xl font-bold mt-2">{achievementRate}%</h3>
            </div>
            <FaChartPie className="text-2xl opacity-80" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-green-400 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: `${achievementRate}%` }}></div>
            </div>
            <p className="text-green-100 text-sm mt-2">+5% from last term</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Avg. Collection/Day</p>
              <h3 className="text-3xl font-bold mt-2">₹{(totalCollected / 180).toLocaleString()}</h3>
            </div>
            <FaCalendarAlt className="text-2xl opacity-80" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-purple-400 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: '90%' }}></div>
            </div>
            <p className="text-purple-100 text-sm mt-2">Excellent daily average</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Collection Trend Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Collection Trend</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-sm">Collected</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">Target</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                <Legend />
                <Area type="monotone" dataKey="collected" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                <Area type="monotone" dataKey="target" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fee Type Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-6">Fee Type Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Tuition', value: 450000 },
                    { name: 'Transport', value: 180000 },
                    { name: 'Hostel', value: 120000 },
                    { name: 'Library', value: 80000 },
                    { name: 'Sports', value: 50000 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ₹${entry.value.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Analytics Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Monthly Performance</h3>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <FaDownload />
            <span>Export Data</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Achievement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.map((item, index) => {
                const achievement = Math.round((item.collected / item.target) * 100);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.month}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-green-600">₹{item.collected.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-red-600">₹{item.pending.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-blue-600">₹{item.target.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-green-600 h-2.5 rounded-full" 
                            style={{ width: `${achievement}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 font-medium">{achievement}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        achievement >= 90 ? 'bg-green-100 text-green-800' :
                        achievement >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {achievement >= 90 ? 'Excellent' :
                         achievement >= 70 ? 'Good' : 'Needs Improvement'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-2xl">
                        {item.collected > (index > 0 ? analytics[index - 1].collected : 0) ? '📈' : '📉'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}