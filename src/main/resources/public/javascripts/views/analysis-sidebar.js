var Traffic = Traffic || {};
Traffic.views = Traffic.views || {};

(function(A, views, translator, C, dc) {

  views.AnalysisSidebar = Marionette.Layout.extend({

    template: Handlebars.getTemplate('app', 'sidebar-analysis'),

    events : {
      'change #week1ToList' : 'changeToWeek',
      'change #week2ToList' : 'changeToWeek',
      'change #week1FromList' : 'changeFromWeek',
      'change #week2FromList' : 'changeFromWeek',
      'change #confidenceInterval' : 'changeConfidenceInterval',
      'change #normalizeByTime' : 'changeNormalizeBy',
      'click #compare' : 'clickCompare'
    },

    resetRoute : function() {
      A.app.sidebarTabs.resetRoute();
    },

    getRoute : function() {
      A.app.sidebarTabs.getRoute();
    },

    initialize : function() {
      _.bindAll(this, 'updateTrafficTiles', 'addTrafficOverlay', 'update', 'changeFromWeek', 'changeToWeek', 'clickCompare', 'changeConfidenceInterval', 'changeNormalizeBy');
    },

    onClose : function() {
      A.app.map.off("moveend", A.app.sidebar.mapMove);
    },

    onShow : function() {

      var _this = this;

      A.app.map.on("moveend", A.app.sidebar.mapMove);

      this.$("#week1To").hide();
      this.$("#week2To").hide();
      this.$("#compareWeekSelector").hide();
      this.$("#percentChangeTitle1").hide();
      this.$("#percentChangeTitle2").hide();
      this.$("#percentChangeLegend").hide();


      $.getJSON('/weeks', function(data) {

        data.sort(function(a, b) {
          return a.weekId - b.weekId;
        });

        A.app.sidebar.weekList = data;

        _this.$("#week1FromList").empty();
        _this.$("#week1ToList").empty();

        _this.$("#week2FromList").empty();
        _this.$("#week2ToList").empty();

        _this.$("#week1FromList").append('<option value="-1">' + translator.translate("all_weeks") + '</option>');
        for(var i in A.app.sidebar.weekList) {
          var weekDate = new Date( data[i].weekStartTime);
          _this.$("#week1FromList").append('<option value="' + data[i].weekId + '">' + translator.translate("week_of") + ' ' + (weekDate.getUTCMonth() + 1) + '/' + weekDate.getUTCDate() + '/' + weekDate.getUTCFullYear() + '</option>');
        }

        _this.$("#week2FromList").empty();
        _this.$("#week2FromList").append('<option value="-1">' + translator.translate("all_weeks") + '</option>');
        for(var i in A.app.sidebar.weekList) {
          var weekDate = new Date( data[i].weekStartTime);
          _this.$("#week2FromList").append('<option value="' + data[i].weekId + '">' + translator.translate("week_of") + ' ' + (weekDate.getUTCMonth() + 1) + '/' + weekDate.getUTCDate() + '/' + weekDate.getUTCFullYear() + '</option>');
        }


      });

      this.changeFromWeek();

    },

    clickCompare : function() {

      A.app.sidebar.filterChanged = true;

      if(this.$("#compare").prop( "checked" )) {
        this.$("#compareWeekSelector").show();
        this.$("#percentChangeTitle1").show();
        this.$("#percentChangeTitle2").show();
        this.$("#percentChangeLegend").show();
        this.$("#speedLegend").hide();

        A.app.sidebar.percentChange = true;
      }
      else {
        this.$("#compareWeekSelector").hide();
        this.$("#percentChangeTitle1").hide();
        this.$("#percentChangeTitle2").hide();
        this.$("#percentChangeLegend").hide();
        this.$("#speedLegend").show();
        A.app.sidebar.percentChange = false;
      }

      this.update();
    },

    changeFromWeek : function() {

      A.app.sidebar.filterChanged = true;
      A.app.sidebar.hourExtent = false;
      A.app.sidebar.dayExtent = false;

      this.$("#week1To").hide();
      this.$("#week2To").hide();

      if(this.$("#week1FromList").val() > 0) {
        this.$("#week1ToList").empty();
        for(var i in A.app.sidebar.weekList) {
          if(A.app.sidebar.weekList[i].weekId >= this.$("#week1FromList").val()) {
            var weekDate = new Date( A.app.sidebar.weekList[i].weekStartTime);
            this.$("#week1ToList").append('<option value="' + A.app.sidebar.weekList[i].weekId + '">' + translator.translate("week_of") + ' ' + (weekDate.getUTCMonth() + 1) + '/' + weekDate.getUTCDate() + '/' + weekDate.getUTCFullYear() + '</option>');
          }
          this.$("#week1To").show();
        }
      }


      if(this.$("#week2FromList").val() > 0) {
        this.$("#week2ToList").empty();
        for(var i in A.app.sidebar.weekList) {
          if(A.app.sidebar.weekList[i].weekId >= this.$("#week2FromList").val()) {
            var weekDate = new Date( A.app.sidebar.weekList[i].weekStartTime);
            this.$("#week2ToList").append('<option value="' + A.app.sidebar.weekList[i].weekId + '">' + translator.translate("week_of") + ' ' + (weekDate.getUTCMonth() + 1) + '/' + weekDate.getUTCDate() + '/' + weekDate.getUTCFullYear() + '</option>');
          }
          this.$("#week2To").show();
        }
      }


      this.update();
    },

    changeToWeek : function() {

      A.app.sidebar.filterChanged = true;
      A.app.sidebar.hourExtent = false;
      A.app.sidebar.dayExtent = false;

      this.update();
    },

    changeNormalizeBy: function() {

      A.app.sidebar.filterChanged = true;
      this.update();
    },

    changeConfidenceInterval : function() {

      A.app.sidebar.filterChanged = true;
      this.update();
    },

    getWeek1List : function() {
      var wFrom = this.$("#week1FromList").val();

      var wList = new Array();

      if(wFrom == -1) {
        for(var i in A.app.sidebar.weekList) {
          wList.push(A.app.sidebar.weekList[i].weekId );
        }
      } else {
        var wTo = this.$("#week1ToList").val();
        for(var i in A.app.sidebar.weekList) {
          if(A.app.sidebar.weekList[i].weekId >= wFrom && A.app.sidebar.weekList[i].weekId <= wTo)
            wList.push(A.app.sidebar.weekList[i].weekId);
        }

      }

      return wList;
    },

    getWeek2List : function() {
      var wFrom = this.$("#week2FromList").val();

      var wList = new Array();

      if(wFrom == -1) {
        for(var i in A.app.sidebar.weekList) {
          wList.push(A.app.sidebar.weekList[i].weekId );
        }
      } else {
        var wTo = this.$("#week2ToList").val();
        for(var i in A.app.sidebar.weekList) {
          if(A.app.sidebar.weekList[i].weekId >= wFrom && A.app.sidebar.weekList[i].weekId <= wTo)
            wList.push(A.app.sidebar.weekList[i].weekId);
        }

      }

      return wList;
    },

    mapMove : function() {
      A.app.sidebar.filterChanged = false;
      A.app.sidebar.update();
    },

    update : function() {

      var _this = this;

      var bounds = A.app.map.getBounds();
      var x1 = bounds.getWest();
      var x2 = bounds.getEast();
      var y1 = bounds.getNorth();
      var y2 = bounds.getSouth();

      var confidenceInterval = this.$("#confidenceInterval").val();
      var normalizeByTime = this.$("#normalizeByTime").val();

      var url = '/weeklyStats?confidenceInterval=' + confidenceInterval + '&normalizeByTime=' + normalizeByTime + '&x1=' + x1 + '&x2=' + x2 + '&y1=' + y1 + '&y2=' + y2;

      var w1List = this.getWeek1List();
      var w2List = this.getWeek2List();

      url += "&w1=" + w1List.join(",");

      if(this.$("#compare").prop( "checked" )) {
        if (w2List && w2List.length > 0)
          url += '&w2=' + w2List.join(",");
      }

      $.getJSON(url, function(chartData){
        A.app.sidebar.loadChartData(chartData)
      });
    },

    loadChartData : function(data) {

      data.hours.forEach(function (d) {
        d.hourOfDay = (d.h % 24) + 1;
        d.dayOfWeek = ((d.h - d.hourOfDay) / 24) + 1;
        d.s = d.s * 3.6; // convert from m/s km/h
      });

      if(!this.chartData) {
        this.chartData = C(data.hours);

        this.dayCount = this.chartData.dimension(function (d) {
          return d.dayOfWeek;       // add the magnitude dimension
        });

        this.dayCountGroup = this.dayCount.group().reduce(
          /* callback for when data is added to the current filter results */
          function (p, v) {
            p.count += v.c;
            p.sum += v.s;
            if(p.count > 0)
              p.avg = (p.sum / p.count);
            else
              p.avg = 0;
            return p;
          },
          /* callback for when data is removed from the current filter results */
          function (p, v) {
            p.count -= v.c;
            p.sum -= v.s;
            if(p.count > 0)
              p.avg = (p.sum / p.count);
            else
              p.avg = 0;
            return p;
          },
          /* initialize p */
          function () {
            return {
              count: 0,
              sum: 0,
              avg: 0
            };
          }
        );

        this.hourCount = this.chartData.dimension(function (d) {
          return d.hourOfDay;       // add the magnitude dimension
        });

        this.hourCountGroup = this.hourCount.group().reduce(
          /* callback for when data is added to the current filter results */
          function (p, v) {
            p.count += v.c;
            p.sum += v.s;
            if(p.count > 0)
              p.avg = (p.sum / p.count);
            else
              p.avg = 0;
            return p;
          },
          /* callback for when data is removed from the current filter results */
          function (p, v) {
            p.count -= v.c;
            p.sum -= v.s;
            if(p.count > 0)
              p.avg = (p.sum / p.count);
            else
              p.avg = 0;

            return p;
          },
          /* initialize p */
          function () {
            return {
              count: 0,
              sum: 0,
              avg: 0
            };
          }
        );

        var dayLabel = new Array();
        dayLabel[1] = translator.translate("mon");
        dayLabel[2] = translator.translate("tue");
        dayLabel[3] = translator.translate("wed");
        dayLabel[4] = translator.translate("thu");
        dayLabel[5] = translator.translate("fri");
        dayLabel[6] = translator.translate("sat");
        dayLabel[7] = translator.translate("sun");

        this.dailyChart = dc.barChart("#dailyChart");

        if(this.$("#compare").prop( "checked" ))
          A.app.sidebar.percentChange = true;
        else
          A.app.sidebar.percentChange = false;

        this.dailyChart.width(430)
          .height(75)
          .margins({top: 5, right: 10, bottom: 20, left: 40})
          .dimension(this.dayCount)
          .group(this.dayCountGroup)
          .transitionDuration(0)
          .centerBar(true)
          .valueAccessor(function (p) {
            return p.value.avg;
          })
          .gap(10)
          .x(d3.scale.linear().domain([0.5, 7.5]))
          .renderHorizontalGridLines(true)
          .elasticY(true)
          .xAxis().tickFormat(function (d) {
            return dayLabel[d]
          });

        this.dailyChart.yAxis().ticks(4);


        this.dailyChart.yAxis().tickFormat(function (d) {
          if(A.app.sidebar.percentChange)
            return Math.round(d * 100) + "%"
          else
            return d;
        });

        this.dailyChart.brush().on("brushend.custom", A.app.sidebar.updateTrafficTiles);

        this.hourlyChart = dc.barChart("#hourlyChart");

        this.hourlyChart.width(430)
          .height(100)
          .margins({top: 5, right: 10, bottom: 20, left: 40})
          .dimension(this.hourCount)
          .group(this.hourCountGroup)
          .transitionDuration(0)
          .centerBar(true)
          .valueAccessor(function (p) {
            return p.value.avg;
          })
          .gap(5)
          .x(d3.scale.linear().domain([0.5, 24.5]))
          .renderHorizontalGridLines(true)
          .elasticY(true)
          .xAxis().tickFormat();

        this.hourlyChart.yAxis().ticks(6);

        this.hourlyChart.yAxis().tickFormat(function (d) {
          if(A.app.sidebar.percentChange)
            return Math.round(d * 100) + "%"
          else
            return d;
        });

        this.hourlyChart.brush().on("brushend.custom", A.app.sidebar.updateTrafficTiles);

      }
      else {

        this.hourlyChart.filterAll();
        this.dailyChart.filterAll();
        this.chartData.remove();


        this.chartData.add(data.hours);

        if(A.app.sidebar.hourExtent && ( A.app.sidebar.hourExtent[0] >= 1.0 ||  A.app.sidebar.hourExtent[1] >= 1.0)) {
          this.hourlyChart.filter(dc.filters.RangedFilter(A.app.sidebar.hourExtent[0], A.app.sidebar.hourExtent[1]));
        }
        if(A.app.sidebar.dayExtent && ( A.app.sidebar.dayExtent[0] >= 1.0 ||  A.app.sidebar.dayExtent[1] >= 1.0)) {
          this.dailyChart.filter(dc.filters.RangedFilter(A.app.sidebar.dayExtent[0], A.app.sidebar.dayExtent[1]));
        }

        this.hourlyChart.brush().on("brushend.custom", A.app.sidebar.updateTrafficTiles);
        this.dailyChart.brush().on("brushend.custom", A.app.sidebar.updateTrafficTiles);
      }



      dc.renderAll();

      this.addTrafficOverlay();
    },

    addTrafficOverlay : function(hours) {

      if(!A.app.sidebar.filterChanged)
        return;

      if(A.app.segmentOverlay && A.app.map.hasLayer(A.app.segmentOverlay))
        A.app.map.removeLayer(A.app.segmentOverlay);

      var hoursStr;

      if(hours && hours.length > 0)
        hoursStr = hours.join(",");

      var w1List = A.app.sidebar.getWeek1List();
      var w2List = A.app.sidebar.getWeek2List();

      var confidenceInterval = this.$("#confidenceInterval").val();
      var normalizeByTime = this.$("#normalizeByTime").val();

      var url = '/tile/traffic?z={z}&x={x}&y={y}&confidenceInterval=' + confidenceInterval + '&normalizeByTime=' + normalizeByTime;

      if(hoursStr)
        url += '&h=' + hoursStr;

      if(w1List && w1List.length > 0)
        url += '&w1=' + w1List.join(",");

      if(this.$("#compare").prop( "checked" )) {
        if (w2List && w2List.length > 0)
          url += '&w2=' + w2List.join(",");
      }

      A.app.segmentOverlay = L.tileLayer(url).addTo(A.app.map).bringToFront();
    },

    updateTrafficTiles : function() {

      A.app.sidebar.filterChanged = true;

      A.app.sidebar.hourExtent = A.app.sidebar.hourlyChart.brush().extent();
      A.app.sidebar.dayExtent = A.app.sidebar.dailyChart.brush().extent();

      var minHour, maxHour, minDay, maxDay;

      if(A.app.sidebar.hourExtent[0] < 1 && A.app.sidebar.hourExtent[1] < 1) {
        minHour = 1
        maxHour = 24;
      }
      else {
        minHour = Math.ceil(A.app.sidebar.hourExtent[0]);
        maxHour = Math.floor(A.app.sidebar.hourExtent[1]);
      }

      if(A.app.sidebar.dayExtent[0] < 1 && A.app.sidebar.dayExtent[1] < 1) {
        minDay = 1
        maxDay = 7;
      }
      else {
        minDay = Math.ceil(A.app.sidebar.dayExtent[0]);
        maxDay = Math.floor(A.app.sidebar.dayExtent[1]);
      }

      var hours = new Array();

      for(d = minDay; d <= maxDay; d++) {
        for(h = minHour; h <= maxHour; h++) {
          hours.push(h + (24 * (d -1)));
        }
      }

      A.app.sidebar.addTrafficOverlay(hours);
    },

    onRender : function () {
      this.$("#journeyInfo").hide();
    }
  });
})(Traffic, Traffic.views, Traffic.translations, crossfilter, dc);