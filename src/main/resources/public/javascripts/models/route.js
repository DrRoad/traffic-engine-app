var Traffic = Traffic || {};

Traffic.models = Traffic.models || {};

Traffic.models.RouteModel = Backbone.Model.extend({

  defaults: {
    name: '',
    date: '',
    json: ''
  }

});