var logger = require('loginator')('backbone-components');

var components = {};

var initialized = false;

function getOptions(el, model, view){
	var opts = {
		el: el,
		_parentModel: model,
		_parentView: view,
		getOptions: function(newEl){
			return getOptions(newEl, model, view);
		}
	};

	var data = model ? model.toJSON() : {};
	for(var i = 0; i < el.attributes.length; i++) {
		var attrib = el.attributes[i];
		if(attrib.value.indexOf('$') === 0) 
			opts[attrib.name] = getValue(data, attrib.value, el, view);
		else 
			opts[attrib.name] = attrib.value;
	}

	return opts;
}

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

		if(Backbone.__componentsInit) {
			logger.warn('You are trying to initialize backbone-components again.');
			return;
		}

		initialized = true;

		logger.info('Initializing with Backbone instance:', Backbone);

		Backbone.originalViewRef = Backbone.View;
		Backbone.View = Backbone.View.extend({
			constructor: function () {
				// logger.debug('Applying custom component logic to View', this);
				Backbone.originalViewRef.apply(this, arguments);
				this.on('render', function () {
					var model = this.model;
					var _this = this;
					this.$el.find('*').each(function(index, el) {

						// skip if already initialized by lower component
						if(el.attributes.getNamedItem('__owner-view') && el.attributes.getNamedItem('__owner-view').value) {
							return;
						}

						if(!_this.components) _this.components = {};

						var componentClass = components[el.tagName.toLowerCase()] || _this.components[el.tagName.toLowerCase()];

						if(componentClass) {
							var rootModel = _this.rootModel;
							if(!rootModel){
								rootModel = model;
							}
							var rootView = _this.rootView;
							if(!rootView){
								rootView = this;
							}
							
							
							var opts = getOptions(el, model, _this, opts);
							
							logger.info('Creating component:', el.tagName.toLowerCase(), 'with opts', opts, 'for view:', _this.cid);
							componentClass = componentClass.extend({rootModel: rootModel, rootView: rootView, parentView: this, parentModel: model});
							var comp = new componentClass(opts);
							
							if(!_this.views){
								_this.views = [];
							}
							_this.views.push(comp);
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
				this.on('attach', function () {
					if(this.views){
						for(var i in this.views){
							var comp = this.views[i];
							if(comp.triggerMethod) comp.triggerMethod('attach');
						}
					}
				});
			}
		});
	}
};

function getValue(data, expr, el, view) {
	data._parent = view;


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
