// Build: gera a versão leve da LP em /dist (é essa pasta que vai para o ar).
// - remove do CSS as regras de classes que não existem no HTML/JS
// - minifica HTML, CSS e JS
// - copia só os arquivos de assets/ que a página usa
// Uso: node scripts/build.js
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..");
const out = path.join(src, "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });

const read = (f) => fs.readFileSync(path.join(src, f), "utf8");
const html = read("index.html");
const css = read("styles.css");
const js1 = read("script.js");
const js2 = read("wow.js");

/* ---------------- CSS: parser simples de blocos ---------------- */
function parse(s) {
  // devolve lista de nós { prelude, body (string) | children, type }
  const nodes = [];
  let i = 0;
  const n = s.length;
  function skipWs() { while (i < n && /\s/.test(s[i])) i++; }
  while (i < n) {
    skipWs();
    if (i >= n) break;
    if (s.startsWith("/*", i)) { const e = s.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
    // lê o prelúdio até { ou ;
    let start = i, q = null;
    while (i < n) {
      const c = s[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (s.startsWith("/*", i)) { const e = s.indexOf("*/", i + 2); i = e < 0 ? n : e + 1; }
      else if (c === "{" || c === ";") break;
      i++;
    }
    const prelude = s.slice(start, i).replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (s[i] === ";") { nodes.push({ type: "at-stmt", prelude }); i++; continue; }
    // acha o fecha-chaves correspondente
    i++;
    let depth = 1, bStart = i; q = null;
    while (i < n && depth) {
      const c = s[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (s.startsWith("/*", i)) { const e = s.indexOf("*/", i + 2); i = e < 0 ? n : e + 1; }
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
    const body = s.slice(bStart, i - 1);
    if (/^@(media|supports|layer|container)\b/.test(prelude)) nodes.push({ type: "group", prelude, children: parse(body) });
    else nodes.push({ type: prelude.startsWith("@") ? "at-block" : "rule", prelude, body });
  }
  return nodes;
}

// palavras que aparecem no HTML/JS: uma classe só fica se o nome dela aparecer lá
const corpus = html + "\n" + js1 + "\n" + js2;
const words = new Set(corpus.match(/[A-Za-z_][\w-]*/g));
function selectorUsed(sel) {
  const clean = sel.replace(/::?[\w-]+(\([^)]*\))?/g, (m) => (m.startsWith(":not(") || m.startsWith(":is(") || m.startsWith(":where(") || m.startsWith(":has(") ? m : ""));
  const classes = clean.match(/\.[A-Za-z_][\w-]*/g) || [];
  return classes.every((c) => words.has(c.slice(1)));
}

function purge(nodes) {
  const outNodes = [];
  for (const nd of nodes) {
    if (nd.type === "group") {
      const kids = purge(nd.children);
      if (kids.length) outNodes.push({ ...nd, children: kids });
    } else if (nd.type === "rule") {
      const sels = nd.prelude.split(/,(?![^(]*\))/).map((x) => x.trim()).filter(selectorUsed);
      if (sels.length && nd.body.trim()) outNodes.push({ ...nd, prelude: sels.join(",") });
    } else outNodes.push(nd);
  }
  return outNodes;
}

function minDecl(b) {
  return b
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,>])\s*/g, "$1")
    .replace(/;$/, "")
    .trim();
}
function stringify(nodes) {
  return nodes.map((nd) => {
    if (nd.type === "group") return nd.prelude.replace(/\s+/g, " ") + "{" + stringify(nd.children) + "}";
    if (nd.type === "at-stmt") return nd.prelude + ";";
    if (nd.type === "at-block" && /^@keyframes/.test(nd.prelude)) {
      return nd.prelude.replace(/\s+/g, " ") + "{" + stringify(parse(nd.body)) + "}";
    }
    return nd.prelude.replace(/\s+/g, " ").replace(/\s*([>+~,])\s*/g, "$1") + "{" + minDecl(nd.body) + "}";
  }).join("");
}

let tree = purge(parse(css));
// remove @keyframes que ninguém usa
let flat = stringify(tree);
tree = (function dropKf(nodes) {
  return nodes.filter((nd) => {
    if (nd.type === "group") { nd.children = dropKf(nd.children); return nd.children.length; }
    if (nd.type === "at-block" && /^@(-webkit-)?keyframes\s+/.test(nd.prelude)) {
      const name = nd.prelude.split(/\s+/)[1];
      const uses = flat.split(name).length - 1;
      return uses > 1;
    }
    return true;
  });
})(tree);
const cssOut = stringify(tree);

/* ---------------- JS e HTML ---------------- */
function minJs(s) {
  // conservador: tira comentários de bloco e de linha inteira e indentação (seguro com ASI)
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"))
    .join("\n");
}
function minHtml(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

fs.writeFileSync(path.join(out, "index.html"), minHtml(html));
fs.writeFileSync(path.join(out, "styles.css"), cssOut);
fs.writeFileSync(path.join(out, "script.js"), minJs(js1));
fs.writeFileSync(path.join(out, "wow.js"), minJs(js2));

// só os arquivos de assets/ realmente usados (mais robots/sitemap/favicon se existirem)
const used = new Set((html + cssOut + js1 + js2).match(/assets\/[\w.-]+/g));
used.forEach((a) => fs.copyFileSync(path.join(src, a), path.join(out, a)));
["robots.txt", "sitemap.xml", "favicon.svg"].forEach((f) => {
  if (fs.existsSync(path.join(src, f))) fs.copyFileSync(path.join(src, f), path.join(out, f));
});

// compressão e cache para hospedagens Apache/LiteSpeed (a Vercel ignora)
fs.writeFileSync(path.join(out, ".htaccess"), `<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript image/svg+xml
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType image/webp "access plus 1 year"
ExpiresByType image/svg+xml "access plus 1 year"
ExpiresByType video/mp4 "access plus 1 year"
ExpiresByType audio/mpeg "access plus 1 year"
ExpiresByType text/css "access plus 1 month"
ExpiresByType application/javascript "access plus 1 month"
ExpiresByType text/html "access plus 0 seconds"
</IfModule>
`);

const kb = (b) => (b / 1024).toFixed(1) + " KB";
console.log("CSS: " + kb(Buffer.byteLength(css)) + " -> " + kb(Buffer.byteLength(cssOut)));
let total = 0;
(function walk(d) {
  fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) return walk(p);
    total += fs.statSync(p).size;
  });
})(out);
console.log("dist pronto: " + kb(total) + ", " + used.size + " arquivos de assets");
