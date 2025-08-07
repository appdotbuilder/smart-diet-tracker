import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { User, LogFluidInput } from '../../../server/src/schema';

interface FluidLoggingTabProps {
  currentUser: User | null;
  selectedDate: string;
  onFluidLogged: () => void;
}

export function FluidLoggingTab({ currentUser, selectedDate, onFluidLogged }: FluidLoggingTabProps) {
  const [fluidType, setFluidType] = useState<string>('');
  const [customFluidType, setCustomFluidType] = useState<string>('');
  const [volume, setVolume] = useState<string>('250');
  const [isLogging, setIsLogging] = useState(false);

  // Common fluid types
  const commonFluids = [
    { value: 'water', label: 'Water 💧', emoji: '💧' },
    { value: 'tea', label: 'Tea ☕', emoji: '☕' },
    { value: 'coffee', label: 'Coffee ☕', emoji: '☕' },
    { value: 'juice', label: 'Juice 🧃', emoji: '🧃' },
    { value: 'milk', label: 'Milk 🥛', emoji: '🥛' },
    { value: 'soda', label: 'Soda 🥤', emoji: '🥤' },
    { value: 'smoothie', label: 'Smoothie 🥤', emoji: '🥤' },
    { value: 'sports_drink', label: 'Sports Drink ⚡', emoji: '⚡' },
    { value: 'custom', label: 'Custom...', emoji: '✏️' }
  ];

  // Common volume amounts
  const commonVolumes = [
    { value: 100, label: '100ml (Small sip)' },
    { value: 150, label: '150ml (Cup)' },
    { value: 250, label: '250ml (Glass)' },
    { value: 330, label: '330ml (Can)' },
    { value: 500, label: '500ml (Water bottle)' },
    { value: 750, label: '750ml (Large bottle)' },
    { value: 1000, label: '1000ml (1 Liter)' }
  ];

  // Handle fluid logging
  const handleLogFluid = async () => {
    if (!currentUser || !fluidType || !volume) {
      return;
    }

    const volumeML = parseFloat(volume);
    if (isNaN(volumeML) || volumeML <= 0) {
      return;
    }

    const finalFluidType = fluidType === 'custom' ? customFluidType : fluidType;
    if (!finalFluidType.trim()) {
      return;
    }

    setIsLogging(true);
    try {
      const logData: LogFluidInput = {
        user_id: currentUser.id,
        fluid_type: finalFluidType,
        volume: volumeML,
        consumed_at: new Date(`${selectedDate}T${new Date().toTimeString().split(' ')[0]}`)
      };

      await trpc.logFluid.mutate(logData);
      
      // Reset form
      setFluidType('');
      setCustomFluidType('');
      setVolume('250');
      
      // Notify parent to refresh data
      onFluidLogged();
      
      console.log('Fluid logged successfully!');
    } catch (error) {
      console.error('Failed to log fluid:', error);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Fluid Logging Form */}
      <Card className="bg-white/80 backdrop-blur border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-blue-800 flex items-center gap-2">
            💧 Log Fluid Intake
          </CardTitle>
          <CardDescription>
            Track your daily hydration and fluid consumption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fluid Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="fluid-type" className="text-sm font-medium text-gray-700">
              🥤 Fluid Type
            </Label>
            <Select value={fluidType} onValueChange={setFluidType}>
              <SelectTrigger className="border-blue-200 focus:border-blue-400">
                <SelectValue placeholder="Select fluid type..." />
              </SelectTrigger>
              <SelectContent>
                {commonFluids.map((fluid) => (
                  <SelectItem key={fluid.value} value={fluid.value}>
                    <div className="flex items-center gap-2">
                      <span>{fluid.emoji}</span>
                      <span>{fluid.label.replace(/ .*$/, '')}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Fluid Type Input */}
          {fluidType === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="custom-fluid" className="text-sm font-medium text-gray-700">
                ✏️ Custom Fluid Type
              </Label>
              <Input
                id="custom-fluid"
                placeholder="Enter fluid type (e.g., Green Tea, Orange Juice)"
                value={customFluidType}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFluidType(e.target.value)}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
          )}

          {/* Volume Input */}
          <div className="space-y-2">
            <Label htmlFor="volume" className="text-sm font-medium text-gray-700">
              📏 Volume (milliliters)
            </Label>
            <Input
              id="volume"
              type="number"
              placeholder="250"
              value={volume}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVolume(e.target.value)}
              min="1"
              step="1"
              className="border-blue-200 focus:border-blue-400"
            />
          </div>

          {/* Log Button */}
          <Button 
            onClick={handleLogFluid}
            disabled={
              !fluidType || 
              (fluidType === 'custom' && !customFluidType.trim()) || 
              !volume || 
              isLogging || 
              !currentUser
            }
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLogging ? '🔄 Logging Fluid...' : '📝 Log Fluid Intake'}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions and Tips */}
      <div className="space-y-6">
        {/* Quick Volume Selection */}
        <Card className="bg-white/80 backdrop-blur border-cyan-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-cyan-800 flex items-center gap-2">
              ⚡ Quick Volume Selection
            </CardTitle>
            <CardDescription>
              Choose from common fluid volumes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {commonVolumes.map((vol) => (
                <Button
                  key={vol.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setVolume(vol.value.toString())}
                  className="justify-start text-sm hover:bg-cyan-50 border-cyan-200"
                >
                  {vol.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hydration Tips */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              💡 Hydration Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">💧</span>
                <span>Aim for 8-10 glasses of water daily (2-2.5 liters)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">🌅</span>
                <span>Start your day with a glass of water</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-500">🏃</span>
                <span>Increase intake during exercise or hot weather</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-500">🎯</span>
                <span>Set regular reminders to drink water</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-500">🧃</span>
                <span>Herbal teas and water-rich foods count too!</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Volume Preview */}
        {volume && parseFloat(volume) > 0 && (
          <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-green-800 flex items-center gap-2">
                📊 Volume Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-blue-600">
                  {parseFloat(volume).toLocaleString()} ml
                </div>
                <div className="text-sm text-gray-600">
                  ≈ {(parseFloat(volume) / 1000).toFixed(2)} liters
                </div>
                {fluidType && fluidType !== 'custom' && (
                  <Badge variant="outline" className="mt-2">
                    {commonFluids.find(f => f.value === fluidType)?.emoji}{' '}
                    {fluidType.charAt(0).toUpperCase() + fluidType.slice(1).replace('_', ' ')}
                  </Badge>
                )}
                {fluidType === 'custom' && customFluidType && (
                  <Badge variant="outline" className="mt-2">
                    ✏️ {customFluidType}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}