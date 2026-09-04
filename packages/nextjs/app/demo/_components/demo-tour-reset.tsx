"use client";

import { useEffect } from "react";
import { resetDemoTourGuides } from "@/app/demo/_components/demo-replay";

/** Visiting /tour or the intake start clears dismissed guides so replays run again. */
export function DemoTourResetOnMount() {
  useEffect(() => {
    resetDemoTourGuides();
  }, []);
  return null;
}
