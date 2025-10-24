'use client';

import { useEffect, useRef, useState } from 'react';

type AnimatedCounterProps = { value: number; duration?: number; className?: string };

export const AnimatedCounter = ({ value, duration = 2000, className = '' }: AnimatedCounterProps) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        startTimeRef.current = null;
        countRef.current = 0;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            const currentCount = Math.floor(progress * value);

            if (currentCount !== countRef.current) {
                countRef.current = currentCount;
                setCount(currentCount);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(value);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <span className={className}>{count.toLocaleString()}</span>;
};
