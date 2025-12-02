import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const SyncProgressIndicator = ({ progress }) => {
  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    if (progress?.elapsed_seconds) {
      const minutes = Math.floor(progress.elapsed_seconds / 60);
      const seconds = Math.floor(progress.elapsed_seconds % 60);
      setElapsedTime(`${minutes}m ${seconds}s`);
    }
  }, [progress]);

  if (!progress) return null;

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'fetching':
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const statusColors = {
      idle: 'bg-gray-100 text-gray-800',
      connecting: 'bg-blue-100 text-blue-800',
      fetching: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={statusColors[progress.status] || 'bg-gray-100'}>
        {progress.status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Sync Progress</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-semibold">{progress.progress_percentage}%</span>
            </div>
            <Progress value={progress.progress_percentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Total Orders</div>
              <div className="text-2xl font-bold">{progress.total_orders}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Processed</div>
              <div className="text-2xl font-bold text-green-600">
                {progress.processed_orders}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Failed</div>
              <div className="text-2xl font-bold text-red-600">
                {progress.failed_orders}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Time Elapsed</div>
              <div className="text-2xl font-bold">{elapsedTime || '0s'}</div>
            </div>
          </div>

          {/* Batch Info */}
          {progress.current_batch > 0 && (
            <div className="text-sm text-gray-600">
              Processing batch {progress.current_batch}
              {progress.total_batches !== 'unknown' &&
                ` of ${progress.total_batches}`}
            </div>
          )}

          {/* Errors */}
          {progress.errors && progress.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="font-semibold mb-2">Recent Errors:</div>
                <ul className="text-sm space-y-1">
                  {progress.errors.slice(0, 3).map((error, idx) => (
                    <li key={idx} className="truncate">
                      • {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncProgressIndicator;
