(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('esn.bpmn')
  .factory('bpmnPropertiesPanelProvider', function() {
    return require('bpmn-js-properties-panel/lib/provider/bpmn');
  });

},{"bpmn-js-properties-panel/lib/provider/bpmn":19}],2:[function(require,module,exports){
'use strict';

var DEFAULT_PRIORITY = 1000;


/**
 * A component that decides upon the visibility / editable
 * state of properties in the properties panel.
 *
 * Implementors must subclass this component and override
 * {@link PropertiesActivator#isEntryVisible} and
 * {@link PropertiesActivator#isPropertyEditable} to provide
 * custom behavior.
 *
 * @class
 * @constructor
 *
 * @param {EventBus} eventBus
 * @param {Number} [priority] at which priority to hook into the activation
 */
function PropertiesActivator(eventBus, priority) {
  var self = this;

  priority = priority || DEFAULT_PRIORITY;

  eventBus.on('propertiesPanel.isEntryVisible', priority, function(e) {
    return self.isEntryVisible(e.entry, e.element);
  });

  eventBus.on('propertiesPanel.isPropertyEditable', priority, function(e) {
    return self.isPropertyEditable(e.entry, e.propertyName, e.element);
  });
}

PropertiesActivator.$inject = [ 'eventBus' ];

module.exports = PropertiesActivator;


/**
 * Should the given entry be visible for the specified element.
 *
 * @method  PropertiesActivator#isEntryVisible
 *
 * @param {EntryDescriptor} entry
 * @param {ModdleElement} element
 *
 * @returns {Boolean}
 */
PropertiesActivator.prototype.isEntryVisible = function(entry, element) {
  return true;
};

/**
 * Should the given property be editable for the specified element
 *
 * @method  PropertiesActivator#isPropertyEditable
 *
 * @param {EntryDescriptor} entry
 * @param {String} propertyName
 * @param {ModdleElement} element
 *
 * @returns {Boolean}
 */
PropertiesActivator.prototype.isPropertyEditable = function(entry, propertyName, element) {
  return true;
};
},{}],3:[function(require,module,exports){
'use strict';

var domQuery = require('min-dom/lib/query'),
    domClear = require('min-dom/lib/clear'),
    is = require('bpmn-js/lib/util/ModelUtil').is,
    forEach = require('lodash/collection/forEach'),
    domify = require('min-dom/lib/domify'),
    Ids = require('ids');

var SPACE_REGEX = /\s/;

// for QName validation as per http://www.w3.org/TR/REC-xml/#NT-NameChar
var QNAME_REGEX = /^([a-z][\w-.]*:)?[a-z_][\w-.]*$/i;

// for ID validation as per BPMN Schema (QName - Namespace)
var ID_REGEX = /^[a-z_][\w-.]*$/i;

function selectedOption(selectBox) {
  if (selectBox.selectedIndex >= 0) {
    return selectBox.options[selectBox.selectedIndex].value;
  }
}

module.exports.selectedOption = selectedOption;


function selectedType(elementSyntax, inputNode) {
  var typeSelect = domQuery(elementSyntax, inputNode);
  return selectedOption(typeSelect);
}

module.exports.selectedType = selectedType;


/**
 * Retrieve the root element the document this
 * business object is contained in.
 *
 * @return {ModdleElement}
 */
function getRoot(businessObject) {
  var parent = businessObject;
  while (parent.$parent) {
    parent = parent.$parent;
  }
  return parent;
}

module.exports.getRoot = getRoot;


/**
 * filters all elements in the list which have a given type.
 * removes a new list
 */
function filterElementsByType(objectList, type) {
  var list = objectList || [];
  var result = [];
  forEach(list, function(obj) {
    if (is(obj, type)) {
      result.push(obj);
    }
  });
  return result;
}

module.exports.filterElementsByType = filterElementsByType;


function findRootElementsByType(businessObject, referencedType) {
  var root = getRoot(businessObject);

  return filterElementsByType(root.rootElements, referencedType);
}

module.exports.findRootElementsByType = findRootElementsByType;


function removeAllChildren(domElement) {
  while(!!domElement.firstChild) {
    domElement.removeChild(domElement.firstChild);
  }
}

module.exports.removeAllChildren = removeAllChildren;


/**
 * adds an empty option to the list
 */
function addEmptyParameter(list) {
  return list.push({'label': '', 'value': '', 'name': ''});
}

module.exports.addEmptyParameter = addEmptyParameter;


/**
 * returns a list with all root elements for the given parameter 'referencedType'
 */
function refreshOptionsModel(businessObject, referencedType) {
  var model = [];
  var referableObjects = findRootElementsByType(businessObject, referencedType);
  forEach(referableObjects, function(obj) {
    model.push({
      label: (obj.name || '')  + ' (id='+obj.id+')',
      value: obj.id,
      name: obj.name
    });
  });
  return model;
}

module.exports.refreshOptionsModel = refreshOptionsModel;


/**
 * fills the drop down with options
 */
function updateOptionsDropDown(domSelector, businessObject, referencedType, entryNode) {
  var options = refreshOptionsModel(businessObject, referencedType);
  addEmptyParameter(options);
  var selectBox = domQuery(domSelector, entryNode);
  domClear(selectBox);

  forEach(options, function(option){
    var optionEntry = domify('<option value="' + option.value + '">' + option.label + '</option>');
    selectBox.appendChild(optionEntry);
  });
  return options;
}

module.exports.updateOptionsDropDown = updateOptionsDropDown;


/**
 * checks whether the id value is valid
 *
 * @param {ModdleElement} bo
 * @param {String} idValue
 *
 * @return {String} error message
 */
function isIdValid(bo, idValue) {
  var assigned = bo.$model.ids.assigned(idValue);

  var idExists = !!assigned && assigned !== bo;

  if (!idValue || idExists) {
    return 'Element must have an unique id.';
  }

  return validateId(idValue);
}

module.exports.isIdValid = isIdValid;


function validateId(idValue) {

  if (containsSpace(idValue)) {
    return 'Id must not contain spaces.';
  }

  if (!ID_REGEX.test(idValue)) {

    if (QNAME_REGEX.test(idValue)) {
      return 'Id must not contain prefix.';
    }

    return 'Id must be a valid QName.';
  }
}

module.exports.validateId = validateId;


function containsSpace(value) {
  return SPACE_REGEX.test(value);
}

module.exports.containsSpace = containsSpace;


/**
 * generate a semantic id with given prefix
 */
function nextId(prefix) {
  var ids = new Ids([32,32,1]);

  return ids.nextPrefixed(prefix);
}

module.exports.nextId = nextId;


function triggerClickEvent(element) {
  var evt;
  var eventType = 'click';

  if (!!document.createEvent) {
    try {
      // Chrome, Safari, Firefox
      evt = new MouseEvent((eventType), { view: window, bubbles: true, cancelable: true });
    } catch (e) {
      // IE 11, PhantomJS (wat!)
      evt = document.createEvent('MouseEvent');

      evt.initEvent((eventType), true, true);
    }
    return element.dispatchEvent(evt);
  } else {
    // Welcome IE
    evt = document.createEventObject();

    return element.fireEvent('on' + eventType, evt);
  }
}

module.exports.triggerClickEvent = triggerClickEvent;

},{"bpmn-js/lib/util/ModelUtil":109,"ids":35,"lodash/collection/forEach":41,"min-dom/lib/clear":101,"min-dom/lib/domify":103,"min-dom/lib/query":104}],4:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    cmdHelper = require('../helper/CmdHelper');

var checkbox = function(options, defaultParameters) {
  var resource = defaultParameters,
    label = options.label || resource.id,
    canBeDisabled = !!options.disabled && typeof options.disabled === 'function';


  resource.html =
    '<input id="camunda-' + resource.id + '" ' +
         'type="checkbox" ' +
         'name="' + options.modelProperty + '" ' +
         (canBeDisabled ? 'data-show="isDisabled"' : '') +
         ' />' +
    '<label for="camunda-' + resource.id + '" ' +
         (canBeDisabled ? 'data-show="isDisabled"' : '') +
         '>' + label + '</label>';

  resource.get = function(element) {
    var bo = getBusinessObject(element),
      res = {};

    res[options.modelProperty] = bo.get(options.modelProperty);

    return res;
  };
  resource.set = function(element, values) {
    var res = {};

    res[options.modelProperty] = !!values[options.modelProperty];

    return cmdHelper.updateProperties(element, res);
  };

  if(typeof options.set === 'function') {
    resource.set = options.set;
  }

  if(typeof options.get === 'function') {
    resource.get = options.get;
  }

  if(canBeDisabled) {
    resource.isDisabled = function() {
      return !options.disabled.apply(resource, arguments);
    };
  }

  resource.cssClasses = ['pp-checkbox'];

  return resource;
};

module.exports = checkbox;

},{"../helper/CmdHelper":14,"bpmn-js/lib/util/ModelUtil":109}],5:[function(require,module,exports){
'use strict';

var assign = require('lodash/object/assign'),
    find = require('lodash/collection/find');

var domQuery = require('min-dom/lib/query');

var selectEntryFactory = require('./SelectEntryFactory');


/**
 * The combo box is a special implementation of the select entry and adds the option 'custom' to the
 * select box. If 'custom' is selected, an additional text input field is shown which allows to define
 * a custom value.
 *
 * @param  {Object} options
 * @param  {string} options.id
 * @param  {string} options.label
 * @param  {Array<Object>} options.selectOptions list of name/value pairs
 * @param  {string} options.modelProperty
 * @param  {function} options.get
 * @param  {function} options.set
 * @param  {function} options.disabled
 * @param  {string} [options.customValue] custom select option value (default: 'custom')
 * @param  {string} [options.customName] custom select option name visible in the select box (default: 'custom')
 *
 * @return {Object}
 */
var comboBox = function(options) {

  var selectOptions = options.selectOptions,
      modelProperty = options.modelProperty,
      customValue = options.customValue || 'custom',
      customName = options.customName || 'custom ' + modelProperty;

  // check if a value is not a built in value
  var isCustomValue = function(value) {
    if (typeof value[modelProperty] === 'undefined') {
      return false;
    }

    var isCustom = !find(selectOptions, function(option) {
      return value[modelProperty] === option.value;
    });

    return isCustom;
  };

  var comboOptions = assign({}, options);

  // true if the selected value in the select box is customValue
  comboOptions.showCustomInput = function(element, node) {
    var selectBox = domQuery('[data-entry="'+ options.id +'"] select', node.parentNode);

    if (selectBox) {
      return selectBox.value === customValue;
    }

    return false;
  };

  comboOptions.get = function(element, node) {
    var value = options.get(element, node);

    var modifiedValues = {};

    if (!isCustomValue(value)) {
      modifiedValues[modelProperty] = value[modelProperty] || '';
      
      return modifiedValues;
    }

    modifiedValues[modelProperty] = customValue;
    modifiedValues['custom-'+modelProperty] = value[modelProperty];

    return modifiedValues;
  };

  comboOptions.set = function(element, values, node) {
    var modifiedValues = {};

    // if the custom select option has been selected
    // take the value from the text input field
    if (values[modelProperty] === customValue) {
      modifiedValues[modelProperty] = values['custom-' + modelProperty] || '';
    }
    else if (options.emptyParameter && values[modelProperty] === '') {
      modifiedValues[modelProperty] = undefined;
    }
    else {
      modifiedValues[modelProperty] = values[modelProperty];
    }
    return options.set(element, modifiedValues, node);
  };

  comboOptions.selectOptions.push({ name: customName, value: customValue });

  var comboBoxEntry = assign({}, selectEntryFactory(comboOptions, comboOptions));

  comboBoxEntry.html += '<div class="pp-field-wrapper pp-combo-input" ' +
    'data-show="showCustomInput"' +
    '>' +
    '<input id="camunda-' + options.id + '-input" type="text" name="custom-' + modelProperty+'" ' +
      ' />' +
  '</div>';

  return comboBoxEntry;
};

module.exports = comboBox;

},{"./SelectEntryFactory":9,"lodash/collection/find":40,"lodash/object/assign":94,"min-dom/lib/query":104}],6:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

// input entities
var textInputField = require('./TextInputEntryFactory'),
    checkboxField = require('./CheckboxEntryFactory'),
    selectBoxField = require('./SelectEntryFactory'),
    comboBoxField = require('./ComboEntryFactory'),
    textAreaField = require('./TextAreaEntryFactory'),
    validationAwareTextInputField = require('./ValidationAwareTextInput'),
    tableField = require('./TableEntryFactory'),
    labelEntry = require('./LabelFactory'),
    link = require('./LinkEntryFactory');

var cmdHelper = require('../helper/CmdHelper');

// helpers ////////////////////////////////////////

function ensureNotNull(prop) {
  if(!prop) {
    throw new Error(prop + ' must be set.');
  }

  return prop;
}

/**
 * sets the default parameters which are needed to create an entry
 *
 * @param options
 * @returns {{id: *, description: (*|string), get: (*|Function), set: (*|Function),
 *            validate: (*|Function), html: string}}
 */
var setDefaultParameters = function ( options ) {

  // default method to fetch the current value of the input field
  var defaultGet = function (element) {
    var bo = getBusinessObject(element),
      res = {},
      prop = ensureNotNull(options.modelProperty);
    res[prop] = bo.get(prop);

    return res;
  };

// default method to set a new value to the input field
  var defaultSet = function (element, values) {
    var res = {},
        prop = ensureNotNull(options.modelProperty);
    if (values[prop] !== '') {
      res[prop] = values[prop];
    } else {
      res[prop] = undefined;
    }

    return cmdHelper.updateProperties(element, res);
  };

// default validation method
  var defaultValidate = function () {
    return {};
  };

  return {
    id : options.id,
    description : ( options.description || '' ),
    get : ( options.get || defaultGet ),
    set : ( options.set || defaultSet ),
    validate : ( options.validate || defaultValidate ),
    html: ''
  };
};

