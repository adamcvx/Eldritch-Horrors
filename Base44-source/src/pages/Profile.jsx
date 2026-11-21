import SaveTransfer from '@/components/user/SaveTransfer';
import { isLocalPreview } from '@/api/base44Client';
import React, { useState } from 'react';
import { useAppContext } from '../components/context/AppContext';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import ProfileForm from '../components/user/ProfileForm';

export default function ProfilePage() {
  const { currentUser, loading, refreshUserData } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (formData) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await User.updateMyUserData(formData);
      await refreshUserData(); // Refresh context to update layout and other components
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-3xl font-title">Your Profile</CardTitle>
          <CardDescription>
            Update your cultist identity. This information is visible to others in the crucible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentUser && (
            <ProfileForm 
              user={currentUser} 
              onSave={handleSave} 
              isSaving={isSaving}
            />
          )}
          {saveSuccess && (
            <div className="mt-4 flex items-center justify-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Profile updated successfully!</span>
            </div>
          )}
          {isLocalPreview && <SaveTransfer onImported={refreshUserData} />}
        </CardContent>
      </Card>
    </div>
  );
}