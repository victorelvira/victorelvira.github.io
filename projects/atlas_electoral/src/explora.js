import { textos, md } from "./textos.js?v=0.2.135";

// the prose and the tiles are textos/explora.md
export async function renderExplora(app) {
  const T = await textos("explora");
  app.innerHTML = md(T.principal, { page: "explora" }).html;
}
