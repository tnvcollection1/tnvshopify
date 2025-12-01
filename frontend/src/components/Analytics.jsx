import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const Analytics = () => {
  return (
    <div className="flex-1 bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Business insights and analytics</p>
      </div>
      
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Analytics Page</h3>
            <p className="text-gray-500">Coming soon - Business analytics and insights</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;