"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile, homeFor } from "@/lib/useProfile";

export default function StaffRedirect() {
  const { profile } = useProfile();
  const router = useRouter();
  useEffect(() => {
    if (profile && profile.role !== "customer") router.replace(homeFor(profile.role));
  }, [profile, router]);
  return null;
}