function EntryFactory() {

}

/**
 * Generates an text input entry object for a property panel.
 * options are:
 * - id: id of the entry - String
 *
 * - description: description of the property - String
 *
 * - label: label for the input field - String
 *
 * - set: setter method - Function
 *
 * - get: getter method - Function
 *
 * - validate: validation mehtod - Function
 *
 * - modelProperty: name of the model property - String
 *
 * - buttonAction: Object which contains the following properties: - Object
 * ---- name: name of the [data-action] callback - String
 * ---- method: callback function for [data-action] - Function
 *
 * - buttonShow: Object which contains the following properties: - Object
 * ---- name: name of the [data-show] callback - String
 * ---- method: callback function for [data-show] - Function
 *
 * @param options
 * @returns the propertyPanel entry resource object
 */
EntryFactory.textField = function(options) {
  return textInputField(options, setDefaultParameters(options));
};

EntryFactory.validationAwareTextField = function(options) {
  return validationAwareTextInputField(options, setDefaultParameters(options));
};

/**
 * Generates a checkbox input entry object for a property panel.
 * options are:
 * - id: id of the entry - String
 *
 * - description: description of the property - String
 *
 * - label: label for the input field - String
 *
 * - set: setter method - Function
 *
 * - get: getter method - Function
 *
 * - validate: validation mehtod - Function
 *
 * - modelProperty: name of the model property - String
 *
 * @param options
 * @returns the propertyPanel entry resource object
 */
EntryFactory.checkbox = function(options) {
  return checkboxField(options, setDefaultParameters(options));
};

EntryFactory.textArea = function(options) {
  return textAreaField(options, setDefaultParameters(options));
};

EntryFactory.selectBox = function(options) {
  return selectBoxField(options, setDefaultParameters(options));
};

EntryFactory.comboBox = function(options) {
  return comboBoxField(options);
};

EntryFactory.table = function(options) {
  return tableField(options);
};

EntryFactory.label = function(options) {
  return labelEntry(options);
};

EntryFactory.link = function(options) {
  return link(options);
};

module.exports = EntryFactory;

},{"../helper/CmdHelper":14,"./CheckboxEntryFactory":4,"./ComboEntryFactory":5,"./LabelFactory":7,"./LinkEntryFactory":8,"./SelectEntryFactory":9,"./TableEntryFactory":10,"./TextAreaEntryFactory":11,"./TextInputEntryFactory":12,"./ValidationAwareTextInput":13,"bpmn-js/lib/util/ModelUtil":109}],7:[function(require,module,exports){
'use strict';

/**
 * The label factory provides a label entry. For the label text
 * it expects either a string provided by the options.labelText
 * parameter or it could be generated programmatically using a
 * function passed as the options.get parameter.
 *
 * @param  {Object} options
 * @param  {string} options.id
 * @param  {string} [options.labelText]
 * @param  {Function} [options.get]
 * @param  {Function} [options.showLabel]
 * @param  {Boolean} [options.divider] adds a divider at the top of the label if true; default: false
 */
var label = function(options) {
  return {
    id: options.id,
    html: '<label data-value="label" ' +
            'data-show="showLabel" ' +
            'class="entry-label' + (options.divider ? ' divider' : '') + '">' +
          '</label>',
    get: function(element, node) {
      if (typeof options.get === 'function') {
        return options.get(element, node);
      }
      return { label: options.labelText };
    },
    showLabel: function(element, node) {
      if (typeof options.showLabel === 'function') {
        return options.showLabel(element, node);
      }
      return true;
    }
  };
};

module.exports = label;

},{}],8:[function(require,module,exports){
'use strict';

var utils = require('../Utils');

var link = function(options, defaultParameters) {


  var id                  = options.id,
      label               = options.label || id,
      hideLink            = options.hideLink,
      canBeHidden         = typeof hideLink === 'function',
      getClickableElement = options.getClickableElement;

  var resource = { id: id };

  resource.html =
    '<a data-action="linkSelected" ' +
    (canBeHidden ? 'data-show="hideLink" ' : '') +
    'class="pp-entry-link' + (options.cssClasses ? ' ' + options.cssClasses : '') +
    '">' + label + '</a>';

  resource.linkSelected = function(element, node, event, scopeNode) {
    if (typeof getClickableElement === 'function') {

      var link = getClickableElement.apply(resource, [ element, node, event, scopeNode ]);
      link && utils.triggerClickEvent(link);
    }

    return false;
  };

  if (canBeHidden) {
    resource.hideLink = function() {
      return !hideLink.apply(resource, arguments);
    };
  }

  return resource;
};

module.exports = link;

},{"../Utils":3}],9:[function(require,module,exports){
'use strict';

var forEach = require('lodash/collection/forEach');

var isList = function(list) {
  return !(!list || Object.prototype.toString.call(list) !== '[object Array]');
};

var addEmptyParameter = function(list) {
  return list.concat([ { name: '', value: '' } ]);
};

/**
 * @param  {Object} options
 * @param  {string} options.id
 * @param  {string} [options.label]
 * @param  {Array<Object>} options.selectOptions
 * @param  {string} options.modelProperty
 * @param  {boolean} options.emptyParameter
 * @param  {function} options.disabled
 * @param  {Object} defaultParameters
 *
 * @return {Object}
 */
var selectbox = function(options, defaultParameters) {
  var resource = defaultParameters,
      label = options.label || resource.id,
      selectOptions = options.selectOptions,
      modelProperty = options.modelProperty,
      emptyParameter = options.emptyParameter,
      canBeDisabled = !!options.disabled && typeof options.disabled === 'function';

  if (isList(selectOptions)) {
    if (emptyParameter) {
      selectOptions = addEmptyParameter(selectOptions);
    }
  } else {
    selectOptions = [ { name: '', value: '' } ];
  }

  resource.html =
    '<label for="camunda-' + resource.id + '"' +
    (canBeDisabled ? 'data-show="isDisabled" ' : '') + '>' + label + '</label>' +
    '<select id="camunda-' + resource.id + '-select" name="' + modelProperty + '"' +
    (canBeDisabled ? 'data-show="isDisabled" ' : '') + ' data-value>';

  forEach(selectOptions, function(option){
    resource.html += '<option value="' + option.value + '">' + (option.name || '') + '</option>';
  });

  resource.html += '</select>';

  if(canBeDisabled) {
    resource.isDisabled = function() {
      return !options.disabled.apply(resource, arguments);
    };
  }

  resource.cssClasses = ['dropdown'];

  return resource;
};

module.exports = selectbox;

},{"lodash/collection/forEach":41}],10:[function(require,module,exports){
'use strict';

var cmdHelper = require('../helper/CmdHelper');

var domQuery = require('min-dom/lib/query'),
    domAttr = require('min-dom/lib/attr'),
    domClosest = require('min-dom/lib/closest');

var filter = require('lodash/collection/filter'),
    forEach = require('lodash/collection/forEach'),
    keys = require('lodash/object/keys');

var domify = require('min-dom/lib/domify');

var TABLE_ROW_DIV_SNIPPET = '<div class="pp-field-wrapper pp-table-row">';
var DELETE_ROW_BUTTON_SNIPPET = '<button class="clear" data-action="deleteElement">' +
                                  '<span>X</span>' +
                                '</button>';

function createInputRowTemplate(properties, canRemove) {
  var template = TABLE_ROW_DIV_SNIPPET;
  template += createInputTemplate(properties, canRemove);
  template += canRemove ? DELETE_ROW_BUTTON_SNIPPET : '';
  template += '</div>';

  return template;
}

function createInputTemplate(properties, canRemove) {
  var columns = properties.length;
  var template = '';
  forEach(properties, function(prop) {
    template += '<input class="pp-table-row-columns-' + columns + ' ' +
                               (canRemove ? 'pp-table-row-removable' : '') + '" ' +
                       'id="camunda-table-row-cell-input-value" ' +
                       'type="text" ' +
                       'name="' + prop + '" />';
  });
  return template;
}

function createLabelRowTemplate(labels) {
  var template = TABLE_ROW_DIV_SNIPPET;
  template += createLabelTemplate(labels);
  template += '</div>';

return template;
}

function createLabelTemplate(labels) {
  var columns = labels.length;
  var template = '';
  forEach(labels, function(label) {
    template += '<label class="pp-table-row-columns-' + columns + '">' + label + '</label>';
  });
  return template;
}

function pick(elements, properties) {
  return (elements || []).map(function(elem) {
    var newElement = {};
    forEach(properties, function(prop) {
      newElement[prop] = elem[prop] || '';
    });
    return newElement;
  });
}

function diff(element, node, values, oldValues, editable) {
  return filter(values, function(value, idx) {
    return !valueEqual(element, node, value, oldValues[idx], editable, idx);
  });
}

function valueEqual(element, node, value, oldValue, editable, idx) {
  if (value && !oldValue) {
    return false;
  }
  var allKeys = keys(value).concat(keys(oldValue));

  return allKeys.every(function(key) {
    var n = value[key] || undefined;
    var o = oldValue[key] || undefined;
    return !editable(element, node, key, idx) || n === o;
  });
}

function getEntryNode(node) {
  return domClosest(node, '[data-entry]', true);
}

function getContainer(node) {
  return domQuery('div[data-list-entry-container]', node);
}

/**
 * @param  {Object} options
 * @param  {string} options.id
 * @param  {Array<string>} options.modelProperties
 * @param  {Array<string>} options.labels
 * @param  {Function} options.getElements - this callback function must return a list of business object items
 * @param  {Function} options.removeElement
 * @param  {Function} options.addElement
 * @param  {Function} options.updateElement
 * @param  {Function} options.editable
 * @param  {Function} options.setControlValue
 * @param  {Function} options.show
 *
 * @return {Object}
 */
module.exports = function(options) {

  var id              = options.id,
      modelProperties = options.modelProperties,
      labels          = options.labels;

  var labelRow = createLabelRowTemplate(labels);

  var getElements   = options.getElements;

  var removeElement = options.removeElement,
      canRemove     = typeof removeElement === 'function';

  var addElement = options.addElement,
      canAdd     = typeof addElement === 'function',
      addLabel   = options.addLabel || 'Add Value';

  var updateElement = options.updateElement,
      canUpdate     = typeof updateElement === 'function';

  var editable        = options.editable || function() { return true; },
      setControlValue = options.setControlValue;

  var show       = options.show,
      canBeShown = typeof show === 'function';

  var elements = function(element, node) {
    return pick(getElements(element, node), modelProperties);
  };

  var factory = {
    id: id,
    html: ( canAdd ?
          '<div class="pp-table-add-row" ' + (canBeShown ? 'data-show="show"' : '') + '>' +
            '<label>' + addLabel + '</label>' +
            '<button class="add" data-action="addElement"><span>+</span></button>' +
          '</div>' : '') +
          '<div class="pp-table" data-show="showTable">' +
            '<div class="pp-field-wrapper pp-table-row">' +
               labelRow +
            '</div>' +
            '<div data-list-entry-container>' +
            '</div>' +
          '</div>',

    get: function(element, node) {
      var boElements = elements(element, node, this.__invalidValues);

      var invalidValues = this.__invalidValues;

      delete this.__invalidValues;

      forEach(invalidValues, function(value, idx) {
        var element = boElements[idx];

        forEach(modelProperties, function(prop) {
          element[prop] = value[prop];
        });
      });

      return boElements;
    },

    set: function(element, values, node) {
      var action = this.__action || {};
      delete this.__action;

      if (action.id === 'delete-element') {
        return removeElement(element, node, action.idx);
      }
      else if (action.id === 'add-element') {
        return addElement(element, node);
      }
      else if (canUpdate) {
        var commands = [],
            valuesToValidate = values;

        if (typeof options.validate !== 'function') {
          valuesToValidate = diff(element, node, values, elements(element, node), editable);
        }

        var self = this;

        forEach(valuesToValidate, function(value) {
          var validationError,
              idx = values.indexOf(value);

          if (typeof options.validate === 'function') {
            validationError = options.validate(element, value, node, idx);
          }

          if (!validationError) {
            var cmd = updateElement(element, value, node, idx);

            if(cmd) {
              commands.push(cmd);
            }
          } else {
            // cache invalid value in an object by index as key
            self.__invalidValues = self.__invalidValues || {};
            self.__invalidValues[idx] = value;

            // execute a command, which does not do anything
            commands.push(cmdHelper.updateProperties(element, {}));
          }
        });

        return commands;
      }
    },
    createListEntryTemplate: function(value, index, selectBox) {
      return createInputRowTemplate(modelProperties, canRemove);
    },

    addElement: function(element, node, event, scopeNode) {
      var template = domify(createInputRowTemplate(modelProperties, canRemove));

      var container = getContainer(node);
      container.appendChild(template);

      this.__action = {
        id: 'add-element'
      };

      return true;
    },

    deleteElement: function(element, node, event, scopeNode) {
      var container = getContainer(node);
      var rowToDelete = event.delegateTarget.parentNode;
      var idx = parseInt(domAttr(rowToDelete, 'data-index'), 10);

      container.removeChild(rowToDelete);

      this.__action = {
        id: 'delete-element',
        idx: idx
      };

      return true;
    },

    editable: function(element, rowNode, input, prop, value, idx) {
      var entryNode = domClosest(rowNode, '[data-entry]');
      return editable(element, entryNode, prop, idx);
    },

    show: function(element, entryNode, node, scopeNode) {
      entryNode = getEntryNode(entryNode);
      return show(element, entryNode, node, scopeNode);
    },

    showTable: function(element, entryNode, node, scopeNode) {
      entryNode = getEntryNode(entryNode);
      var elems = elements(element, entryNode);
      return elems && elems.length && (!canBeShown || show(element, entryNode, node, scopeNode));
    },

    validateListItem: function(element, value, node, idx) {
      if (typeof options.validate === 'function') {
        return options.validate(element, value, node, idx);
      }
    }

  };

  if (setControlValue) {
    factory.setControlValue = function(element, rowNode, input, prop, value, idx) {
      var entryNode = getEntryNode(rowNode);
      setControlValue(element, entryNode, input, prop, value, idx);
    };
  }

  return factory;

};
},{"../helper/CmdHelper":14,"lodash/collection/filter":39,"lodash/collection/forEach":41,"lodash/object/keys":95,"min-dom/lib/attr":100,"min-dom/lib/closest":102,"min-dom/lib/domify":103,"min-dom/lib/query":104}],11:[function(require,module,exports){
'use strict';

var textArea = function(options, defaultParameters) {

  var resource = defaultParameters,
    label = options.label || resource.id,
    canBeShown = !!options.show && typeof options.show === 'function',
    expandable = options.expandable,
    minRows = options.minRows,
    maxRows = options.maxRows;

  resource.html =
    '<label for="camunda-' + resource.id + '" ' +
    (canBeShown ? 'data-show="isShown"' : '') +
    '>' + label + '</label>' +
    '<div class="pp-field-wrapper" ' +
    (canBeShown ? 'data-show="isShown"' : '') +
    '>' +
      '<textarea id="camunda-' + resource.id + '" ' +
                'name="' + options.modelProperty + '" ' +
                (expandable ? 'data-expandable ' : '') +
                (minRows ? 'data-min-rows="' + minRows + '" ' : '') +
                (maxRows ? 'data-max-rows="' + maxRows + '" ' : '') +
      '>' +
      '</textarea>' +
    '</div>';

  if(canBeShown) {
    resource.isShown = function() {
      return options.show.apply(resource, arguments);
    };
  }

  resource.cssClasses = ['pp-textarea'];

  return resource;
};

module.exports = textArea;

},{}],12:[function(require,module,exports){
'use strict';

var domQuery = require('min-dom/lib/query');

var textField = function(options, defaultParameters) {

  // Default action for the button next to the input-field
  var defaultButtonAction = function (element, inputNode) {
    var input = domQuery('input[name="' + options.modelProperty + '"]', inputNode);
    input.value = '';

    return true;
  };

  // default method to determine if the button should be visible
  var defaultButtonShow = function (element, inputNode) {
    var input = domQuery('input[name="' + options.modelProperty + '"]', inputNode);

    return input.value !== '';
  };

  var resource = defaultParameters,
      label = options.label || resource.id,
      dataValueLabel = options.dataValueLabel,
      buttonLabel = ( options.buttonLabel || 'X' ),
      actionName = ( typeof options.buttonAction != 'undefined' ) ? options.buttonAction.name : 'clear',
      actionMethod = ( typeof options.buttonAction != 'undefined' ) ? options.buttonAction.method : defaultButtonAction,
      showName = ( typeof options.buttonShow != 'undefined' ) ? options.buttonShow.name : 'canClear',
      showMethod = ( typeof options.buttonShow != 'undefined' ) ? options.buttonShow.method : defaultButtonShow,
      canBeDisabled = !!options.disabled && typeof options.disabled === 'function';

  resource.html =
    '<label for="camunda-' + resource.id + '" ' +
      (canBeDisabled ? 'data-show="isDisabled" ' : '') +
      (dataValueLabel ? 'data-value="' + dataValueLabel + '"' : '') + '>'+ label +'</label>' +
    '<div class="pp-field-wrapper" ' +
      (canBeDisabled ? 'data-show="isDisabled"' : '') +
      '>' +
      '<input id="camunda-' + resource.id + '" type="text" name="' + options.modelProperty+'" ' +
        ' />' +
      '<button class="' + actionName + '" data-action="' + actionName + '" data-show="' + showName + '" ' +
        (canBeDisabled ? 'data-disabled="isDisabled"' : '') + '>' +
        '<span>' + buttonLabel + '</span>' +
      '</button>' +
    '</div>';

  resource[actionName] = actionMethod;
  resource[showName] = showMethod;

  if(canBeDisabled) {
    resource.isDisabled = function() {
      return !options.disabled.apply(resource, arguments);
    };
  }

  resource.cssClasses = ['pp-textfield'];

  return resource;
};

module.exports = textField;

},{"min-dom/lib/query":104}],13:[function(require,module,exports){
'use strict';

var textField = require('./TextInputEntryFactory');

/**
 * This function is a wrapper around TextInputEntryFactory.
 * It adds functionality to cache an invalid value entered in the
 * text input, instead of setting it on the business object.
 */
var validationAwareTextField = function(options, defaultParameters) {

  var modelProperty = options.modelProperty;

  defaultParameters.get = function(element, node) {
    var value = this.__lastInvalidValue;

    delete this.__lastInvalidValue;

    var properties = {};

    properties[modelProperty] = value !== undefined ? value : options.getProperty(element, node);

    return properties;
  };

  defaultParameters.set = function(element, values, node) {
    var validationErrors = validate.apply(this, [ element, values, node ]),
        propertyValue = values[modelProperty];

    // make sure we do not update the id
    if (validationErrors && validationErrors[modelProperty]) {
      this.__lastInvalidValue = propertyValue;

      return options.setProperty(element, {}, node);
    } else {
      var properties = {};

      properties[modelProperty] = propertyValue;

      return options.setProperty(element, properties, node);
    }
  };

  var validate = defaultParameters.validate = function(element, values, node) {
    var value = values[modelProperty] || this.__lastInvalidValue;

    var property = {};
    property[modelProperty] = value;

    return options.validate(element, property, node);
  };

  return textField(options, defaultParameters);
};

module.exports = validationAwareTextField;
},{"./TextInputEntryFactory":12}],14:[function(require,module,exports){
'use strict';

var CmdHelper = {};
module.exports = CmdHelper;

CmdHelper.updateProperties = function(element, properties) {
  return {
    cmd: 'element.updateProperties',
    context: { element: element, properties: properties }
  };
};

CmdHelper.updateBusinessObject = function(element, businessObject, newProperties) {
  return {
    cmd: 'properties-panel.update-businessobject',
    context: {
      element: element,
      businessObject: businessObject,
      properties: newProperties
    }
  };
};

CmdHelper.addElementsTolist = function(element, businessObject, listPropertyName, objectsToAdd) {
  return {
    cmd: 'properties-panel.update-businessobject-list',
    context: {
      element: element,
      currentObject: businessObject,
      propertyName: listPropertyName,
      objectsToAdd: objectsToAdd
    }
  };
};

CmdHelper.removeElementsFromList = function
  (element, businessObject, listPropertyName, referencePropertyName, objectsToRemove) {

  return {
    cmd: 'properties-panel.update-businessobject-list',
    context: {
      element: element,
      currentObject: businessObject,
      propertyName: listPropertyName,
      referencePropertyName: referencePropertyName,
      objectsToRemove: objectsToRemove
    }
  };
};


CmdHelper.addAndRemoveElementsFromList = function
  (element, businessObject, listPropertyName, referencePropertyName, objectsToAdd, objectsToRemove) {

  return {
    cmd: 'properties-panel.update-businessobject-list',
    context: {
      element: element,
      currentObject: businessObject,
      propertyName: listPropertyName,
      referencePropertyName: referencePropertyName,
      objectsToAdd: objectsToAdd,
      objectsToRemove: objectsToRemove
    }
  };
};


CmdHelper.setList = function(element, businessObject, listPropertyName, updatedObjectList) {
  return {
    cmd: 'properties-panel.update-businessobject-list',
    context: {
      element: element,
      currentObject: businessObject,
      propertyName: listPropertyName,
      updatedObjectList: updatedObjectList
    }
  };
};

},{}],15:[function(require,module,exports){
'use strict';

var ElementHelper = {};
module.exports = ElementHelper;

/**
 * Creates a new element and set the parent to it
 *
 * @method ElementHelper#createElement
 *
 * @param {String} elementType of the new element
 * @param {Object} properties of the new element in key-value pairs
 * @param {moddle.object} parent of the new element
 * @param {BpmnFactory} factory which creates the new element
 *
 * @returns {djs.model.Base} element which is created
 */
ElementHelper.createElement = function(elementType, properties, parent, factory) {
  var element = factory.create(elementType, properties);
  element.$parent = parent;

  return element;
};

},{}],16:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    is = require('bpmn-js/lib/util/ModelUtil').is,
    forEach = require('lodash/collection/forEach');

