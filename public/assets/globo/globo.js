(function () {
  function buildMap(rootId, options) {
    var root = am5.Root.new(rootId);
    if (root._logo) root._logo.set("forceHidden", true);
    root.setThemes([am5themes_Animated.new(root)]);

    var chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: options.projection,
        panX: options.panX,
        panY: options.panY,
        wheelY: "none"
      })
    );

    chart.setAll({
      rotationX: options.rotationX || 0,
      rotationY: options.rotationY || 0,
      homeZoomLevel: options.homeZoomLevel || 1,
      homeGeoPoint: options.homeGeoPoint || { longitude: 0, latitude: 0 }
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
      strokeOpacity: 0.08
    });

    var pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
    options.data.forEach(function (item) {
      pointSeries.data.push({
        geometry: { type: "Point", coordinates: [item.lng, item.lat] },
        city: item.city,
        country: item.country
      });
    });

    pointSeries.bullets.push(function () {
      var container = am5.Container.new(root, { cursorOverStyle: "pointer" });
      var pulse = container.children.push(
        am5.Circle.new(root, {
          radius: options.pulseSize || 3,
          fill: am5.color(0xf69220),
          fillOpacity: 0.24,
          strokeOpacity: 0
        })
      );
      var dot = container.children.push(
        am5.Circle.new(root, {
          radius: options.dotSize || 2,
          fill: am5.color(0xf69220),
          tooltipText: "{city}, {country}"
        })
      );

      pulse.animate({
        key: "scale",
        from: 1,
        to: 4,
        duration: 1400,
        loops: Infinity,
        easing: am5.ease.out(am5.ease.cubic)
      });
      pulse.animate({
        key: "opacity",
        from: 0.7,
        to: 0,
        duration: 1400,
        loops: Infinity,
        easing: am5.ease.out(am5.ease.cubic)
      });

      return am5.Bullet.new(root, { sprite: container });
    });

    if (options.autoSpin) {
      var spin = chart.animate({
        key: "rotationX",
        from: chart.get("rotationX"),
        to: chart.get("rotationX") + 360,
        duration: 42000,
        loops: Infinity
      });
      var el = document.getElementById(rootId);
      if (el) {
        el.addEventListener("mouseenter", function () { spin.pause(); });
        el.addEventListener("mouseleave", function () { spin.play(); });
      }
    }

    if (options.fillBounds) {
      var fitToWidth = function () {
        chart.zoomToGeoBounds(options.fillBounds, 0);
      };

      polygonSeries.events.on("datavalidated", fitToWidth);

      var resizeTimer = null;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(fitToWidth, 120);
      });
    }

    return root;
  }

  function initCasGlobe() {
    if (!window.am5 || !window.am5map || !window.am5geodata_worldLow) return;
    if (!Array.isArray(window.casGlobeCities)) return;

    var btnGlobo = document.getElementById("showglobo");
    var btnMap = document.getElementById("showmap");
    var btnMap2 = document.getElementById("showmap2");
    var paneGlobo = document.getElementById("chartdivglobo");
    var paneMap = document.getElementById("chartdivmap");
    var paneMap2 = document.getElementById("chartdivmap2");
    if (!btnGlobo || !btnMap || !btnMap2 || !paneGlobo || !paneMap || !paneMap2) return;

    // Disponer roots de instancias anteriores (View Transitions re-ejecuta el script)
    if (window._casGlobeRoots) {
      ["globo", "map", "map2"].forEach(function (k) {
        if (window._casGlobeRoots[k]) {
          try { window._casGlobeRoots[k].dispose(); } catch (e) {}
        }
      });
    }

    var roots = window._casGlobeRoots = {
      globo: null,
      map: null,
      map2: null
    };

    var businessCities = window.casGlobeCities.filter(function (item) {
      return ["Buenos Aires", "Mexico City", "Madrid", "Miami"].indexOf(item.city) !== -1;
    });

    function ensureView(view) {
      if (view === "globo" && !roots.globo) {
        roots.globo = buildMap("chartdivglobo", {
          projection: am5map.geoOrthographic(),
          panX: "rotateX",
          panY: "rotateY",
          rotationX: -130,
          rotationY: -20,
          autoSpin: true,
          data: window.casGlobeCities
        });
      }
      if (view === "map" && !roots.map) {
        roots.map = buildMap("chartdivmap", {
          projection: am5map.geoMercator(),
          panX: "translateX",
          panY: "translateY",
          fillBounds: { left: -35, right: 15, top: 70, bottom: -52 },
          dotSize: 2.4,
          pulseSize: 3.2,
          data: window.casGlobeCities
        });
      }
      if (view === "map2" && !roots.map2) {
        roots.map2 = buildMap("chartdivmap2", {
          projection: am5map.geoMercator(),
          panX: "translateX",
          panY: "translateY",
          fillBounds: { left: -35, right: 15, top: 70, bottom: -52 },
          dotSize: 3,
          pulseSize: 4,
          data: businessCities
        });
      }
    }

    function showView(view) {
      paneGlobo.classList.toggle("hidden", view !== "globo");
      paneMap.classList.toggle("hidden", view !== "map");
      paneMap2.classList.toggle("hidden", view !== "map2");

      btnGlobo.classList.toggle("active", view === "globo");
      btnMap.classList.toggle("active", view === "map");
      btnMap2.classList.toggle("active", view === "map2");

      ensureView(view);
    }

    btnGlobo.addEventListener("click", function () { showView("globo"); });
    btnMap.addEventListener("click", function () { showView("map"); });
    btnMap2.addEventListener("click", function () { showView("map2"); });

    showView("globo");
  }

  // Exponer para que el loader lazy pueda llamarla después de cargar los scripts
  window.initCasGlobe = initCasGlobe;

  // astro:page-load dispara en carga inicial y en cada navegación con View Transitions
  document.addEventListener("astro:page-load", initCasGlobe);
})();
