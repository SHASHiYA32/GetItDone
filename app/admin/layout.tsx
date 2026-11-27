import type { ReactNode } from "react";
import Shell from "@/components/Shell.tsx";
export default function AdminLayout({ children }: { children: ReactNode }) { return <Shell role="admin">{children}</Shell>; }