var EventDefinitionHelper = {};

module.exports = EventDefinitionHelper;

EventDefinitionHelper.getEventDefinition = function(element, eventType) {

  var bo = getBusinessObject(element),
    eventDefinition = null;

  if(bo.eventDefinitions) {
    forEach(bo.eventDefinitions, function(event) {
      if(is(event, eventType)) {
        eventDefinition = event;
      }
    });
  }

  return eventDefinition;
};

EventDefinitionHelper.getTimerEventDefinition = function(element) {
  return this.getEventDefinition(element, 'bpmn:TimerEventDefinition');
};

EventDefinitionHelper.getMessageEventDefinition = function(element) {
  return this.getEventDefinition(element, 'bpmn:MessageEventDefinition');
};

EventDefinitionHelper.getSignalEventDefinition = function(element) {
  return this.getEventDefinition(element, 'bpmn:SignalEventDefinition');
};

EventDefinitionHelper.getErrorEventDefinition = function(element) {
  return this.getEventDefinition(element, 'bpmn:ErrorEventDefinition');
};

EventDefinitionHelper.getEscalationEventDefinition = function(element) {
  return this.getEventDefinition(element, 'bpmn:EscalationEventDefinition');
};

EventDefinitionHelper.getCompensateEventDefinition = function(element) {
  return this.getEventDefinition(element, 'bpmn:CompensateEventDefinition');
};

},{"bpmn-js/lib/util/ModelUtil":109,"lodash/collection/forEach":41}],17:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    cmdHelper = require('./CmdHelper');


var ParticipantHelper = {};

module.exports = ParticipantHelper;

ParticipantHelper.modifyProcessBusinessObject = function(element, property, values) {
  if( !is(element, 'bpmn:Participant') ) {
    return {};
  }

  var bo = getBusinessObject(element).get('processRef'),
      properties = {};

  properties[property] = values[property];

  return cmdHelper.updateBusinessObject(element, bo, properties);
};

ParticipantHelper.getProcessBusinessObject = function(element, propertyName) {
  if( !is(element, 'bpmn:Participant') ) {
    return {};
  }

  var bo = getBusinessObject(element).get('processRef'),
      properties = {};

  properties[propertyName] = bo.get(propertyName);

  return properties;
};
},{"./CmdHelper":14,"bpmn-js/lib/util/ModelUtil":109}],18:[function(require,module,exports){
'use strict';


var inherits = require('inherits');

var PropertiesActivator = require('../../PropertiesActivator');

var processProps = require('./parts/ProcessProps'),
    eventProps = require('./parts/EventProps'),
    linkProps = require('./parts/LinkProps'),
    documentationProps = require('./parts/DocumentationProps'),
    idProps = require('./parts/IdProps'),
    nameProps = require('./parts/NameProps');

function createGeneralTabGroups(element, bpmnFactory, elementRegistry) {

  var generalGroup = {
    id: 'general',
    label: 'General',
    entries: []
  };
  idProps(generalGroup, element, elementRegistry);
  nameProps(generalGroup, element);
  processProps(generalGroup, element);

  var detailsGroup = {
    id: 'details',
    label: 'Details',
    entries: []
  };
  linkProps(detailsGroup, element);
  eventProps(detailsGroup, element, bpmnFactory, elementRegistry);

  var documentationGroup = {
    id: 'documentation',
    label: 'Documentation',
    entries: []
  };

  documentationProps(documentationGroup, element, bpmnFactory);

  return[
    generalGroup,
    detailsGroup,
    documentationGroup
  ];

}

function BpmnPropertiesProvider(eventBus, bpmnFactory, elementRegistry) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {

    var generalTab = {
      id: 'general',
      label: 'General',
      groups: createGeneralTabGroups(element, bpmnFactory, elementRegistry)
    };

    return [
      generalTab
    ];
  };
}

BpmnPropertiesProvider.$inject = [ 'eventBus', 'bpmnFactory', 'elementRegistry' ];

inherits(BpmnPropertiesProvider, PropertiesActivator);

module.exports = BpmnPropertiesProvider;

},{"../../PropertiesActivator":2,"./parts/DocumentationProps":20,"./parts/EventProps":21,"./parts/IdProps":22,"./parts/LinkProps":23,"./parts/NameProps":24,"./parts/ProcessProps":25,"inherits":37}],19:[function(require,module,exports){
module.exports = {
  __init__: [ 'propertiesProvider' ],
  propertiesProvider: [ 'type', require('./BpmnPropertiesProvider') ]
};
},{"./BpmnPropertiesProvider":18}],20:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
  getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
  cmdHelper = require('../../../helper/CmdHelper');


