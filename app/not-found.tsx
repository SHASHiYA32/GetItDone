import Link from "next/link";
import Logo from "@/components/Logo.tsx";
export default function NotFound() { return <main className="loading"><Logo size={72} /><h2>Page not found</h2><Link className="btn" href="/">Go to GetItDone</Link></main>; }
