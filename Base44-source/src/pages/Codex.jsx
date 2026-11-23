import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Waves } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Codex() {
  return (
    <div className="container mx-auto max-w-4xl">
      <div className="text-center mb-8">
        <motion.h1
          className="text-4xl font-bold mb-2 font-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}>

          The Codex of Amalgam
        </motion.h1>
        <motion.p
          className="text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}>

          Ancient knowledge of the Primordial Horrors and the art of flesh binding
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}>

        <Card className="relative game-gallery rounded-2xl border border-purple-500/30 shadow-2xl">
          {/* Decorative Elements */}
          <div className="absolute top-4 left-4">
            <Eye className="w-6 h-6 text-purple-400/50" />
          </div>
          <div className="absolute top-4 right-4">
            <Eye className="w-6 h-6 text-purple-400/50" />
          </div>
          <div className="absolute bottom-4 left-4">
            <Eye className="w-6 h-6 text-purple-400/50" />
          </div>
          <div className="absolute bottom-4 right-4">
            <Eye className="w-6 h-6 text-purple-400/50" />
          </div>

          {/* Floating mystical elements */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {[...Array(20)].map((_, i) =>
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                y: [-10, 10, -10],
                opacity: [0.2, 0.8, 0.2],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }} />

            )}
          </div>

          <CardContent className="pt-8 pr-16 pb-8 pl-16 relative z-10">
            <div className="prose prose-invert prose-purple max-w-none">
              <div className="text-gray-300 leading-relaxed space-y-6 text-justify font-serif">
                <motion.p
                  className="text-lg italic text-purple-300 border-l-4 border-purple-500/50 pl-4 bg-purple-900/20 p-4 rounded-r-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1, duration: 0.8 }}>

                  Before the first mortal dream, before the seas rose to kiss the stars, there was the <strong>Shattering of Veils</strong>.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.8 }}>

                  In that moment, the walls between worlds cracked, and from the rupture spilled the <span className="text-red-300 font-semibold">Primordial Horrors</span> — entities that belonged to no singular plane. They were the <em>Faceless Watchers</em>, the <em>Deep Lurkers</em>, the <em>Dream-Eaters</em>, the <em>Gibbering Shamblers</em>, and the <em>Veil Serpents</em> — each born of an impossible origin, each carrying a fragment of the universe's madness.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4, duration: 0.8 }}>

                  Mankind discovered these entities not by will, but by accident of obsession. In forgotten laboratories and echoing sanctums, scholars tore open the void in search of knowledge. What they found was not wisdom but fragments — shards of the Horrors, scattered like broken teeth across dimensions. To bind them was blasphemy, but to leave them unbound was annihilation.
                </motion.p>

                <motion.div
                  className="text-center py-4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.6, duration: 0.8 }}>

                  <div className="inline-flex items-center gap-3 text-2xl font-bold text-yellow-300 font-title">
                    <Waves className="w-6 h-6" />
                    Thus, the art of Amalgamation was founded.
                    <Waves className="w-6 h-6" />
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8, duration: 0.8 }}>

                  By rites etched in blood and whispers, mortals learned to merge Horrors into <span className="text-purple-300 font-semibold">Abominations</span> — creatures neither of the original spawn nor wholly new, but fused chimeras whose bodies screamed with paradox. Each fusion carried traits of its progenitors: eyes that saw too much, mouths that never ceased, serpentine shadows that slithered across stars.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2, duration: 0.8 }}>

                  Yet Amalgamation was never a tool of peace. Once created, Abominations hungered. They craved conflict, not by mortal design but by the will of the Horrors themselves. The <span className="text-red-300 font-semibold">Abyssal Crucible</span> was born — places where space and time fractured, where mortals would set their creations against one another. The Abominations fought not for victory, but to reclaim the fragments of themselves, to stitch back together the forgotten whole.
                </motion.p>

                <motion.p
                  className="text-lg text-blue-300 border-l-4 border-blue-500/50 pl-4 bg-blue-900/20 p-4 rounded-r-lg italic"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.2, duration: 0.8 }}>

                  The Congregation, the last mortal order, decreed: <strong>"Only through combat shall the Horrors be tamed. Only through merging shall their secrets be revealed."</strong> And so, the cycle began.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.4, duration: 0.8 }}>

                  Players — known in this age as <span className="text-green-300 font-semibold">Binders of Flesh and Shadow</span> — step into this blighted world not as heroes, but as curators of madness. They gather shards, merge Horrors, and record their triumphs in the <em>Crucible Ascension</em> — the eternal ledger of those who dared to command the uncontrollable.
                </motion.p>

                <motion.div
                  className="text-center py-6 border-2 border-red-500/30 bg-red-900/10 rounded-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.6, duration: 0.8 }}>

                  <p className="text-red-300 font-semibold text-lg leading-relaxed">
                    But the whispers say this: each Abomination birthed does not serve its Binder alone. It remembers… It hungers for reunion. And when the last fragment is merged, when the final Abomination stands victorious… <span className="text-red-400 text-xl font-bold">the Primordial Horror will awaken, whole once more.</span>
                  </p>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>);

}