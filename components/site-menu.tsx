"use client";

import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { Suspense, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { spring } from "@/lib/springs";

// Três traços que viram um X: os de fora giram sobre o centro e o do meio some.
function MenuGlyph({ open }: { open: boolean }) {
  return (
    <MotionConfig reducedMotion="user" transition={spring.fast}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <motion.path d="M4 6h16" initial={false} animate={open ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }} />
        <motion.path d="M4 12h16" initial={false} animate={{ opacity: open ? 0 : 1 }} />
        <motion.path d="M4 18h16" initial={false} animate={open ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }} />
      </svg>
    </MotionConfig>
  );
}

// Abaixo de lg os links do header ficam neste menu, junto com o envio. No celular, o idioma também.
export function SiteMenu({ label, links, locale }: { label: string; links: { href: string; label: string }[]; locale: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} className="lg:hidden" />}>
        <MenuGlyph open={open} />
      </PopoverTrigger>
      <PopoverPopup align="start" sideOffset={8}>
        <nav aria-label={label} className="-mx-2.5 flex w-52 flex-col">
          {links.map((link) => (
            <Button key={link.href} variant="ghost" className="justify-start" render={<Link href={link.href} onClick={() => setOpen(false)} />}>{link.label}</Button>
          ))}
        </nav>
        <div className="mt-3 sm:hidden">
          <Suspense fallback={null}>{locale}</Suspense>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
