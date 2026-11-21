import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TutorialSection({ icon, title, description, linkTo, linkText, children }) {
  const IconComponent = icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gray-800/50 border-gray-700 h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {IconComponent && <IconComponent className="w-6 h-6 text-purple-400" />}
            <span className="text-2xl font-title">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          <div>
            <p className="text-gray-400 mb-4">{description}</p>
            {children}
          </div>
          {linkTo && (
            <Link to={linkTo} className="mt-6 block">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                {linkText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}