import type { ReactNode } from "react";
import Shell from "@/components/Shell.tsx";
export default function WorkerLayout({ children }: { children: ReactNode }) { return <Shell role="worker">{children}</Shell>; }
