import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const ParticleSystem = React.forwardRef((props, ref) => {
    const particlesRef = useRef([]);
    const sceneRef = useRef();

    useEffect(() => {
        // Initialize particle system
        sceneRef.current = new THREE.Scene();
    }, []);

    const createFireballParticles = (startPos, endPos) => {
        const particleCount = 30;
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff4500,
            transparent: true,
            opacity: 0.9 
        });

        const particles = [];
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(startPos);
            
            // Random velocity towards target with spread
            const direction = new THREE.Vector3()
                .subVectors(endPos, startPos)
                .normalize()
                .add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.8,
                    (Math.random() - 0.5) * 0.8,
                    (Math.random() - 0.5) * 0.8
                ));
            
            particle.velocity = direction.multiplyScalar(0.3 + Math.random() * 0.2);
            particle.life = 1.0;
            particles.push(particle);
            
            if (sceneRef.current) {
                sceneRef.current.add(particle);
            }
        }

        // Animate particles
        const animateParticles = () => {
            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity);
                particle.life -= 0.03;
                particle.material.opacity = particle.life;
                particle.scale.setScalar(particle.life);
                
                if (particle.life <= 0) {
                    sceneRef.current?.remove(particle);
                    particles.splice(index, 1);
                }
            });

            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };
        animateParticles();
    };

    const createLightningParticles = (startPos, endPos) => {
        const geometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 1.0
        });

        // Create lightning bolt segments
        const segments = 8;
        const bolts = [];
        
        for (let i = 0; i < segments; i++) {
            const bolt = new THREE.Mesh(geometry, material);
            
            const progress = i / (segments - 1);
            const pos = new THREE.Vector3()
                .lerpVectors(startPos, endPos, progress)
                .add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.8,
                    (Math.random() - 0.5) * 0.8,
                    (Math.random() - 0.5) * 0.8
                ));
            
            bolt.position.copy(pos);
            bolt.lookAt(endPos);
            bolts.push(bolt);
            
            if (sceneRef.current) {
                sceneRef.current.add(bolt);
            }
        }

        // Fade out lightning with flash effect
        let opacity = 1.0;
        let flashCount = 0;
        const fadeLightning = () => {
            flashCount++;
            
            if (flashCount < 6) {
                // Flash effect
                const flashOpacity = flashCount % 2 === 0 ? 1.0 : 0.3;
                bolts.forEach(bolt => {
                    bolt.material.opacity = flashOpacity;
                });
                setTimeout(fadeLightning, 50);
            } else {
                // Fade out
                opacity -= 0.1;
                bolts.forEach(bolt => {
                    bolt.material.opacity = opacity;
                });

                if (opacity > 0) {
                    setTimeout(fadeLightning, 50);
                } else {
                    bolts.forEach(bolt => {
                        sceneRef.current?.remove(bolt);
                    });
                }
            }
        };
        
        fadeLightning();
    };

    const createIceShards = (startPos, endPos) => {
        const particleCount = 25;
        const geometry = new THREE.ConeGeometry(0.05, 0.3, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.8 
        });

        const particles = [];
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(startPos);
            
            const direction = new THREE.Vector3()
                .subVectors(endPos, startPos)
                .normalize()
                .add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.6,
                    (Math.random() - 0.5) * 0.6,
                    (Math.random() - 0.5) * 0.6
                ));
            
            particle.velocity = direction.multiplyScalar(0.25 + Math.random() * 0.15);
            particle.life = 1.0;
            particle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            particles.push(particle);
            
            if (sceneRef.current) {
                sceneRef.current.add(particle);
            }
        }

        const animateParticles = () => {
            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity);
                particle.rotation.x += 0.1;
                particle.rotation.z += 0.05;
                particle.life -= 0.025;
                particle.material.opacity = particle.life * 0.8;
                
                if (particle.life <= 0) {
                    sceneRef.current?.remove(particle);
                    particles.splice(index, 1);
                }
            });

            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };
        animateParticles();
    };

    React.useImperativeHandle(ref, () => ({
        triggerAbility: (ability) => {
            const startPos = new THREE.Vector3(-4, 2, 0); // Player position
            const endPos = new THREE.Vector3(4, 2, 0);    // Opponent position

            // Different effects based on ability name and type
            const abilityName = ability.name.toLowerCase();
            
            if (ability.type === 'attack') {
                if (abilityName.includes('fire') || abilityName.includes('flame') || abilityName.includes('meteor')) {
                    createFireballParticles(startPos, endPos);
                } else if (abilityName.includes('lightning') || abilityName.includes('bolt') || abilityName.includes('electric')) {
                    createLightningParticles(startPos, endPos);
                } else if (abilityName.includes('ice') || abilityName.includes('frost') || abilityName.includes('freeze')) {
                    createIceShards(startPos, endPos);
                } else if (abilityName.includes('wind') || abilityName.includes('air') || abilityName.includes('slice')) {
                    createIceShards(startPos, endPos); // Wind effect using ice shards with different color
                } else {
                    // Default energy blast
                    createFireballParticles(startPos, endPos);
                }
            } else if (ability.type === 'buff') {
                // Create healing/buff particles around player
                createFireballParticles(startPos, startPos); // Self-targeting effect
            } else if (ability.type === 'debuff') {
                // Create dark energy towards opponent
                createLightningParticles(startPos, endPos);
            }
        },
        getScene: () => sceneRef.current
    }));

    return null; // This component doesn't render anything directly
});

ParticleSystem.displayName = 'ParticleSystem';

export default ParticleSystem;