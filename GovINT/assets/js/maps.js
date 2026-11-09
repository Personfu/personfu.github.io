/* FLLC // PERSONFU — Maps Module (Leaflet) */
(function () {
  'use strict';

  function initMap(containerId, opts) {
    opts = opts || {};
    var center = opts.center || [33.45, -112.07];
    var zoom = opts.zoom || 7;
    var map = L.map(containerId, { zoomControl: true }).setView(center, zoom);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &amp; CartoDB',
      maxZoom: 18
    }).addTo(map);
    return map;
  }

  function addMarkers(map, points) {
    points.forEach(function (p) {
      var color = p.color || '#cc0000';
      var icon = L.divIcon({
        className: '',
        html: '<svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="' + color + '" opacity=".85" stroke="#000" stroke-width="1"/></svg>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      var marker = L.marker([p.lat, p.lon], { icon: icon }).addTo(map);
      if (p.popup) marker.bindPopup(p.popup);
    });
  }

  function addLegend(map, entries) {
    var leg = L.control({ position: 'bottomright' });
    leg.onAdd = function () {
      var d = L.DomUtil.create('div', '');
      d.style.cssText = 'background:#111;padding:8px 10px;font-size:11px;color:#ccc;line-height:1.6;border:1px solid #333;border-radius:4px;font-family:JetBrains Mono,monospace';
      var html = '<b style="color:#cc0000">LEGEND</b><br>';
      entries.forEach(function (e) {
        html += '<span style="color:' + e.color + '">&#9679; ' + e.label + '</span><br>';
      });
      d.innerHTML = html;
      return d;
    };
    leg.addTo(map);
  }

  window.GovMaps = {
    initMap: initMap,
    addMarkers: addMarkers,
    addLegend: addLegend
  };
})();
