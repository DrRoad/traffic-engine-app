var Traffic = Traffic || {};
(function(A, translator) {
  A.MapWrapper = {

    LMmap: null, // Leaflet map object

    ENGLISH_TILE_LAYER: L.tileLayer('https://a.tiles.mapbox.com/v4/xdliu.ec1c6353/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoieGRsaXUiLCJhIjoiY2lpamVzdGxwMDExN3ZqbTVuOHMwaGVyYyJ9.P_agsd7B_e22deT1QRhiBQ', {
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://mapbox.com">Mapbox</a>',
          maxZoom: 17,
          zIndex: 0
        }),
    LOCALIZED_TILE_LAYER: L.tileLayer('https://a.tiles.mapbox.com/v4/conveyal.gepida3i/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiY29udmV5YWwiLCJhIjoiMDliQURXOCJ9.9JWPsqJY7dGIdX777An7Pw', {
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://mapbox.com">Mapbox</a>',
          maxZoom: 17,
          zIndex: 0
        }),

    init:function(mapId, options) {
      options = options || {};
      options.zoomControl = false; // will call this.addZoomControl() to add it in order to support multi-locale control tooltip

      this.LMmap = L.map(mapId, options);

      this.addZoomControl();
      this.addScalebar();
      this.addLayersControl();
    },

    addScalebar: function() {
      if(this.LMmap) {
        L.control.scale().addTo(this.LMmap);
      }
    },

    addZoomControl: function() {
      if(this.LMmap) {
        new L.Control.Zoom({
          zoomInTitle: translator.translate('zoom_in'),
          zoomOutTitle: translator.translate('zoom_out')
        }).addTo(this.LMmap)
      }
    },

    addLayersControl: function() {
      var baseMaps = {};
      baseMaps[translator.translate('english_basemap')] = this.ENGLISH_TILE_LAYER.addTo(this.LMmap);
      baseMaps[translator.translate('international_basemap')] = this.LOCALIZED_TILE_LAYER;

      if(this.LMmap) {
        L.control.layers(baseMaps,{}).addTo(this.LMmap);

        //This is to set basemap at the bottom so to let later added layers visible
        this.LMmap.on('baselayerchange', function(evt){
          var layer = evt.layer;
          layer.bringToBack();
        });
      }
    }
  };
})(Traffic, Traffic.translations);