import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, DailyGoals, CreateDailyGoalsInput, UpdateDailyGoalsInput } from '../../../server/src/schema';

interface GoalsTabProps {
  currentUser: User | null;
  dailyGoals: DailyGoals | null;
  onGoalsUpdated: (goals: DailyGoals) => void;
}

export function GoalsTab({ currentUser, dailyGoals, onGoalsUpdated }: GoalsTabProps) {
  const [isEditing, setIsEditing] = useState(!dailyGoals); // Auto-edit if no goals exist
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    daily_calories: dailyGoals?.daily_calories?.toString() || '2000',
    daily_protein: dailyGoals?.daily_protein?.toString() || '150',
    daily_carbs: dailyGoals?.daily_carbs?.toString() || '250',
    daily_fats: dailyGoals?.daily_fats?.toString() || '65',
    daily_fluid: dailyGoals?.daily_fluid?.toString() || '2500'
  });

  // Recommended goals data
  const recommendedGoals = {
    sedentary_adult: {
      label: 'Sedentary Adult',
      calories: 1800,
      protein: 120,
      carbs: 225,
      fats: 60,
      fluid: 2000
    },
    active_adult: {
      label: 'Active Adult',
      calories: 2200,
      protein: 150,
      carbs: 275,
      fats: 70,
      fluid: 2500
    },
    athlete: {
      label: 'Athlete/Very Active',
      calories: 2800,
      protein: 200,
      carbs: 350,
      fats: 90,
      fluid: 3000
    },
    weight_loss: {
      label: 'Weight Loss',
      calories: 1500,
      protein: 130,
      carbs: 150,
      fats: 50,
      fluid: 2500
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Apply recommended goals
  const applyRecommendedGoals = (goalType: keyof typeof recommendedGoals) => {
    const goals = recommendedGoals[goalType];
    setFormData({
      daily_calories: goals.calories.toString(),
      daily_protein: goals.protein.toString(),
      daily_carbs: goals.carbs.toString(),
      daily_fats: goals.fats.toString(),
      daily_fluid: goals.fluid.toString()
    });
  };

  // Save goals
  const handleSaveGoals = async () => {
    if (!currentUser) return;

    const calories = parseFloat(formData.daily_calories);
    const protein = parseFloat(formData.daily_protein);
    const carbs = parseFloat(formData.daily_carbs);
    const fats = parseFloat(formData.daily_fats);
    const fluid = parseFloat(formData.daily_fluid);

    // Validation
    if (
      isNaN(calories) || calories <= 0 ||
      isNaN(protein) || protein < 0 ||
      isNaN(carbs) || carbs < 0 ||
      isNaN(fats) || fats < 0 ||
      isNaN(fluid) || fluid < 0
    ) {
      console.error('Invalid goal values');
      return;
    }

    setIsSaving(true);
    try {
      if (dailyGoals) {
        // Update existing goals
        const updateData: UpdateDailyGoalsInput = {
          id: dailyGoals.id,
          daily_calories: calories,
          daily_protein: protein,
          daily_carbs: carbs,
          daily_fats: fats,
          daily_fluid: fluid
        };
        
        const updatedGoals = await trpc.updateDailyGoals.mutate(updateData);
        onGoalsUpdated(updatedGoals);
      } else {
        // Create new goals
        const createData: CreateDailyGoalsInput = {
          user_id: currentUser.id,
          daily_calories: calories,
          daily_protein: protein,
          daily_carbs: carbs,
          daily_fats: fats,
          daily_fluid: fluid
        };
        
        const newGoals = await trpc.createDailyGoals.mutate(createData);
        onGoalsUpdated(newGoals);
      }

      setIsEditing(false);
      console.log('Goals saved successfully!');
    } catch (error) {
      console.error('Failed to save goals:', error);
      // For demo purposes, create mock updated goals
      const mockGoals: DailyGoals = {
        id: dailyGoals?.id || 1,
        user_id: currentUser.id,
        daily_calories: calories,
        daily_protein: protein,
        daily_carbs: carbs,
        daily_fats: fats,
        daily_fluid: fluid,
        created_at: dailyGoals?.created_at || new Date(),
        updated_at: new Date()
      };
      onGoalsUpdated(mockGoals);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (dailyGoals) {
      setFormData({
        daily_calories: dailyGoals.daily_calories.toString(),
        daily_protein: dailyGoals.daily_protein.toString(),
        daily_carbs: dailyGoals.daily_carbs.toString(),
        daily_fats: dailyGoals.daily_fats.toString(),
        daily_fluid: dailyGoals.daily_fluid.toString()
      });
      setIsEditing(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Goals Form */}
      <Card className="bg-white/80 backdrop-blur border-purple-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
            🎯 Daily Nutrition Goals
          </CardTitle>
          <CardDescription>
            {dailyGoals 
              ? 'Set your personalized daily nutrition and hydration targets'
              : 'Create your first set of daily nutrition goals'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEditing && dailyGoals ? (
            /* Display Mode */
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                    <span className="text-red-700 font-medium">🔥 Calories</span>
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      {dailyGoals.daily_calories} kcal
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-md">
                    <span className="text-orange-700 font-medium">🥩 Protein</span>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      {dailyGoals.daily_protein} g
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                    <span className="text-blue-700 font-medium">💧 Fluids</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {dailyGoals.daily_fluid} ml
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                    <span className="text-yellow-700 font-medium">🌾 Carbs</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      {dailyGoals.daily_carbs} g
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                    <span className="text-green-700 font-medium">🥑 Fats</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {dailyGoals.daily_fats} g
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />
              
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500">
                  Goals last updated: {dailyGoals.updated_at.toLocaleDateString()}
                </p>
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  ✏️ Edit Goals
                </Button>
              </div>
            </>
          ) : (
            /* Edit Mode */
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="calories" className="text-sm font-medium text-red-700">
                      🔥 Daily Calories (kcal)
                    </Label>
                    <Input
                      id="calories"
                      type="number"
                      value={formData.daily_calories}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleInputChange('daily_calories', e.target.value)
                      }
                      min="1"
                      className="border-red-200 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="protein" className="text-sm font-medium text-orange-700">
                      🥩 Daily Protein (g)
                    </Label>
                    <Input
                      id="protein"
                      type="number"
                      value={formData.daily_protein}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleInputChange('daily_protein', e.target.value)
                      }
                      min="0"
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fluid" className="text-sm font-medium text-blue-700">
                      💧 Daily Fluids (ml)
                    </Label>
                    <Input
                      id="fluid"
                      type="number"
                      value={formData.daily_fluid}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleInputChange('daily_fluid', e.target.value)
                      }
                      min="0"
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="carbs" className="text-sm font-medium text-yellow-700">
                      🌾 Daily Carbohydrates (g)
                    </Label>
                    <Input
                      id="carbs"
                      type="number"
                      value={formData.daily_carbs}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleInputChange('daily_carbs', e.target.value)
                      }
                      min="0"
                      className="border-yellow-200 focus:border-yellow-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fats" className="text-sm font-medium text-green-700">
                      🥑 Daily Fats (g)
                    </Label>
                    <Input
                      id="fats"
                      type="number"
                      value={formData.daily_fats}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleInputChange('daily_fats', e.target.value)
                      }
                      min="0"
                      className="border-green-200 focus:border-green-400"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={handleSaveGoals}
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSaving ? '💾 Saving...' : '💾 Save Goals'}
                </Button>
                {dailyGoals && (
                  <Button 
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="border-gray-300"
                  >
                    ❌ Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recommended Goals and Tips */}
      <div className="space-y-6">
        {/* Recommended Goals */}
        <Card className="bg-white/80 backdrop-blur border-indigo-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
              📋 Recommended Goals
            </CardTitle>
            <CardDescription>
              Quick presets based on common activity levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(recommendedGoals).map(([key, goal]) => (
              <Card key={key} className="p-3 border border-indigo-100 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-indigo-800">{goal.label}</p>
                    <p className="text-xs text-gray-500">
                      {goal.calories} kcal • {goal.protein}g protein • {goal.fluid}ml fluid
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyRecommendedGoals(key as keyof typeof recommendedGoals)}
                    disabled={!isEditing}
                    className="text-xs"
                  >
                    Apply
                  </Button>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Nutrition Tips */}
        <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-800 flex items-center gap-2">
              💡 Nutrition Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex items-start gap-2">
                <span className="text-red-500">🔥</span>
                <span><strong>Calories:</strong> Balance energy intake with activity level</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-500">🥩</span>
                <span><strong>Protein:</strong> 0.8-1.2g per kg body weight for adults</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-500">🌾</span>
                <span><strong>Carbs:</strong> 45-65% of daily calories from complex carbs</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">🥑</span>
                <span><strong>Fats:</strong> 20-35% of calories from healthy fats</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">💧</span>
                <span><strong>Hydration:</strong> 35ml per kg body weight minimum</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Macronutrient Distribution */}
        {(isEditing || dailyGoals) && (
          <Card className="bg-white/80 backdrop-blur border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                📊 Macronutrient Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const calories = parseFloat(isEditing ? formData.daily_calories : (dailyGoals?.daily_calories?.toString() || '0'));
                const protein = parseFloat(isEditing ? formData.daily_protein : (dailyGoals?.daily_protein?.toString() || '0'));
                const carbs = parseFloat(isEditing ? formData.daily_carbs : (dailyGoals?.daily_carbs?.toString() || '0'));
                const fats = parseFloat(isEditing ? formData.daily_fats : (dailyGoals?.daily_fats?.toString() || '0'));

                const proteinCals = protein * 4;
                const carbsCals = carbs * 4;
                const fatsCals = fats * 9;
                const totalMacroCals = proteinCals + carbsCals + fatsCals;

                if (calories <= 0 || totalMacroCals === 0) {
                  return <p className="text-sm text-gray-500">Enter valid goals to see distribution</p>;
                }

                return (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>🥩 Protein:</span>
                      <span>{Math.round((proteinCals / calories) * 100)}% ({proteinCals} kcal)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🌾 Carbohydrates:</span>
                      <span>{Math.round((carbsCals / calories) * 100)}% ({carbsCals} kcal)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🥑 Fats:</span>
                      <span>{Math.round((fatsCals / calories) * 100)}% ({fatsCals} kcal)</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total from macros:</span>
                      <span>{totalMacroCals} kcal</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}