module.exports = function(group, element, bpmnFactory) {

  // Documentation
  var entry = entryFactory.textArea({
    id: 'documentation',
    description: '',
    label: 'Documentation',
    modelProperty: 'documentation'
  });

  entry.set = function(element, values) {
    var businessObject = getBusinessObject(element),
        newObjectList = [];

    if (typeof values.documentation !== 'undefined' && values.documentation !== '') {
      newObjectList.push(bpmnFactory.create('bpmn:Documentation', {
        text: values.documentation
      }));
    }

    return cmdHelper.setList(element, businessObject, 'documentation', newObjectList);
  };

  entry.get = function(element) {
    var businessObject = getBusinessObject(element),
        documentations = businessObject.get('documentation'),
        text = (documentations.length > 0) ? documentations[0].text : '';

    return { documentation: text };
  };

  group.entries.push(entry);
};
},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":14,"bpmn-js/lib/util/ModelUtil":109}],21:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    eventDefinitionHelper = require('../../../helper/EventDefinitionHelper');

var forEach = require('lodash/collection/forEach');

var message = require('./implementation/MessageEventDefinition'),
    signal = require('./implementation/SignalEventDefinition'),
    error = require('./implementation/ErrorEventDefinition'),
    escalation = require('./implementation/EscalationEventDefinition'),
    timer = require('./implementation/TimerEventDefinition'),
    compensation = require('./implementation/CompensateEventDefinition');


module.exports = function(group, element, bpmnFactory, elementRegistry) {
  var events = [
    'bpmn:StartEvent',
    'bpmn:EndEvent',
    'bpmn:IntermediateThrowEvent',
    'bpmn:BoundaryEvent',
    'bpmn:IntermediateCatchEvent'
  ];

  // Message and Signal Event Definition
  forEach(events, function(event) {
    if(is(element, event)) {

      var messageEventDefinition = eventDefinitionHelper.getMessageEventDefinition(element),
          signalEventDefinition = eventDefinitionHelper.getSignalEventDefinition(element);

      if(messageEventDefinition) {
        message(group, element, bpmnFactory, messageEventDefinition);
      }

      if(signalEventDefinition) {
        signal(group, element, bpmnFactory, signalEventDefinition);
      }

    }
  });

  // Special Case: Receive Task
  if(is(element, 'bpmn:ReceiveTask')) {
    message(group, element, bpmnFactory, getBusinessObject(element));
  }

  // Error Event Definition
  var errorEvents = [
    'bpmn:StartEvent',
    'bpmn:BoundaryEvent',
    'bpmn:EndEvent'
  ];

  forEach(errorEvents, function(event) {
    if(is(element, event)) {

      var showErrorCodeVariable = is(element, 'bpmn:StartEvent') || is (element, 'bpmn:BoundaryEvent');

      var errorEventDefinition = eventDefinitionHelper.getErrorEventDefinition(element);

      if(errorEventDefinition) {
        error(group, element, bpmnFactory, errorEventDefinition, showErrorCodeVariable);
      }
    }
  });

  // Escalation Event Definition
  var escalationEvents = [
    'bpmn:StartEvent',
    'bpmn:BoundaryEvent',
    'bpmn:IntermediateThrowEvent',
    'bpmn:EndEvent'
  ];

  forEach(escalationEvents, function(event) {
    if(is(element, event)) {

      var showEscalationCodeVariable = is(element, 'bpmn:StartEvent') || is(element, 'bpmn:BoundaryEvent');

      // get business object
      var escalationEventDefinition = eventDefinitionHelper.getEscalationEventDefinition(element);

      if(escalationEventDefinition) {
        escalation(group, element, bpmnFactory, escalationEventDefinition, showEscalationCodeVariable);
      }
    }

  });

  // Timer Event Definition
  var timerEvents = [
    'bpmn:StartEvent',
    'bpmn:BoundaryEvent',
    'bpmn:IntermediateCatchEvent'
  ];

  forEach(timerEvents, function(event) {
    if(is(element, event)) {

      // get business object
      var timerEventDefinition = eventDefinitionHelper.getTimerEventDefinition(element);

      if(timerEventDefinition) {
        timer(group, element, bpmnFactory, timerEventDefinition);
      }
    }
  });

  // Compensate Event Definition
  var compensationEvents = [
    'bpmn:EndEvent',
    'bpmn:IntermediateThrowEvent'
  ];

  forEach(compensationEvents, function(event) {
    if(is(element, event)) {

      // get business object
      var compensateEventDefinition = eventDefinitionHelper.getCompensateEventDefinition(element);

      if(compensateEventDefinition) {
        compensation(group, element, bpmnFactory, compensateEventDefinition, elementRegistry);
      }
    }
  });

};

},{"../../../helper/EventDefinitionHelper":16,"./implementation/CompensateEventDefinition":26,"./implementation/ErrorEventDefinition":28,"./implementation/EscalationEventDefinition":29,"./implementation/MessageEventDefinition":31,"./implementation/SignalEventDefinition":33,"./implementation/TimerEventDefinition":34,"bpmn-js/lib/util/ModelUtil":109,"lodash/collection/forEach":41}],22:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    utils = require('../../../Utils'),
    cmdHelper = require('../../../helper/CmdHelper');

module.exports = function(group, element) {

  // Id
  group.entries.push(entryFactory.validationAwareTextField({
    id: 'id',
    description: '',
    label: 'Id',
    modelProperty: 'id',
    getProperty: function(element) {
      return element.id;
    },
    setProperty: function(element, properties) {
      return cmdHelper.updateProperties(element, properties);
    },
    validate: function(element, values) {
      var idValue = values.id;

      var bo = getBusinessObject(element);

      var idError = utils.isIdValid(bo, idValue);

      return idError ? { id: idError } : {};
    }
  }));

};

},{"../../../Utils":3,"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":14,"bpmn-js/lib/util/ModelUtil":109}],23:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
  getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
  entryFactory = require('../../../factory/EntryFactory'),
  cmdHelper = require('../../../helper/CmdHelper');

var forEach = require('lodash/collection/forEach');

function getLinkEventDefinition(element) {

  var bo = getBusinessObject(element);

  var linkEventDefinition = null;
  if(bo.eventDefinitions) {
    forEach(bo.eventDefinitions, function(eventDefinition) {
      if(is(eventDefinition, 'bpmn:LinkEventDefinition')) {
        linkEventDefinition = eventDefinition;
      }
    });
  }

  return linkEventDefinition;
}

module.exports = function(group, element) {
  var linkEvents = [ 'bpmn:IntermediateThrowEvent', 'bpmn:IntermediateCatchEvent' ];

  forEach(linkEvents, function(event) {
    if(is(element, event)) {

      var linkEventDefinition = getLinkEventDefinition(element);

      if(linkEventDefinition) {
        var entry = entryFactory.textField({
          id: 'link-event',
          description: '',
          label: 'Link Name',
          modelProperty: 'link-name'
        });

        entry.get = function () {
          return { 'link-name': linkEventDefinition.get('name')};
        };

        entry.set = function (element, values) {
          var newProperties = {
            name: values['link-name']
          };
          return cmdHelper.updateBusinessObject(element, linkEventDefinition, newProperties);
        };

        group.entries.push(entry);
      }
    }
  });
};


},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":14,"bpmn-js/lib/util/ModelUtil":109,"lodash/collection/forEach":41}],24:[function(require,module,exports){
'use strict';

var nameEntryFactory = require('./implementation/Name'),
    is = require('bpmn-js/lib/util/ModelUtil').is;

module.exports = function(group, element) {

  if (!is(element, 'bpmn:Collaboration')) {

    // name
    group.entries = group.entries.concat(nameEntryFactory(element));

  }

};

},{"./implementation/Name":32,"bpmn-js/lib/util/ModelUtil":109}],25:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
    entryFactory = require('../../../factory/EntryFactory'),
    participantHelper = require('../../../helper/ParticipantHelper'),
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    nameEntryFactory = require('./implementation/Name');

module.exports = function(group, element) {
  var businessObject = getBusinessObject(element);

  if (is(element, 'bpmn:Process') || (is(element, 'bpmn:Participant') && businessObject.get('processRef'))) {

    /**
     * processId
     */
    if(is(element, 'bpmn:Participant')) {
      var idEntry = entryFactory.textField({
        id: 'process-id',
        description: '',
        label: 'Process Id',
        modelProperty: 'processId'
      });

      // in participants we have to change the default behavior of set and get
      idEntry.get = function (element) {
        var properties = participantHelper.getProcessBusinessObject(element, 'id');
        return { processId: properties.id };
      };

      idEntry.set = function (element, values) {
        return participantHelper.modifyProcessBusinessObject(element, 'id', { id: values.processId });
      };

      group.entries.push(idEntry);


      /**
       * process name
       */
       var processNameEntry = nameEntryFactory(element, {
         id: 'process-name',
         label: 'Process Name'
       })[0];

      // in participants we have to change the default behavior of set and get
      processNameEntry.get = function (element) {
        return participantHelper.getProcessBusinessObject(element, 'name');
      };

      processNameEntry.set = function (element, values) {
        return participantHelper.modifyProcessBusinessObject(element, 'name', values);
      };

      group.entries.push(processNameEntry);
    }


    /**
     * isExecutable
     */
    var executableEntry = entryFactory.checkbox({
      id: 'process-is-executable',
      description: 'Defines if a process is executable by a process engine',
      label: 'Executable',
      modelProperty: 'isExecutable'
    });

    // in participants we have to change the default behavior of set and get
    if(is(element, 'bpmn:Participant')) {
      executableEntry.get = function (element) {
        return participantHelper.getProcessBusinessObject(element, 'isExecutable');
      };

      executableEntry.set = function (element, values) {
        return participantHelper.modifyProcessBusinessObject(element, 'isExecutable', values);
      };
    }

    group.entries.push(executableEntry);
  }
};

},{"../../../factory/EntryFactory":6,"../../../helper/ParticipantHelper":17,"./implementation/Name":32,"bpmn-js/lib/util/ModelUtil":109}],26:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory');

var cmdHelper = require('../../../../helper/CmdHelper'),
    eventDefinitionHelper = require('../../../../helper/EventDefinitionHelper'),
    utils = require('../../../../Utils');

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    is = require('bpmn-js/lib/util/ModelUtil').is;

var forEach = require('lodash/collection/forEach'),
    find = require('lodash/collection/find'),
    filter = require('lodash/collection/filter');


function getContainedActivities(element) {
  return getFlowElements(element, 'bpmn:Activity');
}

function getContainedBoundaryEvents(element) {
  return getFlowElements(element, 'bpmn:BoundaryEvent');
}

function getFlowElements(element, type) {
  return utils.filterElementsByType(element.flowElements, type);
}

function isCompensationEventAttachedToActivity(activity, boundaryEvents) {
  var activityId = activity.id;
  var boundaryEvent = find(boundaryEvents, function(boundaryEvent) {
    var compensateEventDefinition = eventDefinitionHelper.getCompensateEventDefinition(boundaryEvent);
    var attachedToRef = boundaryEvent.attachedToRef;
    return compensateEventDefinition && attachedToRef && attachedToRef.id === activityId;
  });
  return !!boundaryEvent;
}

// subprocess: only when it is not triggeredByEvent
// activity: only when it attach a compensation boundary event
// callActivity: no limitation
function canActivityBeCompensated(activity, boundaryEvents) {
  return (is(activity, 'bpmn:SubProcess') && !activity.triggeredByEvent) ||
          is(activity, 'bpmn:CallActivity') ||
          isCompensationEventAttachedToActivity(activity, boundaryEvents);
}

function getActivitiesForCompensation(element) {
  var boundaryEvents = getContainedBoundaryEvents(element);
  return filter(getContainedActivities(element), function(activity) {
    return canActivityBeCompensated(activity, boundaryEvents);
  });
}

function getActivitiesForActivityRef(element) {
  var bo = getBusinessObject(element);
  var parent = bo.$parent;

  var activitiesForActivityRef = getActivitiesForCompensation(parent);

  // if throwing compensation event is in an event sub process:
  // get also all activities outside of the event sub process
  if (is(parent, 'bpmn:SubProcess') && parent.triggeredByEvent) {
    parent = parent.$parent;
    if (parent) {
      activitiesForActivityRef = activitiesForActivityRef.concat(getActivitiesForCompensation(parent));
    }

  }

  return activitiesForActivityRef;
}

function createActivityRefOptions(element) {
  var options = [ { value: '' } ];

  var activities = getActivitiesForActivityRef(element);
  forEach(activities, function(activity) {
    var activityId = activity.id;
    var name = (activity.name ? (activity.name + ' ') : '') + '(id=' + activityId + ')';
    options.push({ value: activityId, name: name });
  });

  return options;
}


