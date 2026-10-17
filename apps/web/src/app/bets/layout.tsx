import type { ReactNode } from "react";
import { privateMetadata } from "@/lib/seo";
export const metadata = { ...privateMetadata, title: "Bet history | GoldBet365" };
export default function Layout({ children }: { children: ReactNode }) { return children; }
