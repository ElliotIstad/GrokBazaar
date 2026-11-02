import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/bazaar/desk";

export const Route = createFileRoute("/")({
  component: Desk,
});
