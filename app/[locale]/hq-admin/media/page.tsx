import MediaOpsClient from "./MediaOpsClient";

/**
 * Media HQ ops — authorization is enforced by hq-admin/layout.tsx
 * (canonical HQ_ADMIN_EMAILS, fail-closed). Client loads data via Bearer API only.
 */
export default function HqMediaOrdersPage() {
  return <MediaOpsClient />;
}
