/* ==========================================================================
   StreamMAE project page, interactive result charts, figure lightbox, nav.
   No dependencies. All numbers come from the paper's result tables; each
   chart renders from the same data as its table view, so the two agree.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- data -- */

  // Metric registry. `higher` drives the ↑/↓ arrow and the "best" logic.
  var METRICS = {
    in1k:  { label: 'IN-1K',      unit: 'Acc@1 %',  higher: true,  dp: 1, note: 'ImageNet-1K top-1 accuracy after full fine-tuning. Higher is better.' },
    city:  { label: 'Cityscapes', unit: 'mIoU',     higher: true,  dp: 1, note: 'Cityscapes semantic segmentation. Higher is better.' },
    ade:   { label: 'ADE20K',     unit: 'mIoU',     higher: true,  dp: 1, note: 'ADE20K semantic segmentation. Higher is better.' },
    nyu:   { label: 'NYUv2',      unit: 'RMSE',     higher: false, dp: 3, note: 'NYUv2 monocular depth. Lower is better.' },
    kitti: { label: 'KITTI',      unit: 'RMSE',     higher: false, dp: 3, note: 'KITTI monocular depth. Lower is better.' }
  };

  // Main streaming benchmark, ViT-S/16, pretrained on WT++12h unless noted.
  var BENCHMARK = {
    metrics: ['in1k', 'city', 'ade', 'nyu', 'kitti'],
    refRow: 'iid-wt',
    refLabel: 'i.i.d. MAE, same video',
    groups: [
      {
        label: 'No pretraining',
        rows: [
          { id: 'rand', name: 'Random init', kind: 'context',
            in1k: 71.9, city: 47.7, ade: 16.7, nyu: [0.877, 0.013], kitti: [6.108, 0.028] }
        ]
      },
      {
        label: 'Standard i.i.d. setup',
        rows: [
          { id: 'iid-wt', name: 'MAE, standard i.i.d.', qual: 'WT++12h', kind: 'ref',
            in1k: 77.0, city: 63.5, ade: 25.9, nyu: [0.701, 0.004], kitti: [4.070, 0.006] },
          { id: 'iid-in', name: 'MAE, standard i.i.d.', qual: 'ImageNet-1K', kind: 'ref',
            in1k: 77.4, city: 64.0, ade: 26.9, nyu: [0.656, 0.004], kitti: [3.854, 0.008] }
        ]
      },
      {
        label: 'Streaming setup: temporal order, sliding window',
        rows: [
          { id: 'moco', name: 'MoCo-v3', kind: 'context',
            in1k: 68.7, city: 52.0, ade: 19.4, nyu: [0.760, 0.000], kitti: [4.882, 0.054] },
          { id: 'memsto', name: 'MemoryStoryboard', kind: 'context',
            in1k: 71.0, city: 49.2, ade: 21.6, nyu: [0.792, 0.001], kitti: [4.647, 0.038] },
          { id: 'dino', name: 'DINO', kind: 'context',
            in1k: 72.7, city: 53.2, ade: 23.9, nyu: [0.734, 0.003], kitti: [4.454, 0.034] },
          { id: 'omae', name: 'Orthogonal-MAE', kind: 'context',
            in1k: 75.9, city: 58.3, ade: 22.5, nyu: [0.749, 0.004], kitti: [4.209, 0.036] },
          { id: 'mae', name: 'streaming MAE (baseline)', kind: 'context',
            in1k: 77.1, city: 61.3, ade: 23.9, nyu: [0.742, 0.002], kitti: [4.211, 0.137] },
          { id: 'ours12', name: 'StreamMAE', qual: 'ours', kind: 'ours',
            in1k: 77.5, city: 63.8, ade: 26.1, nyu: [0.694, 0.003], kitti: [3.976, 0.012] }
        ]
      }
    ]
  };

  // Encoder scaling, ViT-B/16, WT++12h unless noted.
  var ENCODER = {
    metrics: ['in1k', 'city', 'ade', 'nyu', 'kitti'],
    refRow: 'b-iid-wt',
    refLabel: 'i.i.d. MAE, same video',
    groups: [
      {
        label: 'No pretraining',
        rows: [
          { id: 'b-rand', name: 'Random init', kind: 'context',
            in1k: 78.5, city: 51.0, ade: 17.5, nyu: [0.881, 0.002], kitti: [5.818, 0.137] }
        ]
      },
      {
        label: 'Standard i.i.d. setup',
        rows: [
          { id: 'b-iid-wt', name: 'MAE, standard i.i.d.', qual: 'WT++12h', kind: 'ref',
            in1k: 81.2, city: 67.8, ade: 32.9, nyu: [0.675, 0.004], kitti: [3.855, 0.048] },
          { id: 'b-iid-in', name: 'MAE, standard i.i.d.', qual: 'ImageNet-1K', kind: 'ref',
            in1k: 81.5, city: 72.3, ade: 35.9, nyu: [0.588, 0.003], kitti: [3.771, 0.039] }
        ]
      },
      {
        label: 'Streaming setup',
        rows: [
          { id: 'b-mae', name: 'streaming MAE (baseline)', kind: 'context',
            in1k: 80.0, city: 58.2, ade: 26.2, nyu: [0.753, 0.005], kitti: [4.543, 0.046] },
          { id: 'b-omae', name: 'Orthogonal-MAE', kind: 'context',
            in1k: 80.0, city: 60.6, ade: 27.3, nyu: [0.750, 0.002], kitti: [4.289, 0.011] },
          { id: 'b-ours12', name: 'StreamMAE', qual: 'ours', kind: 'ours',
            in1k: 81.1, city: 69.0, ade: 32.7, nyu: [0.655, 0.002], kitti: [3.797, 0.006] }
        ]
      }
    ]
  };

  // Cumulative component ablation, ViT-S/16, WT++12h.
  var ABLATION = {
    metrics: ['city', 'ade', 'kitti'],
    groups: [
      {
        rows: [
          { id: 'a0', name: 'streaming MAE (baseline)', qual: 'no DataDrop', kind: 'context',
            city: 60.8, ade: 23.2, kitti: [4.307, 0.046] },
          { id: 'a1', name: '+ DataDrop', kind: 'context',
            city: 61.3, ade: 23.9, kitti: [4.211, 0.137] },
          { id: 'a2', name: '+ Color jitter & drop path', kind: 'context',
            city: 62.6, ade: 25.1, kitti: [4.025, 0.039] },
          { id: 'a3', name: '+ Two-stage cropping', kind: 'context',
            city: 62.8, ade: 26.1, kitti: [4.074, 0.048] },
          { id: 'a4', name: '+ Motion-biased crop selection', qual: 'full StreamMAE', kind: 'ours',
            city: 63.8, ade: 26.1, kitti: [3.976, 0.012] }
        ]
      }
    ],
    // Leave-one-out rows, shown in the table view only.
    extra: [
      { id: 'a5', name: 'StreamMAE without color jitter & drop path',
        city: 62.4, ade: 24.7, kitti: [4.022, 0.123] },
      { id: 'a6', name: 'StreamMAE without DataDrop',
        city: 63.1, ade: 25.4, kitti: [3.958, 0.087] }
    ]
  };

  /* The two similarity experiments, shown as fixed comparisons. Each changes
     one of the two similarity statistics and keeps the other fixed.
     Everything plotted is ViT-B/16 on Cityscapes; the full grid is in the
     table view. Sources: main "Pre-shuffled ImageNet-1K" table and the
     appendix "Intra-/inter-batch similarity on WT++12h" table. */
  var CONTROL = {
    enc: 'ViT-B/16',
    metric: 'Cityscapes mIoU',
    experiments: [
      {
        n: 1,
        data: 'ImageNet-1K',
        setup: 'Sample batches i.i.d. from ImageNet-1K, or shuffle it once and then read that fixed order with a sliding window of stride s = 8.',
        from: 'standard i.i.d.',
        to: 'pre-shuffled stream',
        changed: 'inter',
        inter: [0.325, 0.989],
        intra: [0.004, 0.004],
        scores: [
          { name: 'Cityscapes mIoU', v: [72.3, 73.6] },
          { name: 'ADE20K mIoU', v: [35.9, 36.5] }
        ],
        verdict: 'no drop on either benchmark',
        kind: 'flat'
      },
      {
        n: 2,
        data: 'WT++12h video',
        setup: 'Shuffle the same video once, or leave the frames in their original order.',
        // i.i.d. on the same frames, as an anchor for what "unshuffled" costs
        ref: { name: 'i.i.d. sampling', inter: 0.738, intra: 0.171, scores: [67.8, 32.9] },
        from: 'pre-shuffled stream',
        to: 'chronological stream',
        changed: 'intra',
        inter: [0.999, 1.000],
        intra: [0.171, 0.665],
        scores: [
          { name: 'Cityscapes mIoU', v: [68.8, 58.2] },
          { name: 'ADE20K mIoU', v: [32.3, 26.2] }
        ],
        verdict: 'a collapse on both',
        kind: 'bad'
      }
    ],
    // full grid, table view only
    table: [
      { data: 'ImageNet-1K', regime: 'Standard i.i.d.', intra: 0.004, inter: 0.325,
        s: { in1k: 77.4, city: 64.0, ade: 26.9 }, b: { in1k: 81.5, city: 72.3, ade: 35.9 }, ref: true },
      { data: 'ImageNet-1K', regime: 'Pre-shuffled stream', intra: 0.004, inter: 0.989,
        s: { in1k: 77.4, city: 63.6, ade: 27.2 }, b: { in1k: 81.6, city: 73.6, ade: 36.5 } },
      { data: 'WT++12h', regime: 'i.i.d. sampling', intra: 0.171, inter: 0.738,
        s: { city: 63.5, ade: 25.9 }, b: { city: 67.8, ade: 32.9 }, ref: true },
      { data: 'WT++12h', regime: 'Pre-shuffled stream', intra: 0.171, inter: 0.999,
        s: { city: 63.9, ade: 26.0 }, b: { city: 68.8, ade: 32.3 } },
      { data: 'WT++12h', regime: 'Chronological stream', intra: 0.665, inter: 1.000,
        s: { city: 61.3, ade: 23.9 }, b: { city: 58.2, ade: 26.2 } }
    ]
  };

  // Stream scaling, StreamMAE at 12/25/50/95 hours.
  var SCALING = {
    metrics: ['city', 'ade', 'nyu', 'kitti', 'in1k'],
    x: [12, 25, 50, 95],
    xLabels: ['12h', '25h', '50h', '95h'],
    series: [
      { id: 'vits', name: 'ViT-S/16', color: 'var(--ours)', hex: '#eb6834',
        in1k: [77.5, 78.1, 78.2, 78.4], city: [63.8, 67.1, 67.5, 68.0], ade: [26.1, 28.4, 29.0, 29.5],
        nyu: [0.694, 0.659, 0.656, 0.646], kitti: [3.976, 3.747, 3.895, 3.765] },
      { id: 'vitb', name: 'ViT-B/16', color: 'var(--ours-deep)', hex: '#b03800',
        in1k: [81.1, 81.6, 81.9, 82.0], city: [69.0, 72.5, 73.8, 74.0], ade: [32.7, 35.0, 35.6, 36.5],
        nyu: [0.655, 0.617, 0.600, 0.584], kitti: [3.797, 3.619, 3.620, 3.496] }
    ]
  };

  // Long i.i.d. ImageNet-1K reference, iteration-matched to the WT++95h streaming
  // runs (~650k iterations = 95h of video at 3.75 FPS with stride s=2).
  var LONGRUN = {
    metrics: ['city', 'ade', 'in1k'],
    groups: [
      {
        label: 'ViT-S/16',
        rows: [
          { id: 'l-s-iid', name: 'MAE, standard i.i.d.', qual: 'ImageNet-1K, ~650k iters', kind: 'ref',
            in1k: 78.5, city: 65.9, ade: 28.5 },
          { id: 'l-s-ours', name: 'StreamMAE', qual: 'ours · WT++95h', kind: 'ours',
            in1k: 78.4, city: 68.0, ade: 29.5 }
        ]
      },
      {
        label: 'ViT-B/16',
        rows: [
          { id: 'l-b-iid', name: 'MAE, standard i.i.d.', qual: 'ImageNet-1K, ~650k iters', kind: 'ref',
            in1k: 82.5, city: 75.2, ade: 39.8 },
          { id: 'l-b-ours', name: 'StreamMAE', qual: 'ours · WT++95h', kind: 'ours',
            in1k: 82.0, city: 74.0, ade: 36.5 },
          { id: 'l-b-avg', name: 'StreamMAE + checkpoint averaging', qual: 'ours · WT++95h, avg. {60,100}%', kind: 'ours',
            in1k: 81.9, city: 75.3, ade: 37.3 }
        ]
      }
    ]
  };

  // WT++ stream construction, each stream is a prefix of the next.
  var STREAMS = [
    { id: 'wt12', name: 'WT++12h', videos: 1,  hours: 12.0, note: 'the London stream, our default' },
    { id: 'wt25', name: 'WT++25h', videos: 10, hours: 24.8, note: '+ 9 videos from the original WalkingTours' },
    { id: 'wt50', name: 'WT++50h', videos: 26, hours: 50.0, note: '+ 16 more videos' },
    { id: 'wt95', name: 'WT++95h', videos: 58, hours: 94.5, note: '+ 32 more videos, the full WT++ collection' }
  ];

  // Generalization across pretraining domains, ViT-B/16.
  var DOMAINS = {
    metrics: ['city', 'ade', 'nyu', 'kitti'],
    domains: [
      { id: 'hdepic', name: 'HD-EPIC', blurb: 'indoor egocentric kitchen', hours: '18 h', fps: '2.5 FPS',
        rows: [
          { id: 'h-iid',  name: 'MAE, standard i.i.d.', kind: 'ref',     city: 65.2, ade: 30.7, nyu: [0.681, 0.001], kitti: [4.184, 0.081] },
          { id: 'h-mae',  name: 'streaming MAE (baseline)',       kind: 'context', city: 63.2, ade: 29.3, nyu: [0.711, 0.000], kitti: [4.206, 0.003] },
          { id: 'h-ours', name: 'StreamMAE',             kind: 'ours',    city: 65.6, ade: 32.0, nyu: [0.652, 0.001], kitti: [4.030, 0.049] }
        ] },
      { id: 'crowd', name: 'CROWD', blurb: 'front-facing urban dashcam', hours: '14.5 h', fps: '4 FPS',
        rows: [
          { id: 'c-iid',  name: 'MAE, standard i.i.d.', kind: 'ref',     city: 68.1, ade: 32.3, nyu: [0.681, 0.000], kitti: [3.830, 0.026] },
          { id: 'c-mae',  name: 'streaming MAE (baseline)',       kind: 'context', city: 65.7, ade: 29.1, nyu: [0.704, 0.004], kitti: [4.287, 0.147] },
          { id: 'c-ours', name: 'StreamMAE',             kind: 'ours',    city: 71.5, ade: 32.6, nyu: [0.644, 0.001], kitti: [3.756, 0.046] }
        ] },
      { id: 'krishna', name: 'KrishnaCAM', blurb: 'longitudinal egocentric daily life', hours: '70 h', fps: '1 FPS',
        rows: [
          { id: 'k-iid',  name: 'MAE, standard i.i.d.', kind: 'ref',     city: 71.7, ade: 34.6, nyu: [0.616, 0.004], kitti: [3.596, 0.003] },
          { id: 'k-mae',  name: 'streaming MAE (baseline)',       kind: 'context', city: 67.9, ade: 32.9, nyu: [0.663, 0.009], kitti: [3.799, 0.010] },
          { id: 'k-ours', name: 'StreamMAE',             kind: 'ours',    city: 72.2, ade: 34.5, nyu: [0.621, 0.001], kitti: [3.583, 0.012] }
        ] }
    ]
  };

  /* --------------------------------------------------------------- utils -- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;   // labels are inserted as text, never HTML
    return n;
  }

  function val(row, metric) {
    var v = row[metric];
    return Array.isArray(v) ? v[0] : v;
  }

  function std(row, metric) {
    var v = row[metric];
    return Array.isArray(v) ? v[1] : null;
  }

  function fmt(v, dp) {
    return v == null ? '\u2013' : v.toFixed(dp);   // en dash: no value for this cell
  }

  // Round axis bounds and step to clean numbers (1, 2, 2.5, 5 x 10^k).
  function niceScale(lo, hi, target) {
    if (hi === lo) { hi = lo + 1; }
    var raw = (hi - lo) / Math.max(1, target);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    var min = Math.floor(lo / step) * step;
    var max = Math.ceil(hi / step) * step;
    var ticks = [];
    for (var v = min; v <= max + step / 1000; v += step) ticks.push(Math.round(v / step) * step);
    return { min: min, max: max, step: step, ticks: ticks };
  }

  function allRows(spec) {
    var out = [];
    spec.groups.forEach(function (g) { g.rows.forEach(function (r) { out.push(r); }); });
    return out;
  }

  /* ------------------------------------------------------------ tooltips -- */

  function makeTooltip(host) {
    var tip = el('div', 'tooltip');
    tip.setAttribute('role', 'status');
    host.appendChild(tip);
    return {
      node: tip,
      show: function (html, x, y) {
        tip.innerHTML = '';
        html.forEach(function (n) { tip.appendChild(n); });
        tip.classList.add('is-visible');
        var hb = host.getBoundingClientRect();
        var tb = tip.getBoundingClientRect();
        var left = Math.min(Math.max(x - hb.left - tb.width / 2, 4), hb.width - tb.width - 4);
        var top = y - hb.top - tb.height - 12;
        if (top < 0) top = y - hb.top + 18;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
      },
      hide: function () { tip.classList.remove('is-visible'); }
    };
  }

  function tipRows(title, entries) {
    var out = [];
    var t = el('div', 'tt-title', title);
    out.push(t);
    entries.forEach(function (e) {
      var row = el('div', 'tt-row');
      if (e.color) {
        var k = el('span', 'tt-key');
        k.style.background = e.color;
        row.appendChild(k);
      }
      row.appendChild(el('span', 'tt-val', e.value));
      row.appendChild(el('span', 'tt-name', e.name));
      out.push(row);
    });
    return out;
  }

  /* ----------------------------------------------------------- bar chart -- */

  /**
   * Horizontal bar chart with an emphasis palette (ours / reference / context),
   * zero-based bars, a value at every tip, an optional reference rule, and a
   * table-view twin. Metric switching animates bar widths.
   */
  function BarChart(root, spec, opts) {
    opts = opts || {};
    var metric = opts.initial || spec.metrics[0];
    var rows = allRows(spec);

    var chart = el('div', 'chart');
    var plot = el('div', 'chart-plot');
    var rowsWrap = el('div', 'chart-rows');
    plot.appendChild(rowsWrap);
    chart.appendChild(plot);

    var refRule = null;
    if (spec.refRow) {
      refRule = el('div', 'ref-rule');
      refRule.appendChild(el('span', 'ref-rule-label', spec.refLabel || 'reference'));
      plot.appendChild(refRule);
    }

    var tip = makeTooltip(chart);
    var nodes = {};
    var firstWrap = null;

    spec.groups.forEach(function (g) {
      if (g.label) rowsWrap.appendChild(el('div', 'group-label', g.label));
      g.rows.forEach(function (r) {
        var row = el('div', 'row is-' + r.kind);
        row.tabIndex = 0;

        var name = el('div', 'name');
        name.appendChild(document.createTextNode(r.name));
        if (r.qual) name.appendChild(el('span', 'qual', r.qual));
        row.appendChild(name);

        var track = el('div', 'bar-track');
        var wrap = el('div', 'bar-wrap');
        var bar = el('div', 'bar');
        var value = el('div', 'bar-value');
        wrap.appendChild(bar);
        wrap.appendChild(value);
        track.appendChild(wrap);
        row.appendChild(track);
        if (!firstWrap) firstWrap = wrap;

        function show(ev) {
          var m = METRICS[metric];
          var s = std(r, metric);
          var entries = [{
            color: r.kind === 'ours' ? '#eb6834' : (r.kind === 'ref' ? '#2a78d6' : '#898781'),
            value: fmt(val(r, metric), m.dp) + (s != null ? ' ± ' + s.toFixed(m.dp) : ''),
            name: m.label + ' ' + m.unit
          }];
          /* Only our own rows get the gap to the i.i.d. reference. Differencing a
             contrastive or distillation baseline against i.i.d. MAE would invite a
             comparison the experiment does not support, different objective, not
             just a different data order. */
          if (spec.refRow && r.kind === 'ours') {
            var ref = rows.filter(function (x) { return x.id === spec.refRow; })[0];
            if (ref && ref.id !== r.id) {
              var d = val(r, metric) - val(ref, metric);
              var better = m.higher ? d > 0 : d < 0;
              entries.push({
                value: (d > 0 ? '+' : '\u2212') + Math.abs(d).toFixed(m.dp),
                name: 'vs i.i.d. MAE on the same video' + (Math.abs(d) < 1e-9 ? '' : (better ? ' (better)' : ' (worse)'))
              });
            }
          }
          var b = (ev.currentTarget || row).getBoundingClientRect();
          tip.show(tipRows(r.name + (r.qual ? ' · ' + r.qual : ''), entries), b.left + b.width / 2, b.top);
        }
        row.addEventListener('pointerenter', show);
        row.addEventListener('focus', show);
        row.addEventListener('pointerleave', tip.hide);
        row.addEventListener('blur', tip.hide);

        rowsWrap.appendChild(row);
        nodes[r.id] = { row: row, bar: bar, value: value, wrap: wrap };
      });
    });

    root.appendChild(chart);

    // Table-view twin
    var tableWrap = el('div', 'table-wrap table-view');
    tableWrap.hidden = true;
    root.appendChild(tableWrap);
    buildTable(tableWrap, spec, rows);

    function draw(animate) {
      var m = METRICS[metric];
      var maxV = Math.max.apply(null, rows.map(function (r) { return val(r, metric); }));
      var scaleMax = maxV * 1.06;

      rows.forEach(function (r) {
        var n = nodes[r.id];
        var v = val(r, metric);
        var s = std(r, metric);
        var pct = (v / scaleMax) * 100;
        if (!animate) { n.bar.style.transition = 'none'; n.value.style.transition = 'none'; }
        n.bar.style.width = pct + '%';
        n.value.style.left = pct + '%';
        if (!animate) {
          void n.bar.offsetWidth;
          n.bar.style.transition = ''; n.value.style.transition = '';
        }
        // The bar tip shows the value; ± and deltas live in the tooltip and table.
        n.value.textContent = fmt(v, m.dp);
        n.row.setAttribute('aria-label',
          r.name + (r.qual ? ', ' + r.qual : '') + ', ' + fmt(v, m.dp) +
          (s != null ? ' plus or minus ' + s.toFixed(m.dp) : '') + ' ' + m.label + ' ' + m.unit);
      });

      placeRefRule(scaleMax);
      root.querySelectorAll('[data-metric-col]').forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-metric-col') === metric);
      });
    }

    // The reference rule is positioned in pixels off a measured bar track, so it
    // lands exactly on the plot scale at any container width.
    var lastScaleMax = null;
    function placeRefRule(scaleMax) {
      if (scaleMax != null) lastScaleMax = scaleMax;
      if (!refRule || !firstWrap || lastScaleMax == null) return;
      var stacked = window.matchMedia('(max-width: 760px)').matches;
      refRule.hidden = stacked;
      if (stacked) return;
      var ref = rows.filter(function (x) { return x.id === spec.refRow; })[0];
      var pb = plot.getBoundingClientRect();
      var wb = firstWrap.getBoundingClientRect();
      var x = (wb.left - pb.left) + (val(ref, metric) / lastScaleMax) * wb.width;
      refRule.style.left = x + 'px';
      // Flip the caption to the left of the rule when it would run past the card.
      refRule.classList.toggle('flip', x > pb.width - 130);
    }

    draw(false);
    if ('ResizeObserver' in window) new ResizeObserver(function () { placeRefRule(); }).observe(plot);
    window.addEventListener('resize', function () { placeRefRule(); });

    return {
      setMetric: function (m) { metric = m; draw(true); },
      getMetric: function () { return metric; },
      table: tableWrap
    };
  }

  function buildTable(wrap, spec, rows) {
    var table = el('table');
    var thead = el('thead');
    var htr = el('tr');
    htr.appendChild(el('th', null, 'Method'));
    spec.metrics.forEach(function (mk) {
      var m = METRICS[mk];
      var th = el('th', null, m.label + ' ' + m.unit + ' ' + (m.higher ? '↑' : '↓'));
      th.setAttribute('data-metric-col', mk);
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    var tbody = el('tbody');
    spec.groups.forEach(function (g) {
      if (g.label) {
        var gtr = el('tr', 'group-row');
        var gtd = el('td', null, g.label);
        gtd.colSpan = spec.metrics.length + 1;
        gtr.appendChild(gtd);
        tbody.appendChild(gtr);
      }
      g.rows.forEach(function (r) {
        var tr = el('tr', r.kind === 'ours' ? 'is-ours' : (r.kind === 'ref' ? 'is-ref' : null));
        var td0 = el('td');
        td0.appendChild(document.createTextNode(r.name));
        if (r.qual) { td0.appendChild(el('span', 'qual', ' · ' + r.qual)); }
        tr.appendChild(td0);
        spec.metrics.forEach(function (mk) {
          var m = METRICS[mk];
          var td = el('td');
          td.setAttribute('data-metric-col', mk);
          td.appendChild(document.createTextNode(fmt(val(r, mk), m.dp)));
          var s = std(r, mk);
          if (s != null) td.appendChild(el('span', 'pm', ' ±' + s.toFixed(m.dp)));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    });

    if (spec.extra && spec.extra.length) {
      var etr = el('tr', 'group-row');
      var etd = el('td', null, 'Leave-one-out');
      etd.colSpan = spec.metrics.length + 1;
      etr.appendChild(etd);
      tbody.appendChild(etr);
      spec.extra.forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', null, r.name));
        spec.metrics.forEach(function (mk) {
          var m = METRICS[mk];
          var td = el('td');
          td.setAttribute('data-metric-col', mk);
          td.appendChild(document.createTextNode(fmt(val(r, mk), m.dp)));
          var s = std(r, mk);
          if (s != null) td.appendChild(el('span', 'pm', ' ±' + s.toFixed(m.dp)));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  /* ---------------------------------------------------------- line chart -- */

  function LineChart(root, spec, opts) {
    opts = opts || {};
    var metric = opts.initial || spec.metrics[0];

    var chart = el('div', 'chart');
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'linechart');
    svg.setAttribute('role', 'img');
    chart.appendChild(svg);
    root.appendChild(chart);

    var tip = makeTooltip(chart);

    var tableWrap = el('div', 'table-wrap table-view');
    tableWrap.hidden = true;
    root.appendChild(tableWrap);
    buildScalingTable(tableWrap, spec);

    // the viewBox tracks the rendered width, so label font sizes stay true px
    var W = 720, H = 320, narrow = false;
    var pad = { t: 18, r: 74, b: 42, l: 56 };

    function measure() {
      W = Math.max(300, Math.round(chart.clientWidth || 720));
      narrow = W < 520;
      H = narrow ? 260 : Math.max(300, Math.min(420, Math.round(W / 2.7)));
      pad = narrow ? { t: 14, r: 16, b: 44, l: 44 } : { t: 18, r: 74, b: 42, l: 56 };
    }

    function draw() {
      measure();
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

      var m = METRICS[metric];
      var vals = [];
      spec.series.forEach(function (s) { s[metric].forEach(function (v) { vals.push(v); }); });
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      var padv = (hi - lo) * 0.18 || 1;
      var sc = niceScale(lo - padv, hi + padv, 4);
      var y0 = sc.min, y1 = sc.max;

      var px = function (i) { return pad.l + (i / (spec.x.length - 1)) * (W - pad.l - pad.r); };
      var py = function (v) { return pad.t + (1 - (v - y0) / (y1 - y0)) * (H - pad.t - pad.b); };

      function add(tag, attrs, cls) {
        var n = document.createElementNS(svgNS, tag);
        Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
        if (cls) n.setAttribute('class', cls);
        svg.appendChild(n);
        return n;
      }

      // y gridlines + ticks on clean round steps
      var tickDp = sc.step >= 1 ? 0 : (sc.step >= 0.1 ? 1 : 2);
      sc.ticks.forEach(function (v) {
        var yy = py(v);
        add('line', { x1: pad.l, y1: yy, x2: W - pad.r, y2: yy }, 'grid-line');
        var t = add('text', { x: pad.l - 10, y: yy + 4, 'text-anchor': 'end' }, 'tick');
        t.textContent = v.toFixed(tickDp);
      });

      // x axis
      add('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b }, 'axis-line');
      spec.xLabels.forEach(function (lbl, i) {
        var t = add('text', { x: px(i), y: H - pad.b + 22, 'text-anchor': 'middle' }, 'tick');
        t.textContent = lbl;
      });
      var xt = add('text', { x: (pad.l + W - pad.r) / 2, y: H - 4, 'text-anchor': 'middle' }, 'axis-title');
      xt.textContent = 'Pretraining stream length';
      var yt = add('text', {
        x: 0, y: 0, 'text-anchor': 'middle',
        transform: 'translate(14,' + (pad.t + (H - pad.t - pad.b) / 2) + ') rotate(-90)'
      }, 'axis-title');
      yt.textContent = m.label + ' ' + m.unit + ' ' + (m.higher ? '↑' : '↓');

      // series
      spec.series.forEach(function (s) {
        var d = s[metric].map(function (v, i) { return (i ? 'L' : 'M') + px(i) + ' ' + py(v); }).join(' ');
        add('path', { d: d, stroke: s.hex }, 'series-line');
        s[metric].forEach(function (v, i) {
          add('circle', { cx: px(i), cy: py(v), r: 4.5, fill: s.hex }, 'series-dot');
        });
        // direct end label, dropped when narrow because the legend below names it
        if (!narrow) {
          var last = s[metric].length - 1;
          var lbl = add('text', { x: px(last) + 12, y: py(s[metric][last]) + 4 }, 'end-label');
          lbl.textContent = s.name;
        }
      });

      // one hover column per x position: shows every series at that x
      spec.x.forEach(function (_, i) {
        var w = (W - pad.l - pad.r) / (spec.x.length - 1);
        var hit = add('rect', {
          x: px(i) - w / 2, y: pad.t, width: w, height: H - pad.t - pad.b
        }, 'hit');
        hit.setAttribute('tabindex', '0');
        hit.setAttribute('role', 'button');
        hit.setAttribute('aria-label', spec.xLabels[i] + ': ' + spec.series.map(function (s) {
          return s.name + ' ' + fmt(s[metric][i], m.dp);
        }).join(', '));

        function show(ev) {
          var cross = document.createElementNS(svgNS, 'line');
          cross.setAttribute('x1', px(i)); cross.setAttribute('x2', px(i));
          cross.setAttribute('y1', pad.t); cross.setAttribute('y2', H - pad.b);
          cross.setAttribute('class', 'crosshair');
          var old = svg.querySelector('.crosshair');
          if (old) old.remove();
          svg.insertBefore(cross, svg.querySelector('.series-line'));

          var r = hit.getBoundingClientRect();
          tip.show(tipRows(spec.xLabels[i] + ' of stream', spec.series.map(function (s) {
            return { color: s.hex, value: fmt(s[metric][i], m.dp), name: s.name };
          })), r.left + r.width / 2, r.top + 40);
          if (ev.type === 'focus') hit.style.outline = '2px solid var(--ours)';
        }
        function hide() {
          tip.hide();
          var old = svg.querySelector('.crosshair');
          if (old) old.remove();
          hit.style.outline = '';
        }
        hit.addEventListener('pointerenter', show);
        hit.addEventListener('pointermove', show);
        hit.addEventListener('focus', show);
        hit.addEventListener('pointerleave', hide);
        hit.addEventListener('blur', hide);
      });

      svg.setAttribute('aria-label',
        'StreamMAE ' + m.label + ' ' + m.unit + ' as the pretraining stream grows from 12 to 95 hours, for ViT-S and ViT-B.');

      root.querySelectorAll('[data-metric-col]').forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-metric-col') === metric);
      });
    }

    draw();
    var redrawTimer;
    window.addEventListener('resize', function () {
      clearTimeout(redrawTimer);
      redrawTimer = setTimeout(draw, 150);
    });
    return { setMetric: function (mm) { metric = mm; draw(); }, table: tableWrap };
  }

  function buildScalingTable(wrap, spec) {
    var table = el('table');
    var thead = el('thead');
    var htr = el('tr');
    htr.appendChild(el('th', null, 'Encoder · stream'));
    spec.metrics.forEach(function (mk) {
      var m = METRICS[mk];
      var th = el('th', null, m.label + ' ' + m.unit + ' ' + (m.higher ? '↑' : '↓'));
      th.setAttribute('data-metric-col', mk);
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    var tbody = el('tbody');
    spec.series.forEach(function (s) {
      var gtr = el('tr', 'group-row');
      var gtd = el('td', null, 'StreamMAE · ' + s.name);
      gtd.colSpan = spec.metrics.length + 1;
      gtr.appendChild(gtd);
      tbody.appendChild(gtr);
      spec.xLabels.forEach(function (lbl, i) {
        var tr = el('tr', i === spec.xLabels.length - 1 ? 'is-ours' : null);
        tr.appendChild(el('td', null, 'WT++' + lbl));
        spec.metrics.forEach(function (mk) {
          var td = el('td', null, fmt(s[mk][i], METRICS[mk].dp));
          td.setAttribute('data-metric-col', mk);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  /* ------------------------------------------------------- similarity ---- */

  /* ------------------------------------------------------------- control -- */

  /**
   * Two controlled comparisons, rendered as before/after rows. Each moves one
   * similarity statistic and pins the other, so reading the two "changed" rows
   * against the two outcomes is the whole argument. Deliberately has no
   * controls, the only affordance is the table view for the full grid.
   */
  function ControlChart(card) {
    var root = card.querySelector('.chart-host');

    CONTROL.experiments.forEach(function (x) {
      var hasRef = !!x.ref;

      /* One row: label, optional reference value, then before -> after and a
         tag. `state` is 'changed' for the variable under test, 'held' for the
         one pinned, 'result' for an outcome row. */
      function line(label, refVal, pair, state, dp, tag) {
        var row = el('div', 'xp-line is-' + state);
        row.appendChild(el('div', 'xp-label', label));
        if (hasRef) {
          var rc = el('div', 'xp-ref');
          if (refVal != null) {
            // the key only shows when the column header is dropped on mobile
            rc.appendChild(el('span', 'xp-ref-k', x.ref.name));
            rc.appendChild(document.createTextNode(refVal.toFixed(dp)));
          }
          row.appendChild(rc);
        }
        row.appendChild(el('div', 'xp-a', pair[0] == null ? '' : pair[0].toFixed(dp)));
        var arrow = el('div', 'xp-arrow');
        if (pair[0] != null) arrow.innerHTML = '&rarr;';
        row.appendChild(arrow);
        row.appendChild(el('div', 'xp-b', pair[1] == null ? '' : pair[1].toFixed(dp)));
        row.appendChild(el('div', 'xp-tag', tag || ''));
        return row;
      }

      var box = el('div', 'xp');

      var head = el('div', 'xp-head');
      head.appendChild(el('span', 'xp-n', 'Experiment ' + x.n));
      head.appendChild(el('h4', null, x.data));
      head.appendChild(el('p', null, x.setup));
      box.appendChild(head);

      var grid = el('div', 'xp-grid' + (hasRef ? ' has-ref' : ''));

      var cols = el('div', 'xp-line is-cols');
      cols.appendChild(el('div', 'xp-label'));
      if (hasRef) cols.appendChild(el('div', 'xp-ref', x.ref.name));
      cols.appendChild(el('div', 'xp-a', x.from));
      cols.appendChild(el('div', 'xp-arrow'));
      cols.appendChild(el('div', 'xp-b', x.to));
      cols.appendChild(el('div', 'xp-tag'));
      grid.appendChild(cols);

      grid.appendChild(line('inter-batch similarity', hasRef ? x.ref.inter : null, x.inter,
        x.changed === 'inter' ? 'changed' : 'held', 3,
        x.changed === 'inter' ? 'changed' : 'held'));
      grid.appendChild(line('intra-batch similarity', hasRef ? x.ref.intra : null, x.intra,
        x.changed === 'intra' ? 'changed' : 'held', 3,
        x.changed === 'intra' ? 'changed' : 'held'));

      x.scores.forEach(function (sc, k) {
        var d = +(sc.v[1] - sc.v[0]).toFixed(1);
        var row = line(sc.name, hasRef ? x.ref.scores[k] : null, sc.v,
          'result' + (k === 0 ? ' is-first-result' : ''), 1,
          (d > 0 ? '+' : '\u2212') + Math.abs(d).toFixed(1));
        row.querySelector('.xp-tag').classList.add('is-delta', 'is-' + x.kind);
        grid.appendChild(row);
      });

      box.appendChild(grid);

      var out = el('div', 'xp-out is-' + x.kind);
      out.appendChild(el('span', 'xp-out-lbl', x.verdict));
      box.appendChild(out);

      box.setAttribute('aria-label',
        'Experiment ' + x.n + ' on ' + x.data + '. From ' + x.from + ' to ' + x.to +
        (hasRef ? ', with an ' + x.ref.name + ' reference alongside' : '') + '. ' +
        'Inter-batch similarity ' + x.inter[0].toFixed(3) + ' to ' + x.inter[1].toFixed(3) + ', ' +
        'intra-batch similarity ' + x.intra[0].toFixed(3) + ' to ' + x.intra[1].toFixed(3) + '. ' +
        x.scores.map(function (sc) {
          return sc.name + ' ' + sc.v[0].toFixed(1) + ' to ' + sc.v[1].toFixed(1);
        }).join('. ') + '. Verdict: ' + x.verdict + '.');

      root.appendChild(box);
    });

    var tableWrap = el('div', 'table-wrap table-view');
    tableWrap.hidden = true;
    root.appendChild(tableWrap);

    var table = el('table');
    var thead = el('thead');
    var htr = el('tr');
    ['Pretraining data', 'Training regime', '\u03bc intra', '\u03bc inter',
     'ViT-S IN-1K', 'ViT-S City', 'ViT-S ADE', 'ViT-B IN-1K', 'ViT-B City', 'ViT-B ADE']
      .forEach(function (h) { htr.appendChild(el('th', null, h)); });
    thead.appendChild(htr);
    table.appendChild(thead);
    var tbody = el('tbody');
    CONTROL.table.forEach(function (r) {
      var tr = el('tr', r.ref ? 'is-ref' : null);
      tr.appendChild(el('td', null, r.data));
      tr.appendChild(el('td', null, r.regime));
      tr.appendChild(el('td', null, r.intra.toFixed(3)));
      tr.appendChild(el('td', null, r.inter.toFixed(3)));
      ['s', 'b'].forEach(function (e) {
        ['in1k', 'city', 'ade'].forEach(function (mk) {
          var v = r[e][mk];
          tr.appendChild(el('td', null, v == null ? '\u2013' : v.toFixed(1)));
        });
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    return { table: tableWrap };
  }

  /* ------------------------------------------------------ WT++ stream bars */

  function StreamBars(root) {
    var maxH = Math.max.apply(null, STREAMS.map(function (s2) { return s2.hours; }));
    var wrap = el('div', 'streams');
    STREAMS.forEach(function (st) {
      var row = el('div', 'stream-row' + (st.id === 'wt12' ? ' is-default' : ''));
      var head = el('div', 'stream-head');
      head.appendChild(el('span', 'stream-name', st.name));
      head.appendChild(el('span', 'stream-meta', st.videos + (st.videos === 1 ? ' video' : ' videos')));
      row.appendChild(head);

      var track = el('div', 'stream-track');
      var lane = el('div', 'stream-lane');     // inset by the label gutter
      var fill = el('div', 'stream-fill');
      var pct = (st.hours / maxH) * 100;
      fill.style.width = pct + '%';
      lane.appendChild(fill);
      var hrs = el('span', 'stream-hours', st.hours.toFixed(1) + ' h');
      hrs.style.left = pct + '%';
      lane.appendChild(hrs);
      track.appendChild(lane);
      row.appendChild(track);

      row.appendChild(el('p', 'stream-note', st.note));
      row.setAttribute('aria-label', st.name + ': ' + st.videos + ' videos, ' + st.hours.toFixed(1) + ' hours, ' + st.note);
      wrap.appendChild(row);
    });
    root.appendChild(wrap);
  }

  /* ------------------------------------------------------------- domains -- */

  function DomainCharts(root, initial) {
    var metric = initial || 'city';
    var panels = [];
    var grid = el('div', 'domain-grid');

    DOMAINS.domains.forEach(function (d) {
      var panel = el('div', 'domain-panel');
      var head = el('div', 'domain-head');
      head.appendChild(el('h4', null, d.name));
      head.appendChild(el('p', null, d.blurb));
      var meta = el('p', 'domain-meta');
      meta.appendChild(el('strong', null, d.hours));
      meta.appendChild(document.createTextNode(' stream \u00b7 ' + d.fps));
      head.appendChild(meta);
      panel.appendChild(head);

      var chart = el('div', 'chart');
      var rowsWrap = el('div', 'chart-rows');
      chart.appendChild(rowsWrap);
      var tip = makeTooltip(chart);
      var nodes = {};

      d.rows.forEach(function (r) {
        var row = el('div', 'row is-' + r.kind);
        row.tabIndex = 0;
        row.appendChild(el('div', 'name', r.name));
        var track = el('div', 'bar-track');
        var wrap = el('div', 'bar-wrap');
        var bar = el('div', 'bar');
        var value = el('div', 'bar-value');
        wrap.appendChild(bar); wrap.appendChild(value);
        track.appendChild(wrap);
        row.appendChild(track);
        rowsWrap.appendChild(row);
        nodes[r.id] = { row: row, bar: bar, value: value };

        function show(ev) {
          var m = METRICS[metric];
          var s = std(r, metric);
          var b = (ev.currentTarget || row).getBoundingClientRect();
          tip.show(tipRows(d.name + ' · ' + r.name, [{
            color: r.kind === 'ours' ? '#eb6834' : (r.kind === 'ref' ? '#2a78d6' : '#898781'),
            value: fmt(val(r, metric), m.dp) + (s != null ? ' ± ' + s.toFixed(m.dp) : ''),
            name: m.label + ' ' + m.unit
          }]), b.left + b.width / 2, b.top);
        }
        row.addEventListener('pointerenter', show);
        row.addEventListener('focus', show);
        row.addEventListener('pointerleave', tip.hide);
        row.addEventListener('blur', tip.hide);
      });

      panel.appendChild(chart);
      grid.appendChild(panel);
      panels.push({ d: d, nodes: nodes });
    });

    root.appendChild(grid);

    var tableWrap = el('div', 'table-wrap table-view');
    tableWrap.hidden = true;
    root.appendChild(tableWrap);
    buildDomainTable(tableWrap);

    function draw() {
      var m = METRICS[metric];
      panels.forEach(function (p) {
        var maxV = Math.max.apply(null, p.d.rows.map(function (r) { return val(r, metric); })) * 1.06;
        p.d.rows.forEach(function (r) {
          var n = p.nodes[r.id];
          n.bar.style.width = ((val(r, metric) / maxV) * 100) + '%';
          n.value.style.left = ((val(r, metric) / maxV) * 100) + '%';
          n.value.textContent = fmt(val(r, metric), m.dp);
          n.row.setAttribute('aria-label', p.d.name + ' ' + r.name + ': ' + fmt(val(r, metric), m.dp) + ' ' + m.label);
        });
      });
      root.querySelectorAll('[data-metric-col]').forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-metric-col') === metric);
      });
    }
    draw();
    return { setMetric: function (mm) { metric = mm; draw(); }, table: tableWrap };
  }

  function buildDomainTable(wrap) {
    var table = el('table');
    var thead = el('thead');
    var htr = el('tr');
    htr.appendChild(el('th', null, 'Pretraining stream · method'));
    DOMAINS.metrics.forEach(function (mk) {
      var m = METRICS[mk];
      var th = el('th', null, m.label + ' ' + m.unit + ' ' + (m.higher ? '↑' : '↓'));
      th.setAttribute('data-metric-col', mk);
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);
    var tbody = el('tbody');
    DOMAINS.domains.forEach(function (d) {
      var gtr = el('tr', 'group-row');
      var gtd = el('td', null, d.name + ', ' + d.blurb + ', ' + d.hours + ' stream at ' + d.fps);
      gtd.colSpan = DOMAINS.metrics.length + 1;
      gtr.appendChild(gtd);
      tbody.appendChild(gtr);
      d.rows.forEach(function (r) {
        var tr = el('tr', r.kind === 'ours' ? 'is-ours' : (r.kind === 'ref' ? 'is-ref' : null));
        tr.appendChild(el('td', null, r.name));
        DOMAINS.metrics.forEach(function (mk) {
          var m = METRICS[mk];
          var td = el('td');
          td.setAttribute('data-metric-col', mk);
          td.appendChild(document.createTextNode(fmt(val(r, mk), m.dp)));
          var s = std(r, mk);
          if (s != null) td.appendChild(el('span', 'pm', ' ±' + s.toFixed(m.dp)));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  /* -------------------------------------------------------- control wiring */

  /**
   * Metric filter buttons. These are toggle buttons, not tabs (there is no
   * tabpanel), so they use aria-pressed. The selected *look* rides a class:
   * Chrome does not reliably restyle on an ARIA attribute change, so the
   * attribute alone would leave the wrong pill highlighted.
   */
  function wireMetricTabs(container, chart, metrics, noteNode) {
    var bar = container.querySelector('.segmented');
    if (!bar) return;
    var buttons = [];

    function select(mk, b) {
      buttons.forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      chart.setMetric(mk);
      if (noteNode) noteNode.textContent = METRICS[mk].note;
    }

    metrics.forEach(function (mk) {
      var b = el('button', null, METRICS[mk].label);
      b.type = 'button';
      b.addEventListener('click', function () { select(mk, b); });
      buttons.push(b);
      bar.appendChild(b);
    });

    bar.setAttribute('role', 'group');
    select(metrics[0], buttons[0]);
    return { select: function (i) { select(metrics[i], buttons[i]); } };
  }

  function wireTableToggle(container, chart) {
    var btn = container.querySelector('.js-table-toggle');
    if (!btn || !chart.table) return;
    btn.addEventListener('click', function () {
      var showing = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!showing));
      btn.classList.toggle('is-on', !showing);
      chart.table.hidden = showing;
      container.querySelectorAll('.chart, .domain-grid').forEach(function (c) { c.hidden = !showing; });
      btn.querySelector('.label').textContent = showing ? 'Table view' : 'Chart view';
    });
  }

  /* ------------------------------------------------- sliding-window demo -- */

  /**
   * The streaming protocol, animated as a conveyor.
   *
   * The window slides in from the left for the first few steps, then holds its
   * screen position while the film flows leftwards through it, the way you
   * would film someone walking. That makes the loop seamless and endless
   * without ever rewinding the stream: frame indices only ever increase, which
   * matters here, since replaying frames is exactly what the paper does not do.
   *
   * Mechanically, each tick does two things:
   *   1. recycle, fold the previous tick's track offset into the frame
   *      indices with transitions off. Every frame keeps its screen position,
   *      so this is invisible, and it keeps the numbers bounded.
   *   2. advance, move the window one stride along the track, and scroll the
   *      track by whatever keeps the window at its hold position.
   */
  function SlidingWindow(root) {
    var viewport = root.querySelector('.swin-viewport');
    var track    = root.querySelector('.swin-track');
    var win      = root.querySelector('.swin-window');
    var tag      = root.querySelector('.swin-window-tag');
    var readout  = root.querySelector('.swin-readout');
    var playBtn  = root.querySelector('.swin-play');
    var stepBtn  = root.querySelector('.swin-step');
    var bIn      = root.querySelector('.swin-b');
    var sIn      = root.querySelector('.swin-s');
    var bOut     = root.querySelector('.swin-b-out');
    var sOut     = root.querySelector('.swin-s-out');

    var GAP = 3, BUFFER = 10, TICK = 1500;
    // 64 real WT++London frames (every 4th, from frame 1000) packed into one
    // 8x8 sprite sheet, one request instead of 64.
    var SHEET = 'static/images/project/stream-frames.jpg';
    var SHEET_N = 64, SHEET_COLS = 8, SHEET_ROWS = 8, ASPECT = 9 / 16;
    var MAX_VISIBLE = 9;   // at most 9 on screen, so B = 8 always leaves one outside
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    var B = 4, S = 2;
    var cells = [], visibleN = 12, totalN = 22, pitch = 48;
    var base = 1;      // frame index shown in the leftmost track cell
    var start = 1;     // frame index of the window's first frame
    var step_ = 0;     // training step t
    var shift = 0;     // track offset, in cells
    var prev = null;   // previous batch range, for the repeated-frame shading
    var timer = null;

    var cellW = 60, cellH = 34;

    function build() {
      var vw = viewport.clientWidth || 720;
      visibleN = Math.max(5, Math.min(MAX_VISIBLE, Math.floor(vw / 105)));
      pitch = (vw + GAP) / visibleN;
      cellW = pitch - GAP;
      cellH = Math.round(cellW * ASPECT);        // keep 16:9 so frames are undistorted
      totalN = visibleN + BUFFER;

      // keep only the window element, rebuild the cells around it
      cells.forEach(function (c) { c.node.remove(); });
      cells = [];
      for (var i = 0; i < totalN; i++) {
        var c = el('div', 'swin-cell');
        c.style.width = cellW + 'px';
        c.style.left = (i * pitch) + 'px';

        var thumb = el('div', 'swin-thumb');
        thumb.style.height = cellH + 'px';
        thumb.style.backgroundImage = 'url("' + SHEET + '")';
        thumb.style.backgroundSize = (cellW * SHEET_COLS) + 'px ' + (cellH * SHEET_ROWS) + 'px';
        c.appendChild(thumb);

        // "x4" read as a 4x magnification, so the index is a real subscript
        var lbl = el('span', 'swin-cell-label');
        lbl.appendChild(el('span', 'swin-x', 'x'));
        var num = document.createElement('sub');
        lbl.appendChild(num);
        c.appendChild(lbl);

        track.appendChild(c);
        cells.push({ node: c, thumb: thumb, label: lbl, num: num });
      }
      track.style.width = (totalN * pitch - GAP) + 'px';
      track.style.height = (cellH + 19) + 'px';   // frame + its index label
    }

    /* The strip only ever shows 64 frames. Internally the counter stays
       monotonic, the conveyor's recycle step relies on that, and on 19 track
       cells no label can appear twice at once, so the wrap happens purely at
       display time. */
    function wrapIdx(g) { return ((g - 1) % SHEET_N) + 1; }

    function frameRange(g, n) {
      var a = wrapIdx(g), b = wrapIdx(g + n - 1);
      return a <= b
        ? a + '\u2013' + b
        : a + '\u2013' + SHEET_N + ' and 1\u2013' + b;
    }

    function holdCells() {
      // Where the window settles on screen. Higher = it slides for more steps
      // before the film starts flowing under it, which reads better; lower
      // keeps more upcoming frames in view. 0.6 balances the two.
      return Math.max(0, Math.min(visibleN - B, Math.round((visibleN - B) * 0.6)));
    }

    function paint(animate) {
      var pos = start - base;

      for (var i = 0; i < totalN; i++) {
        var g = base + i, c = cells[i];
        c.num.textContent = wrapIdx(g);

        // The 64 frames are a ring: new frames enter at the right edge, so the
        // seam where the sequence restarts scrolls in like an ordinary cut
        // rather than flashing the whole strip.
        var tile = (g - 1) % SHEET_N;
        c.thumb.style.backgroundPosition =
          (-(tile % SHEET_COLS) * cellW) + 'px ' + (-Math.floor(tile / SHEET_COLS) * cellH) + 'px';

        var inWin = g >= start && g < start + B;
        var repeated = prev && inWin && g >= prev[0] && g < prev[1];
        c.node.classList.toggle('is-in', !!inWin);
        c.node.classList.toggle('is-repeated', !!repeated);
        c.node.classList.toggle('is-past', g < start);
      }

      var noAnim = !animate || reduced.matches;
      track.classList.toggle('no-anim', noAnim);
      win.classList.toggle('no-anim', noAnim);

      track.style.transform = 'translateX(' + (-shift * pitch) + 'px)';
      win.style.transform = 'translateX(' + (pos * pitch - 3) + 'px)';
      win.style.width = (B * pitch - GAP + 6) + 'px';
      win.style.height = (cellH + 6) + 'px';

      if (noAnim) {
        void track.offsetWidth;
        track.classList.remove('no-anim');
        win.classList.remove('no-anim');
      }

      tag.textContent = 't = ' + step_;

      var overlap = Math.max(0, B - S);
      readout.textContent = '';
      readout.appendChild(el('span', 'swin-ro-strong',
        'Step ' + step_ + ' \u00b7 frames ' + frameRange(start, B)));
      readout.appendChild(document.createTextNode(
        ' \u00b7 advances by s = ' + S + ' \u00b7 ' + overlap + ' of ' + B + ' frames (' +
        Math.round((overlap / B) * 100) + '%) repeated from the previous batch'));

      track.setAttribute('aria-label',
        'A film strip of 64 walking-tour frames that repeats. At step ' + step_ +
        ' the batch is frames ' + frameRange(start, B) + ' of 64,' + ', overlapping the previous batch by ' +
        overlap + ' of ' + B + ' frames.');
    }

    /* Fold the current track offset into the frame indices. Each cell's label
       goes up by `shift` while the track slides right by the same amount, so
       nothing appears to move, it just stops the offsets growing forever. */
    function recycle() {
      if (shift <= 0) return;
      base += shift;
      shift = 0;
      paint(false);
    }

    function advance() {
      recycle();
      step_ += 1;
      prev = [start, start + B];
      start += S;
      shift = Math.max(0, (start - base) - holdCells());
      paint(true);
    }

    function reset(keepPlaying) {
      step_ = 0; start = 1; base = 1; shift = 0; prev = null;
      paint(false);
      if (keepPlaying) play();
    }

    function play() {
      if (timer) return;
      timer = setInterval(advance, TICK);
      playBtn.querySelector('.label').textContent = 'Pause';
      playBtn.querySelector('use').setAttribute('href', '#i-pause');
      playBtn.setAttribute('aria-label', 'Pause the animation');
    }

    function pause() {
      clearInterval(timer);
      timer = null;
      playBtn.querySelector('.label').textContent = 'Play';
      playBtn.querySelector('use').setAttribute('href', '#i-play');
      playBtn.setAttribute('aria-label', 'Play the animation');
    }

    function clampControls() {
      // Cap B so at least one frame is always visible outside the window , 
      // otherwise the batch fills the strip and the sliding stops reading.
      var bMax = Math.max(2, Math.min(8, visibleN - 1));
      bIn.max = String(bMax);
      if (B > bMax) { B = bMax; bIn.value = String(B); }

      sIn.max = String(B);              // a stride past B would skip frames
      if (S > B) { S = B; sIn.value = String(S); }

      bOut.textContent = B;
      sOut.textContent = S;
    }

    playBtn.addEventListener('click', function () {
      if (timer) { pause(); root.dataset.userPaused = '1'; }
      else { play(); delete root.dataset.userPaused; }
    });
    stepBtn.addEventListener('click', function () {
      pause();
      root.dataset.userPaused = '1';
      advance();
    });

    function onSlider() {
      var wasPlaying = !!timer;
      pause();
      B = +bIn.value;
      S = +sIn.value;
      clampControls();
      reset(wasPlaying);
    }
    bIn.addEventListener('input', onSlider);
    sIn.addEventListener('input', onSlider);

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { build(); clampControls(); paint(false); }, 150);
    });

    // Run only while on screen, and never override a deliberate pause.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !root.dataset.userPaused) play();
          else if (!e.isIntersecting) pause();
        });
      }, { threshold: 0.3 }).observe(root);
    }

    build();
    clampControls();
    reset(false);
    if (reduced.matches) { pause(); root.dataset.userPaused = '1'; }
    else play();
  }

  /* ------------------------------------------------------------ lightbox -- */

  function initLightbox() {
    var box = document.getElementById('lightbox');
    if (!box) return;
    var img = box.querySelector('img');
    var cap = box.querySelector('.lightbox-caption');
    var lastFocus = null;

    function open(src, alt, caption) {
      lastFocus = document.activeElement;
      img.src = src;
      img.alt = alt || '';
      cap.textContent = caption || '';
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      box.querySelector('.lightbox-close').focus();
    }
    function close() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      img.src = '';
      if (lastFocus) lastFocus.focus();
    }

    document.querySelectorAll('.fig-zoom').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var im = btn.querySelector('img');
        var fig = btn.closest('figure');
        var fc = fig ? fig.querySelector('figcaption') : null;
        open(im.getAttribute('src'), im.getAttribute('alt'), fc ? fc.textContent.trim() : '');
      });
    });

    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('.lightbox-close')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  }

  /* ----------------------------------------------------------------- nav -- */

  function initNav() {
    var nav = document.querySelector('.topnav');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('.topnav-links a'));
    var targets = links.map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    }).filter(Boolean);

    window.addEventListener('scroll', function () {
      nav.classList.toggle('is-stuck', window.scrollY > 8);
    }, { passive: true });

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* -------------------------------------------------------------- bibtex -- */

  /* ----------------------------------------------------------- city clips -- */

  /**
   * Ten short city loops. Nothing downloads until the mosaic is near the
   * viewport, and each clip only plays while it is actually on screen, so the
   * page does not run ten decoders at once. Under prefers-reduced-motion the
   * posters stand in and nothing is fetched at all.
   */
  function initCities() {
    var vids = Array.prototype.slice.call(document.querySelectorAll('.city-vid[data-src]'));
    if (!vids.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)) {
      return;                       // posters already render; leave it there
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src) v.src = v.dataset.src;
          var p = v.play();
          if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stands in */ });
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.15 });

    vids.forEach(function (v) { io.observe(v); });
  }

  /* The info marks have no text, so give each one its tooltip as an
     accessible name and a role screen readers will announce. */
  function initHints() {
    document.querySelectorAll('.hint[data-hint]').forEach(function (h) {
      h.setAttribute('role', 'note');
      h.setAttribute('aria-label', h.getAttribute('data-hint'));
    });
  }

  function initCopy() {
    var btn = document.querySelector('.copy-btn');
    var code = document.getElementById('bibtex-code');
    if (!btn || !code) return;
    btn.addEventListener('click', function () {
      var text = code.textContent;
      var done = function () {
        btn.classList.add('is-copied');
        btn.querySelector('.label').textContent = 'Copied';
        setTimeout(function () {
          btn.classList.remove('is-copied');
          btn.querySelector('.label').textContent = 'Copy';
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* no-op */ }
        document.body.removeChild(ta);
        done();
      }
    });
  }

  /* ----------------------------------------------------------------- boot */

  document.addEventListener('DOMContentLoaded', function () {
    var host;

    host = document.getElementById('chart-benchmark');
    if (host) {
      var c1 = BarChart(host.querySelector('.chart-host'), BENCHMARK);
      wireMetricTabs(host, c1, BENCHMARK.metrics, host.querySelector('.metric-note'));
      wireTableToggle(host, c1);
    }

    host = document.getElementById('chart-scaling');
    if (host) {
      var c2 = LineChart(host.querySelector('.chart-host'), SCALING);
      wireMetricTabs(host, c2, SCALING.metrics, host.querySelector('.metric-note'));
      wireTableToggle(host, c2);
    }

    host = document.getElementById('chart-encoder');
    if (host) {
      var c3 = BarChart(host.querySelector('.chart-host'), ENCODER, { initial: 'city' });
      var t3 = wireMetricTabs(host, c3, ENCODER.metrics, host.querySelector('.metric-note'));
      wireTableToggle(host, c3);
      t3.select(1);   // open on Cityscapes, where the streaming gap is widest
    }

    host = document.getElementById('chart-ablation');
    if (host) {
      var c4 = BarChart(host.querySelector('.chart-host'), ABLATION, { initial: 'city' });
      wireMetricTabs(host, c4, ABLATION.metrics, host.querySelector('.metric-note'));
      wireTableToggle(host, c4);
    }

    host = document.getElementById('chart-domains');
    if (host) {
      var c5 = DomainCharts(host.querySelector('.chart-host'), 'city');
      wireMetricTabs(host, c5, DOMAINS.metrics, host.querySelector('.metric-note'));
      wireTableToggle(host, c5);
    }

    host = document.getElementById('chart-longrun');
    if (host) {
      var c6 = BarChart(host.querySelector('.chart-host'), LONGRUN, { initial: 'city' });
      wireMetricTabs(host, c6, LONGRUN.metrics, host.querySelector('.metric-note'));
      wireTableToggle(host, c6);
    }

    host = document.getElementById('chart-control');
    if (host) {
      var c7 = ControlChart(host);
      wireTableToggle(host, c7);
    }

    host = document.getElementById('streams');
    if (host) StreamBars(host);

    host = document.getElementById('sliding-window');
    if (host) SlidingWindow(host);

    initLightbox();
    initNav();
    initCities();
    initHints();
    initCopy();
  });
})();
