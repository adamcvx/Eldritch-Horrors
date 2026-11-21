import React, { useEffect, useState } from 'react';
import { User } from '@/entities/User';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WelcomePage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                await User.me();
                window.location.href = createPageUrl('FusionLab');
            } catch (error) {
                setLoading(false);
            }
        };
        checkUser();
    }, []);

    const handleLogin = async () => {
        setLoading(true);
        try {
            await User.login();
        } catch (error) {
            console.error("Login failed:", error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-screen flex flex-col justify-center items-center bg-gray-900 text-white">
                <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                <p className="mt-4 text-lg text-gray-400">Awakening the Old Ones...</p>
            </div>
        );
    }

    return (
        <div 
            className="w-full h-screen flex flex-col justify-center items-center bg-cover bg-center p-8 text-white text-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544646774-9f7624b59fbe?q=80&w=2070&auto=format&fit=crop')" }}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            
            <motion.div 
                className="relative z-10 flex flex-col items-center"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <h1 className="text-6xl md:text-8xl font-title text-purple-300 drop-shadow-[0_0_15px_rgba(192,132,252,0.5)]">
                    Eldritch Fusion
                </h1>
                
                <p className="mt-6 max-w-2xl text-lg md:text-xl text-gray-300 font-serif leading-relaxed">
                    The veil thins and whispers from the void beckon. Forge abominations from nightmare and reality, and ascend in the crucible of cosmic horror.
                </p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                >
                    <Button 
                        onClick={handleLogin}
                        size="lg"
                        className="mt-12 px-12 py-8 text-2xl font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/50 transform hover:scale-105"
                    >
                        Answer the Call
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
}