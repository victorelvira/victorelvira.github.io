const d3 = window.d3;

/**
 * Wheel / pinch / drag zoom on a map svg, plus +, - and reset buttons over it.
 * Borders keep their screen width (vector-effect: non-scaling-stroke in the CSS).
 */
export function addZoom(svg, g, wrap, { max = 40 } = {}) {
  const [, , W, H] = svg.attr("viewBox").split(" ").map(Number);
  const zoom = d3.zoom().scaleExtent([1, max]).translateExtent([[0, 0], [W, H]])
    .on("zoom", (e) => g.attr("transform", e.transform));
  svg.call(zoom);
  wrap.insertAdjacentHTML("beforeend", `<div class="zoombtns">
    <button data-z="in" aria-label="Acercar">+</button><button data-z="out" aria-label="Alejar">−</button>
    <button data-z="reset" aria-label="Ver todo">⟲</button></div>`);
  wrap.querySelectorAll(".zoombtns button").forEach((b) => b.onclick = () => {
    const t = svg.transition().duration(300);
    if (b.dataset.z === "in") t.call(zoom.scaleBy, 2);
    else if (b.dataset.z === "out") t.call(zoom.scaleBy, 0.5);
    else t.call(zoom.transform, d3.zoomIdentity);
  });
  return zoom;
}
