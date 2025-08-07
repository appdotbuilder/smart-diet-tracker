import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, FoodItem, LogFoodInput } from '../../../server/src/schema';

interface FoodLoggingTabProps {
  currentUser: User | null;
  foodItems: FoodItem[];
  selectedDate: string;
  onFoodLogged: () => void;
}

export function FoodLoggingTab({ currentUser, foodItems, selectedDate, onFoodLogged }: FoodLoggingTabProps) {
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [portionSize, setPortionSize] = useState<string>('100');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLogging, setIsLogging] = useState(false);
  const [nutritionPreview, setNutritionPreview] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null>(null);

  // Filter food items based on search query
  const filteredFoodItems = foodItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected food item
  const selectedFood = foodItems.find(item => item.id.toString() === selectedFoodId);

  // Calculate nutrition preview when food or portion changes
  const updateNutritionPreview = useCallback((food: FoodItem | undefined, portion: string) => {
    if (!food || !portion || isNaN(parseFloat(portion))) {
      setNutritionPreview(null);
      return;
    }

    const portionGrams = parseFloat(portion);
    const multiplier = portionGrams / 100; // per 100g to actual portion

    setNutritionPreview({
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fats: Math.round(food.fats_per_100g * multiplier * 10) / 10,
    });
  }, []);

  // Update preview when selection changes
  const handleFoodChange = (value: string) => {
    setSelectedFoodId(value);
    const food = foodItems.find(item => item.id.toString() === value);
    updateNutritionPreview(food, portionSize);
  };

  const handlePortionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPortion = e.target.value;
    setPortionSize(newPortion);
    updateNutritionPreview(selectedFood, newPortion);
  };

  // Handle food logging
  const handleLogFood = async () => {
    if (!currentUser || !selectedFoodId || !portionSize) {
      return;
    }

    const portionGrams = parseFloat(portionSize);
    if (isNaN(portionGrams) || portionGrams <= 0) {
      return;
    }

    setIsLogging(true);
    try {
      const logData: LogFoodInput = {
        user_id: currentUser.id,
        food_item_id: parseInt(selectedFoodId),
        portion_size: portionGrams,
        consumed_at: new Date(`${selectedDate}T${new Date().toTimeString().split(' ')[0]}`)
      };

      await trpc.logFood.mutate(logData);
      
      // Reset form
      setSelectedFoodId('');
      setPortionSize('100');
      setNutritionPreview(null);
      setSearchQuery('');
      
      // Notify parent to refresh data
      onFoodLogged();
      
      console.log('Food logged successfully!');
    } catch (error) {
      console.error('Failed to log food:', error);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Food Selection and Logging */}
      <Card className="bg-white/80 backdrop-blur border-orange-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-orange-800 flex items-center gap-2">
            🍽️ Log Food Intake
          </CardTitle>
          <CardDescription>
            Select a food item and portion size to log your meal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Food Items */}
          <div className="space-y-2">
            <Label htmlFor="food-search" className="text-sm font-medium text-gray-700">
              🔍 Search Food Items
            </Label>
            <Input
              id="food-search"
              placeholder="Search for food items..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="border-orange-200 focus:border-orange-400"
            />
          </div>

          {/* Food Selection */}
          <div className="space-y-2">
            <Label htmlFor="food-select" className="text-sm font-medium text-gray-700">
              🥗 Select Food Item
            </Label>
            <Select value={selectedFoodId} onValueChange={handleFoodChange}>
              <SelectTrigger className="border-orange-200 focus:border-orange-400">
                <SelectValue placeholder="Choose a food item..." />
              </SelectTrigger>
              <SelectContent>
                {filteredFoodItems.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {searchQuery ? 'No foods match your search' : 'No food items available'}
                  </SelectItem>
                ) : (
                  filteredFoodItems.map((food) => (
                    <SelectItem key={food.id} value={food.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{food.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {food.calories_per_100g} cal/100g
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Portion Size */}
          <div className="space-y-2">
            <Label htmlFor="portion-size" className="text-sm font-medium text-gray-700">
              ⚖️ Portion Size (grams)
            </Label>
            <Input
              id="portion-size"
              type="number"
              placeholder="100"
              value={portionSize}
              onChange={handlePortionChange}
              min="1"
              step="1"
              className="border-orange-200 focus:border-orange-400"
            />
          </div>

          {/* Log Button */}
          <Button 
            onClick={handleLogFood}
            disabled={!selectedFoodId || !portionSize || isLogging || !currentUser}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isLogging ? '🔄 Logging Food...' : '📝 Log Food Intake'}
          </Button>
        </CardContent>
      </Card>

      {/* Nutrition Preview and Food Details */}
      <div className="space-y-6">
        {/* Selected Food Details */}
        {selectedFood && (
          <Card className="bg-white/80 backdrop-blur border-green-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-green-800 flex items-center gap-2">
                📊 Food Details
              </CardTitle>
              <CardDescription className="text-lg font-medium text-gray-800">
                {selectedFood.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Calories:</span>
                    <span className="font-medium">{selectedFood.calories_per_100g} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protein:</span>
                    <span className="font-medium">{selectedFood.protein_per_100g} g</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carbs:</span>
                    <span className="font-medium">{selectedFood.carbs_per_100g} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fats:</span>
                    <span className="font-medium">{selectedFood.fats_per_100g} g</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * Values per 100g serving
              </p>
            </CardContent>
          </Card>
        )}

        {/* Nutrition Preview */}
        {nutritionPreview && selectedFood && (
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                🔮 Nutrition Preview
              </CardTitle>
              <CardDescription>
                For {portionSize}g of {selectedFood.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                    <span className="text-red-700 font-medium">🔥 Calories</span>
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      {nutritionPreview.calories} kcal
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded-md">
                    <span className="text-orange-700 font-medium">🥩 Protein</span>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      {nutritionPreview.protein} g
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-md">
                    <span className="text-yellow-700 font-medium">🌾 Carbs</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      {nutritionPreview.carbs} g
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                    <span className="text-green-700 font-medium">🥑 Fats</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {nutritionPreview.fats} g
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Add Common Portions */}
        {selectedFood && (
          <Card className="bg-white/80 backdrop-blur border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                ⚡ Quick Portions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 150, 200, 250, 300].map((portion) => (
                  <Button
                    key={portion}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPortionSize(portion.toString());
                      updateNutritionPreview(selectedFood, portion.toString());
                    }}
                    className="text-xs hover:bg-gray-50"
                  >
                    {portion}g
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}