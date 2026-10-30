"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

interface FluidNavLink {
  href: string;
  label: string;
  icon?: ReactNode;
}

// Um único fundo desliza entre os links, no lugar de um hover isolado em cada botão.
export function FluidNav({ id, label, links, className }: { id: string; label: string; links: FluidNavLink[]; className?: string }) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label={label} onPointerLeave={() => setActive(null)} className={cn("flex items-center gap-0.5", className)}>
        {links.map((link) => (
          <span
            key={link.href}
            className="relative"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setActive(link.href);
            }}
            onFocus={() => setActive(link.href)}
            onBlur={() => setActive(null)}
          >
            <AnimatePresence initial={false}>
              {active === link.href ? (
                <motion.span
                  layoutId={`${id}-hover`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: spring.moderate.exit }}
                  transition={spring.moderate}
                  className="absolute inset-0 rounded-full bg-accent"
                />
              ) : null}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="sm"
              className="relative text-muted-foreground hover:bg-transparent hover:text-foreground"
              render={link.href.startsWith("/") ? <Link href={link.href} /> : <a href={link.href} />}
            >
              {link.icon}
              {link.label}
            </Button>
          </span>
        ))}
      </nav>
    </MotionConfig>
  );
}
