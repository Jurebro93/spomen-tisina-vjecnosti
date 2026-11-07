// Obituary photos come from the old Totohost server (through Netlify). If one
// fails to load, try once more after a short pause, then show the default
// photo instead of the browser's empty "broken image" frame. One listener for
// the whole site, so every list and page (homepage, /umrli, search, obituary)
// is covered without changing each <img>.

const DEFAULT_PHOTO = '/default-obituary-photo.jpg';
const OLD_SERVER_PHOTO = /\/wp(-content|\/wp-content)\/uploads\//;

export function installPhotoFallback() {
  document.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const src = img.currentSrc || img.src;
      if (!OLD_SERVER_PHOTO.test(src)) return;
      if (img.dataset.photoRetry) {
        img.removeAttribute('srcset');
        img.src = DEFAULT_PHOTO;
        return;
      }
      img.dataset.photoRetry = '1';
      setTimeout(() => {
        const url = new URL(src, window.location.href);
        url.searchParams.set('r', '1');
        img.src = url.toString();
      }, 1500);
    },
    true,
  );
}