module.exports = function(group, element, bpmnFactory, compensateEventDefinition, elementRegistry) {

  group.entries.push(entryFactory.checkbox({
    id: 'wait-for-completion',
    description: 'Configure compensation event definition',
    label: 'Wait for Completion',
    modelProperty: 'waitForCompletion',

    get: function(element, node) {
      return {
        waitForCompletion: compensateEventDefinition.waitForCompletion
      };
    },

    set: function(element, values) {
      values.waitForCompletion = values.waitForCompletion || undefined;
      return cmdHelper.updateBusinessObject(element, compensateEventDefinition, values);
    }
  }));

  group.entries.push(entryFactory.selectBox({
    id: 'activity-ref',
    label: 'Activity Ref',
    selectOptions: createActivityRefOptions(element),
    modelProperty: 'activityRef',

    get: function(element, node) {
      var activityRef = compensateEventDefinition.activityRef;
      activityRef = activityRef && activityRef.id;
      return {
        activityRef: activityRef || ''
      };
    },

    set: function(element, values) {
      var activityRef = values.activityRef || undefined;
      activityRef = activityRef && getBusinessObject(elementRegistry.get(activityRef));
      return cmdHelper.updateBusinessObject(element, compensateEventDefinition, {
        activityRef: activityRef
      });
    }
  }));

};

},{"../../../../Utils":3,"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":14,"../../../../helper/EventDefinitionHelper":16,"bpmn-js/lib/util/ModelUtil":109,"lodash/collection/filter":39,"lodash/collection/find":40,"lodash/collection/forEach":41}],27:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory');

var cmdHelper = require('../../../../helper/CmdHelper');

/**
 * Create an entry to modify a property of an element which
 * is referenced by a event definition.
 *
 * @param  {djs.model.Base} element
 * @param  {ModdleElement} definition
 * @param  {BpmnFactory} bpmnFactory
 * @param  {Object} options
 * @param  {string} options.id the id of the entry
 * @param  {string} options.label the label of the entry
 * @param  {string} options.referenceProperty the name of referencing property
 * @param  {string} options.modelProperty the name of property to modify
 * @param  {string} options.shouldValidate a flag indicate whether to validate or not
 *
 * @return {Array<Object>} return an array containing the entries
 */
module.exports = function(element, definition, bpmnFactory, options) {

  var id = options.id || 'element-property';
  var label = options.label;
  var referenceProperty = options.referenceProperty;
  var modelProperty = options.modelProperty || 'name';
  var shouldValidate = options.shouldValidate || false;

  var entry = entryFactory.textField({
    id: id,
    label: label,
    modelProperty: modelProperty,

    get: function(element, node) {
      var reference = definition.get(referenceProperty);
      var props = {};
      props[modelProperty] = reference && reference.get(modelProperty);
      return props;
    },

    set: function(element, values, node) {
      var reference = definition.get(referenceProperty);
      var props = {};
      props[modelProperty] = values[modelProperty] || undefined;
      return cmdHelper.updateBusinessObject(element, reference, props);
    },

    disabled: function(element, node) {
      return !definition.get(referenceProperty);
    }
  });

  if (shouldValidate) {
    entry.validate = function(element, values, node) {
      var reference = definition.get(referenceProperty);
      if (reference && !values[modelProperty]) {
        var validationErrors = {};
        validationErrors[modelProperty] = 'Must provide a value';
        return validationErrors;
      }
    };
  }

  return [ entry ];
};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":14}],28:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory'),
    cmdHelper = require('../../../../helper/CmdHelper');

var eventDefinitionReference = require('./EventDefinitionReference'),
    elementReferenceProperty = require('./ElementReferenceProperty');


module.exports = function(group, element, bpmnFactory, errorEventDefinition, showErrorCodeVariable) {

  group.entries = group.entries.concat(eventDefinitionReference(element, errorEventDefinition, bpmnFactory, {
    label: 'Error',
    description: 'Configure the error element',
    elementName: 'error',
    elementType: 'bpmn:Error',
    referenceProperty: 'errorRef',
    newElementIdPrefix: 'Error_'
  }));


  group.entries = group.entries.concat(elementReferenceProperty(element, errorEventDefinition, bpmnFactory, {
    id: 'error-element-name',
    label: 'Error Name',
    referenceProperty: 'errorRef',
    modelProperty: 'name',
    shouldValidate: true
  }));


  group.entries = group.entries.concat(elementReferenceProperty(element, errorEventDefinition, bpmnFactory, {
    id: 'error-element-code',
    label: 'Error Code',
    referenceProperty: 'errorRef',
    modelProperty: 'errorCode'
  }));


  if (showErrorCodeVariable) {
    group.entries.push(entryFactory.textField({
      id : 'errorCodeVariable',
      label : 'Error Code Variable',
      modelProperty : 'errorCodeVariable',

      get: function(element) {
        var codeVariable = errorEventDefinition.get('camunda:errorCodeVariable');
        return {
          errorCodeVariable: codeVariable
        };
      },

      set: function(element, values) {
        return cmdHelper.updateBusinessObject(element, errorEventDefinition, {
          'camunda:errorCodeVariable': values.errorCodeVariable || undefined
        });
      }
    }));
  }
};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":14,"./ElementReferenceProperty":27,"./EventDefinitionReference":30}],29:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory'),
    cmdHelper = require('../../../../helper/CmdHelper');

var eventDefinitionReference = require('./EventDefinitionReference'),
    elementReferenceProperty = require('./ElementReferenceProperty');


module.exports = function(group, element, bpmnFactory, escalationEventDefinition, showEscalationCodeVariable) {

  group.entries = group.entries.concat(eventDefinitionReference(element, escalationEventDefinition, bpmnFactory, {
    label: 'Escalation',
    description: 'Configure the escalation element',
    elementName: 'escalation',
    elementType: 'bpmn:Escalation',
    referenceProperty: 'escalationRef',
    newElementIdPrefix: 'Escalation_'
  }));


  group.entries = group.entries.concat(elementReferenceProperty(element, escalationEventDefinition, bpmnFactory, {
    id: 'escalation-element-name',
    label: 'Escalation Name',
    referenceProperty: 'escalationRef',
    modelProperty: 'name',
    shouldValidate: true
  }));


  group.entries = group.entries.concat(elementReferenceProperty(element, escalationEventDefinition, bpmnFactory, {
    id: 'escalation-element-code',
    label: 'Escalation Code',
    referenceProperty: 'escalationRef',
    modelProperty: 'escalationCode'
  }));


  if (showEscalationCodeVariable) {
    group.entries.push(entryFactory.textField({
      id : 'escalationCodeVariable',
      label : 'Escalation Code Variable',
      modelProperty : 'escalationCodeVariable',

      get: function(element) {
        var codeVariable = escalationEventDefinition.get('camunda:escalationCodeVariable');
        return {
          escalationCodeVariable: codeVariable
        };
      },

      set: function(element, values) {
        return cmdHelper.updateBusinessObject(element, escalationEventDefinition, {
          'camunda:escalationCodeVariable': values.escalationCodeVariable || undefined
        });
      }
    }));
  }
};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":14,"./ElementReferenceProperty":27,"./EventDefinitionReference":30}],30:[function(require,module,exports){
'use strict';

var cmdHelper = require('../../../../helper/CmdHelper');

var domQuery = require('min-dom/lib/query'),
    domify = require('min-dom/lib/domify'),
    domAttr = require('min-dom/lib/attr');

var forEach = require('lodash/collection/forEach'),
    find = require('lodash/collection/find');

var elementHelper = require('../../../../helper/ElementHelper');
var utils = require('../../../../Utils');

var selector = 'select[name=selectedElement]';

/**
 * Get select box containing all elements.
 *
 * @param {DOMElement} node
 *
 * @return {DOMElement} the select box
 */
function getSelectBox(node) {
  return domQuery(selector, node.parentElement);
}

/**
 * Find element by given id.
 *
 * @param {ModdleElement} eventDefinition
 *
 * @return {ModdleElement} an element
 */
function findElementById(eventDefinition, type, id) {
  var elements = utils.findRootElementsByType(eventDefinition, type);
  return find(elements, function(element) {
    return element.id === id;
  });
}

/**
 * Create an entry to modify the reference to an element from an
 * event definition.
 *
 * @param  {djs.model.Base} element
 * @param  {ModdleElement} definition
 * @param  {BpmnFactory} bpmnFactory
 * @param  {Object} options
 * @param  {string} options.label the label of the entry
 * @param  {string} options.description the description of the entry
 * @param  {string} options.elementName the name of the element
 * @param  {string} options.elementType the type of the element
 * @param  {string} options.referenceProperty the name of referencing property
 * @param  {string} options.newElementIdPrefix the prefix of a new created element
 *
 * @return {Array<Object>} return an array containing the entries
 */
module.exports = function(element, definition, bpmnFactory, options) {

  var elementName       = options.elementName || '',
      elementType       = options.elementType,
      referenceProperty = options.referenceProperty;

  var newElementIdPrefix = options.newElementIdPrefix || 'elem_';

  var label       = options.label || '',
      description = options.description || '';

  var entries = [];

  entries.push({

    id: 'event-definitions-' + elementName,
    description: description,
    html: '<div class="pp-row pp-select">' +
             '<label for="camunda-' + elementName + '">' + label + '</label>' +
             '<div class="pp-field-wrapper">' +
               '<select id="camunda-' + elementName + '" name="selectedElement" data-value>' +
               '</select>' +
               '<button class="add" id="addElement" data-action="addElement"><span>+</span></button>' +
             '</div>' +
          '</div>',

    get: function(element, entryNode) {
      utils.updateOptionsDropDown(selector, definition, elementType, entryNode);
      var reference = definition.get(referenceProperty);
      return {
        selectedElement: (reference && reference.id) || ''
      };
    },

    set: function(element, values) {
      var selection = values.selectedElement;

      var props = {};

      if (!selection || typeof selection === 'undefined') {
        // remove reference to element
        props[referenceProperty] = undefined;
        return cmdHelper.updateBusinessObject(element, definition, props);
      }

      var commands = [];

      var selectedElement = findElementById(definition, elementType, selection);
      if (!selectedElement) {
        var root = utils.getRoot(definition);

        // create a new element
        selectedElement = elementHelper.createElement(elementType, { name: selection }, root, bpmnFactory);
        commands.push(cmdHelper.addAndRemoveElementsFromList(element, root, 'rootElements', null, [ selectedElement ]));
      }

      // update reference to element
      props[referenceProperty] = selectedElement;
      commands.push(cmdHelper.updateBusinessObject(element, definition, props));

      return commands;
    },

    addElement: function(element, inputNode) {
      // note: this generated id will be used as name
      // of the element and not as id
      var id = utils.nextId(newElementIdPrefix);

      var optionTemplate = domify('<option value="' + id + '"> (id='+id+')' + '</option>');

      // add new option
      var selectBox = getSelectBox(inputNode);
      selectBox.insertBefore(optionTemplate, selectBox.firstChild);

      // select new element in the select box
      forEach(selectBox, function(option) {
        if (option.value === id) {
          domAttr(option, 'selected', 'selected');
        } else {
          domAttr(option, 'selected', null);
        }
      });

      return true;
    }

  });

  return entries;

};

},{"../../../../Utils":3,"../../../../helper/CmdHelper":14,"../../../../helper/ElementHelper":15,"lodash/collection/find":40,"lodash/collection/forEach":41,"min-dom/lib/attr":100,"min-dom/lib/domify":103,"min-dom/lib/query":104}],31:[function(require,module,exports){
'use strict';

var eventDefinitionReference = require('./EventDefinitionReference'),
    elementReferenceProperty = require('./ElementReferenceProperty');


module.exports = function(group, element, bpmnFactory, messageEventDefinition) {

  group.entries = group.entries.concat(eventDefinitionReference(element, messageEventDefinition, bpmnFactory, {
    label: 'Message',
    description: 'Configure the message element',
    elementName: 'message',
    elementType: 'bpmn:Message',
    referenceProperty: 'messageRef',
    newElementIdPrefix: 'Message_'
  }));


  group.entries = group.entries.concat(elementReferenceProperty(element, messageEventDefinition, bpmnFactory, {
    id: 'message-element-name',
    label: 'Message Name',
    referenceProperty: 'messageRef',
    modelProperty: 'name',
    shouldValidate: true
  }));

};

},{"./ElementReferenceProperty":27,"./EventDefinitionReference":30}],32:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory');

/**
 * Create an entry to modify the name of an an element.
 *
 * @param  {djs.model.Base} element
 * @param  {Object} options
 * @param  {string} options.id the id of the entry
 * @param  {string} options.label the label of the entry
 *
 * @return {Array<Object>} return an array containing
 *                         the entry to modify the name
 */
