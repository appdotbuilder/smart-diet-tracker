import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { DailyProgress } from '../../../server/src/schema';

interface DashboardTabProps {
  dailyProgress: DailyProgress | null;
  isLoading: boolean;
  selectedDate: string;
}

export function DashboardTab({ dailyProgress, isLoading, selectedDate }: DashboardTabProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-white/80 backdrop-blur">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!dailyProgress) {
    return (
      <Card className="bg-white/80 backdrop-blur border-yellow-200">
        <CardContent className="p-8 text-center">
          <p className="text-lg text-yellow-700">📈 No progress data available for {selectedDate}</p>
          <p className="text-sm text-yellow-600 mt-2">Start logging food and fluids to see your progress!</p>
        </CardContent>
      </Card>
    );
  }

  const goals = dailyProgress.goals;
  const summary = dailyProgress.summary;
  const progressPercentages = dailyProgress.progress_percentages;

  // Calculate actual values from summary or default to 0
  const actualValues = {
    calories: summary?.total_calories || 0,
    protein: summary?.total_protein || 0,
    carbs: summary?.total_carbs || 0,
    fats: summary?.total_fats || 0,
    fluid: summary?.total_fluid || 0,
  };

  const progressCards = [
    {
      title: '🔥 Calories',
      current: actualValues.calories,
      goal: goals?.daily_calories || 2000,
      unit: 'kcal',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      progressColor: 'bg-red-500',
      percentage: progressPercentages.calories,
    },
    {
      title: '🥩 Protein',
      current: actualValues.protein,
      goal: goals?.daily_protein || 150,
      unit: 'g',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      progressColor: 'bg-orange-500',
      percentage: progressPercentages.protein,
    },
    {
      title: '🌾 Carbohydrates',
      current: actualValues.carbs,
      goal: goals?.daily_carbs || 250,
      unit: 'g',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      progressColor: 'bg-yellow-500',
      percentage: progressPercentages.carbs,
    },
    {
      title: '🥑 Fats',
      current: actualValues.fats,
      goal: goals?.daily_fats || 65,
      unit: 'g',
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      progressColor: 'bg-green-500',
      percentage: progressPercentages.fats,
    },
    {
      title: '💧 Fluids',
      current: actualValues.fluid,
      goal: goals?.daily_fluid || 2500,
      unit: 'ml',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      progressColor: 'bg-blue-500',
      percentage: progressPercentages.fluid,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-white/80 backdrop-blur border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">
            📈 Daily Progress Overview
          </CardTitle>
          <CardDescription>
            Progress for {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {progressCards.map((card) => (
          <Card key={card.title} className={`${card.bgColor} ${card.borderColor} backdrop-blur`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-lg font-semibold ${card.color}`}>
                {card.title}
              </CardTitle>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-800">
                  {card.current.toFixed(card.unit === 'ml' ? 0 : 1)}
                </span>
                <Badge variant="outline" className="text-sm">
                  {card.goal} {card.unit} goal
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{Math.round(card.percentage)}%</span>
                </div>
                <Progress 
                  value={Math.min(card.percentage, 100)} 
                  className="h-2"
                />
                <div className="text-xs text-gray-500">
                  {card.goal - card.current > 0 
                    ? `${(card.goal - card.current).toFixed(1)} ${card.unit} remaining`
                    : '🎉 Goal achieved!'
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Food and Fluid Logs Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/80 backdrop-blur border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-orange-700 flex items-center gap-2">
              🍽️ Food Logs Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyProgress.food_logs.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No food logged yet today</p>
            ) : (
              <div className="space-y-2">
                {dailyProgress.food_logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex justify-between items-center py-2 border-b border-orange-100">
                    <span className="text-sm font-medium">Food Item #{log.food_item_id}</span>
                    <Badge variant="outline" className="text-xs">
                      {log.portion_size}g
                    </Badge>
                  </div>
                ))}
                {dailyProgress.food_logs.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2">
                    ... and {dailyProgress.food_logs.length - 5} more items
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              💧 Fluid Logs Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyProgress.fluid_logs.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No fluids logged yet today</p>
            ) : (
              <div className="space-y-2">
                {dailyProgress.fluid_logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm font-medium">{log.fluid_type}</span>
                    <Badge variant="outline" className="text-xs">
                      {log.volume}ml
                    </Badge>
                  </div>
                ))}
                {dailyProgress.fluid_logs.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2">
                    ... and {dailyProgress.fluid_logs.length - 5} more items
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}