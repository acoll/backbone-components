var logger = require('loginator')('backbone-components');

var components = {};

module.exports = {
	components: components,
	register: function (name, Component) {
		if(components[name]) {
			logger.warn('Skipping `' + name + '` It is already registered.');
		}
		components[name] = Component;
		logger.info('`' + name + '` registered');
	},
	init: function (Backbone) {
		var orig = Backbone.View;
		Backbone.View = Backbone.View.extend({
			constructor: function () {
				orig.apply(this, arguments);

				this.on('render', function () {
					this.$el.find('*').each((index, el) => {

						var componentClass = components[el.tagName.toLowerCase()];

						if(componentClass) {
							var opts = {el: el};

							for(var i = 0; i < el.attributes.length; i++) {
								var attrib = el.attributes[i];
								if(attrib.value.indexOf('$') === 0) 
									opts[attrib.name] = getValue(this.model.toJSON(), attrib.value);
							 	else 
							 		opts[attrib.name] = attrib.value;
							}

							logger.info('Creating component:', el.tagName.toLowerCase(), 'with opts', opts);
							var comp = new componentClass(opts);
							try {
								comp.render();
							} catch(err) {
								logger.error('Error rendering', el, err, err.stack);
							}
							if(comp.triggerMethod) comp.triggerMethod('show');
						}

					});
				});
			}
		});
	}
};

function getValue(data, expr) {

	expr = expr.substring(2, expr.length - 1);

	var fnExpr = [
		'(function (',
		Object.keys(data).join(','),
		'){ return ' + expr + '; })',
		'(' + Object.keys(data).map(function (p) { return 'data["' + p + '"]'; }).join(',') + ')'
	].join('');

	var result = eval(fnExpr);

	console.log(fnExpr, '=', result);

	return result;
}