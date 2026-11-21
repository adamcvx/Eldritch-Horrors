import { SignOut, useAccountEmail } from '@/components/user/IdentityGate';
import { cloudEnabled } from '@/api/cloudSave';
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
  const accountEmail = useAccountEmail();
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
            Update the cultist profile other players see in the crucible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountEmail && <dl className="mb-6">
            <dt className="text-sm text-muted-foreground">Signed in as</dt>
            <dd className="break-all">{accountEmail}</dd>
          </dl>}
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
          {isLocalPreview && !cloudEnabled && <SaveTransfer />}
          {cloudEnabled && <p className="mt-6 text-sm text-muted-foreground">
            Game progress saves automatically to your account.
          </p>}
          {cloudEnabled && <SignOut />}
        </CardContent>
      </Card>
    </div>
  );
}