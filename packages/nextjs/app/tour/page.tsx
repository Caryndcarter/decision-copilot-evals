import { redirect } from "next/navigation";

/** Public entry — sends visitors into the real-product demo flow. */
export default function TourPage() {
  redirect("/demo/intake");
}
