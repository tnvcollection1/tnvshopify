import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const Reports = () => {
  return (
    <div className="flex-1 bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Agent performance and sales reports</p>
      </div>
      
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Reports Page</h3>
            <p className="text-gray-500">Coming soon - Agent performance reports</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;