module.exports = function(element, options) {

  options = options || {};
  var id = options.id || 'name',
      label = options.label || 'Name';

  var nameEntry = entryFactory.textArea({
    id: id,
    label: label,
    modelProperty: 'name',
    expandable: true,
    minRows: 1,
    maxRows: 3
  });

  return [ nameEntry ];

};

},{"../../../../factory/EntryFactory":6}],33:[function(require,module,exports){
'use strict';

var eventDefinitionReference = require('./EventDefinitionReference'),
    elementReferenceProperty = require('./ElementReferenceProperty');


module.exports = function(group, element, bpmnFactory, signalEventDefinition) {

  group.entries = group.entries.concat(eventDefinitionReference(element, signalEventDefinition, bpmnFactory, {
    label: 'Signal',
    description: 'Configure the signal element',
    elementName: 'signal',
    elementType: 'bpmn:Signal',
    referenceProperty: 'signalRef',
    newElementIdPrefix: 'Signal_'
  }));


  group.entries = group.entries.concat(elementReferenceProperty(element, signalEventDefinition, bpmnFactory, {
    id: 'signal-element-name',
    label: 'Signal Name',
    referenceProperty: 'signalRef',
    modelProperty: 'name',
    shouldValidate: true
  }));

};

},{"./ElementReferenceProperty":27,"./EventDefinitionReference":30}],34:[function(require,module,exports){
'use strict';

var elementHelper = require('../../../../helper/ElementHelper'),
    cmdHelper = require('../../../../helper/CmdHelper');

var entryFactory = require('../../../../factory/EntryFactory');

/**
 * Get the timer definition type for a given timer event definition.
 *
 * @param {ModdleElement<bpmn:TimerEventDefinition>} timer
 *
 * @return {string|undefined} the timer definition type
 */
function getTimerDefinitionType(timer) {
  var timeDate = timer.get('timeDate');
  if (typeof timeDate !== 'undefined') {
    return 'timeDate';
  }

  var timeCycle = timer.get('timeCycle');
  if (typeof timeCycle !== 'undefined') {
    return 'timeCycle';
  }

  var timeDuration = timer.get('timeDuration');
  if (typeof timeDuration !== 'undefined') {
    return 'timeDuration';
  }
}

/**
 * Creates 'bpmn:FormalExpression' element.
 *
 * @param {ModdleElement} parent
 * @param {string} body
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement<bpmn:FormalExpression>} a formal expression
 */
function createFormalExpression(parent, body, bpmnFactory) {
  body = body || undefined;
  return elementHelper.createElement('bpmn:FormalExpression', { body: body }, parent, bpmnFactory);
}

function TimerEventDefinition(group, element, bpmnFactory, timerEventDefinition) {

  var selectOptions = [
    { value: 'timeDate', name: 'Date' },
    { value: 'timeDuration', name: 'Duration' },
    { value: 'timeCycle', name: 'Cycle' }
  ];

  group.entries.push(entryFactory.selectBox({
    id: 'timer-event-definition-type',
    label: 'Timer Definition Type',
    selectOptions: selectOptions,
    emptyParameter: true,
    modelProperty: 'timerDefinitionType',

    get: function(element, node) {
      return {
        timerDefinitionType: getTimerDefinitionType(timerEventDefinition) || ''
      };
    },

    set: function(element, values) {
      var props = {
        timeDuration: undefined,
        timeDate: undefined,
        timeCycle: undefined
      };

      var newType = values.timerDefinitionType;
      if (values.timerDefinitionType) {
        var oldType = getTimerDefinitionType(timerEventDefinition);

        var value;
        if (oldType) {
          var definition = timerEventDefinition.get(oldType);
          value = definition.get('body');
        }

        props[newType] = createFormalExpression(timerEventDefinition, value, bpmnFactory);
      }

      return cmdHelper.updateBusinessObject(element, timerEventDefinition, props);
    }

  }));


  group.entries.push(entryFactory.textField({
    id: 'timer-event-definition',
    label: 'Timer Definition',
    modelProperty: 'timerDefinition',

    get: function(element, node) {
      var type = getTimerDefinitionType(timerEventDefinition);
      var definition = type && timerEventDefinition.get(type);
      var value = definition && definition.get('body');
      return {
        timerDefinition: value
      };
    },

    set: function(element, values) {
      var type = getTimerDefinitionType(timerEventDefinition);
      var definition = type && timerEventDefinition.get(type);

      if (definition) {
        return cmdHelper.updateBusinessObject(element, definition, {
          body: values.timerDefinition || undefined
        });
      }
    },

    validate: function(element) {
      var type = getTimerDefinitionType(timerEventDefinition);
      var definition = type && timerEventDefinition.get(type);
      if (definition) {
        var value = definition.get('body');
        if (!value) {
          return {
            timerDefinition: 'Must provide a value'
          };
        }
      }
    },

    disabled: function(element) {
      return !getTimerDefinitionType(timerEventDefinition);
    }

  }));

}

module.exports = TimerEventDefinition;

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":14,"../../../../helper/ElementHelper":15}],35:[function(require,module,exports){
'use strict';

var hat = require('hat');


/**
 * Create a new id generator / cache instance.
 *
 * You may optionally provide a seed that is used internally.
 *
 * @param {Seed} seed
 */
function Ids(seed) {

  if (!(this instanceof Ids)) {
    return new Ids(seed);
  }

  seed = seed || [ 128, 36, 1 ];
  this._seed = seed.length ? hat.rack(seed[0], seed[1], seed[2]) : seed;
}

module.exports = Ids;

/**
 * Generate a next id.
 *
 * @param {Object} [element] element to bind the id to
 *
 * @return {String} id
 */
Ids.prototype.next = function(element) {
  return this._seed(element || true);
};

/**
 * Generate a next id with a given prefix.
 *
 * @param {Object} [element] element to bind the id to
 *
 * @return {String} id
 */
Ids.prototype.nextPrefixed = function(prefix, element) {
  var id;

  do {
    id = prefix + this.next(true);
  } while (this.assigned(id));

  // claim {prefix}{random}
  this.claim(id, element);

  // return
  return id;
};

/**
 * Manually claim an existing id.
 *
 * @param {String} id
 * @param {String} [element] element the id is claimed by
 */
Ids.prototype.claim = function(id, element) {
  this._seed.set(id, element || true);
};

/**
 * Returns true if the given id has already been assigned.
 *
 * @param  {String} id
 * @return {Boolean}
 */
Ids.prototype.assigned = function(id) {
  return this._seed.get(id) || false;
};

/**
 * Unclaim an id.
 *
 * @param  {String} id the id to unclaim
 */
Ids.prototype.unclaim = function(id) {
  delete this._seed.hats[id];
};


/**
 * Clear all claimed ids.
 */
Ids.prototype.clear = function() {

  var hats = this._seed.hats,
      id;

  for (id in hats) {
    this.unclaim(id);
  }
};
},{"hat":36}],36:[function(require,module,exports){
var hat = module.exports = function (bits, base) {
    if (!base) base = 16;
    if (bits === undefined) bits = 128;
    if (bits <= 0) return '0';
    
    var digits = Math.log(Math.pow(2, bits)) / Math.log(base);
    for (var i = 2; digits === Infinity; i *= 2) {
        digits = Math.log(Math.pow(2, bits / i)) / Math.log(base) * i;
    }
    
    var rem = digits - Math.floor(digits);
    
    var res = '';
    
    for (var i = 0; i < Math.floor(digits); i++) {
        var x = Math.floor(Math.random() * base).toString(base);
        res = x + res;
    }
    
    if (rem) {
        var b = Math.pow(base, rem);
        var x = Math.floor(Math.random() * b).toString(base);
        res = x + res;
    }
    
    var parsed = parseInt(res, base);
    if (parsed !== Infinity && parsed >= Math.pow(2, bits)) {
        return hat(bits, base)
    }
    else return res;
};

hat.rack = function (bits, base, expandBy) {
    var fn = function (data) {
        var iters = 0;
        do {
            if (iters ++ > 10) {
                if (expandBy) bits += expandBy;
                else throw new Error('too many ID collisions, use more bits')
            }
            
            var id = hat(bits, base);
        } while (Object.hasOwnProperty.call(hats, id));
        
        hats[id] = data;
        return id;
    };
    var hats = fn.hats = {};
    
    fn.get = function (id) {
        return fn.hats[id];
    };
    
    fn.set = function (id, value) {
        fn.hats[id] = value;
        return fn;
    };
    
    fn.bits = bits || 128;
    fn.base = base || 16;
    return fn;
};

},{}],37:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],38:[function(require,module,exports){
/**
 * Gets the last element of `array`.
 *
 * @static
 * @memberOf _
 * @category Array
 * @param {Array} array The array to query.
 * @returns {*} Returns the last element of `array`.
 * @example
 *
 * _.last([1, 2, 3]);
 * // => 3
 */
function last(array) {
  var length = array ? array.length : 0;
  return length ? array[length - 1] : undefined;
}

module.exports = last;

},{}],39:[function(require,module,exports){
var arrayFilter = require('../internal/arrayFilter'),
    baseCallback = require('../internal/baseCallback'),
    baseFilter = require('../internal/baseFilter'),
    isArray = require('../lang/isArray');

/**
 * Iterates over elements of `collection`, returning an array of all elements
 * `predicate` returns truthy for. The predicate is bound to `thisArg` and
 * invoked with three arguments: (value, index|key, collection).
 *
 * If a property name is provided for `predicate` the created `_.property`
 * style callback returns the property value of the given element.
 *
 * If a value is also provided for `thisArg` the created `_.matchesProperty`
 * style callback returns `true` for elements that have a matching property
 * value, else `false`.
 *
 * If an object is provided for `predicate` the created `_.matches` style
 * callback returns `true` for elements that have the properties of the given
 * object, else `false`.
 *
 * @static
 * @memberOf _
 * @alias select
 * @category Collection
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function|Object|string} [predicate=_.identity] The function invoked
 *  per iteration.
 * @param {*} [thisArg] The `this` binding of `predicate`.
 * @returns {Array} Returns the new filtered array.
 * @example
 *
 * _.filter([4, 5, 6], function(n) {
 *   return n % 2 == 0;
 * });
 * // => [4, 6]
 *
 * var users = [
 *   { 'user': 'barney', 'age': 36, 'active': true },
 *   { 'user': 'fred',   'age': 40, 'active': false }
 * ];
 *
 * // using the `_.matches` callback shorthand
 * _.pluck(_.filter(users, { 'age': 36, 'active': true }), 'user');
 * // => ['barney']
 *
 * // using the `_.matchesProperty` callback shorthand
 * _.pluck(_.filter(users, 'active', false), 'user');
 * // => ['fred']
 *
 * // using the `_.property` callback shorthand
 * _.pluck(_.filter(users, 'active'), 'user');
 * // => ['barney']
 */
function filter(collection, predicate, thisArg) {
  var func = isArray(collection) ? arrayFilter : baseFilter;
  predicate = baseCallback(predicate, thisArg, 3);
  return func(collection, predicate);
}

module.exports = filter;

},{"../internal/arrayFilter":44,"../internal/baseCallback":48,"../internal/baseFilter":51,"../lang/isArray":89}],40:[function(require,module,exports){
var baseEach = require('../internal/baseEach'),
    createFind = require('../internal/createFind');

/**
 * Iterates over elements of `collection`, returning the first element
 * `predicate` returns truthy for. The predicate is bound to `thisArg` and
 * invoked with three arguments: (value, index|key, collection).
 *
 * If a property name is provided for `predicate` the created `_.property`
 * style callback returns the property value of the given element.
 *
 * If a value is also provided for `thisArg` the created `_.matchesProperty`
 * style callback returns `true` for elements that have a matching property
 * value, else `false`.
 *
 * If an object is provided for `predicate` the created `_.matches` style
 * callback returns `true` for elements that have the properties of the given
 * object, else `false`.
 *
 * @static
 * @memberOf _
 * @alias detect
 * @category Collection
 * @param {Array|Object|string} collection The collection to search.
 * @param {Function|Object|string} [predicate=_.identity] The function invoked
 *  per iteration.
 * @param {*} [thisArg] The `this` binding of `predicate`.
 * @returns {*} Returns the matched element, else `undefined`.
 * @example
 *
 * var users = [
 *   { 'user': 'barney',  'age': 36, 'active': true },
 *   { 'user': 'fred',    'age': 40, 'active': false },
 *   { 'user': 'pebbles', 'age': 1,  'active': true }
 * ];
 *
 * _.result(_.find(users, function(chr) {
 *   return chr.age < 40;
 * }), 'user');
 * // => 'barney'
 *
 * // using the `_.matches` callback shorthand
 * _.result(_.find(users, { 'age': 1, 'active': true }), 'user');
 * // => 'pebbles'
 *
 * // using the `_.matchesProperty` callback shorthand
 * _.result(_.find(users, 'active', false), 'user');
 * // => 'fred'
 *
 * // using the `_.property` callback shorthand
 * _.result(_.find(users, 'active'), 'user');
 * // => 'barney'
 */
var find = createFind(baseEach);

module.exports = find;

},{"../internal/baseEach":50,"../internal/createFind":70}],41:[function(require,module,exports){
var arrayEach = require('../internal/arrayEach'),
    baseEach = require('../internal/baseEach'),
    createForEach = require('../internal/createForEach');

/**
 * Iterates over elements of `collection` invoking `iteratee` for each element.
 * The `iteratee` is bound to `thisArg` and invoked with three arguments:
 * (value, index|key, collection). Iteratee functions may exit iteration early
 * by explicitly returning `false`.
 *
 * **Note:** As with other "Collections" methods, objects with a "length" property
 * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
 * may be used for object iteration.
 *
 * @static
 * @memberOf _
 * @alias each
 * @category Collection
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Array|Object|string} Returns `collection`.
 * @example
 *
 * _([1, 2]).forEach(function(n) {
 *   console.log(n);
 * }).value();
 * // => logs each value from left to right and returns the array
 *
 * _.forEach({ 'a': 1, 'b': 2 }, function(n, key) {
 *   console.log(n, key);
 * });
 * // => logs each value-key pair and returns the object (iteration order is not guaranteed)
 */
var forEach = createForEach(arrayEach, baseEach);

module.exports = forEach;

},{"../internal/arrayEach":43,"../internal/baseEach":50,"../internal/createForEach":71}],42:[function(require,module,exports){
/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],43:[function(require,module,exports){
/**
 * A specialized version of `_.forEach` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],44:[function(require,module,exports){
/**
 * A specialized version of `_.filter` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array.length,
      resIndex = -1,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[++resIndex] = value;
    }
  }
  return result;
}

module.exports = arrayFilter;

},{}],45:[function(require,module,exports){
/**
 * A specialized version of `_.some` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

module.exports = arraySome;

},{}],46:[function(require,module,exports){
var keys = require('../object/keys');

/**
 * A specialized version of `_.assign` for customizing assigned values without
 * support for argument juggling, multiple sources, and `this` binding `customizer`
 * functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} customizer The function to customize assigned values.
 * @returns {Object} Returns `object`.
 */
function assignWith(object, source, customizer) {
  var index = -1,
      props = keys(source),
      length = props.length;

  while (++index < length) {
    var key = props[index],
        value = object[key],
        result = customizer(value, source[key], key, object, source);

    if ((result === result ? (result !== value) : (value === value)) ||
        (value === undefined && !(key in object))) {
      object[key] = result;
    }
  }
  return object;
}

module.exports = assignWith;

},{"../object/keys":95}],47:[function(require,module,exports){
var baseCopy = require('./baseCopy'),
    keys = require('../object/keys');

/**
 * The base implementation of `_.assign` without support for argument juggling,
 * multiple sources, and `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return source == null
    ? object
    : baseCopy(source, keys(source), object);
}

module.exports = baseAssign;

},{"../object/keys":95,"./baseCopy":49}],48:[function(require,module,exports){
var baseMatches = require('./baseMatches'),
    baseMatchesProperty = require('./baseMatchesProperty'),
    bindCallback = require('./bindCallback'),
    identity = require('../utility/identity'),
    property = require('../utility/property');

/**
 * The base implementation of `_.callback` which supports specifying the
 * number of arguments to provide to `func`.
 *
 * @private
 * @param {*} [func=_.identity] The value to convert to a callback.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function baseCallback(func, thisArg, argCount) {
  var type = typeof func;
  if (type == 'function') {
    return thisArg === undefined
      ? func
      : bindCallback(func, thisArg, argCount);
  }
  if (func == null) {
    return identity;
  }
  if (type == 'object') {
    return baseMatches(func);
  }
  return thisArg === undefined
    ? property(func)
    : baseMatchesProperty(func, thisArg);
}

module.exports = baseCallback;

},{"../utility/identity":98,"../utility/property":99,"./baseMatches":60,"./baseMatchesProperty":61,"./bindCallback":66}],49:[function(require,module,exports){
/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property names to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, props, object) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

},{}],50:[function(require,module,exports){
var baseForOwn = require('./baseForOwn'),
    createBaseEach = require('./createBaseEach');

/**
 * The base implementation of `_.forEach` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object|string} Returns `collection`.
 */
var baseEach = createBaseEach(baseForOwn);

module.exports = baseEach;

},{"./baseForOwn":55,"./createBaseEach":68}],51:[function(require,module,exports){
var baseEach = require('./baseEach');

/**
 * The base implementation of `_.filter` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function baseFilter(collection, predicate) {
  var result = [];
  baseEach(collection, function(value, index, collection) {
    if (predicate(value, index, collection)) {
      result.push(value);
    }
  });
  return result;
}

module.exports = baseFilter;

},{"./baseEach":50}],52:[function(require,module,exports){
/**
 * The base implementation of `_.find`, `_.findLast`, `_.findKey`, and `_.findLastKey`,
 * without support for callback shorthands and `this` binding, which iterates
 * over `collection` using the provided `eachFunc`.
 *
 * @private
 * @param {Array|Object|string} collection The collection to search.
 * @param {Function} predicate The function invoked per iteration.
 * @param {Function} eachFunc The function to iterate over `collection`.
 * @param {boolean} [retKey] Specify returning the key of the found element
 *  instead of the element itself.
 * @returns {*} Returns the found element or its key, else `undefined`.
 */
function baseFind(collection, predicate, eachFunc, retKey) {
  var result;
  eachFunc(collection, function(value, key, collection) {
    if (predicate(value, key, collection)) {
      result = retKey ? key : value;
      return false;
    }
  });
  return result;
}

module.exports = baseFind;

},{}],53:[function(require,module,exports){
/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for callback shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {Function} predicate The function invoked per iteration.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromRight) {
  var length = array.length,
      index = fromRight ? length : -1;

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

module.exports = baseFindIndex;

},{}],54:[function(require,module,exports){
var createBaseFor = require('./createBaseFor');

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"./createBaseFor":69}],55:[function(require,module,exports){
var baseFor = require('./baseFor'),
    keys = require('../object/keys');

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

module.exports = baseForOwn;

},{"../object/keys":95,"./baseFor":54}],56:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * The base implementation of `get` without support for string paths
 * and default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} path The path of the property to get.
 * @param {string} [pathKey] The key representation of path.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path, pathKey) {
  if (object == null) {
    return;
  }
  if (pathKey !== undefined && pathKey in toObject(object)) {
    path = [pathKey];
  }
  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[path[index++]];
  }
  return (index && index == length) ? object : undefined;
}

