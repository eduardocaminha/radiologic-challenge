"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, MenuLinkItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";

// Abaixo de lg os links do header ficam neste menu, junto com o envio.
export function SiteMenu({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  return (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} className="lg:hidden" />}>
        <MenuIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup align="end">
        {links.map((link) => <MenuLinkItem key={link.href} render={<Link href={link.href} />}>{link.label}</MenuLinkItem>)}
      </MenuPopup>
    </Menu>
  );
}
