// Corretor UNIP — Bookmarklet source (unminified reference)
// Run on ava.ead.unip.br review page: inlines images as data-URIs, copies HTML to clipboard.
// To produce the javascript: URI for app/bookmarklet/page.tsx:
//   1. Minify: npx terser public/bookmarklet-source.js --compress --mangle
//   2. Encode: encodeURIComponent(minifiedSource)
//   3. Prefix:  "javascript:" + encoded
// See .planning/phases/07-bookmarklet/07-RESEARCH.md for all pitfall notes.
(async () => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const httpImgs = imgs.filter(img => (img.getAttribute('src') || '').startsWith('http'));

  await Promise.all(httpImgs.map(async (img) => {
    try {
      const res = await fetch(img.src, { credentials: 'include' });
      if (!res.ok) return;
      const blob = await res.blob();
      const buf = await blob.arrayBuffer();
      // chunked loop — avoids RangeError stack overflow on large images (Pitfall 1)
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      img.src = 'data:' + blob.type + ';base64,' + btoa(bin);
    } catch (e) { /* skip failed images silently */ }
  }));

  const html = document.documentElement.outerHTML;
  try {
    // Primary: Clipboard API (requires HTTPS + user gesture — UNIP is HTTPS)
    await navigator.clipboard.writeText(html);
  } catch {
    // Fallback: execCommand (deprecated but functional; does not require active gesture)
    // Handles Safari where user-gesture activation expires after async image fetches (Pitfall 3)
    const ta = document.createElement('textarea');
    ta.value = html;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  alert('HTML copiado com ' + httpImgs.length + ' imagens incorporadas. Cole no Corretor UNIP.');
})();
