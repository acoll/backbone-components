var logger = require('loginator')('backbone-components');

var components = {};

module.exports = {
	components: components,
	register: function (name, Component) {
		if(name.indexOf('-component') > 0) throw new Error('-component is already appended to the end of the name you pass in.');

		name = name + '-component';

		if(components[name]) {
			logger.warn('Skipping `' + name + '` It is already registered.');
		}
		components[name] = Component;
		logger.info('`' + name + '` registered');
	},
	init: function (Backbone) {

		logger.info('Initializing with Backbone instance:', Backbone);

		var orig = Backbone.View;
		Backbone.View = Backbone.View.extend({
			constructor: function () {
				// logger.debug('Applying custom component logic to View', this);
				orig.apply(this, arguments);

				this.on('render', function () {
					var model = this.model;
					var _this = this;
					this.$el.find('*').each(function(index, el) {

						// skip if already initialized by lower component
						if(el.attributes.getNamedItem('__owner-view') && el.attributes.getNamedItem('__view').value) {
							return;
						}

						var componentClass = components[el.tagName.toLowerCase()];

						if(componentClass) {
							var opts = {el: el};

							for(var i = 0; i < el.attributes.length; i++) {
								var attrib = el.attributes[i];
								if(attrib.value.indexOf('$') === 0) 
									opts[attrib.name] = getValue(model, attrib.value, el, _this);
							 	else 
							 		opts[attrib.name] = attrib.value;
							}

							logger.info('Creating component:', el.tagName.toLowerCase(), 'with opts', opts, 'for view:', _this.cid);
							var comp = new componentClass(opts);
							try {
								el.setAttribute('__owner-view', _this.cid);
								if(comp.render) comp.render();
							} catch(err) {
								logger.error('Error rendering', el, err, err.stack);
							}
							if(comp.triggerMethod) comp.triggerMethod('show');
						} else {
							if(el.tagName.toLowerCase().indexOf('-component') > 0) logger.warn('No component registered for', el.tagName.toLowerCase());
						}

					});
				});
			}
		});
	}
};

function getValue(model, expr, el, view) {
	var data = {};
	if(model && model.toJSON) data = model.toJSON();


	var parsedExpr = expr.substring(2, expr.length - 1);

	var fnExpr = [
		'(function (',
		Object.keys(data).join(','),
		'){ return ' + parsedExpr + '; })',
		'(' + Object.keys(data).map(function (p) { return 'data["' + p + '"]'; }).join(',') + ')'
	].join('');

	var result = undefined;
	try {
		result = eval(fnExpr);
	} catch(err) {
		logger.error('Error evaluating:', expr, 'for el:', el, 'inside view:', view.cid, view.name);
		logger.error(err);

	}

	return result;
}