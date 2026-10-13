import { Navigate, useParams, useLocation } from "react-router-dom";
import ObituaryPage from "@/pages/ObituaryPage";

/**
 * Legacy flat URLs like /groblja-slavonski-brod/ or /umrli-rijeka/
 * are redirected to their current nested equivalents (/groblja/slavonski-brod).
 * Everything else falls through to the obituary page.
 */
const LEGACY_PREFIXES: Array<{ prefix: string; target: string }> = [
  { prefix: "groblja-", target: "/groblja" },
  { prefix: "groblje-", target: "/groblje" },
  { prefix: "umrli-", target: "/umrli" },
  { prefix: "sprovodi-", target: "/sprovodi" },
  { prefix: "sprovod-", target: "/sprovodi" },
];

const LegacySlugRoute = () => {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();

  if (slug) {
    const normalized = slug.toLowerCase();
    const match = LEGACY_PREFIXES.find(
      (entry) => normalized.startsWith(entry.prefix) && normalized.length > entry.prefix.length
    );
    if (match) {
      const rest = normalized.slice(match.prefix.length).replace(/\/+$/, "");
      if (rest) {
        return <Navigate to={`${match.target}/${rest}${search}`} replace />;
      }
    }
  }

  return <ObituaryPage />;
};

export default LegacySlugRoute;
