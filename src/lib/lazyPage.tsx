import { ComponentType, lazy } from "react";

const RELOAD_KEY = "page-chunk-reload";

/**
 * After a deploy, a tab still running the previous version asks for page
 * files that no longer exist. Reload once so it picks up the new version.
 */
function reloadOnce(error: unknown): never {
  let reloaded = false;
  try {
    reloaded = sessionStorage.getItem(RELOAD_KEY) === "1";
    if (!reloaded) sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    // storage blocked: still reload, the browser fetches fresh files
  }
  if (!reloaded) window.location.reload();
  throw error;
}

/**
 * A route page whose code is downloaded only when it is needed. Once
 * preload() has resolved the page renders synchronously, without suspending,
 * so preloading before the first render avoids a blank frame.
 */
export function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  let Loaded: ComponentType<P> | null = null;
  const preload = () =>
    load().then((m) => {
      Loaded = m.default;
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // ignore
      }
      return m;
    }, reloadOnce);
  // lazy() wraps props in ref types that a plain generic P cannot satisfy.
  const Lazy = lazy(preload) as unknown as ComponentType<P>;
  const Page = (props: P) => (Loaded ? <Loaded {...props} /> : <Lazy {...props} />);
  Page.preload = preload;
  return Page;
}
