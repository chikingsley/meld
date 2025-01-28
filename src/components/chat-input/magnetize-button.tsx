import React, { useState } from "react"
import { cn } from "@/utils";
import { motion, useAnimation } from "framer-motion";
import { Magnet } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface MagnetizeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    particleCount?: number;
    attractRadius?: number;
}

interface Particle {
    id: number;
    x: number;
    y: number;
}

function MagnetizeButton({
    className,
    particleCount = 12,
    attractRadius = 50,
    ...props
}: MagnetizeButtonProps) {
    const [isAttracting, setIsAttracting] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const particlesControl = useAnimation();

    useEffect(() => {
        const newParticles = Array.from({ length: particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 360 - 180,
            y: Math.random() * 360 - 180,
        }));
        setParticles(newParticles);
    }, [particleCount]);

    const handleInteractionStart = () => {
        setIsAttracting(true);
        particlesControl.start((index) => ({
            x: 0,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 20,
                mass: 1,
                delay: index * 0.02
            }
        }));
    };

    const handleInteractionEnd = () => {
        setIsAttracting(false);
        particlesControl.start((index) => ({
            x: particles[index].x * attractRadius,
            y: particles[index].y * attractRadius,
            scale: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
                mass: 1,
                delay: index * 0.01
            }
        }));
    };

    return (
        <Button
            className={cn(
                "min-w-40 relative touch-none",
                "bg-violet-100 dark:bg-violet-900",
                "hover:bg-violet-200 dark:hover:bg-violet-800",
                "text-violet-600 dark:text-violet-300",
                "border border-violet-300 dark:border-violet-700",
                "transition-all duration-300",
                className
            )}
            onMouseEnter={handleInteractionStart}
            onMouseLeave={handleInteractionEnd}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            {...props}
        >
            {particles.map((_, index) => (
                <motion.div
                    key={index}
                    custom={index}
                    initial={{ x: particles[index].x, y: particles[index].y, scale: 0 }}
                    animate={particlesControl}
                    transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        mass: 1,
                    }}
                    className={cn(
                        "absolute w-1.5 h-1.5 rounded-full",
                        "bg-violet-400 dark:bg-violet-300",
                        "transition-opacity duration-300",
                        isAttracting ? "opacity-100" : "opacity-40"
                    )}
                />
            ))}
            <span className="relative w-full flex items-center justify-center gap-2">
                <Magnet
                    className={cn(
                        "w-4 h-4 transition-transform duration-300",
                        isAttracting && "scale-110 rotate-12"
                    )}
                />
                {isAttracting ? "Attracting" : "Start Call"}
            </span>
        </Button>
    );
}

export { MagnetizeButton }