// 301-redirects every URL ending in "/" (except the homepage) to the same URL
// without it, so Google sees one address per page (/umrli/zadar, not also
// /umrli/zadar/). Canonical tags already point at the no-slash form.

export default async (request, context) => {
  const url = new URL(request.url);
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
};

export const config = { path: '/*' };
