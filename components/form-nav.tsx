"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

const HOOK = 12;
const RAIL_X = 0.5;

// Trilho do formulário: a linha desce até a seção em que a pessoa está e curva em direção ao nome dela.
export function FormNav({ sections }: { sections: readonly (readonly [id: string, label: string])[] }) {
  const list = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState<string | undefined>(sections[0]?.[0]);
  const ids = sections.map(([id]) => id).join(" ");
  const [target, setTarget] = useState({ y: 0, height: 0 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const order = ids.split(" ");
    let current = order[0];
    // A última seção é curta e pode nunca cruzar a faixa: no fim da página ela é a ativa.
    const update = () => {
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      setActive(atEnd ? order.at(-1) : current);
    };
    const observer = new IntersectionObserver((entries) => {
      const section = entries.findLast((entry) => entry.isIntersecting)?.target.getAttribute("aria-labelledby");
      if (section) current = section.replace("-heading", "");
      update();
    }, { rootMargin: "-25% 0px -70% 0px" });
    for (const id of order) {
      const section = document.getElementById(`${id}-heading`)?.closest("section");
      if (section) observer.observe(section);
    }

    window.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, [ids]);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    function measure() {
      const item = element?.querySelector<HTMLElement>('[aria-current="true"]');
      if (item && element) setTarget({ y: item.offsetTop + item.offsetHeight / 2, height: element.offsetHeight });
    }
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    return () => resize.disconnect();
  }, [active]);

  return (
    <ol ref={list} className="sticky top-6 flex flex-col border-s border-border">
      <svg aria-hidden="true" width={HOOK + 1} height={target.height} className="pointer-events-none absolute -start-px top-0 fill-none stroke-foreground">
        <motion.path
          initial={false}
          animate={{ d: `M ${RAIL_X} 0 V ${Math.max(0, target.y - HOOK)} Q ${RAIL_X} ${target.y} ${HOOK + RAIL_X} ${target.y}` }}
          transition={reduced ? { duration: 0 } : spring.moderate}
        />
      </svg>
      {sections.map(([id, label]) => (
        <li key={id} className="flex">
          <a
            href={`#${id}-heading`}
            aria-current={active === id ? "true" : undefined}
            className={cn("w-full py-1.5 ps-5 text-sm transition-colors", active === id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </a>
        </li>
      ))}
    </ol>
  );
}
