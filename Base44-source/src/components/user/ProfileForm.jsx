import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Image, Loader2 } from 'lucide-react';
import AvatarGallery from './AvatarGallery';

export default function ProfileForm({ user, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    avatar: ''
  });
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);

  const loading = isSaving;

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || user.full_name || '',
        bio: user.bio || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = (avatarUrl) => {
    setFormData((prev) => ({ ...prev, avatar: avatarUrl }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={formData.avatar} />
            <AvatarFallback className="text-3xl bg-purple-600 text-white">
              {(user?.displayName || user?.full_name || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground">
              Cultist Insignia (Avatar)
            </label>
            <div className="mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAvatarGallery(true)}
                disabled={loading}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-700/50"
              >
                <Image className="w-4 h-4" />
                <span>Choose an image...</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium text-muted-foreground">
            Display Name
          </label>
          <Input
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleInputChange}
            placeholder="e.g., Randolph Carter"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-medium text-muted-foreground">
            Bio
          </label>
          <Textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Whisper something about your journey into the abyss..."
            className="h-24"
            disabled={loading}
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading} 
          className="bg-purple-600 hover:bg-purple-700 w-full mt-4"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {loading ? 'Saving Profile...' : 'Save Changes'}
        </Button>
      </form>

      <AvatarGallery
        currentAvatar={formData.avatar}
        onSelectAvatar={handleAvatarSelect}
        isOpen={showAvatarGallery}
        onClose={() => setShowAvatarGallery(false)}
      />
    </>
  );
}