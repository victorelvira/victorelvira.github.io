// Chart helpers copied verbatim from nyc/functions.js (0.3.2) so the "Analysis and context" tab
// is the same as on the published page. Uses Chart.js (loaded in nyc_next.html, pinned version).

 window._charts = window._charts || {};

 function renderLineChart(canvasId, labels, series) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return;
   const ctx = canvas.getContext('2d');

   if (window._charts[canvasId]) window._charts[canvasId].destroy();

   window._charts[canvasId] = new Chart(ctx, {
     type: 'line',
     data: {
       labels,
       datasets: series.map(s => ({
         label: s.label,
         data: s.data
       }))
     },
     options: {
       responsive: true,
       maintainAspectRatio: false,
       scales: {
         y: {
           beginAtZero: true   // <<< THIS
         }
       }
     }
   });
 }

 function renderBarChart(canvasId, labels, datasets) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return;
   const ctx = canvas.getContext('2d');

   if (window._charts[canvasId]) window._charts[canvasId].destroy();

   window._charts[canvasId] = new Chart(ctx, {
     type: 'bar',
     data: { labels, datasets },
     options: {
       responsive: true,
       maintainAspectRatio: false
     }
   });
 }


 // Horizontal bar chart (for long labels, rankings)
 function renderBarChartHorizontal(canvasId, labels, datasets) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return;
   const ctx = canvas.getContext('2d');

   if (window._charts[canvasId]) window._charts[canvasId].destroy();

   const MAX_LABEL = 35;
   const shortLabels = labels.map(l =>
     l.length > MAX_LABEL ? l.slice(0, MAX_LABEL) + '…' : l
   );

   window._charts[canvasId] = new Chart(ctx, {
     type: 'bar',
     data: { labels: shortLabels, datasets },
     options: {
       indexAxis: 'y', // this is what makes it horizontal
       responsive: true,
       maintainAspectRatio: false,
       plugins: {
         tooltip: {
           callbacks: {
             title: items => labels[items[0].dataIndex] // full label
           }
         },
         legend: { display: false }
       },
       scales: {
         x: { beginAtZero: true },
         y: {
           ticks: {
             autoSkip: false,      // show every label
             maxRotation: 0,
             minRotation: 0
           }
         }
       }
     }
   });
 }

 function renderStackedBarChart(canvasId, labels, series) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return;
   const ctx = canvas.getContext('2d');

   if (window._charts[canvasId]) window._charts[canvasId].destroy();

   window._charts[canvasId] = new Chart(ctx, {
     type: 'bar',
     data: { labels, datasets: series.map(s => ({ label: s.label, data: s.data })) },
     options: {
       responsive: true,
       maintainAspectRatio: false,
       scales: { x: { stacked: true }, y: { stacked: true } }
     }
   });
 }


function renderPieChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window._charts[canvasId]) window._charts[canvasId].destroy();

  window._charts[canvasId] = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}


function renderLineChart(canvasId, labels, datasets) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window._charts[canvasId]) window._charts[canvasId].destroy();

  window._charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        tooltip: {
          callbacks: {
            // This replaces the "1" (rank) with the piece title, if provided
            title: function(items) {
              if (!items || !items.length) return '';
              const it = items[0];
              const ds = it.dataset || {};
              const idx = it.dataIndex;

              const rank = it.label; // this is "1", "2", ...
              const title = (Array.isArray(ds.pointTitles) && ds.pointTitles[idx]) ? ds.pointTitles[idx] : '';
              const composer = (Array.isArray(ds.pointComposers) && ds.pointComposers[idx]) ? ds.pointComposers[idx] : '';

              if (title && composer) return '#' + rank + ' – ' + title + ' (' + composer + ')';
              if (title) return '#' + rank + ' – ' + title;
              return it.label;
            }
          }
        }
      },
      scales: { y: { beginAtZero: true } }
    }
  });
}



