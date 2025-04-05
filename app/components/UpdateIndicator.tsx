import React from 'react';

interface UpdateIndicatorProps {
  isLoading: boolean;
  lastUpdate: number | null;
  updateComplete?: boolean;
}

export const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({ 
  isLoading, 
  lastUpdate,
  updateComplete 
}) => {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
      isLoading 
        ? 'bg-amber-50 border border-amber-200' 
        : updateComplete 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-gray-50 border border-gray-200'
    }`}>
      <div className="relative">
        {isLoading ? (
          <svg 
            className="animate-spin h-4 w-4 text-amber-600" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : updateComplete ? (
          <svg 
            className="h-4 w-4 text-green-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg 
            className="h-4 w-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>
      <div className="flex flex-col">
        <span className={`text-sm ${
          isLoading 
            ? 'text-amber-700' 
            : updateComplete 
              ? 'text-green-700' 
              : 'text-gray-700'
        }`}>
          {isLoading ? 'データ更新中...' : '最終更新'}
        </span>
        {!isLoading && lastUpdate && (
          <span className="text-xs text-gray-500">
            {new Date(lastUpdate).toLocaleString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}; 