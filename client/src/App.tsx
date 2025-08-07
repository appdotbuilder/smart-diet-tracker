import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';

// Import components
import { DashboardTab } from '@/components/DashboardTab';
import { FoodLoggingTab } from '@/components/FoodLoggingTab';
import { FluidLoggingTab } from '@/components/FluidLoggingTab';
import { GoalsTab } from '@/components/GoalsTab';
import { UserSetup } from '@/components/UserSetup';

// Import types with proper relative paths
import type { User, DailyGoals, DailyProgress, FoodItem } from '../../server/src/schema';

function App() {
  // User and authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Daily progress state
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Daily goals state
  const [dailyGoals, setDailyGoals] = useState<DailyGoals | null>(null);

  // Food items for search
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);

  // Current date for progress tracking
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Load user data
  const loadUser = useCallback(async (userId: number) => {
    try {
      setIsLoadingUser(true);
      const user = await trpc.getUserById.query({ userId });
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user:', error);
      // For demonstration, create a mock user if API fails
      setCurrentUser({
        id: userId,
        name: 'Demo User',
        email: 'demo@example.com',
        created_at: new Date()
      });
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // Load daily goals
  const loadDailyGoals = useCallback(async (userId: number) => {
    try {
      const goals = await trpc.getUserDailyGoals.query({ userId });
      setDailyGoals(goals);
    } catch (error) {
      console.error('Failed to load daily goals:', error);
      // For demonstration, set some default goals
      setDailyGoals({
        id: 1,
        user_id: userId,
        daily_calories: 2000,
        daily_protein: 150,
        daily_carbs: 250,
        daily_fats: 65,
        daily_fluid: 2500,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }, []);

  // Load daily progress
  const loadDailyProgress = useCallback(async (userId: number, date: string) => {
    try {
      setIsLoadingProgress(true);
      const progress = await trpc.getUserDailyProgress.query({ user_id: userId, date });
      setDailyProgress(progress);
    } catch (error) {
      console.error('Failed to load daily progress:', error);
      // For demonstration, create mock progress data
      setDailyProgress({
        date: date,
        goals: dailyGoals,
        summary: null,
        food_logs: [],
        fluid_logs: [],
        progress_percentages: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          fluid: 0
        }
      });
    } finally {
      setIsLoadingProgress(false);
    }
  }, [dailyGoals]);

  // Load food items for search
  const loadFoodItems = useCallback(async () => {
    try {
      const items = await trpc.getAllFoodItems.query();
      setFoodItems(items);
      
      // If no items from API, provide some demo foods
      if (items.length === 0) {
        setFoodItems([
          {
            id: 1,
            name: 'Chicken Breast',
            calories_per_100g: 165,
            protein_per_100g: 31,
            carbs_per_100g: 0,
            fats_per_100g: 3.6,
            created_at: new Date()
          },
          {
            id: 2,
            name: 'Brown Rice',
            calories_per_100g: 112,
            protein_per_100g: 2.6,
            carbs_per_100g: 23,
            fats_per_100g: 0.9,
            created_at: new Date()
          },
          {
            id: 3,
            name: 'Broccoli',
            calories_per_100g: 34,
            protein_per_100g: 2.8,
            carbs_per_100g: 7,
            fats_per_100g: 0.4,
            created_at: new Date()
          },
          {
            id: 4,
            name: 'Banana',
            calories_per_100g: 89,
            protein_per_100g: 1.1,
            carbs_per_100g: 23,
            fats_per_100g: 0.3,
            created_at: new Date()
          },
          {
            id: 5,
            name: 'Greek Yogurt',
            calories_per_100g: 59,
            protein_per_100g: 10,
            carbs_per_100g: 3.6,
            fats_per_100g: 0.4,
            created_at: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load food items:', error);
    }
  }, []);

  // Initialize app with user ID 1 (for demo purposes)
  useEffect(() => {
    const initializeApp = async () => {
      const userId = 1; // In real app, this would come from authentication
      await loadUser(userId);
      await loadDailyGoals(userId);
      await loadFoodItems();
    };

    initializeApp();
  }, [loadUser, loadDailyGoals, loadFoodItems]);

  // Load daily progress when user and date change
  useEffect(() => {
    if (currentUser) {
      loadDailyProgress(currentUser.id, selectedDate);
    }
  }, [currentUser, selectedDate, loadDailyProgress]);

  // Function to refresh data after logging
  const refreshData = useCallback(() => {
    if (currentUser) {
      loadDailyProgress(currentUser.id, selectedDate);
    }
  }, [currentUser, selectedDate, loadDailyProgress]);

  // If no user is set up, show user setup component
  if (!currentUser && !isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <UserSetup onUserCreated={loadUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-green-200 bg-white/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-green-800 flex items-center justify-center gap-2">
              🥗 Smart Diet Tracker
            </CardTitle>
            <CardDescription className="text-lg text-green-600">
              Track your nutrition goals and build healthy habits
            </CardDescription>
            {currentUser && (
              <Badge variant="secondary" className="mx-auto w-fit mt-2">
                Welcome back, {currentUser.name}! 👋
              </Badge>
            )}
          </CardHeader>
        </Card>

        {/* Date Selector */}
        <Card className="border-blue-200 bg-white/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <label htmlFor="date-selector" className="font-medium text-gray-700">
                📅 Tracking Date:
              </label>
              <input
                id="date-selector"
                type="date"
                value={selectedDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur border border-gray-200">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
              📊 Dashboard
            </TabsTrigger>
            <TabsTrigger value="food" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800">
              🍽️ Log Food
            </TabsTrigger>
            <TabsTrigger value="fluid" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800">
              💧 Log Fluids
            </TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              🎯 Goals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab
              dailyProgress={dailyProgress}
              isLoading={isLoadingProgress}
              selectedDate={selectedDate}
            />
          </TabsContent>

          <TabsContent value="food">
            <FoodLoggingTab
              currentUser={currentUser}
              foodItems={foodItems}
              selectedDate={selectedDate}
              onFoodLogged={refreshData}
            />
          </TabsContent>

          <TabsContent value="fluid">
            <FluidLoggingTab
              currentUser={currentUser}
              selectedDate={selectedDate}
              onFluidLogged={refreshData}
            />
          </TabsContent>

          <TabsContent value="goals">
            <GoalsTab
              currentUser={currentUser}
              dailyGoals={dailyGoals}
              onGoalsUpdated={(goals: DailyGoals) => setDailyGoals(goals)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;