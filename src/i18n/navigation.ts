import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// next-intl v4 API (replaces legacy createSharedPathnamesNavigation).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
