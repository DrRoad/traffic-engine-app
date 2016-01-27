var Traffic = Traffic || {};
Traffic.views = Traffic.views || {};

(function(A, views, translator) {

  views.SidebarTabs = Marionette.Layout.extend({

    template: Handlebars.getTemplate('app', 'sidebar-tabs'),

    events : {
      'click #data' : 'clickData',
      'click #routing' : 'clickRouting',
      'click #analysis' : 'clickAnalysis',
      'click #localeItem' : 'selectLocale'
    },

    initialize : function() {
      var _this = this;

      _.bindAll(this, 'onMapClick', 'clickAnalysis', 'selectLocale');
    },

    onRender : function() {

      var _this = this;

      if(translator) {
        this.$("#localeList").empty();

        var locales = translator.getAvailableLocales() || {};

        _.each(locales, function(name, locale) {
          _this.$("#localeList").append('<li><a href="#" id="localeItem" data-locale="' + locale + '">' + name + '</a></li>');
        });

        var currentLocale = locales[translator.getLocale()] || "";
        this.$('#localeLabel').text(currentLocale);
      }
    },

    mapMove: function() {
      if(A.app.sidebar) {
        A.app.sidebar.filterChanged = false;
        A.app.sidebar.update();
      }
    },

    selectLocale : function(evt) {
      var locale = $(evt.target).data('locale');
      if(translator) {
        translator.setLocale(locale);
        window.location.reload();
      }
    },

    clickData: function(evt) {
      this.endRouting();

      A.app.sidebar = new views.DataSidebar();
      A.app.instance.sidebar.show(A.app.sidebar);

      this.$("li").removeClass("active");
      this.$("#data").addClass("active");

      if(A.app.map.hasLayer(A.app.segmentOverlay))
        A.app.map.removeLayer(A.app.segmentOverlay);

      A.app.dataOverlay = L.tileLayer('/tile/data?z={z}&x={x}&y={y}').addTo(A.app.map).bringToFront();
    },

    clickRouting: function(evt) {
      this.startRouting();

      A.app.sidebar = new views.RoutingSidebar();
      A.app.instance.sidebar.show(A.app.sidebar);

      this.$("li").removeClass("active");
      this.$("#routing").addClass("active");

      if(A.app.map.hasLayer(A.app.dataOverlay))
        A.app.map.removeLayer(A.app.dataOverlay);

      if(A.app.map.hasLayer(A.app.segmentOverlay))
        A.app.map.removeLayer(A.app.segmentOverlay);

      if(A.app.map.hasLayer(A.app.pathOverlay))
        A.app.map.removeLayer(A.app.pathOverlay);
    },

    clickAnalysis: function(evt) {
      A.app.sidebar = new views.AnalysisSidebar();
      A.app.instance.sidebar.show(A.app.sidebar);

      this.endRouting();

      this.$("li").removeClass("active");
      this.$("#analysis").addClass("active");

      if(A.app.map.hasLayer(A.app.dataOverlay))
        A.app.map.removeLayer(A.app.dataOverlay);

      A.app.sidebar.addTrafficOverlay()
    },

    resetRoute : function() {

      if(A.app.sidebar) {
        A.app.sidebar.$("#clickInfo").show();
        A.app.sidebar.$("#routeData").hide();
      }

      this.routePoints = [];
      if(this.routePointsLayer) {
        A.app.map.removeLayer(this.routePointsLayer);
      }

      if(A.app.map.hasLayer(A.app.pathOverlay))
        A.app.map.removeLayer(A.app.pathOverlay);

    },

    startRouting : function() {
      A.app.map.on("click", this.onMapClick);
      this.resetRoute();
    },

    endRouting : function() {
      A.app.map.off("click", this.onMapClick);
      this.resetRoute();
    },

    initializeRoutePoints: function() {
      if(!this.routePoints) {
        this.routePoints = [];
      }

      if(!this.routePointsLayer) {
        this.routePointsLayer = L.featureGroup([]).addTo(A.app.map);
        var _this = this;
        this.routePointsLayer.on('click', function(evt) {
          var layer = evt.layer;
          var layerLatlng = layer.getLatLng();

          this.removeLayer(layer);
          for(var i=0, pointCount=_this.routePoints.length; i<pointCount; i++) {
            var point = _this.routePoints[i];
            if(point.lat == layerLatlng.lat && point.lng == layerLatlng.lng) {
              _this.routePoints.splice(i, 1);
              break;
            }
          }
          var layers = this.getLayers();
          if(layers.length > 0) {
            layers[0].setStyle({fillColor: '#0D0'});
            if(layers.length > 1) {
              layers[layers.length -1].setStyle({fillColor: '#D00'});
            }
          }
          _this.getRoute();
        });
      }
    },

    onMapClick : function(evt) {
      this.initializeRoutePoints();

      this.routePoints.push({
        lat: evt.latlng.lat,
        lng: evt.latlng.lng
      });

      if(this.routePoints.length == 1) {
        this.routePointsLayer.addLayer(L.circleMarker(evt.latlng, {fillColor: "#0D0", color: '#fff', fillOpacity: 1.0,opacity: 1.0, radius: 5}).addTo(A.app.map));
      }
      else {
        var existingLayers = this.routePointsLayer.getLayers();
        if(existingLayers.length > 1) {
          existingLayers[existingLayers.length -1].setStyle({fillColor: '#00D'});
        }

        this.routePointsLayer.addLayer(L.circleMarker(evt.latlng, {fillColor: "#D00", color: '#fff', fillOpacity: 1.0,opacity: 1.0, radius: 5}).addTo(A.app.map));
        this.getRoute();
        $('#routeButtons').show();
      }

    },

    getRoute : function(hours) {

      if(A.app.map.hasLayer(A.app.pathOverlay))
        A.app.map.removeLayer(A.app.pathOverlay);

      var routePoints = this.routePoints;
      if(!routePoints || routePoints.length < 2)
        return;

      var startLatLng = routePoints[0];
      var endLatLng = routePoints[routePoints.length - 1];

      var hoursStr;

      if(hours && hours.length > 0)
        hoursStr = hours.join(",");

      var w1List = A.app.sidebar.getWeek1List();
      var w2List = A.app.sidebar.getWeek2List();

      var confidenceInterval = this.$("#confidenceInterval").val();
      var normalizeByTime = this.$("#normalizeByTime").val();

      var url = '/route?fromLat=' + startLatLng.lat + '&fromLon=' + startLatLng.lng + '&toLat=' + endLatLng.lat + '&toLon=' + endLatLng.lng;

      if(hoursStr)
        url += '&h=' + hoursStr;

      if(w1List && w1List.length > 0)
        url += '&w1=' + w1List.join(",");

      if(this.$("#compare").prop( "checked" )) {
        if (w2List && w2List.length > 0)
          url += '&w2=' + w2List.join(",");
      }

      $.getJSON(url, function(data){

        var distance = 0;
        var time = 0;

        var lines = new Array();
        var insufficientDataWarning = translator.translate('insufficient_data_warning');
        var inferredDataNotification = translator.translate('inferred_data_notification');
        var routeInfoTemplate = Handlebars.getTemplate('app', 'route-popup');
        for(i in data.pathEdges) {
          var edge = data.pathEdges[i];

                    var polyLine = L.Polyline.fromEncoded(edge.geometry);
                    polyLine = L.polyline(polyLine.getLatLngs(), {opacity: 1.0, color: edge.color});

                    var segmentPopupContent = insufficientDataWarning;
                    if(!isNaN(edge.length) && !isNaN(edge.speed && edge.stdDev)){
                      segmentPopupContent = routeInfoTemplate({
                        segment_length: new Number(edge.length).toFixed(2),
                        segment_speed: new Number(edge.speed).toFixed(2),
                        segment_std_dev: new Number(edge.stdDev).toFixed(2)
                      });
                      if(edge.inferred == true){
                          segmentPopupContent = inferredDataNotification + " " + segmentPopupContent;
                      }
                    }
                    polyLine.bindPopup(segmentPopupContent);

                    polyLine.on('mouseover', function(e) {
                        e.target.openPopup();
                    });

                    polyLine.on('mouseout', function(e) {
                        e.target.closePopup();
                    });

                    lines.push(polyLine);

          if(edge.speed > 0 && edge.length > 0) {
            distance += edge.length;
            time += edge.length * (1 /edge.speed);
          }
        }

        A.app.pathOverlay = L.featureGroup(lines);

        A.app.pathOverlay.addTo(A.app.map);

        A.app.sidebar.$("#clickInfo").hide();
        A.app.sidebar.$("#journeyInfo").show();

        var seconds = time % 60;
        var minutes = time / 60;

        var speed =  (distance / time) * 3.6;

        A.app.sidebar.$("#travelTime").text(Math.round(minutes) + "m " + Math.round(seconds) + "s");
        A.app.sidebar.$("#avgSpeed").text(speed.toPrecision(2) + "km");

        A.app.sidebar.loadChartData(data.weeklyStats);

        A.app.sidebar.$("#clickInfo").hide();
        A.app.sidebar.$("#routeData").show();

      });
    }
  });
})(Traffic, Traffic.views, Traffic.translations);