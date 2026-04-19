// app/bookmarklet/page.tsx
// Server Component — static HTML, no client directive needed.
// Pitfall 5 (RESEARCH.md): Next.js router intercepts javascript: hrefs — onClick e.preventDefault() is
// handled inside BookmarkletAnchor (Client Component) to satisfy Next.js 16 App Router constraints.

import BookmarkletAnchor from "./BookmarkletAnchor";

// Minified from public/bookmarklet-source.js via encodeURIComponent
const BOOKMARKLET_HREF =
  "javascript:(async()%3D%3E%7Bconst%20imgs%3DArray.from(document.querySelectorAll('img'))%3Bconst%20httpImgs%3Dimgs.filter(i%3D%3E(i.getAttribute('src')%7C%7C'').startsWith('http'))%3Bawait%20Promise.all(httpImgs.map(async(img)%3D%3E%7Btry%7Bconst%20res%3Dawait%20fetch(img.src%2C%7Bcredentials%3A'include'%7D)%3Bif(!res.ok)return%3Bconst%20blob%3Dawait%20res.blob()%3Bconst%20buf%3Dawait%20blob.arrayBuffer()%3Blet%20bin%3D''%3Bconst%20bytes%3Dnew%20Uint8Array(buf)%3Bfor(let%20i%3D0%3Bi%3Cbytes.length%3Bi%2B%2B)bin%2B%3DString.fromCharCode(bytes%5Bi%5D)%3Bimg.src%3D'data%3A'%2Bblob.type%2B'%3Bbase64%2C'%2Bbtoa(bin)%3B%7Dcatch(e)%7B%7D%7D))%3Bconst%20html%3Ddocument.documentElement.outerHTML%3Btry%7Bawait%20navigator.clipboard.writeText(html)%3B%7Dcatch%7Bconst%20ta%3Ddocument.createElement('textarea')%3Bta.value%3Dhtml%3Bta.style.position%3D'fixed'%3Bta.style.opacity%3D'0'%3Bdocument.body.appendChild(ta)%3Bta.select()%3Bdocument.execCommand('copy')%3Bdocument.body.removeChild(ta)%3B%7Dalert('HTML%20copiado%20com%20'%2BhttpImgs.length%2B'%20imagens%20incorporadas.%20Cole%20no%20Corretor%20UNIP.')%3B%7D)()";

export default function BookmarkletPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12 gap-8">
      <header className="text-center">
        <h1 className="font-heading text-2xl font-semibold">Corretor UNIP</h1>
        <p className="text-base text-muted-foreground">Bookmarklet: copiar HTML com imagens</p>
      </header>

      <div className="w-full max-w-lg flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-base">Como instalar</h2>
          <ol className="list-decimal list-inside flex flex-col gap-2 text-sm text-muted-foreground">
            <li>Mostre a barra de favoritos do seu navegador (Ctrl+Shift+B no Chrome/Edge).</li>
            <li>Arraste o link abaixo para a barra de favoritos.</li>
            <li>Abra a revisão de prova no AVA UNIP.</li>
            <li>Clique no favorito que você acabou de adicionar.</li>
            <li>Quando o alerta aparecer, cole o conteúdo no campo de HTML do Corretor UNIP.</li>
          </ol>
        </section>

        <section className="flex flex-col gap-3 items-start">
          <p className="text-sm text-muted-foreground">
            Arraste este link para a sua barra de favoritos:
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <BookmarkletAnchor href={BOOKMARKLET_HREF} />
          <p className="text-xs text-muted-foreground">
            Não clique — arraste para a barra de favoritos.
          </p>
        </section>

        <section className="flex flex-col gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
            Se o bookmarklet não fizer nada
          </p>
          <p className="text-xs text-muted-foreground">
            O servidor do AVA UNIP pode estar bloqueando scripts externos via Content Security Policy
            (CSP). Isso não pode ser corrigido no bookmarklet — é uma restrição do
            servidor da UNIP. Verifique o console do navegador: se aparecer &quot;Refused to execute
            inline script&quot;, o bloqueio está ativo.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">O que o bookmarklet faz</h2>
          <ul className="list-disc list-inside flex flex-col gap-1 text-sm text-muted-foreground">
            <li>Localiza todas as imagens da página de revisão.</li>
            <li>Baixa cada imagem usando sua sessão autenticada no AVA (sem erros 401).</li>
            <li>Converte as imagens para formato base64 embutido no HTML.</li>
            <li>Copia o HTML resultante para a área de transferência.</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-1">
            Apenas execute o bookmarklet em <strong>ava.ead.unip.br</strong>. Não o execute em
            outros sites.
          </p>
        </section>
      </div>
    </main>
  );
}
