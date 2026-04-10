(function () {
  function initOfficeMap() {
    var mount = document.getElementById("office-map");
    if (!mount) return;
    if (!window.am5 || !window.am5map || !window.am5geodata_worldLow) return;

    var office = {
      lat: -34.5523,
      lng: -58.5051,
      title: "CAS (Contenidos Advertising SA)",
      address: "Esteban Echeverria 760, B1603 Villa Martelli, Provincia de Buenos Aires"
    };

    var root = am5.Root.new("office-map");
    if (root._logo) root._logo.set("forceHidden", true);
    root.setThemes([am5themes_Animated.new(root)]);

    var chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: am5map.geoMercator(),
        panX: "none",
        panY: "none",
        wheelY: "none",
        wheelX: "none"
      })
    );

    chart.setAll({
      homeZoomLevel: 260,
      homeGeoPoint: { latitude: office.lat, longitude: office.lng }
    });

    var backgroundSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
    backgroundSeries.mapPolygons.template.setAll({
      fill: am5.color(0x0e0e0e),
      fillOpacity: 1,
      strokeOpacity: 0
    });
    backgroundSeries.data.push({
      geometry: am5map.getGeoRectangle(90, 180, -90, -180)
    });

    var polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, { geoJSON: am5geodata_worldLow })
    );
    polygonSeries.mapPolygons.template.setAll({
      fill: am5.color(0x1f1f1f),
      stroke: am5.color(0x3f3f3f),
      strokeWidth: 0.6
    });

    var gridSeries = chart.series.push(am5map.GraticuleSeries.new(root, { step: 10 }));
    gridSeries.mapLines.template.setAll({
      stroke: am5.color(0xf69220),
      strokeOpacity: 0.09
    });

    var pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
    pointSeries.data.push({
      geometry: { type: "Point", coordinates: [office.lng, office.lat] },
      title: office.title,
      address: office.address
    });

    pointSeries.bullets.push(function () {
      var container = am5.Container.new(root, {});

      var pulse = container.children.push(
        am5.Circle.new(root, {
          radius: 10,
          fill: am5.color(0xf69220),
          fillOpacity: 0.2,
          strokeOpacity: 0
        })
      );
      pulse.animate({
        key: "scale",
        from: 1,
        to: 3,
        duration: 1300,
        loops: Infinity
      });
      pulse.animate({
        key: "opacity",
        from: 0.6,
        to: 0,
        duration: 1300,
        loops: Infinity
      });

      container.children.push(
        am5.Circle.new(root, {
          radius: 7,
          fill: am5.color(0xf69220),
          tooltipText: "{title}\n{address}"
        })
      );

      return am5.Bullet.new(root, { sprite: container });
    });
  }

  document.addEventListener("DOMContentLoaded", initOfficeMap);
})();
