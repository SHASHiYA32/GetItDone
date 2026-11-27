import type { ReactNode } from "react";
import Shell from "@/components/Shell.tsx";
export default function CustomerLayout({ children }: { children: ReactNode }) { return <Shell role="customer">{children}</Shell>; }
