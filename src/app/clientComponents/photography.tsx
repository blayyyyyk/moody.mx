"use client";
import Marquee from "react-fast-marquee";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const nPieces = 10;
// 1. Change radius to use Container Query Width (cqw)
const radius = "50cqw"; 
const vCount = 6;

export function ApertureFrame({ children }: { children: any }) {
    const [isFocused, setIsFocused] = useState<boolean>(false);
    
    // 2. Create a reference to the parent container
    const containerRef = useRef<HTMLDivElement>(null);
    
    const radius = useSpring(25);
    const springRadius = useSpring(radius, { stiffness: 30, damping: 20 });
    
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springX = useSpring(mouseX, { stiffness: 30, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            
            // 3. Get the exact dimensions and position of the parent div on the screen
            const rect = containerRef.current.getBoundingClientRect();
            
            // Calculate the exact center of THIS specific div
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calculate mouse offset from the div's center, not the window's center
            const xOffset = e.clientX - centerX;
            const yOffset = e.clientY - centerY;
            
            mouseX.set(xOffset);
            mouseY.set(yOffset);
        };

        window.addEventListener("mousemove", handleMouseMove);
        
        
        const handleMouseDown = (e: MouseEvent) => {
            radius.set(50);
        }
        
        const handleMouseUp = (e: MouseEvent) => {
            radius.set(25);
        }
        
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mousemove", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseUp);
        }
    }, [mouseX, mouseY]);

    return (
        <div 
            ref={containerRef}
            // 4. Removed h-screen and top-[-50vh]. Used h-full so it fits whatever parent you put it in.
            className="w-full h-full overflow-hidden relative border-primary border-1 z-10"
            // 5. CRITICAL: This line tells CSS to calculate cqw/cqh based on this div!
            style={{ containerType: "size" }} 
        >
            <motion.div
                className="absolute top-1/2 left-1/2 w-0 h-0"
                style={{
                    x: springX,
                    y: springY,
                    transformStyle: "preserve-3d",
                    opacity: isFocused ? "100%" : "0%"
                }}
                onMouseOver={() => setIsFocused(true)}
                onMouseOut={() => setIsFocused(false)}
            >
                {Array.from({ length: nPieces }).map((_, index) => {
                    const angle = (360 / nPieces) * index;
                    return (
                        <div
                            key={index}
                            className="absolute flex flex-col justify-end"
                            style={{
                                // 6. Swapped all vw/vh for cqw/cqh.
                                // Moved width into the style object since Tailwind's arbitrary 
                                // values sometimes struggle to parse the cqw unit.
                                width: "calc(hypot(200cqw, 200cqh))",
                                top: "50%",
                                left: "50%",
                                transformOrigin: "bottom center",
                                transform: `translate(-50%, -100%) rotate(${angle}deg) rotateY(-2deg)`,
                                height: "calc(hypot(100cqw, 100cqh))",
                                paddingBottom: `${springRadius}`,
                            }}
                        >
                            {Array.from({ length: vCount }).map((_, vIndex) => {
                                return (
                                    <Marquee
                                        key={vIndex}
                                        className="w-full text-primary bg-secondary border-t-primary border-b-primary border-1 overflow-hidden"
                                        style={{
                                            // 7. Swapped vw/vh for cqw/cqh here as well
                                            fontSize: `calc((hypot(100cqw, 100cqh) - ${springRadius}cqw) / ${vCount})`,
                                            lineHeight: 1, 
                                        }}
                                        direction={vIndex % 2 == 0 ? "right" : "left"}
                                        speed={25}
                                        autoFill={true}
                                    >
                                        &nbsp;{children}
                                    </Marquee>
                                );
                            })}
                        </div>
                    );
                })}
            </motion.div>
        </div>
    );
}