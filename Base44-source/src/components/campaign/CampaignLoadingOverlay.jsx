import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Star, Zap, Gem } from 'lucide-react';

/**
 * A loading overlay component that displays a sequence of steps with their durations,
 * and an overall progress bar. It signals completion via a callback.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isVisible - Controls the visibility of the overlay.
 * @param {function} [props.onComplete] - Callback function executed when all steps are completed.
 */
const CampaignLoadingOverlay = ({ isVisible, onComplete }) => {
  const steps = useMemo(() => [
    { 
      id: 'chapters', 
      title: 'Forging Chapters of Doom...', 
      description: 'The cosmic architects design your trials',
      icon: BookOpen,
      duration: 2000 // milliseconds
    },
    { 
      id: 'enemies', 
      title: 'Conjuring Eldritch Guardians...', 
      description: 'Ancient horrors awaken to test your mettle',
      icon: Star,
      duration: 4000 
    },
    { 
      id: 'realms', 
      title: 'Weaving Nightmare Realms...', 
      description: 'Reality bends to create twisted battlegrounds',
      icon: Zap,
      duration: 3000 
    },
    { 
      id: 'binding', 
      title: 'Binding Fates to the Void...', 
      description: 'Your destiny is inscribed in the stars',
      icon: Gem,
      duration: 1000 
    }
  ], []);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Calculate the total duration of all steps
  const totalDuration = useMemo(() => 
    steps.reduce((acc, step) => acc + step.duration, 0), 
    [steps]
  );

  // Determine the current step's data.
  const currentStep = steps[currentStepIndex] || steps[steps.length - 1];
  const CurrentIcon = currentStep?.icon;

  // Effect to manage the progression of steps and signal completion
  useEffect(() => {
    let timer;

    if (isVisible) {
      if (currentStepIndex >= steps.length) {
        if (onComplete) {
          onComplete(); // Notify the parent component
        }
      } else {
        // Set a timeout for the duration of the current step
        timer = setTimeout(() => {
          setCurrentStepIndex((prev) => prev + 1);
        }, steps[currentStepIndex].duration);
      }
    } else {
      // If overlay is not visible, reset the step index
      setCurrentStepIndex(0);
    }

    // Cleanup function
    return () => clearTimeout(timer);
  }, [isVisible, currentStepIndex, steps, onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="relative bg-gray-900 border-2 border-purple-500/50 rounded-2xl p-8 max-w-md w-full text-center"
      >
        {/* Animated Icon */}
        <motion.div
          key={currentStep.id + "-icon"} 
          initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
          className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/50"
        >
          {CurrentIcon && <CurrentIcon className="w-10 h-10 text-purple-400" />}
        </motion.div>

        {/* Step Title */}
        <motion.h3 
          key={currentStep.id + "-title"} 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-purple-300 mb-2"
        >
          {currentStep.title}
        </motion.h3>
        
        {/* Step Description */}
        <motion.p 
          key={currentStep.id + "-description"} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-gray-400 mb-6 text-sm"
        >
          {currentStep.description}
        </motion.p>

        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: totalDuration / 1000, ease: "linear" }} 
          />
        </div>

        {/* Flavor Text */}
        <p className="text-xs text-gray-500">
          The Forbidden Path awaits your arrival...
        </p>

        {/* Pulsing Border Animation */}
        <motion.div
          className="absolute inset-0 border-2 border-purple-500/30 rounded-2xl pointer-events-none"
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.02, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default CampaignLoadingOverlay;