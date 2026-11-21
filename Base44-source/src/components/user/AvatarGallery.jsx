import React, { useState, useEffect } from 'react';
import { Avatar as AvatarEntity } from '@/entities/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AvatarGallery({ currentAvatar, onSelectAvatar, isOpen, onClose }) {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);

  useEffect(() => {
    const loadAvatars = async () => {
      try {
        setLoading(true);
        const avatarList = await AvatarEntity.list();
        setAvatars(avatarList);
      } catch (error) {
        console.error('Error loading avatars:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadAvatars();
      setSelectedAvatar(currentAvatar);
    }
  }, [isOpen, currentAvatar]);

  const handleSelectAvatar = (avatarUrl) => {
    setSelectedAvatar(avatarUrl);
  };

  const handleConfirm = () => {
    onSelectAvatar(selectedAvatar);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-400">
            Choose Your Cultist Insignia
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
          </div>
        ) : avatars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No avatars available. Contact an Elder to generate avatars.</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4">
                {avatars.map((avatar, index) => (
                  <motion.div
                    key={avatar.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleSelectAvatar(avatar.url)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden aspect-square border-2 transition-all hover:scale-105 ${
                      selectedAvatar === avatar.url
                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={`Avatar ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedAvatar === avatar.url && (
                      <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                        <Check className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedAvatar}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Confirm Selection
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}