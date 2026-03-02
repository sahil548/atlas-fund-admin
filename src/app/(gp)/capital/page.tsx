"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function CapitalRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/entities"); }, [router]);
  return <div className="text-sm text-gray-400">Redirecting...</div>;
}
