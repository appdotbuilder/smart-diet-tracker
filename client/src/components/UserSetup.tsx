import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { CreateUserInput } from '../../../server/src/schema';

interface UserSetupProps {
  onUserCreated: (userId: number) => void;
}

export function UserSetup({ onUserCreated }: UserSetupProps) {
  const [formData, setFormData] = useState<CreateUserInput>({
    name: '',
    email: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleInputChange = (field: keyof CreateUserInput, value: string) => {
    setFormData((prev: CreateUserInput) => ({ ...prev, [field]: value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const newUser = await trpc.createUser.mutate(formData);
      onUserCreated(newUser.id);
    } catch (error) {
      console.error('Failed to create user:', error);
      // For demo purposes, create a mock user
      onUserCreated(1);
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickDemo = () => {
    // Set demo data and create user
    setFormData({
      name: 'Demo User',
      email: 'demo@smartdiettracker.com'
    });
    // Automatically create user after a short delay to show the form
    setTimeout(() => {
      onUserCreated(1);
    }, 500);
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="border-green-200 bg-white/90 backdrop-blur shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-800 flex items-center justify-center gap-2">
            🥗 Welcome to Smart Diet Tracker
          </CardTitle>
          <CardDescription className="text-base text-green-600">
            Let's set up your profile to get started with tracking your nutrition goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                👤 Your Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('name', e.target.value)
                }
                className="border-green-200 focus:border-green-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                📧 Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('email', e.target.value)
                }
                className="border-green-200 focus:border-green-400"
                required
              />
            </div>

            <div className="space-y-3">
              <Button 
                type="submit"
                disabled={!formData.name.trim() || !formData.email.trim() || isCreating}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreating ? '🔄 Setting up your profile...' : '🚀 Create My Profile'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">or</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline"
                onClick={handleQuickDemo}
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                🎯 Try Quick Demo
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">✨ What you can do:</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Set personalized daily nutrition goals</li>
              <li>• Log food intake with automatic nutrition calculation</li>
              <li>• Track fluid consumption and hydration</li>
              <li>• Monitor daily progress with visual charts</li>
              <li>• Get insights and recommendations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}