module.exports = baseGet;

},{"./toObject":86}],57:[function(require,module,exports){
var baseIsEqualDeep = require('./baseIsEqualDeep'),
    isObject = require('../lang/isObject'),
    isObjectLike = require('./isObjectLike');

/**
 * The base implementation of `_.isEqual` without support for `this` binding
 * `customizer` functions.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {Function} [customizer] The function to customize comparing values.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
}

module.exports = baseIsEqual;

},{"../lang/isObject":92,"./baseIsEqualDeep":58,"./isObjectLike":83}],58:[function(require,module,exports){
var equalArrays = require('./equalArrays'),
    equalByTag = require('./equalByTag'),
    equalObjects = require('./equalObjects'),
    isArray = require('../lang/isArray'),
    isTypedArray = require('../lang/isTypedArray');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    objectTag = '[object Object]';

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing objects.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA=[]] Tracks traversed `value` objects.
 * @param {Array} [stackB=[]] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = arrayTag,
      othTag = arrayTag;

  if (!objIsArr) {
    objTag = objToString.call(object);
    if (objTag == argsTag) {
      objTag = objectTag;
    } else if (objTag != objectTag) {
      objIsArr = isTypedArray(object);
    }
  }
  if (!othIsArr) {
    othTag = objToString.call(other);
    if (othTag == argsTag) {
      othTag = objectTag;
    } else if (othTag != objectTag) {
      othIsArr = isTypedArray(other);
    }
  }
  var objIsObj = objTag == objectTag,
      othIsObj = othTag == objectTag,
      isSameTag = objTag == othTag;

  if (isSameTag && !(objIsArr || objIsObj)) {
    return equalByTag(object, other, objTag);
  }
  if (!isLoose) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
    }
  }
  if (!isSameTag) {
    return false;
  }
  // Assume cyclic values are equal.
  // For more information on detecting circular references see https://es5.github.io/#JO.
  stackA || (stackA = []);
  stackB || (stackB = []);

  var length = stackA.length;
  while (length--) {
    if (stackA[length] == object) {
      return stackB[length] == other;
    }
  }
  // Add `object` and `other` to the stack of traversed objects.
  stackA.push(object);
  stackB.push(other);

  var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);

  stackA.pop();
  stackB.pop();

  return result;
}

module.exports = baseIsEqualDeep;

},{"../lang/isArray":89,"../lang/isTypedArray":93,"./equalArrays":72,"./equalByTag":73,"./equalObjects":74}],59:[function(require,module,exports){
var baseIsEqual = require('./baseIsEqual'),
    toObject = require('./toObject');

/**
 * The base implementation of `_.isMatch` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Array} matchData The propery names, values, and compare flags to match.
 * @param {Function} [customizer] The function to customize comparing objects.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, matchData, customizer) {
  var index = matchData.length,
      length = index,
      noCustomizer = !customizer;

  if (object == null) {
    return !length;
  }
  object = toObject(object);
  while (index--) {
    var data = matchData[index];
    if ((noCustomizer && data[2])
          ? data[1] !== object[data[0]]
          : !(data[0] in object)
        ) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0],
        objValue = object[key],
        srcValue = data[1];

    if (noCustomizer && data[2]) {
      if (objValue === undefined && !(key in object)) {
        return false;
      }
    } else {
      var result = customizer ? customizer(objValue, srcValue, key) : undefined;
      if (!(result === undefined ? baseIsEqual(srcValue, objValue, customizer, true) : result)) {
        return false;
      }
    }
  }
  return true;
}

module.exports = baseIsMatch;

},{"./baseIsEqual":57,"./toObject":86}],60:[function(require,module,exports){
var baseIsMatch = require('./baseIsMatch'),
    getMatchData = require('./getMatchData'),
    toObject = require('./toObject');

/**
 * The base implementation of `_.matches` which does not clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new function.
 */
function baseMatches(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    var key = matchData[0][0],
        value = matchData[0][1];

    return function(object) {
      if (object == null) {
        return false;
      }
      return object[key] === value && (value !== undefined || (key in toObject(object)));
    };
  }
  return function(object) {
    return baseIsMatch(object, matchData);
  };
}

module.exports = baseMatches;

},{"./baseIsMatch":59,"./getMatchData":76,"./toObject":86}],61:[function(require,module,exports){
var baseGet = require('./baseGet'),
    baseIsEqual = require('./baseIsEqual'),
    baseSlice = require('./baseSlice'),
    isArray = require('../lang/isArray'),
    isKey = require('./isKey'),
    isStrictComparable = require('./isStrictComparable'),
    last = require('../array/last'),
    toObject = require('./toObject'),
    toPath = require('./toPath');

/**
 * The base implementation of `_.matchesProperty` which does not clone `srcValue`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} srcValue The value to compare.
 * @returns {Function} Returns the new function.
 */
function baseMatchesProperty(path, srcValue) {
  var isArr = isArray(path),
      isCommon = isKey(path) && isStrictComparable(srcValue),
      pathKey = (path + '');

  path = toPath(path);
  return function(object) {
    if (object == null) {
      return false;
    }
    var key = pathKey;
    object = toObject(object);
    if ((isArr || !isCommon) && !(key in object)) {
      object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
      if (object == null) {
        return false;
      }
      key = last(path);
      object = toObject(object);
    }
    return object[key] === srcValue
      ? (srcValue !== undefined || (key in object))
      : baseIsEqual(srcValue, object[key], undefined, true);
  };
}

module.exports = baseMatchesProperty;

},{"../array/last":38,"../lang/isArray":89,"./baseGet":56,"./baseIsEqual":57,"./baseSlice":64,"./isKey":81,"./isStrictComparable":84,"./toObject":86,"./toPath":87}],62:[function(require,module,exports){
/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

},{}],63:[function(require,module,exports){
var baseGet = require('./baseGet'),
    toPath = require('./toPath');

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new function.
 */
function basePropertyDeep(path) {
  var pathKey = (path + '');
  path = toPath(path);
  return function(object) {
    return baseGet(object, path, pathKey);
  };
}

module.exports = basePropertyDeep;

},{"./baseGet":56,"./toPath":87}],64:[function(require,module,exports){
/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  start = start == null ? 0 : (+start || 0);
  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = (end === undefined || end > length) ? length : (+end || 0);
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

module.exports = baseSlice;

},{}],65:[function(require,module,exports){
/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` or `undefined` values.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  return value == null ? '' : (value + '');
}

module.exports = baseToString;

},{}],66:[function(require,module,exports){
var identity = require('../utility/identity');

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

module.exports = bindCallback;

},{"../utility/identity":98}],67:[function(require,module,exports){
var bindCallback = require('./bindCallback'),
    isIterateeCall = require('./isIterateeCall'),
    restParam = require('../function/restParam');

/**
 * Creates a `_.assign`, `_.defaults`, or `_.merge` function.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return restParam(function(object, sources) {
    var index = -1,
        length = object == null ? 0 : sources.length,
        customizer = length > 2 ? sources[length - 2] : undefined,
        guard = length > 2 ? sources[2] : undefined,
        thisArg = length > 1 ? sources[length - 1] : undefined;

    if (typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = typeof thisArg == 'function' ? thisArg : undefined;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"../function/restParam":42,"./bindCallback":66,"./isIterateeCall":80}],68:[function(require,module,exports){
var getLength = require('./getLength'),
    isLength = require('./isLength'),
    toObject = require('./toObject');

/**
 * Creates a `baseEach` or `baseEachRight` function.
 *
 * @private
 * @param {Function} eachFunc The function to iterate over a collection.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    var length = collection ? getLength(collection) : 0;
    if (!isLength(length)) {
      return eachFunc(collection, iteratee);
    }
    var index = fromRight ? length : -1,
        iterable = toObject(collection);

    while ((fromRight ? index-- : ++index < length)) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}

module.exports = createBaseEach;

},{"./getLength":75,"./isLength":82,"./toObject":86}],69:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{"./toObject":86}],70:[function(require,module,exports){
var baseCallback = require('./baseCallback'),
    baseFind = require('./baseFind'),
    baseFindIndex = require('./baseFindIndex'),
    isArray = require('../lang/isArray');

/**
 * Creates a `_.find` or `_.findLast` function.
 *
 * @private
 * @param {Function} eachFunc The function to iterate over a collection.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new find function.
 */
function createFind(eachFunc, fromRight) {
  return function(collection, predicate, thisArg) {
    predicate = baseCallback(predicate, thisArg, 3);
    if (isArray(collection)) {
      var index = baseFindIndex(collection, predicate, fromRight);
      return index > -1 ? collection[index] : undefined;
    }
    return baseFind(collection, predicate, eachFunc);
  };
}

module.exports = createFind;

},{"../lang/isArray":89,"./baseCallback":48,"./baseFind":52,"./baseFindIndex":53}],71:[function(require,module,exports){
var bindCallback = require('./bindCallback'),
    isArray = require('../lang/isArray');

/**
 * Creates a function for `_.forEach` or `_.forEachRight`.
 *
 * @private
 * @param {Function} arrayFunc The function to iterate over an array.
 * @param {Function} eachFunc The function to iterate over a collection.
 * @returns {Function} Returns the new each function.
 */
function createForEach(arrayFunc, eachFunc) {
  return function(collection, iteratee, thisArg) {
    return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection))
      ? arrayFunc(collection, iteratee)
      : eachFunc(collection, bindCallback(iteratee, thisArg, 3));
  };
}

module.exports = createForEach;

},{"../lang/isArray":89,"./bindCallback":66}],72:[function(require,module,exports){
var arraySome = require('./arraySome');

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing arrays.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var index = -1,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
    return false;
  }
  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index],
        result = customizer ? customizer(isLoose ? othValue : arrValue, isLoose ? arrValue : othValue, index) : undefined;

    if (result !== undefined) {
      if (result) {
        continue;
      }
      return false;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (isLoose) {
      if (!arraySome(other, function(othValue) {
            return arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
          })) {
        return false;
      }
    } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB))) {
      return false;
    }
  }
  return true;
}

module.exports = equalArrays;

},{"./arraySome":45}],73:[function(require,module,exports){
/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag) {
  switch (tag) {
    case boolTag:
    case dateTag:
      // Coerce dates and booleans to numbers, dates to milliseconds and booleans
      // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
      return +object == +other;

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case numberTag:
      // Treat `NaN` vs. `NaN` as equal.
      return (object != +object)
        ? other != +other
        : object == +other;

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings primitives and string
      // objects as equal. See https://es5.github.io/#x15.10.6.4 for more details.
      return object == (other + '');
  }
  return false;
}

module.exports = equalByTag;

},{}],74:[function(require,module,exports){
var keys = require('../object/keys');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing values.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var objProps = keys(object),
      objLength = objProps.length,
      othProps = keys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isLoose) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isLoose ? key in other : hasOwnProperty.call(other, key))) {
      return false;
    }
  }
  var skipCtor = isLoose;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key],
        result = customizer ? customizer(isLoose ? othValue : objValue, isLoose? objValue : othValue, key) : undefined;

    // Recursively compare objects (susceptible to call stack limits).
    if (!(result === undefined ? equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB) : result)) {
      return false;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (!skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      return false;
    }
  }
  return true;
}

module.exports = equalObjects;

},{"../object/keys":95}],75:[function(require,module,exports){
var baseProperty = require('./baseProperty');

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

module.exports = getLength;

},{"./baseProperty":62}],76:[function(require,module,exports){
var isStrictComparable = require('./isStrictComparable'),
    pairs = require('../object/pairs');

/**
 * Gets the propery names, values, and compare flags of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the match data of `object`.
 */
function getMatchData(object) {
  var result = pairs(object),
      length = result.length;

  while (length--) {
    result[length][2] = isStrictComparable(result[length][1]);
  }
  return result;
}

module.exports = getMatchData;

},{"../object/pairs":97,"./isStrictComparable":84}],77:[function(require,module,exports){
var isNative = require('../lang/isNative');

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

module.exports = getNative;

},{"../lang/isNative":91}],78:[function(require,module,exports){
var getLength = require('./getLength'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

module.exports = isArrayLike;

},{"./getLength":75,"./isLength":82}],79:[function(require,module,exports){
/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

module.exports = isIndex;

},{}],80:[function(require,module,exports){
var isArrayLike = require('./isArrayLike'),
    isIndex = require('./isIndex'),
    isObject = require('../lang/isObject');

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
      ? (isArrayLike(object) && isIndex(index, object.length))
      : (type == 'string' && index in object)) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

module.exports = isIterateeCall;

},{"../lang/isObject":92,"./isArrayLike":78,"./isIndex":79}],81:[function(require,module,exports){
var isArray = require('../lang/isArray'),
    toObject = require('./toObject');

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  var type = typeof value;
  if ((type == 'string' && reIsPlainProp.test(value)) || type == 'number') {
    return true;
  }
  if (isArray(value)) {
    return false;
  }
  var result = !reIsDeepProp.test(value);
  return result || (object != null && value in toObject(object));
}

module.exports = isKey;

},{"../lang/isArray":89,"./toObject":86}],82:[function(require,module,exports){
/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],83:[function(require,module,exports){
/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],84:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && !isObject(value);
}

module.exports = isStrictComparable;

},{"../lang/isObject":92}],85:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('./isIndex'),
    isLength = require('./isLength'),
    keysIn = require('../object/keysIn');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

module.exports = shimKeys;

},{"../lang/isArguments":88,"../lang/isArray":89,"../object/keysIn":96,"./isIndex":79,"./isLength":82}],86:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

module.exports = toObject;

},{"../lang/isObject":92}],87:[function(require,module,exports){
var baseToString = require('./baseToString'),
    isArray = require('../lang/isArray');

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `value` to property path array if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Array} Returns the property path array.
 */
function toPath(value) {
  if (isArray(value)) {
    return value;
  }
  var result = [];
  baseToString(value).replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
}

module.exports = toPath;

},{"../lang/isArray":89,"./baseToString":65}],88:[function(require,module,exports){
var isArrayLike = require('../internal/isArrayLike'),
    isObjectLike = require('../internal/isObjectLike');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

},{"../internal/isArrayLike":78,"../internal/isObjectLike":83}],89:[function(require,module,exports){
var getNative = require('../internal/getNative'),
    isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var arrayTag = '[object Array]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

module.exports = isArray;

},{"../internal/getNative":77,"../internal/isLength":82,"../internal/isObjectLike":83}],90:[function(require,module,exports){
var isObject = require('./isObject');

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 which returns 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

module.exports = isFunction;

},{"./isObject":92}],91:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isObjectLike = require('../internal/isObjectLike');

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isNative;

},{"../internal/isObjectLike":83,"./isFunction":90}],92:[function(require,module,exports){
/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],93:[function(require,module,exports){
var isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dateTag] = typedArrayTags[errorTag] =
typedArrayTags[funcTag] = typedArrayTags[mapTag] =
typedArrayTags[numberTag] = typedArrayTags[objectTag] =
typedArrayTags[regexpTag] = typedArrayTags[setTag] =
typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
function isTypedArray(value) {
  return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
}

module.exports = isTypedArray;

},{"../internal/isLength":82,"../internal/isObjectLike":83}],94:[function(require,module,exports){
var assignWith = require('../internal/assignWith'),
    baseAssign = require('../internal/baseAssign'),
    createAssigner = require('../internal/createAssigner');

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it's invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * **Note:** This method mutates `object` and is based on
 * [`Object.assign`](http://ecma-international.org/ecma-262/6.0/#sec-object.assign).
 *
 * @static
 * @memberOf _
 * @alias extend
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
 * // => { 'user': 'fred', 'age': 40 }
 *
 * // using a customizer callback
 * var defaults = _.partialRight(_.assign, function(value, other) {
 *   return _.isUndefined(value) ? other : value;
 * });
 *
 * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var assign = createAssigner(function(object, source, customizer) {
  return customizer
    ? assignWith(object, source, customizer)
    : baseAssign(object, source);
});

module.exports = assign;

},{"../internal/assignWith":46,"../internal/baseAssign":47,"../internal/createAssigner":67}],95:[function(require,module,exports){
var getNative = require('../internal/getNative'),
    isArrayLike = require('../internal/isArrayLike'),
    isObject = require('../lang/isObject'),
    shimKeys = require('../internal/shimKeys');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

module.exports = keys;

},{"../internal/getNative":77,"../internal/isArrayLike":78,"../internal/shimKeys":85,"../lang/isObject":92}],96:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('../internal/isIndex'),
    isLength = require('../internal/isLength'),
    isObject = require('../lang/isObject');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

},{"../internal/isIndex":79,"../internal/isLength":82,"../lang/isArguments":88,"../lang/isArray":89,"../lang/isObject":92}],97:[function(require,module,exports){
var keys = require('./keys'),
    toObject = require('../internal/toObject');

/**
 * Creates a two dimensional array of the key-value pairs for `object`,
 * e.g. `[[key1, value1], [key2, value2]]`.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the new array of key-value pairs.
 * @example
 *
 * _.pairs({ 'barney': 36, 'fred': 40 });
 * // => [['barney', 36], ['fred', 40]] (iteration order is not guaranteed)
 */
function pairs(object) {
  object = toObject(object);

  var index = -1,
      props = keys(object),
      length = props.length,
      result = Array(length);

  while (++index < length) {
    var key = props[index];
    result[index] = [key, object[key]];
  }
  return result;
}

module.exports = pairs;

},{"../internal/toObject":86,"./keys":95}],98:[function(require,module,exports){
/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

},{}],99:[function(require,module,exports){
var baseProperty = require('../internal/baseProperty'),
    basePropertyDeep = require('../internal/basePropertyDeep'),
    isKey = require('../internal/isKey');

/**
 * Creates a function that returns the property value at `path` on a
 * given object.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': { 'c': 2 } } },
 *   { 'a': { 'b': { 'c': 1 } } }
 * ];
 *
 * _.map(objects, _.property('a.b.c'));
 * // => [2, 1]
 *
 * _.pluck(_.sortBy(objects, _.property(['a', 'b', 'c'])), 'a.b.c');
 * // => [1, 2]
 */
function property(path) {
  return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
}

module.exports = property;

},{"../internal/baseProperty":62,"../internal/basePropertyDeep":63,"../internal/isKey":81}],100:[function(require,module,exports){
/**
 * Set attribute `name` to `val`, or get attr `name`.
 *
 * @param {Element} el
 * @param {String} name
 * @param {String} [val]
 * @api public
 */

module.exports = function(el, name, val) {
  // get
  if (arguments.length == 2) {
    return el.getAttribute(name);
  }

  // remove
  if (val === null) {
    return el.removeAttribute(name);
  }

  // set
  el.setAttribute(name, val);

  return el;
};
},{}],101:[function(require,module,exports){
module.exports = function(el) {

  var c;

  while (el.childNodes.length) {
    c = el.childNodes[0];
    el.removeChild(c);
  }

  return el;
};
},{}],102:[function(require,module,exports){
module.exports = require('component-closest');
},{"component-closest":105}],103:[function(require,module,exports){
module.exports = require('domify');
},{"domify":108}],104:[function(require,module,exports){
module.exports = require('component-query');
},{"component-query":107}],105:[function(require,module,exports){
var matches = require('matches-selector')

module.exports = function (element, selector, checkYoSelf, root) {
  element = checkYoSelf ? {parentNode: element} : element

  root = root || document

  // Make sure `element !== document` and `element != null`
  // otherwise we get an illegal invocation
  while ((element = element.parentNode) && element !== document) {
    if (matches(element, selector))
      return element
    // After `matches` on the edge case that
    // the selector matches the root
    // (when the root is not the document)
    if (element === root)
      return
  }
}

},{"matches-selector":106}],106:[function(require,module,exports){
/**
 * Module dependencies.
 */

try {
  var query = require('query');
} catch (err) {
  var query = require('component-query');
}

/**
 * Element prototype.
 */

var proto = Element.prototype;

/**
 * Vendor function.
 */

var vendor = proto.matches
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

/**
 * Expose `match()`.
 */

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (!el || el.nodeType !== 1) return false;
  if (vendor) return vendor.call(el, selector);
  var nodes = query.all(selector, el.parentNode);
  for (var i = 0; i < nodes.length; ++i) {
    if (nodes[i] == el) return true;
  }
  return false;
}

},{"component-query":107,"query":107}],107:[function(require,module,exports){
function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
  return exports;
};

},{}],108:[function(require,module,exports){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Tests for browser support.
 */

var innerHTMLBug = false;
var bugTestDiv;
if (typeof document !== 'undefined') {
  bugTestDiv = document.createElement('div');
  // Setup
  bugTestDiv.innerHTML = '  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';
  // Make sure that link elements get serialized correctly by innerHTML
  // This requires a wrapper element in IE
  innerHTMLBug = !bugTestDiv.getElementsByTagName('link').length;
  bugTestDiv = undefined;
}

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  // for script/link/style tags to work in IE6-8, you have to wrap
  // in a div with a non-whitespace character in front, ha!
  _default: innerHTMLBug ? [1, 'X<div>', '</div>'] : [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.polyline =
map.ellipse =
map.polygon =
map.circle =
map.text =
map.line =
map.path =
map.rect =
map.g = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return a DOM Node instance, which could be a TextNode,
 * HTML DOM Node of some kind (<div> for example), or a DocumentFragment
 * instance, depending on the contents of the `html` string.
 *
 * @param {String} html - HTML string to "domify"
 * @param {Document} doc - The `document` instance to create the Node for
 * @return {DOMNode} the TextNode, DOM Node, or DocumentFragment instance
 * @api private
 */

function parse(html, doc) {
  if ('string' != typeof html) throw new TypeError('String expected');

  // default to the global `document` object
  if (!doc) doc = document;

  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return doc.createTextNode(html);

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = doc.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = doc.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = doc.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

},{}],109:[function(require,module,exports){
'use strict';

/**
 * Is an element of the given BPMN type?
 *
 * @param  {djs.model.Base|ModdleElement} element
 * @param  {String} type
 *
 * @return {Boolean}
 */
function is(element, type) {
  var bo = getBusinessObject(element);

  return bo && (typeof bo.$instanceOf === 'function') && bo.$instanceOf(type);
}

module.exports.is = is;


/**
 * Return the business object for a given element.
 *
 * @param  {djs.model.Base|ModdleElement} element
 *
 * @return {ModdleElement}
 */
function getBusinessObject(element) {
  return (element && element.businessObject) || element;
}

module.exports.getBusinessObject = getBusinessObject;

},{}]},{},[1]);
