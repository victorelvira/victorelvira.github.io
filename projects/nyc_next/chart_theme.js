// The charts in the page's own colours (loaded right after Chart.js, before any chart is drawn).
// The analysis code is the published page's, untouched: it gives no colours, so Chart.js used its default
// light blue and pink. Here every dataset gets one, by what it is: the family code where there is one
// (piece blue, conductor green), gold for the concert itself, and "Others" always grey.
(function () {
  if (typeof Chart === "undefined") return;
  const C = { gold: "#8f6d2d", piece: "#2b5fa8", conductor: "#2e7d4f", composer: "#b3373a", form: "#c0650f",
              navy: "#3d4f7a", teal: "#3f9a9b", violet: "#7a6aa8", grey: "#b4b8c4" };
  const BY_LABEL = [
    [/^others?\b/i, C.grey], [/non strauss/i, C.navy], [/^strauss/i, C.gold],
    [/in the program|^program/i, C.piece], [/encore/i, C.gold], [/^total/i, C.gold],
    [/conducted/i, C.conductor],
    [/^polka/i, C.form], [/^waltz/i, C.gold], [/^march/i, C.navy], [/^galop/i, C.composer], [/^overture/i, C.teal],
    [/^new/i, C.gold], [/repeat/i, C.grey],
  ];
  const ROTATION = [C.gold, C.navy, C.teal, C.composer, C.form, C.violet, C.conductor];
  const pick = (label, i) => (BY_LABEL.find(([re]) => re.test(label || "")) || [null, ROTATION[i % ROTATION.length]])[1];

  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  Chart.defaults.font.size = 13;
  Chart.defaults.color = "#646a7c";
  Chart.defaults.borderColor = "#ebe7dd";
  if (Chart.defaults.plugins.colors) Chart.defaults.plugins.colors.enabled = false;

  Chart.register({
    id: "nycTheme",
    beforeUpdate(chart) {
      const type = chart.config.type;
      const labels = chart.data.labels || [];
      chart.data.datasets.forEach((ds, i) => {
        if (ds._nycTheme) return;
        ds._nycTheme = true;
        if (type === "pie" || type === "doughnut") {     // one colour per slice
          ds.backgroundColor = labels.map((l, j) => pick(String(l), j));
          ds.borderColor = "#ffffff";
          return;
        }
        const col = pick(ds.label, i);
        ds.borderColor = col;
        ds.backgroundColor = type === "line" ? col : col + "d9";
        if (type === "line") { ds.borderWidth = 2; ds.pointRadius = 0; ds.pointHoverRadius = 4; }
        else { ds.borderWidth = 0; ds.borderRadius = 2; }
      });
    },
  });
})();
