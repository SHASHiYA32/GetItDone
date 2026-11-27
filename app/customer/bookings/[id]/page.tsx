"use client";
import { use } from "react";
import BookingDetail from "@/components/BookingDetail.tsx";
export default function Page({ params }: { params: Promise<{ id: string }> }) { return <BookingDetail id={use(params).id} />; }
