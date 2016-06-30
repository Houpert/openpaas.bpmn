(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('esn.bpmn')
  .factory('bpmnPropertiesPanelProvider', function() {
    return require('bpmn-js-properties-panel/lib/provider/camunda');
  });

},{"bpmn-js-properties-panel/lib/provider/camunda":48}],2:[function(require,module,exports){
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

},{"bpmn-js/lib/util/ModelUtil":168,"ids":85,"lodash/collection/forEach":92,"min-dom/lib/clear":158,"min-dom/lib/domify":160,"min-dom/lib/query":161}],4:[function(require,module,exports){
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

},{"../helper/CmdHelper":15,"bpmn-js/lib/util/ModelUtil":168}],5:[function(require,module,exports){
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

},{"./SelectEntryFactory":9,"lodash/collection/find":91,"lodash/object/assign":150,"min-dom/lib/query":161}],6:[function(require,module,exports){
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

},{"../helper/CmdHelper":15,"./CheckboxEntryFactory":4,"./ComboEntryFactory":5,"./LabelFactory":7,"./LinkEntryFactory":8,"./SelectEntryFactory":9,"./TableEntryFactory":10,"./TextAreaEntryFactory":11,"./TextInputEntryFactory":12,"./ValidationAwareTextInput":13,"bpmn-js/lib/util/ModelUtil":168}],7:[function(require,module,exports){
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

},{"lodash/collection/forEach":92}],10:[function(require,module,exports){
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
},{"../helper/CmdHelper":15,"lodash/collection/filter":90,"lodash/collection/forEach":92,"lodash/object/keys":151,"min-dom/lib/attr":156,"min-dom/lib/closest":159,"min-dom/lib/domify":160,"min-dom/lib/query":161}],11:[function(require,module,exports){
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

},{"min-dom/lib/query":161}],13:[function(require,module,exports){
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

var map = require('lodash/collection/map');

var extensionElementsHelper = require('./ExtensionElementsHelper');

/**
 * Returns true if the attribute 'camunda:asyncBefore' is set
 * to true.
 *
 * @param  {ModdleElement} bo
 *
 * @return {boolean} a boolean value
 */
function isAsyncBefore(bo) {
  return !!(bo.get('camunda:asyncBefore') || bo.get('camunda:async'));
}

module.exports.isAsyncBefore = isAsyncBefore;

/**
 * Returns true if the attribute 'camunda:asyncAfter' is set
 * to true.
 *
 * @param  {ModdleElement} bo
 *
 * @return {boolean} a boolean value
 */
function isAsyncAfter(bo) {
  return !!bo.get('camunda:asyncAfter');
}

module.exports.isAsyncAfter = isAsyncAfter;

/**
 * Returns true if the attribute 'camunda:exclusive' is set
 * to true.
 *
 * @param  {ModdleElement} bo
 *
 * @return {boolean} a boolean value
 */
function isExclusive(bo) {
  return !!bo.get('camunda:exclusive');
}

module.exports.isExclusive = isExclusive;

/**
 * Get first 'camunda:FailedJobRetryTimeCycle' from the business object.
 *
 * @param  {ModdleElement} bo
 *
 * @return {Array<ModdleElement>} a list of 'camunda:FailedJobRetryTimeCycle'
 */
function getFailedJobRetryTimeCycle(bo) {
  return (extensionElementsHelper.getExtensionElements(bo, 'camunda:FailedJobRetryTimeCycle') || [])[0];
}

module.exports.getFailedJobRetryTimeCycle = getFailedJobRetryTimeCycle;

/**
 * Removes all existing 'camunda:FailedJobRetryTimeCycle' from the business object
 *
 * @param  {ModdleElement} bo
 *
 * @return {Array<ModdleElement>} a list of 'camunda:FailedJobRetryTimeCycle'
 */
function removeFailedJobRetryTimeCycle(bo, element) {
  var retryTimeCycles = extensionElementsHelper.getExtensionElements(bo, 'camunda:FailedJobRetryTimeCycle');
  return map(retryTimeCycles, function(cycle) {
    return extensionElementsHelper.removeEntry(bo, element, cycle);
  });
}

module.exports.removeFailedJobRetryTimeCycle = removeFailedJobRetryTimeCycle;
},{"./ExtensionElementsHelper":18,"lodash/collection/map":93}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/forEach":92}],18:[function(require,module,exports){
'use strict';

var cmdHelper = require('./CmdHelper'),
    elementHelper = require('./ElementHelper');

var is = require('bpmn-js/lib/util/ModelUtil').is;

var ExtensionElementsHelper = {};

var getExtensionElements = function(bo) {
  return bo.get('extensionElements');
};

ExtensionElementsHelper.getExtensionElements = function(bo, type) {
  var extensionElements = getExtensionElements(bo);
  if (typeof extensionElements !== 'undefined') {
    var extensionValues = extensionElements.get('values');
    if (typeof extensionValues !== 'undefined') {
      var elements = extensionValues.filter(function(value) {
        return is(value, type);
      });
      if (elements.length) {
        return elements;
      }
    }
  }
};

ExtensionElementsHelper.addEntry = function(bo, element, entry, bpmnFactory) {
  var extensionElements = bo.get('extensionElements');

  // if there is no extensionElements list, create one
  if( !extensionElements ) {
    // TODO: Ask Daniel which operation costs more
    extensionElements = elementHelper.createElement('bpmn:ExtensionElements', { values: [entry] }, bo, bpmnFactory);
    return { extensionElements : extensionElements };
  } else {
    // add new failedJobRetryExtensionElement to existing extensionElements list
    return cmdHelper.addElementsTolist(element, extensionElements, 'values', [entry]);
  }
};

ExtensionElementsHelper.removeEntry = function(bo, element, entry) {
  var extensionElements = bo.get('extensionElements');

  if( !extensionElements ) {
    // return an empty command when there is no extensionElements list
    return {};
  }

  return cmdHelper.removeElementsFromList(element, extensionElements, 'values', 'extensionElements', [entry]);
};

module.exports = ExtensionElementsHelper;
},{"./CmdHelper":15,"./ElementHelper":16,"bpmn-js/lib/util/ModelUtil":168}],19:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    getExtensionElements = require('./ExtensionElementsHelper').getExtensionElements;

var FormHelper = {};

module.exports = FormHelper;


/**
 * Return the form type of an element: Checks if the 'camunda:FormData'
 * exists in the extensions elements and returns 'form-data' when true.
 * If it does not exist, 'form-key' is returned.
 *
 * @param  {djs.model.Base} element
 *
 * @return {string} a form type (either 'form-key' or 'form-value')
 */
FormHelper.getFormType = function(element) {
  var bo = getBusinessObject(element),
      formData = getExtensionElements(bo, 'camunda:FormData'),
      formType = 'form-key';

  if (formData) {
    formType = 'form-data';
  }
  return formType;
};


/**
 * Return all form fields existing in the business object, and
 * an empty array if none exist.
 *
 * @param  {djs.model.Base} element
 *
 * @return {Array} a list of form field objects
 */
FormHelper.getFormFields = function(element) {
  var bo = getBusinessObject(element),
      formData = getExtensionElements(bo, 'camunda:FormData');

  if (typeof formData !== 'undefined') {
    return formData[0].fields;
  } else {
    return [];
  }
};


/**
 * Get a form field from the business object at given index
 *
 * @param {djs.model.Base} element
 * @param {number} idx
 *
 * @return {ModdleElement} the form field
 */
FormHelper.getFormField = function(element, idx) {

  var formFields = this.getFormFields(element);

  return formFields[idx];
};


/**
 * Get all constraints for a specific form field from the business object
 *
 * @param  {ModdleElement} formField
 *
 * @return {Array<ModdleElement>} a list of constraint objects
 */
FormHelper.getConstraints = function(formField) {
  if(formField && formField.validation && formField.validation.constraints) {
    return formField.validation.constraints;
  }
  return [];
};


/**
 * Get all camunda:value objects for a specific form field from the business object
 *
 * @param  {ModdleElement} formField
 *
 * @return {Array<ModdleElement>} a list of camunda:value objects
 */
FormHelper.getEnumValues = function(formField) {
  if(formField && formField.values) {
    return formField.values;
  }
  return [];
};


},{"./ExtensionElementsHelper":18,"bpmn-js/lib/util/ModelUtil":168}],20:[function(require,module,exports){
'use strict';

var ModelUtil         = require('bpmn-js/lib/util/ModelUtil'),
    is                = ModelUtil.is,
    getBusinessObject = ModelUtil.getBusinessObject;

var eventDefinitionHelper = require('./EventDefinitionHelper');
var extensionsElementHelper = require('./ExtensionElementsHelper');

var ImplementationTypeHelper = {};

module.exports = ImplementationTypeHelper;

/**
 * Returns 'true' if the given element is 'camunda:ServiceTaskLike'
 *
 * @param {djs.model.Base} element
 *
 * @return {boolean} a boolean value
 */
ImplementationTypeHelper.isServiceTaskLike = function(element) {
  return is(element, 'camunda:ServiceTaskLike');
};

/**
 * Returns 'true' if the given element is 'camunda:DmnCapable'
 *
 * @param {djs.model.Base} element
 *
 * @return {boolean} a boolean value
 */
ImplementationTypeHelper.isDmnCapable = function(element) {
  return is(element, 'camunda:DmnCapable');
};

/**
 * Returns 'true' if the given element is 'camunda:ExternalCapable'
 *
 * @param {djs.model.Base} element
 *
 * @return {boolean} a boolean value
 */
ImplementationTypeHelper.isExternalCapable = function(element) {
  return is(element, 'camunda:ExternalCapable');
};

/**
 * Returns 'true' if the given element is 'camunda:ExecutionListener' or
 * 'camunda:TaskListener'
 *
 * @param {djs.model.Base} element
 *
 * @return {boolean} a boolean value
 */
ImplementationTypeHelper.isListener = function(element) {
  return is(element, 'camunda:TaskListener') || is(element, 'camunda:ExecutionListener');
};

/**
 * Get a 'camunda:ServiceTaskLike' business object.
 *
 * If the given element is not a 'camunda:ServiceTaskLike', then 'false'
 * is returned.
 *
 * @param {djs.model.Base} element
 *
 * @return {ModdleElement} the 'camunda:ServiceTaskLike' business object
 */
ImplementationTypeHelper.getServiceTaskLikeBusinessObject = function(element) {

  if (is(element, 'bpmn:IntermediateThrowEvent') || is(element, 'bpmn:EndEvent')) {
     /**
      * change business object to 'messageEventDefinition' when
      * the element is a message intermediate throw event or message end event
      * because the camunda extensions (e.g. camunda:class) are in the message
      * event definition tag and not in the intermediate throw event or end event tag
      */
     var messageEventDefinition = eventDefinitionHelper.getMessageEventDefinition(element);
     if (messageEventDefinition) {
       element = messageEventDefinition;
     }    
  }

  return this.isServiceTaskLike(element) && getBusinessObject(element);

};

/**
 * Returns the implementation type of the given element.
 *
 * Possible implementation types are:
 * - dmn
 * - connector
 * - external
 * - class
 * - expression
 * - delegateExpression
 * - script
 * - or undefined, when no matching implementation type is found
 *
 * @param  {djs.model.Base} element
 *
 * @return {String} the implementation type
 */
ImplementationTypeHelper.getImplementationType = function(element) {

  var bo = this.getServiceTaskLikeBusinessObject(element);

  if (!bo) {
    if (this.isListener(element)) {
      bo = element;
    }
    else {
      return;
    }
  }

  if (this.isDmnCapable(bo)) {
    var decisionRef = bo.get('camunda:decisionRef');
    if (typeof decisionRef !== 'undefined') {
      return 'dmn';
    }
  }

  if (this.isServiceTaskLike(bo)) {
    var connectors = extensionsElementHelper.getExtensionElements(bo, 'camunda:Connector');
    if (typeof connectors !== 'undefined') {
      return 'connector';
    }
  }

  if (this.isExternalCapable(bo)) {
    var type = bo.get('camunda:type');
    if (type === 'external') {
      return 'external';
    }
  }

  var cls = bo.get('camunda:class');
  if (typeof cls !== 'undefined') {
    return 'class';
  }

  var expression = bo.get('camunda:expression');
  if (typeof expression !== 'undefined') {
    return 'expression';
  }

  var delegateExpression = bo.get('camunda:delegateExpression');
  if (typeof delegateExpression !== 'undefined') {
    return 'delegateExpression';
  }

  if (this.isListener(bo)) {
    var script = bo.get('script');
    if (typeof script !== 'undefined') {
      return 'script';
    }
  }

};
},{"./EventDefinitionHelper":17,"./ExtensionElementsHelper":18,"bpmn-js/lib/util/ModelUtil":168}],21:[function(require,module,exports){
'use strict';

var ModelUtil         = require('bpmn-js/lib/util/ModelUtil'),
    is                = ModelUtil.is,
    getBusinessObject = ModelUtil.getBusinessObject;

var extensionElementsHelper = require('./ExtensionElementsHelper'),
    implementationTypeHelper = require('./ImplementationTypeHelper');

var InputOutputHelper = {};

module.exports = InputOutputHelper;

function getElements(bo, type, prop) {
  var elems = extensionElementsHelper.getExtensionElements(bo, type) || [];
  return !prop ? elems : (elems[0] || {})[prop] || [];
}

function getParameters(element, prop, insideConnector) {
  var inputOutput = InputOutputHelper.getInputOutput(element, insideConnector);
  return (inputOutput && inputOutput.get(prop)) || [];
}

/**
 * Get a inputOutput from the business object
 *
 * @param {djs.model.Base} element
 * @param  {boolean} insideConnector
 *
 * @return {ModdleElement} the inputOutput object
 */
InputOutputHelper.getInputOutput = function(element, insideConnector) {
  if (!insideConnector) {
    var bo = getBusinessObject(element);
    return (getElements(bo, 'camunda:InputOutput') || [])[0];
  }
  var connector = this.getConnector(element);
  return connector && connector.get('inputOutput');
};

/**
 * Get a connector from the business object
 *
 * @param {djs.model.Base} element
 *
 * @return {ModdleElement} the connector object
 */
InputOutputHelper.getConnector = function(element) {
  var bo = implementationTypeHelper.getServiceTaskLikeBusinessObject(element);
  return bo && (getElements(bo, 'camunda:Connector') || [])[0];  
};

/**
 * Return all input parameters existing in the business object, and
 * an empty array if none exist.
 *
 * @param  {djs.model.Base} element
 * @param  {boolean} insideConnector
 *
 * @return {Array} a list of input parameter objects
 */
InputOutputHelper.getInputParameters = function(element, insideConnector) {
  return getParameters.apply(this, [ element, 'inputParameters', insideConnector ]);
};

/**
 * Return all output parameters existing in the business object, and
 * an empty array if none exist.
 *
 * @param  {djs.model.Base} element
 * @param  {boolean} insideConnector
 *
 * @return {Array} a list of output parameter objects
 */
InputOutputHelper.getOutputParameters = function(element, insideConnector) {
  return getParameters.apply(this, [ element, 'outputParameters', insideConnector ]);
};

/**
 * Get a input parameter from the business object at given index
 *
 * @param {djs.model.Base} element
 * @param  {boolean} insideConnector
 * @param {number} idx
 *
 * @return {ModdleElement} input parameter
 */
InputOutputHelper.getInputParameter = function(element, insideConnector, idx) {
  return this.getInputParameters(element, insideConnector)[idx];
};

/**
 * Get a output parameter from the business object at given index
 *
 * @param {djs.model.Base} element
 * @param  {boolean} insideConnector
 * @param {number} idx
 *
 * @return {ModdleElement} output parameter
 */
InputOutputHelper.getOutputParameter = function(element, insideConnector, idx) {
  return this.getOutputParameters(element, insideConnector)[idx];
};

/**
 * Returns 'true' if the given element supports inputOutput
 *
 * @param {djs.model.Base} element
 * @param  {boolean} insideConnector
 *
 * @return {boolean} a boolean value
 */
InputOutputHelper.isInputOutputSupported = function(element, insideConnector) {
  var bo = getBusinessObject(element);
  return insideConnector ||
         (is(bo, 'bpmn:FlowNode') &&
         !is(bo, 'bpmn:StartEvent') &&
         !is(bo, 'bpmn:BoundaryEvent') &&
         !(is(bo, 'bpmn:SubProcess') && bo.get('triggeredByEvent')));
};

/**
 * Returns 'true' if the given element supports output parameters
 *
 * @param {djs.model.Base} element
 * @param  {boolean} insideConnector
 *
 * @return {boolean} a boolean value
 */
InputOutputHelper.areOutputParametersSupported = function(element, insideConnector) {
  var bo = getBusinessObject(element);
  return insideConnector || (!is(bo, 'bpmn:EndEvent') && !bo.loopCharacteristics);
};

},{"./ExtensionElementsHelper":18,"./ImplementationTypeHelper":20,"bpmn-js/lib/util/ModelUtil":168}],22:[function(require,module,exports){
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
},{"./CmdHelper":15,"bpmn-js/lib/util/ModelUtil":168}],23:[function(require,module,exports){
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
},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"bpmn-js/lib/util/ModelUtil":168}],24:[function(require,module,exports){
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

},{"../../../helper/EventDefinitionHelper":17,"./implementation/CompensateEventDefinition":29,"./implementation/ErrorEventDefinition":31,"./implementation/EscalationEventDefinition":32,"./implementation/MessageEventDefinition":34,"./implementation/SignalEventDefinition":36,"./implementation/TimerEventDefinition":37,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/forEach":92}],25:[function(require,module,exports){
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

},{"../../../Utils":3,"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"bpmn-js/lib/util/ModelUtil":168}],26:[function(require,module,exports){
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


},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/forEach":92}],27:[function(require,module,exports){
'use strict';

var nameEntryFactory = require('./implementation/Name'),
    is = require('bpmn-js/lib/util/ModelUtil').is;

module.exports = function(group, element) {

  if (!is(element, 'bpmn:Collaboration')) {

    // name
    group.entries = group.entries.concat(nameEntryFactory(element));

  }

};

},{"./implementation/Name":35,"bpmn-js/lib/util/ModelUtil":168}],28:[function(require,module,exports){
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

},{"../../../factory/EntryFactory":6,"../../../helper/ParticipantHelper":22,"./implementation/Name":35,"bpmn-js/lib/util/ModelUtil":168}],29:[function(require,module,exports){
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

},{"../../../../Utils":3,"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"../../../../helper/EventDefinitionHelper":17,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/filter":90,"lodash/collection/find":91,"lodash/collection/forEach":92}],30:[function(require,module,exports){
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

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15}],31:[function(require,module,exports){
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

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"./ElementReferenceProperty":30,"./EventDefinitionReference":33}],32:[function(require,module,exports){
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

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"./ElementReferenceProperty":30,"./EventDefinitionReference":33}],33:[function(require,module,exports){
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

},{"../../../../Utils":3,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"lodash/collection/find":91,"lodash/collection/forEach":92,"min-dom/lib/attr":156,"min-dom/lib/domify":160,"min-dom/lib/query":161}],34:[function(require,module,exports){
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

},{"./ElementReferenceProperty":30,"./EventDefinitionReference":33}],35:[function(require,module,exports){
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

},{"../../../../factory/EntryFactory":6}],36:[function(require,module,exports){
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

},{"./ElementReferenceProperty":30,"./EventDefinitionReference":33}],37:[function(require,module,exports){
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

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16}],38:[function(require,module,exports){
'use strict';

var inherits = require('inherits');

var PropertiesActivator = require('../../PropertiesActivator');

var asyncCapableHelper = require('../../helper/AsyncCapableHelper'),
    ImplementationTypeHelper = require('../../helper/ImplementationTypeHelper');

// bpmn properties
var processProps = require('../bpmn/parts/ProcessProps'),
    eventProps = require('../bpmn/parts/EventProps'),
    linkProps = require('../bpmn/parts/LinkProps'),
    documentationProps = require('../bpmn/parts/DocumentationProps'),
    idProps = require('../bpmn/parts/IdProps'),
    nameProps = require('../bpmn/parts/NameProps');

// camunda properties
var serviceTaskDelegateProps = require('./parts/ServiceTaskDelegateProps'),
    userTaskProps = require('./parts/UserTaskProps'),
    asynchronousContinuationProps = require('./parts/AsynchronousContinuationProps'),
    callActivityProps = require('./parts/CallActivityProps'),
    multiInstanceProps = require('./parts/MultiInstanceLoopProps'),
    sequenceFlowProps = require('./parts/SequenceFlowProps'),
    executionListenerProps = require('./parts/ExecutionListenerProps'),
    scriptProps = require('./parts/ScriptTaskProps'),
    taskListenerProps = require('./parts/TaskListenerProps'),
    formProps = require('./parts/FormProps'),
    startEventInitiator = require('./parts/StartEventInitiator'),
    variableMapping = require('./parts/VariableMappingProps'),
    versionTag = require('./parts/VersionTagProps');

var elementTemplateChooserProps = require('./element-templates/parts/ChooserProps'),
    elementTemplateCustomProps = require('./element-templates/parts/CustomProps');

// Input/Output
var inputOutput = require('./parts/InputOutputProps'),
    inputOutputParameter = require('./parts/InputOutputParameterProps');

// Connector
var connectorDetails = require('./parts/ConnectorDetailProps'),
    connectorInputOutput = require('./parts/ConnectorInputOutputProps'),
    connectorInputOutputParameter = require('./parts/ConnectorInputOutputParameterProps');

// properties
var properties = require('./parts/PropertiesProps');

// job configuration
var jobConfiguration = require('./parts/JobConfigurationProps');

// external task configuration
var externalTaskConfiguration = require('./parts/ExternalTaskConfigurationProps');

var is = require('bpmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    eventDefinitionHelper = require('../../helper/EventDefinitionHelper'),
    implementationTypeHelper = require('../../helper/ImplementationTypeHelper');

// helpers ////////////////////////////////////////

var isExternalTaskPriorityEnabled = function(element) {
  var businessObject = getBusinessObject(element);

  // show only if element is a process, a participant ...
  if (is(element, 'bpmn:Process') || is(element, 'bpmn:Participant') && businessObject.get('processRef'))  {
    return true;
  }

  var externalBo = ImplementationTypeHelper.getServiceTaskLikeBusinessObject(element),
      isExternalTask = ImplementationTypeHelper.getImplementationType(externalBo) === 'external';

  // ... or an external task with selected external implementation type
  return !!ImplementationTypeHelper.isExternalCapable(externalBo) && isExternalTask;
};

var isJobConfigEnabled = function(element) {
  var businessObject = getBusinessObject(element);

  if (is(element, 'bpmn:Process') || is(element, 'bpmn:Participant') && businessObject.get('processRef'))  {
    return true;
  }

  // async behavior
  var bo = getBusinessObject(element);
  if (asyncCapableHelper.isAsyncBefore(bo) || asyncCapableHelper.isAsyncAfter(bo)) {
    return true;
  }

  // timer definition
  if (is(element, 'bpmn:Event'))  {
    return !!eventDefinitionHelper.getTimerEventDefinition(element);
  }

  return false;
};

var getInputOutputParameterLabel = function(param) {

  if (is(param, 'camunda:InputParameter')) {
    return 'Input Parameter';
  }

  if (is(param, 'camunda:OutputParameter')) {
    return 'Output Parameter';
  }

  return '';
};

function createGeneralTabGroups(element, bpmnFactory, elementRegistry, elementTemplates) {

  var generalGroup = {
    id: 'general',
    label: 'General',
    entries: []
  };
  idProps(generalGroup, element, elementRegistry);
  nameProps(generalGroup, element);
  versionTag(generalGroup, element);
  processProps(generalGroup, element);
  elementTemplateChooserProps(generalGroup, element, elementTemplates);

  var customFieldsGroup = {
    id: 'customField',
    label: 'Custom Fields',
    entries: []
  };
  elementTemplateCustomProps(customFieldsGroup, element, elementTemplates, bpmnFactory);

  var detailsGroup = {
    id: 'details',
    label: 'Details',
    entries: []
  };
  serviceTaskDelegateProps(detailsGroup, element, bpmnFactory);
  userTaskProps(detailsGroup, element);
  scriptProps(detailsGroup, element, bpmnFactory);
  linkProps(detailsGroup, element);
  callActivityProps(detailsGroup, element, bpmnFactory);
  eventProps(detailsGroup, element, bpmnFactory, elementRegistry);
  sequenceFlowProps(detailsGroup, element, bpmnFactory);
  startEventInitiator(detailsGroup, element); // this must be the last element of the details group!

  var multiInstanceGroup = {
    id: 'multiInstance',
    label: 'Multi Instance',
    entries: []
  };
  multiInstanceProps(multiInstanceGroup, element, bpmnFactory);

  var asyncGroup = {
    id : 'async',
    label: 'Asynchronous Continuations',
    entries : []
  };
  asynchronousContinuationProps(asyncGroup, element, bpmnFactory);

  var jobConfigurationGroup = {
    id : 'jobConfiguration',
    label : 'Job Configuration',
    entries : [],
    enabled: isJobConfigEnabled
  };
  jobConfiguration(jobConfigurationGroup, element, bpmnFactory);

  var externalTaskGroup = {
    id : 'externalTaskConfiguration',
    label : 'External Task Configuration',
    entries : [],
    enabled: isExternalTaskPriorityEnabled
  };
  externalTaskConfiguration(externalTaskGroup, element, bpmnFactory);

  var documentationGroup = {
    id: 'documentation',
    label: 'Documentation',
    entries: []
  };
  documentationProps(documentationGroup, element, bpmnFactory);

  return [
    generalGroup,
    customFieldsGroup,
    detailsGroup,
    externalTaskGroup,
    multiInstanceGroup,
    asyncGroup,
    jobConfigurationGroup,
    documentationGroup
  ];

}

function createVariablesTabGroups(element, bpmnFactory, elementRegistry) {
  var variablesGroup = {
    id : 'variables',
    label : 'Variables',
    entries: []
  };
  variableMapping(variablesGroup, element, bpmnFactory);

  return [
    variablesGroup
  ];
}

function createFormsTabGroups(element, bpmnFactory, elementRegistry) {
  var formGroup = {
    id : 'forms',
    label : 'Forms',
    entries: []
  };
  formProps(formGroup, element, bpmnFactory);

  return [
    formGroup
  ];
}

function createListenersTabGroups(element, bpmnFactory, elementRegistry) {

  var executionListenersGroup = {
    id : 'executionListeners',
    label: 'Execution Listeners',
    entries: []
  };
  executionListenerProps(executionListenersGroup, element, bpmnFactory);

  var taskListenersGroup = {
    id : 'taskListeners',
    label: 'Task Listeners',
    entries: []
  };
  taskListenerProps(taskListenersGroup, element, bpmnFactory);

  return [
    executionListenersGroup,
    taskListenersGroup
  ];
}

function createInputOutputTabGroups(element, bpmnFactory, elementRegistry) {

  var inputOutputGroup = {
    id: 'input-output',
    label: 'Parameters',
    entries: []
  };

  var options = inputOutput(inputOutputGroup, element, bpmnFactory);

  var inputOutputParameterGroup = {
    id: 'input-output-parameter',
    entries: [],
    enabled: function(element, node) {
      return options.getSelectedParameter(element, node);
    },
    label: function(element, node) {
      var param = options.getSelectedParameter(element, node);
      return getInputOutputParameterLabel(param);
    }
  };

  inputOutputParameter(inputOutputParameterGroup, element, bpmnFactory, options);

  return [
    inputOutputGroup,
    inputOutputParameterGroup
  ];
}

function createConnectorTabGroups(element, bpmnFactory, elementRegistry) {
  var connectorDetailsGroup = {
    id: 'connector-details',
    label: 'Details',
    entries: []
  };

  connectorDetails(connectorDetailsGroup, element, bpmnFactory);

  var connectorInputOutputGroup = {
    id: 'connector-input-output',
    label: 'Input/Output',
    entries: []
  };

  var options = connectorInputOutput(connectorInputOutputGroup, element, bpmnFactory);

  var connectorInputOutputParameterGroup = {
    id: 'connector-input-output-parameter',
    entries: [],
    enabled: function(element, node) {
      return options.getSelectedParameter(element, node);
    },
    label: function(element, node) {
      var param = options.getSelectedParameter(element, node);
      return getInputOutputParameterLabel(param);
    }
  };

  connectorInputOutputParameter(connectorInputOutputParameterGroup, element, bpmnFactory, options);

  return [
    connectorDetailsGroup,
    connectorInputOutputGroup,
    connectorInputOutputParameterGroup
  ];
}

function createExtensionElementsGroups(element, bpmnFactory, elementRegistry) {

  var propertiesGroup = {
    id : 'extensionElements-properties',
    label: 'Properties',
    entries: []
  };
  properties(propertiesGroup, element, bpmnFactory);

  return [
    propertiesGroup
  ];
}

// Camunda Properties Provider /////////////////////////////////////


/**
 * A properties provider for Camunda related properties.
 *
 * @param {EventBus} eventBus
 * @param {BpmnFactory} bpmnFactory
 * @param {ElementRegistry} elementRegistry
 * @param {ElementTemplates} elementTemplates
 */
function CamundaPropertiesProvider(eventBus, bpmnFactory, elementRegistry, elementTemplates) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {

    var generalTab = {
      id: 'general',
      label: 'General',
      groups: createGeneralTabGroups(
                  element, bpmnFactory,
                  elementRegistry, elementTemplates)
    };

    var variablesTab = {
      id: 'variables',
      label: 'Variables',
      groups: createVariablesTabGroups(element, bpmnFactory, elementRegistry)
    };

    var formsTab = {
      id: 'forms',
      label: 'Forms',
      groups: createFormsTabGroups(element, bpmnFactory, elementRegistry)
    };

    var listenersTab = {
      id: 'listeners',
      label: 'Listeners',
      groups: createListenersTabGroups(element, bpmnFactory, elementRegistry)
    };

    var inputOutputTab = {
      id: 'input-output',
      label: 'Input/Output',
      groups: createInputOutputTabGroups(element, bpmnFactory, elementRegistry)
    };

    var connectorTab = {
      id: 'connector',
      label: 'Connector',
      groups: createConnectorTabGroups(element, bpmnFactory, elementRegistry),
      enabled: function(element) {
        var bo = implementationTypeHelper.getServiceTaskLikeBusinessObject(element);
        return bo && implementationTypeHelper.getImplementationType(bo) === 'connector';
      }
    };

    var extensionsTab = {
      id: 'extensionElements',
      label: 'Extensions',
      groups: createExtensionElementsGroups(element, bpmnFactory, elementRegistry)
    };

    return [
      generalTab,
      variablesTab,
      connectorTab,
      formsTab,
      listenersTab,
      inputOutputTab,
      extensionsTab
    ];
  };

}

CamundaPropertiesProvider.$inject = [
  'eventBus',
  'bpmnFactory',
  'elementRegistry',
  'elementTemplates'
];

inherits(CamundaPropertiesProvider, PropertiesActivator);

module.exports = CamundaPropertiesProvider;

},{"../../PropertiesActivator":2,"../../helper/AsyncCapableHelper":14,"../../helper/EventDefinitionHelper":17,"../../helper/ImplementationTypeHelper":20,"../bpmn/parts/DocumentationProps":23,"../bpmn/parts/EventProps":24,"../bpmn/parts/IdProps":25,"../bpmn/parts/LinkProps":26,"../bpmn/parts/NameProps":27,"../bpmn/parts/ProcessProps":28,"./element-templates/parts/ChooserProps":46,"./element-templates/parts/CustomProps":47,"./parts/AsynchronousContinuationProps":49,"./parts/CallActivityProps":50,"./parts/ConnectorDetailProps":51,"./parts/ConnectorInputOutputParameterProps":52,"./parts/ConnectorInputOutputProps":53,"./parts/ExecutionListenerProps":54,"./parts/ExternalTaskConfigurationProps":55,"./parts/FormProps":56,"./parts/InputOutputParameterProps":57,"./parts/InputOutputProps":58,"./parts/JobConfigurationProps":59,"./parts/MultiInstanceLoopProps":60,"./parts/PropertiesProps":61,"./parts/ScriptTaskProps":62,"./parts/SequenceFlowProps":63,"./parts/ServiceTaskDelegateProps":64,"./parts/StartEventInitiator":65,"./parts/TaskListenerProps":66,"./parts/UserTaskProps":67,"./parts/VariableMappingProps":68,"./parts/VersionTagProps":69,"bpmn-js/lib/util/ModelUtil":168,"inherits":87}],39:[function(require,module,exports){
'use strict';

/**
 * Create an input parameter representing the given
 * binding and value.
 *
 * @param {PropertyBinding} binding
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement}
 */
function createInputParameter(binding, value, bpmnFactory) {
  var scriptFormat = binding.scriptFormat,
      parameterValue,
      parameterDefinition;

  if (scriptFormat) {
    parameterDefinition = bpmnFactory.create('camunda:Script', {
      scriptFormat: scriptFormat,
      value: value
    });
  } else {
    parameterValue = value;
  }

  return bpmnFactory.create('camunda:InputParameter', {
    name: binding.name,
    value: parameterValue,
    definition: parameterDefinition
  });
}

module.exports.createInputParameter = createInputParameter;


/**
 * Create an output parameter representing the given
 * binding and value.
 *
 * @param {PropertyBinding} binding
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement}
 */
function createOutputParameter(binding, value, bpmnFactory) {
  var scriptFormat = binding.scriptFormat,
      parameterValue,
      parameterDefinition;

  if (scriptFormat) {
    parameterDefinition = bpmnFactory.create('camunda:Script', {
      scriptFormat: scriptFormat,
      value: binding.source
    });
  } else {
    parameterValue = binding.source;
  }

  return bpmnFactory.create('camunda:OutputParameter', {
    name: value,
    value: parameterValue,
    definition: parameterDefinition
  });
}

module.exports.createOutputParameter = createOutputParameter;

/**
 * Create camunda property from the given binding.
 *
 * @param {PropertyBinding} binding
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {ModdleElement}
 */
function createCamundaProperty(binding, value, bpmnFactory) {
  return bpmnFactory.create('camunda:Property', {
    name: binding.name,
    value: value || ''
  });
}

module.exports.createCamundaProperty = createCamundaProperty;
},{}],40:[function(require,module,exports){
'use strict';

var inherits = require('inherits');

var getTemplate = require('./Helper').getTemplate;

var PropertiesActivator = require('../../../PropertiesActivator');

var HIGHER_PRIORITY = 1100;

/**
 * Applies template visibility settings.
 *
 * Controlled using `entriesVisible` on template config object:
 *
 * ```json
 *     "entriesVisible": {
 *       "_all": true|false,
 *       "entryName": true|false,
 *       ...
 *     }
 * ```
 *
 * @param {EventBus} eventBus
 * @param {ElementTemplates} elementTemplates
 */
function CustomElementsPropertiesActivator(eventBus, elementTemplates) {
  PropertiesActivator.call(this, eventBus, HIGHER_PRIORITY);

  this.isEntryVisible = function(entry, element) {

    var template = getTemplate(element, elementTemplates);

    if (template && !isEntryVisible(entry, template)) {
      return false;
    }
  };

  this.isPropertyEditable = function(entry, propertyName, element) {

    var template = getTemplate(element, elementTemplates);

    if (template && !isEntryEditable(entry, template)) {
      return false;
    }
  };
}

CustomElementsPropertiesActivator.$inject = [ 'eventBus', 'elementTemplates' ];

inherits(CustomElementsPropertiesActivator, PropertiesActivator);

module.exports = CustomElementsPropertiesActivator;



////// helpers ////////////////////////////////////


var CUSTOM_PROPERTIES_PATTERN = /^custom-/;

var DEFAULT_ENTRIES_VISIBLE = {
  _all: false,
  id: true,
  name: true
};

function isCustomEntry(entry) {
  return CUSTOM_PROPERTIES_PATTERN.test(entry.id);
}

function isEntryVisible(entry, template) {

  var entryId = entry.id;

  if (entryId === 'elementTemplate-chooser' || isCustomEntry(entry)) {
    return true;
  }

  var entriesVisible = template.entriesVisible || DEFAULT_ENTRIES_VISIBLE;

  if (typeof entriesVisible === 'boolean') {
    return entriesVisible;
  }

  var defaultVisible = entriesVisible._all || false,
      entryVisible = entriesVisible[entryId];

  // d = true, e = false => false
  // d = false, e = true => true
  // d = false, e = false
  return (
    (defaultVisible === true && entryVisible !== false) ||
    (defaultVisible === false && entryVisible === true)
  );
}

function isEntryEditable(entry, template) {

  var property;

  if (isCustomEntry(entry)) {
    property = getProperty(template, entry);

    return property && property.editable !== false;
  }

  return true;
}

function getProperty(template, entry) {

  var index = parseInt(entry.id.replace('custom-' + template.id + '-', ''), 10);

  if (isNaN(index)) {
    throw new Error('cannot extract property index for entry <' + entry.id + '>');
  }

  return template.properties[index];
}

},{"../../../PropertiesActivator":2,"./Helper":42,"inherits":87}],41:[function(require,module,exports){
'use strict';

var isArray = require('lodash/lang/isArray'),
    forEach = require('lodash/collection/forEach');

var DROPDOWN_TYPE = 'Dropdown';

var VALID_TYPES = [ 'String', 'Text', 'Boolean', DROPDOWN_TYPE ];

var PROPERTY_TYPE = 'property',
    CAMUNDA_PROPERTY_TYPE = 'camunda:property',
    INPUT_PARAMETER_TYPE = 'camunda:inputParameter',
    OUTPUT_PARAMETER_TYPE = 'camunda:outputParameter';

var VALID_BINDING_TYPES = [
  PROPERTY_TYPE,
  CAMUNDA_PROPERTY_TYPE,
  INPUT_PARAMETER_TYPE,
  OUTPUT_PARAMETER_TYPE
];


/**
 * The guy knowing all configured element templates.
 *
 * Ask him anything template related or add more...
 *
 * @param {Array<TemplateDescriptor>} initialTemplates
 */
function ElementTemplates(initialTemplates) {

  this._errors = [];
  this._all = {};

  /**
   * Clear the templates and validation state
   */
  this.clear = function() {
    this._errors = [];
    this._all = {};
  };

  this.logError = function(err, template) {

    if (typeof err === 'string') {
      if (template) {
        err = 'template(id: ' + template.id + ') ' + err;
      }

      err = new Error(err);
    }

    this._errors.push(err);

    return err;
  };

  /**
   * Adds the templates.
   *
   * @param {Array<TemplateDescriptor>} templates
   */
  this.addAll = function(templates) {

    if (!isArray(templates)) {
      this.logError('templates must be []');
    } else {
      templates.forEach(this.add, this);
    }
  };

  /**
   * Add the given element template, if it is valid.
   *
   * @param {TemplateDescriptor} template
   */
  this.add = function(template) {

    var id = template.id,
        appliesTo = template.appliesTo,
        properties = template.properties;

    var err;

    if (!id) {
      return this.logError('missing template id');
    }

    if (this._all[id]) {
      return this.logError('template id <' + id + '> already used');
    }

    if (!isArray(appliesTo)) {
      err = this.logError('missing appliesTo=[]', template);
    }

    if (!isArray(properties)) {
      err = this.logError('missing properties=[]', template);
    } else {
      if (!this._validateProperties(properties)) {
        err = new Error('invalid properties');
      }
    }

    if (!err) {
      this._all[id] = template;
    }
  };

  /**
   * Validate properties and return false if any is invalid.
   *
   * @param {Array<PropertyDescriptor>} properties
   *
   * @return {Boolean}
   */
  this._validateProperties = function(properties) {
    var validProperties = properties.filter(this._validateProperty, this);

    return properties.length === validProperties.length;
  };

  /**
   * Validate property and return false, if there was
   * a validation error.
   *
   * @param {PropertyDescriptor} property
   *
   * @return {Boolean}
   */
  this._validateProperty = function(property) {

    var type = property.type,
        binding = property.binding;

    var err;

    if (VALID_TYPES.indexOf(type) === -1) {
      err = this.logError(
              'invalid property type <' + type + '>; ' +
              'must be any of { ' + VALID_TYPES.join(', ') + ' }');
    }

    if (type === DROPDOWN_TYPE) {
      if (!isArray(property.choices)) {
        err = this.logError('must provide choices=[] with ' + DROPDOWN_TYPE + ' type');
      } else

      if (!property.choices.every(isDropdownChoiceValid)) {
        err = this.logError(
          '{ name, value } must be specified for ' +
          DROPDOWN_TYPE + ' choices'
        );
      }
    }

    if (!binding) {
      return this.logError('property missing binding');
    }

    var bindingType = binding.type;

    if (VALID_BINDING_TYPES.indexOf(bindingType) === -1) {
      err = this.logError(
              'invalid property.binding type <' + bindingType + '>; ' +
              'must be any of { ' + VALID_BINDING_TYPES.join(', ') + ' }');
    }

    if (bindingType === PROPERTY_TYPE ||
        bindingType === CAMUNDA_PROPERTY_TYPE ||
        bindingType === INPUT_PARAMETER_TYPE) {

      if (!binding.name) {
        err = this.logError(
                'property.binding <' + bindingType + '> requires name');
      }
    }

    if (bindingType === OUTPUT_PARAMETER_TYPE) {
      if (!binding.source) {
        err = this.logError(
                'property.binding <' + bindingType + '> requires source');
      }
    }

    return !err;
  };


  /**
   * Get template descriptor with given id.
   *
   * @param {String} id
   *
   * @return {TemplateDescriptor}
   */
  this.get = function(id) {
    return this._all[id];
  };

  /**
   * Return all known template descriptors.
   *
   * @return {Map<String, TemplateDescriptor>}
   */
  this.getAll = function() {
    return this._all;
  };

  /**
   * Do something with every known template descriptor.
   *
   * @param {Function} fn
   * @param {Any} context
   *
   * @return {Any}
   */
  this.forEach = function(fn, context) {
    return forEach(this._all, fn, context);
  };


  // initialize (optional) default templates

  if (initialTemplates) {
    this.addAll(initialTemplates);
  }
}

ElementTemplates.$inject = [ 'config.elementTemplates' ];

module.exports = ElementTemplates;


//////// helpers ///////////////////////////////////

function isDropdownChoiceValid(c) {
  return 'name' in c && 'value' in c;
}
},{"lodash/collection/forEach":92,"lodash/lang/isArray":145}],42:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

var is = require('bpmn-js/lib/util/ModelUtil').is;

var find = require('lodash/collection/find');


var TEMPLATE_ATTR = 'camunda:modelerTemplate';

/**
 * The BPMN 2.0 extension attribute name under
 * which the element template is stored.
 *
 * @type {String}
 */
module.exports.TEMPLATE_ATTR = TEMPLATE_ATTR;


/**
 * Get template id for a given diagram element.
 *
 * @param {djs.model.Base} element
 *
 * @return {String}
 */
function getTemplateId(element) {

  var bo = getBusinessObject(element);

  if (bo) {
    return bo.get(TEMPLATE_ATTR);
  }
}

module.exports.getTemplateId = getTemplateId;


/**
 * Get template of a given element.
 *
 * @param {Element} element
 * @param {ElementTemplates} elementTemplates
 *
 * @return {TemplateDefinition}
 */
function getTemplate(element, elementTemplates) {
  var id = getTemplateId(element);

  return id && elementTemplates.get(id);
}

module.exports.getTemplate = getTemplate;


/**
 * Find extension with given type in
 * BPMN element, diagram element or ExtensionElement.
 *
 * @param {ModdleElement|djs.model.Base} element
 * @param {String} type
 *
 * @return {ModdleElement} the extension
 */
function findExtension(element, type) {
  var bo = getBusinessObject(element);

  var extensionElements;

  if (is(bo, 'bpmn:ExtensionElements')) {
    extensionElements = bo;
  } else {
    extensionElements = bo.extensionElements;
  }

  if (!extensionElements) {
    return null;
  }

  return find(extensionElements.get('values'), function(e) {
    return is(e, type);
  });
}

module.exports.findExtension = findExtension;


function findCamundaProperty(camundaProperties, binding) {
  return find(camundaProperties.get('values'), function(p) {
    return p.name === binding.name;
  });
}

module.exports.findCamundaProperty = findCamundaProperty;


function findInputParameter(inputOutput, binding) {
  var parameters = inputOutput.get('inputParameters');

  return find(parameters, function(p) {
    return p.name === binding.name;
  });
}

module.exports.findInputParameter = findInputParameter;


function findOutputParameter(inputOutput, binding) {
  var parameters = inputOutput.get('outputParameters');

  return find(parameters, function(p) {
    var value = p.value;

    if (!binding.scriptFormat) {
      return value === binding.source;
    }

    var definition = p.definition;

    if (!definition || binding.scriptFormat !== definition.scriptFormat) {
      return false;
    }

    return definition.value === binding.source;
  });
}

module.exports.findOutputParameter = findOutputParameter;
},{"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/find":91}],43:[function(require,module,exports){
'use strict';

var findExtension = require('../Helper').findExtension;

var createCamundaProperty = require('../CreateHelper').createCamundaProperty,
    createInputParameter = require('../CreateHelper').createInputParameter,
    createOutputParameter = require('../CreateHelper').createOutputParameter;

var CAMUNDA_SERVICE_TASK_LIKE = [
  'camunda:class',
  'camunda:delegateExpression',
  'camunda:expression'
];

/**
 * A handler that changes the modeling template of
 * template of a BPMN element.
 */
function ChangeElementTemplateHandler(modeling, commandStack, bpmnFactory) {

  function getExtensionElements(element) {

    var bo = element.businessObject;

    var extensionElements = bo.extensionElements;

    // add extension elements
    if (!extensionElements) {
      extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
        values: []
      });

      modeling.updateProperties(element, {
        extensionElements: extensionElements
      });
    }

    return extensionElements;
  }

  function updateModelerTemplate(element, newTemplate) {
    modeling.updateProperties(element, {
      'camunda:modelerTemplate': newTemplate && newTemplate.id
    });
  }

  function updateIoMappings(element, newTemplate) {

    var extensionElements;

    var newMappings = createInputOutputMappings(newTemplate, bpmnFactory),
        oldMappings;

    if (newMappings) {
      extensionElements = getExtensionElements(element);

      oldMappings = findExtension(element, 'camunda:InputOutput');

      commandStack.execute('properties-panel.update-businessobject-list', {
        element: element,
        currentObject: extensionElements,
        propertyName: 'values',
        objectsToAdd: [ newMappings ],
        objectsToRemove: oldMappings ? [ oldMappings ] : []
      });
    }
  }

  function updateCamundaProperties(element, newTemplate) {

    var extensionElements;

    var newProperties = createCamundaProperties(newTemplate, bpmnFactory),
        oldProperties;

    if (newProperties) {
      extensionElements = getExtensionElements(element);

      oldProperties = findExtension(element, 'camunda:Properties');

      commandStack.execute('properties-panel.update-businessobject-list', {
        element: element,
        currentObject: extensionElements,
        propertyName: 'values',
        objectsToAdd: [ newProperties ],
        objectsToRemove: oldProperties ? [ oldProperties ] : []
      });
    }
  }

  function updateProperties(element, newTemplate) {

    var newProperties = createBpmnPropertyUpdates(newTemplate, bpmnFactory);

    if (Object.keys(newProperties).length > 0) {
      modeling.updateProperties(element, newProperties);
    }
  }

  /**
   * Compose a element template change action, updating all
   * necessary underlying properties.
   *
   * @param {Object} context
   * @param {Object} context.element
   * @param {Object} context.oldTemplate
   * @param {Object} context.newTemplate
   */
  this.preExecute = function(context) {

    var element = context.element,
        newTemplate = context.newTemplate;

    // update camunda:modelerTemplate attribute
    updateModelerTemplate(element, newTemplate);

    if (newTemplate) {

      // update camunda:inputOutput
      updateIoMappings(element, newTemplate);

      // update camunda:properties
      updateCamundaProperties(element, newTemplate);

      // update other properties (bpmn:condition, camunda:async, ...)
      updateProperties(element, newTemplate);
    }
  };
}

ChangeElementTemplateHandler.$inject = [ 'modeling', 'commandStack', 'bpmnFactory' ];

module.exports = ChangeElementTemplateHandler;



/////// helpers /////////////////////////////

function createBpmnPropertyUpdates(template, bpmnFactory) {

  var propertyUpdates = {};

  template.properties.forEach(function(p) {

    var binding = p.binding,
        bindingTarget = binding.name,
        propertyValue;

    if (binding.type === 'property') {

      if (bindingTarget === 'conditionExpression') {
        propertyValue = bpmnFactory.create('bpmn:FormalExpression', {
          body: p.value,
          language: binding.scriptFormat
        });
      } else {
        propertyValue = p.value;
      }

      // assigning camunda:async to true|false
      // assigning bpmn:conditionExpression to { $type: 'bpmn:FormalExpression', ... }
      propertyUpdates[bindingTarget] = propertyValue;

      // make sure we unset other "implementation types"
      // when applying a camunda:class template onto a preconfigured
      // camunda:delegateExpression element
      if (CAMUNDA_SERVICE_TASK_LIKE.indexOf(bindingTarget) !== -1) {
        CAMUNDA_SERVICE_TASK_LIKE.forEach(function(prop) {
          if (prop !== bindingTarget) {
            propertyUpdates[prop] = undefined;
          }
        });
      }
    }
  });

  return propertyUpdates;
}

function createCamundaProperties(template, bpmnFactory) {

  var properties = [];

  template.properties.forEach(function(p) {
    var binding = p.binding,
        bindingType  = binding.type;

    if (bindingType === 'camunda:property') {
      properties.push(createCamundaProperty(
        binding, p.value, bpmnFactory
      ));
    }
  });

  if (properties.length) {
    return bpmnFactory.create('camunda:Properties', {
      values: properties
    });
  }
}

function createInputOutputMappings(template, bpmnFactory) {

  var inputParameters = [],
      outputParameters = [];

  template.properties.forEach(function(p) {
    var binding = p.binding,
        bindingType = binding.type;

    if (bindingType === 'camunda:inputParameter') {
      inputParameters.push(createInputParameter(
        binding, p.value, bpmnFactory
      ));
    }

    if (bindingType === 'camunda:outputParameter') {
      outputParameters.push(createOutputParameter(
        binding, p.value, bpmnFactory
      ));
    }
  });

  // do we need to create new ioMappings (?)
  if (outputParameters.length || inputParameters.length) {
    return bpmnFactory.create('camunda:InputOutput', {
      inputParameters: inputParameters,
      outputParameters: outputParameters
    });
  }
}
},{"../CreateHelper":39,"../Helper":42}],44:[function(require,module,exports){
'use strict';

var ChangeElementTemplateHandler = require('./ChangeElementTemplateHandler');

function registerHandlers(commandStack) {
  commandStack.registerHandler(
    'propertiesPanel.camunda.changeTemplate',
    ChangeElementTemplateHandler
  );
}

registerHandlers.$inject = [ 'commandStack' ];


module.exports = {
  __init__: [ registerHandlers ]
};
},{"./ChangeElementTemplateHandler":43}],45:[function(require,module,exports){
module.exports = {
  __depends__: [
    require('./cmd')
  ],
  __init__: [
    'customElementsPropertiesActivator'
  ],
  customElementsPropertiesActivator: [ 'type', require('./CustomElementsPropertiesActivator') ],
  elementTemplates: [ 'type', require('./ElementTemplates') ]
};
},{"./CustomElementsPropertiesActivator":40,"./ElementTemplates":41,"./cmd":44}],46:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory'),
    is = require('bpmn-js/lib/util/ModelUtil').is,
    getTemplate = require('../Helper').getTemplate,
    getTemplateId = require('../Helper').getTemplateId;


var TEMPLATE_ATTR = require('../Helper').TEMPLATE_ATTR;

function isAny(element, types) {
  return types.reduce(function(result, type) {
    return result || is(element, type);
  }, false);
}


module.exports = function(group, element, elementTemplates) {

  var options = getTemplateOptions(element, elementTemplates);

  if (options.length === 1) {
    return;
  }

  // select element template (via dropdown)

  group.entries.push(entryFactory.selectBox({
    id: 'elementTemplate-chooser',
    label: 'Element Template',
    modelProperty: 'camunda:modelerTemplate',
    selectOptions: options,
    set: function(element, properties) {
      return applyTemplate(element, properties[TEMPLATE_ATTR], elementTemplates);
    }
  }));

};


////// helpers //////////////////////////////////////

function applyTemplate(element, newTemplateId, elementTemplates) {

  // cleanup
  // clear input output mappings
  // undo changes to properties defined in template

  // re-establish
  // set input output mappings
  // apply changes to properties as defined in new template

  var oldTemplate = getTemplate(element, elementTemplates),
      newTemplate = elementTemplates.get(newTemplateId);

  if (oldTemplate === newTemplate) {
    return;
  }

  return {
    cmd: 'propertiesPanel.camunda.changeTemplate',
    context: {
      element: element,
      oldTemplate: oldTemplate,
      newTemplate: newTemplate
    }
  };
}

function getTemplateOptions(element, elementTemplates) {

  var currentTemplateId = getTemplateId(element);

  var options = [ {
    name: '',
    value: ''
  } ];

  var found;

  elementTemplates.forEach(function(t) {
    if (isAny(element, t.appliesTo)) {
      if (t.id === currentTemplateId) {
        found = true;
      }

      options.push({
        name: t.name,
        value: t.id
      });
    }
  });

  if (currentTemplateId && !found) {
    options.push({
      name: '[unknown template: ' + currentTemplateId + ']',
      value: currentTemplateId
    });
  }

  return options;
}
},{"../../../../factory/EntryFactory":6,"../Helper":42,"bpmn-js/lib/util/ModelUtil":168}],47:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory'),
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    getTemplate = require('../Helper').getTemplate,
    cmdHelper = require('../../../../helper/CmdHelper');

var findExtension = require('../Helper').findExtension,
    findInputParameter = require('../Helper').findInputParameter,
    findOutputParameter = require('../Helper').findOutputParameter,
    findCamundaProperty = require('../Helper').findCamundaProperty;

var createCamundaProperty = require('../CreateHelper').createCamundaProperty,
    createInputParameter = require('../CreateHelper').createInputParameter,
    createOutputParameter = require('../CreateHelper').createOutputParameter;

var BASIC_MODDLE_TYPES = [
  'Boolean',
  'Integer',
  'String'
];

var EXTENSION_BINDING_TYPES = [
  'camunda:property',
  'camunda:inputParameter',
  'camunda:outputParameter'
];

var IO_BINDING_TYPES = [
  'camunda:inputParameter',
  'camunda:outputParameter'
];

/**
 * Injects custom properties into the given group.
 *
 * @param {GroupDescriptor} group
 * @param {djs.model.Base} element
 * @param {ElementTemplates} elementTemplates
 * @param {BpmnFactory} bpmnFactory
 */
module.exports = function(group, element, elementTemplates, bpmnFactory) {

  var template = getTemplate(element, elementTemplates);

  if (!template) {
    return;
  }

  template.properties.forEach(function(p, idx) {

    var id = 'custom-' + template.id + '-' + idx;

    var propertyType = p.type;

    var entryOptions = {
      id: id,
      description: p.description,
      label: p.label,
      modelProperty: id,
      get: propertyGetter(id, p),
      set: propertySetter(id, p, bpmnFactory),
      validate: propertyValidator(id, p)
    };

    var entry;

    if (propertyType === 'Boolean') {
      entry = entryFactory.checkbox(entryOptions);
    }

    if (propertyType === 'String') {
      entry = entryFactory.textField(entryOptions);
    }

    if (propertyType === 'Text') {
      entry = entryFactory.textArea(entryOptions);
    }

    if (propertyType === 'Dropdown') {
      entryOptions.selectOptions = p.choices;

      entry = entryFactory.selectBox(entryOptions);
    }

    if (entry) {
      group.entries.push(entry);
    }
  });

};


/////// getters, setters and validators ///////////////


/**
 * Return a getter that retrieves the given property.
 *
 * @param {String} name
 * @param {PropertyDescriptor} property
 *
 * @return {Function}
 */
function propertyGetter(name, property) {

  /* getter */
  return function get(element) {
    var value = getPropertyValue(element, property);

    return objectWithKey(name, value);
  };
}

/**
 * Return a setter that updates the given property.
 *
 * @param {String} name
 * @param {PropertyDescriptor} property
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {Function}
 */
function propertySetter(name, property, bpmnFactory) {

  /* setter */
  return function set(element, values) {

    var value = values[name];

    return setPropertyValue(element, property, value, bpmnFactory);
  };
}

/**
 * Return a validator that ensures the property is ok.
 *
 * @param {String} name
 * @param {PropertyDescriptor} property
 *
 * @return {Function}
 */
function propertyValidator(name, property) {

  /* validator */
  return function validate(element, values) {
    var value = values[name];

    var error = validateValue(value, property);

    if (error) {
      return objectWithKey(name, error);
    }
  };
}


//////// get, set and validate helpers ///////////////////

/**
 * Return the value of the specified property descriptor,
 * on the passed diagram element.
 *
 * @param {djs.model.Base} element
 * @param {PropertyDescriptor} property
 *
 * @return {Any}
 */
function getPropertyValue(element, property) {

  var bo = getBusinessObject(element);

  var binding = property.binding;

  var bindingType = binding.type,
      bindingName = binding.name;

  var propertyValue = property.value || '';

  // property
  if (bindingType === 'property') {

    var value = bo.get(bindingName);

    if (bindingName === 'conditionExpression') {
      if (value) {
        return value.body;
      } else {
        // return defined default
        return propertyValue;
      }
    } else {
      // return value; default to defined default
      return typeof value !== 'undefined' ? value : propertyValue;
    }
  }

  var camundaProperties,
      camundaProperty;

  if (bindingType === 'camunda:property') {
    camundaProperties = findExtension(bo, 'camunda:Properties');

    if (camundaProperties) {
      camundaProperty = findCamundaProperty(camundaProperties, binding);

      if (camundaProperty) {
        return camundaProperty.value;
      }
    }

    return propertyValue;
  }

  var inputOutput,
      ioParameter;

  if (IO_BINDING_TYPES.indexOf(bindingType) !== -1) {
    inputOutput = findExtension(bo, 'camunda:InputOutput');

    if (!inputOutput) {
      // ioParameter cannot exist yet, return property value
      return propertyValue;
    }
  }

  // camunda input parameter
  if (bindingType === 'camunda:inputParameter') {
    ioParameter = findInputParameter(inputOutput, binding);

    if (ioParameter) {
      if (binding.scriptFormat) {
        if (ioParameter.definition) {
          return ioParameter.definition.value;
        }
      } else {
        return ioParameter.value;
      }
    }

    return propertyValue;
  }

  // camunda output parameter
  if (binding.type === 'camunda:outputParameter') {
    ioParameter = findOutputParameter(inputOutput, binding);

    if (ioParameter) {
      return ioParameter.name;
    }

    return propertyValue;
  }

  throw unknownPropertyBinding(property);
}

module.exports.getPropertyValue = getPropertyValue;


/**
 * Return an update operation that changes the
 * diagram elements custom property property to the
 * given value.
 *
 * The response of this method will be processed via
 * {@link PropertiesPanel#applyChanges}.
 *
 * @param {djs.model.Base} element
 * @param {PropertyDescriptor} property
 * @param {String} value
 * @param {BpmnFactory} bpmnFactory
 *
 * @return {Object|Array<Object>} results to be processed
 */
function setPropertyValue(element, property, value, bpmnFactory) {
  var bo = getBusinessObject(element);

  var binding = property.binding;

  var bindingType = binding.type,
      bindingName = binding.name;

  var propertyValue;

  var updates = [];


  // property
  if (bindingType === 'property') {

    if (bindingName === 'conditionExpression') {

      propertyValue = bpmnFactory.create('bpmn:FormalExpression', {
        body: value,
        language: binding.scriptFormat
      });
    } else {

      var moddlePropertyDescriptor = bo.$descriptor.propertiesByName[bindingName];

      var moddleType = moddlePropertyDescriptor.type;

      // make sure we only update String, Integer, Real and
      // Boolean properties (do not accidently override complex objects...)
      if (BASIC_MODDLE_TYPES.indexOf(moddleType) === -1) {
        throw new Error('cannot set moddle type <' + moddleType + '>');
      }

      if (moddleType === 'Boolean') {
        propertyValue = !!value;
      } else
      if (moddleType === 'Integer') {
        propertyValue = parseInt(value, 10);

        if (isNaN(propertyValue)) {
          // do not write NaN value
          propertyValue = undefined;
        }
      } else {
        propertyValue = value;
      }
    }

    if (propertyValue !== undefined) {
      updates.push(cmdHelper.updateBusinessObject(
        element, bo, objectWithKey(bindingName, propertyValue)
      ));
    }
  }

  var extensionElements;

  if (EXTENSION_BINDING_TYPES.indexOf(bindingType) !== -1) {
    extensionElements = bo.get('extensionElements');

    // create extension elements, if they do not exist (yet)
    if (!extensionElements) {
      extensionElements = bpmnFactory.create('bpmn:ExtensionElements');

      updates.push(cmdHelper.updateBusinessObject(
        element, bo, objectWithKey('extensionElements', extensionElements)
      ));
    }
  }

  // camunda:property
  var camundaProperties,
      existingCamundaProperty,
      newCamundaProperty;

  if (bindingType === 'camunda:property') {

    camundaProperties = findExtension(extensionElements, 'camunda:Properties');

    if (!camundaProperties) {
      camundaProperties = bpmnFactory.create('camunda:Properties');

      updates.push(cmdHelper.addElementsTolist(
        element, extensionElements, 'values', [ camundaProperties ]
      ));
    }

    existingCamundaProperty = findCamundaProperty(camundaProperties, binding);

    newCamundaProperty = createCamundaProperty(binding, value, bpmnFactory);

    updates.push(cmdHelper.addAndRemoveElementsFromList(
      element,
      camundaProperties,
      'values',
      null,
      [ newCamundaProperty ],
      existingCamundaProperty ? [ existingCamundaProperty ] : []
    ));
  }

  // camunda:inputParameter
  // camunda:outputParameter
  var inputOutput,
      existingIoParameter,
      newIoParameter;

  if (IO_BINDING_TYPES.indexOf(bindingType) !== -1) {

    inputOutput = findExtension(extensionElements, 'camunda:InputOutput');

    // create inputOutput element, if it do not exist (yet)
    if (!inputOutput) {
      inputOutput = bpmnFactory.create('camunda:InputOutput');

      updates.push(cmdHelper.addElementsTolist(
        element, extensionElements, 'values', inputOutput
      ));
    }
  }

  if (bindingType === 'camunda:inputParameter') {

    existingIoParameter = findInputParameter(inputOutput, binding);

    newIoParameter = createInputParameter(binding, value, bpmnFactory);

    updates.push(cmdHelper.addAndRemoveElementsFromList(
      element,
      inputOutput,
      'inputParameters',
      null,
      [ newIoParameter ],
      existingIoParameter ? [ existingIoParameter ] : []
    ));
  }

  if (bindingType === 'camunda:outputParameter') {

    existingIoParameter = findOutputParameter(inputOutput, binding);

    newIoParameter = createOutputParameter(binding, value, bpmnFactory);

    updates.push(cmdHelper.addAndRemoveElementsFromList(
      element,
      inputOutput,
      'outputParameters',
      null,
      [ newIoParameter ],
      existingIoParameter ? [ existingIoParameter ] : []
    ));
  }

  if (updates.length) {
    return updates;
  }

  // quick warning for better debugging
  console.warn('no update', element, property, value);
}

/**
 * Validate value of a given property.
 *
 * @param {String} value
 * @param {PropertyDescriptor} property
 *
 * @return {Object} with validation errors
 */
function validateValue(value, property) {

  var constraints = property.constraints || {};

  if (constraints.notEmpty && isEmpty(value)) {
    return 'Must not be empty';
  }

  if (constraints.maxLength && value.length > constraints.maxLength) {
    return 'Must have max length ' + constraints.maxLength;
  }

  if (constraints.minLength && value.length < constraints.minLength) {
    return 'Must have min length ' + constraints.minLength;
  }

  var pattern = constraints.pattern,
      message;

  if (pattern) {

    if (typeof pattern !== 'string') {
      message = pattern.message;
      pattern = pattern.value;
    }

    if (!matchesPattern(value, pattern)) {
      return message || 'Must match pattern ' + pattern;
    }
  }
}


//////// misc helpers ///////////////////////////////

/**
 * Return an object with a single key -> value association.
 *
 * @param {String} key
 * @param {Any} value
 *
 * @return {Object}
 */
function objectWithKey(key, value) {
  var obj = {};

  obj[key] = value;

  return obj;
}

/**
 * Does the given string match the specified pattern?
 *
 * @param {String} str
 * @param {String} pattern
 *
 * @return {Boolean}
 */
function matchesPattern(str, pattern) {
  var regexp = new RegExp(pattern);

  return regexp.test(str);
}

function isEmpty(str) {
  return !str || /^\s*$/.test(str);
}

/**
 * Create a new {@link Error} indicating an unknown
 * property binding.
 *
 * @param {PropertyDescriptor} property
 *
 * @return {Error}
 */
function unknownPropertyBinding(property) {
  var binding = property.binding;

  return new Error('unknown binding: <' + binding.type + '>');
}
},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"../CreateHelper":39,"../Helper":42,"bpmn-js/lib/util/ModelUtil":168}],48:[function(require,module,exports){
module.exports = {
  __depends__: [
    require('./element-templates')
  ],
  __init__: [ 'propertiesProvider' ],
  propertiesProvider: [ 'type', require('./CamundaPropertiesProvider') ]
};
},{"./CamundaPropertiesProvider":38,"./element-templates":45}],49:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    is = require('bpmn-js/lib/util/ModelUtil').is,
    asyncContinuation = require('./implementation/AsyncContinuation');

module.exports = function(group, element, bpmnFactory) {

  if (is(element, 'camunda:AsyncCapable')) {

    group.entries = group.entries.concat(asyncContinuation(element, bpmnFactory, {
      getBusinessObject: getBusinessObject
    }));

  }
};
},{"./implementation/AsyncContinuation":70,"bpmn-js/lib/util/ModelUtil":168}],50:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    is = require('bpmn-js/lib/util/ModelUtil').is;

var entryFactory = require('../../../factory/EntryFactory');

var callable = require('./implementation/Callable');

var cmdHelper = require('../../../helper/CmdHelper');

var flattenDeep = require('lodash/array/flattenDeep');
var assign = require('lodash/object/assign');

function getCallableType(element) {
  var bo = getBusinessObject(element);

  var boCalledElement = bo.get('calledElement'),
      boCaseRef = bo.get('camunda:caseRef');

  var callActivityType = '';
  if (typeof boCalledElement !== 'undefined') {
    callActivityType = 'bpmn';
  } else

  if (typeof boCaseRef !== 'undefined') {
    callActivityType = 'cmmn';
  }

  return callActivityType;
}

var DEFAULT_PROPS = {
  calledElement: undefined,
  'camunda:calledElementBinding': 'latest',
  'camunda:calledElementVersion': undefined,
  'camunda:caseRef': undefined,
  'camunda:caseBinding': 'latest',
  'camunda:caseVersion': undefined
};

module.exports = function(group, element, bpmnFactory) {

  if (!is(element, 'camunda:CallActivity')) {
    return;
  }

  group.entries.push(entryFactory.selectBox({
    id : 'callActivity',
    label: 'CallActivity Type',
    selectOptions: [ { name: 'BPMN', value: 'bpmn' }, { name: 'CMMN', value: 'cmmn' } ],
    emptyParameter: true,
    modelProperty: 'callActivityType',

    get: function(element, node) {
      return {
        callActivityType: getCallableType(element)
      };
    },

    set: function(element, values, node) {
      var type = values.callActivityType;

      var props = assign({}, DEFAULT_PROPS);

      if (type === 'bpmn') {
        props.calledElement = '';
      }
      else if (type === 'cmmn') {
        props['camunda:caseRef'] = '';
      }

      return cmdHelper.updateProperties(element, props);
    }

  }));

  group.entries.push(callable(element, bpmnFactory, {
    getCallableType: getCallableType
  }));

  group.entries = flattenDeep(group.entries);
};

},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"./implementation/Callable":71,"bpmn-js/lib/util/ModelUtil":168,"lodash/array/flattenDeep":88,"lodash/object/assign":150}],51:[function(require,module,exports){
'use strict';

var ImplementationTypeHelper = require('../../../helper/ImplementationTypeHelper'),
    InputOutputHelper        = require('../../../helper/InputOutputHelper');

var entryFactory            = require('../../../factory/EntryFactory'),
    cmdHelper               = require('../../../helper/CmdHelper');

function getImplementationType(element) {
  return ImplementationTypeHelper.getImplementationType(element);
}

function getBusinessObject(element) {
  return ImplementationTypeHelper.getServiceTaskLikeBusinessObject(element);
}

function getConnector(bo) {
  return InputOutputHelper.getConnector(bo);
}

function isConnector(element) {
  return getImplementationType(element) === 'connector';
}

module.exports = function(group, element, bpmnFactory) {

  group.entries.push(entryFactory.textField({
    id: 'connectorId',
    label: 'Connector Id',
    modelProperty: 'connectorId',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      var connector = bo && getConnector(bo);
      var value = connector && connector.get('connectorId');
      return { connectorId: value };
    },

    set: function(element, values, node) {
      var bo = getBusinessObject(element);
      var connector = getConnector(bo);
      return cmdHelper.updateBusinessObject(element, connector, {
        connectorId: values.connectorId || undefined
      });
    },

    validate: function(element, values, node) {
      return isConnector(element) && !values.connectorId ? { connectorId: 'Must provide a value'} : {};
    },

    disabled: function(element, node) {
      return !isConnector(element);
    }

  }));

};

},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"../../../helper/ImplementationTypeHelper":20,"../../../helper/InputOutputHelper":21}],52:[function(require,module,exports){
'use strict';

var assign = require('lodash/object/assign');

var inputOutputParameter = require('./implementation/InputOutputParameter');

module.exports = function(group, element, bpmnFactory, options) {

  options = assign({
    idPrefix: 'connector-',
    insideConnector: true
  }, options);

  group.entries = group.entries.concat(inputOutputParameter(element, bpmnFactory, options));

};

},{"./implementation/InputOutputParameter":78,"lodash/object/assign":150}],53:[function(require,module,exports){
'use strict';

var inputOutput = require('./implementation/InputOutput');

module.exports = function(group, element, bpmnFactory) {

  var inputOutputEntry = inputOutput(element, bpmnFactory, {
    idPrefix: 'connector-',
    insideConnector: true
  });

  group.entries = group.entries.concat(inputOutputEntry.entries);

  return {
    getSelectedParameter: inputOutputEntry.getSelectedParameter
  };

};

},{"./implementation/InputOutput":77}],54:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
  getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
  domQuery = require('min-dom/lib/query'),
  cmdHelper = require('../../../helper/CmdHelper'),
  elementHelper = require('../../../helper/ElementHelper'),
  forEach = require('lodash/collection/forEach'),
  domify = require('min-dom/lib/domify'),
  utils = require('../../../Utils'),

  script = require('./implementation/Script')('scriptFormat', 'value', true);


function createListenerTemplate(id, isSequenceFlow) {
  return '<div class="djs-listener-area" data-scope>' +
            '<button class="clear" data-action="removeListener"><span>X</span></button>' +

            '<div class="pp-row">' +
              '<label for="cam-event-type-'+id+'">Event Type</label>' +
              ( !isSequenceFlow ?
                  '<div class="pp-field-wrapper">' +
                    '<select id="cam-event-type-'+id+'" name="eventType" data-value>' +
                      '<option value="start">start</option>' +
                      '<option value="end">end</option>' +
                    '</select>' +
                  '</div>'
                 :
                  '<div class="pp-field-wrapper">' +
                    '<p class="djs-properties-static">take</p>' +
                  '</div>'
              ) +
            '</div>' +

            '<div class="pp-row">' +
              '<label for="cam-listener-type-'+id+'">Listener Type</label>' +
              '<div class="pp-field-wrapper">' +
                '<select id="cam-listener-type-'+id+'" name="listenerType" data-value>' +
                  '<option value="class">Java Class</option>' +
                  '<option value="expression">Expression</option>' +
                  '<option value="delegateExpression">Delegate Expression</option>' +
                  '<option value="script">Script</option>' +
                '</select>' +
              '</div>' +
            '</div>' +

            '<div class="pp-row">' +
              '<div data-show="isNotScript">' +
                '<label for="camunda-listener-val-'+id+'">' +
                  '<span data-show="isJavaClass">Java Class</span>' +
                  '<span data-show="isExpression">Expression</span>' +
                  '<span data-show="isDelegateExpression">Delegate Expression</span>' +
                '</label>' +
                '<div class="pp-field-wrapper">' +
                  '<input id="camunda-listener-val-'+id+'" type="text" name="listenerValue" />' +
                  '<button class="clear" data-action="clearListenerValue" data-show="canClearListenerValue">' +
                    '<span>X</span>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>'+

            '<div data-show="isScript">' +
              script.template +
            '</div>'+

          '</div>';
}

function getItem(element, bo) {
   // read values from xml:
  var boExpression = bo.get('expression'),
      boDelegate = bo.get('delegateExpression'),
      boClass = bo.get('class'),
      boEvent = bo.get('event'),
      boScript = bo.script;

  var values = {},
    listenerType = '';

  if(typeof boExpression !== 'undefined') {
    listenerType = 'expression';
    values.listenerValue = boExpression;
  }
  else if(typeof boDelegate !== 'undefined') {
    listenerType = 'delegateExpression';
    values.listenerValue = boDelegate;
  }
  else if(typeof boClass !== 'undefined') {
    listenerType = 'class';
    values.listenerValue = boClass;
  }
  else if (typeof boScript !== 'undefined') {
    listenerType = 'script';
    values = script.get(element, boScript);
  }

  values.listenerType = listenerType;
  values.eventType = boEvent;

  return values;
}

function setEmpty(update) {
  update.class = undefined;
  update.expression = undefined;
  update.delegateExpression = undefined;
  update.event = undefined;
  update.script = undefined;
}

function createExecutionListener(element, values, extensionElements, executionListenerList, bpmnFactory) {
  // add execution listener values to extension elements values
  forEach(values, function(value) {
    var update = {};
    setEmpty(update);
    update.event = value.eventType;

    var executionListener = elementHelper.createElement('camunda:ExecutionListener',
                                                     update, extensionElements, bpmnFactory);

    if (value.listenerType === 'script') {
      var scriptProps = script.set(element, value);
      executionListener.script = elementHelper.createElement('camunda:Script',
                                                     scriptProps, executionListener, bpmnFactory);
    }
    else {
      executionListener[value.listenerType] = value.listenerValue || '';
    }

    executionListenerList.push(executionListener);
  });

}

module.exports = function(group, element, bpmnFactory) {

  var bo;
  var lastIdx = 0;

  if (is(element, 'bpmn:FlowElement')) {
    bo = getBusinessObject(element);
  }

  if (!bo) {
    return;
  }

  var isSequenceFlow = is(element, 'bpmn:SequenceFlow');

  group.entries.push({
    id: 'executionListeners',
    description: 'Configure execution listener.',
    label: 'Listener',
    html: '<div class="cam-add-listener">' +
              '<label for="addListener">Add Execution Listener </label>' +
              '<button class="add" id="addListener" data-action="addListener"><span>+</span></button>' +
            '</div>' +
            '<div data-list-entry-container></div>',

    createListEntryTemplate: function(value, idx) {
      lastIdx = idx;
      return createListenerTemplate(idx, isSequenceFlow);
    },

    get: function (element, propertyName) {
      var values = [];

      if (!!bo.extensionElements) {
        var extensionElementsValues = getBusinessObject(element).extensionElements.values;
        forEach(extensionElementsValues, function(extensionElement) {
          if (typeof extensionElement.$instanceOf === 'function' && is(extensionElement, 'camunda:ExecutionListener')) {
            values.push(getItem(element, extensionElement));
          }
        });
      }

      return values;
    },

    set: function (element, values, containerElement) {
      var cmd;

      var extensionElements = bo.extensionElements;
      var isExtensionElementsNew = false;

      if (isSequenceFlow) {
        forEach(values, function(value) {
          value.eventType = 'take';
        });
      }

      if (!extensionElements) {
        isExtensionElementsNew = true;
        extensionElements = elementHelper.createElement('bpmn:ExtensionElements',
                                                        { values: [] }, bo, bpmnFactory);
      }

      if (isExtensionElementsNew) {
        var extensionValues = extensionElements.get('values');
        createExecutionListener(element, values, extensionElements, extensionValues, bpmnFactory);

        cmd = cmdHelper.updateProperties(element, { extensionElements: extensionElements });
      } else {

        // remove all existing execution listeners
        var objectsToRemove = [];
        forEach(extensionElements.get('values'), function(extensionElement) {
          if (is(extensionElement, 'camunda:ExecutionListener')) {
            objectsToRemove.push(extensionElement);
          }
        });

        // add all the listeners
        var objectsToAdd = [];
        createExecutionListener(element, values, extensionElements, objectsToAdd, bpmnFactory);

        cmd = cmdHelper.addAndRemoveElementsFromList(element, extensionElements, 'values', 'extensionElements',
                                                      objectsToAdd, objectsToRemove);
      }
      return cmd;
    },

    validateListItem: function(element, values) {
      var validationResult = {};

      if(values.listenerType === 'script') {
        validationResult = script.validate(element, values);
      }
      else if(!values.listenerValue) {
        validationResult.listenerValue = "Must provide a value";
      }

      return validationResult;
    },

    addListener: function(element, inputNode) {
      var listenerContainer = domQuery('[data-list-entry-container]', inputNode);
      lastIdx++;
      var template = domify(createListenerTemplate(lastIdx, isSequenceFlow));
      listenerContainer.appendChild(template);
      return true;
    },

    removeListener: function(element, entryNode, btnNode, scopeNode) {
      scopeNode.parentElement.removeChild(scopeNode);
      return true;
    },

    clearListenerValue:  function(element, entryNode, btnNode, scopeNode) {
      var input = domQuery('input[name=listenerValue]', scopeNode);
      input.value = '';
      return true;
    },

    canClearListenerValue: function(element, entryNode, btnNode, scopeNode) {
      var input = domQuery('input[name=listenerValue]', scopeNode);
      return input.value !== '';
    },

    isExpression: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type === 'expression';
    },

    isJavaClass: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type === 'class';
    },

    isDelegateExpression: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type === 'delegateExpression';
    },

    isScript: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type === 'script';
    },

    isNotScript: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type !== 'script';
    },

    script: script,

    cssClasses: ['pp-textfield']
   });

};

},{"../../../Utils":3,"../../../helper/CmdHelper":15,"../../../helper/ElementHelper":16,"./implementation/Script":84,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/forEach":92,"min-dom/lib/domify":160,"min-dom/lib/query":161}],55:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

var ImplementationTypeHelper = require('../../../helper/ImplementationTypeHelper');

var externalTaskPriority = require('./implementation/ExternalTaskPriority');

function getServiceTaskLikeBusinessObject(element) {
  var bo = ImplementationTypeHelper.getServiceTaskLikeBusinessObject(element);

  // if the element is not a serviceTaskLike element, fetch the normal business object
  // This avoids the loss of the process / participant business object
  if(!bo) {
    bo = getBusinessObject(element);
  }

  return bo;
}

module.exports = function(group, element, bpmnFactory) {

  var bo = getServiceTaskLikeBusinessObject(element);

  if(!bo) {
    return;
  }

  if (is(bo, 'camunda:TaskPriorized') || (is(bo, 'bpmn:Participant')) && bo.get('processRef')) {
    group.entries = group.entries.concat(externalTaskPriority(element, bpmnFactory, {
      getBusinessObject: function(element) {
        if (!is(bo, 'bpmn:Participant')) {
          return bo;
        }
        return bo.get('processRef');
      }
    }));
  }
};
},{"../../../helper/ImplementationTypeHelper":20,"./implementation/ExternalTaskPriority":75,"bpmn-js/lib/util/ModelUtil":168}],56:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    getExtensionElements = require('../../../helper/ExtensionElementsHelper').getExtensionElements,
    extensionElements = require('./implementation/ExtensionElements'),
    properties = require('./implementation/Properties'),
    entryFactory = require('../../../factory/EntryFactory'),
    elementHelper = require('../../../helper/ElementHelper'),
    cmdHelper = require('../../../helper/CmdHelper'),
    formHelper = require('../../../helper/FormHelper'),
    utils = require('../../../Utils'),
    is = require('bpmn-js/lib/util/ModelUtil').is,
    find = require('lodash/collection/find');

function generateValueId() {
  return utils.nextId('Value_');
}

/**
 * Generate a form field specific textField using entryFactory.
 *
 * @param  {string} options.id
 * @param  {string} options.label
 * @param  {string} options.modelProperty
 * @param  {function} options.validate
 *
 * @return {Object} an entryFactory.textField object
 */
function formFieldTextField(options, getSelectedFormField) {

  var id = options.id,
      label = options.label,
      modelProperty = options.modelProperty,
      validate = options.validate;

  return entryFactory.textField({
    id: id,
    label: label,
    modelProperty: modelProperty,
    get: function(element, node) {
      var selectedFormField = getSelectedFormField(element, node) || {},
          values = {};

      values[modelProperty] = selectedFormField[modelProperty];

      return values;
    },

    set: function(element, values, node) {
      var commands = [];

      if (typeof options.set === 'function') {
        var cmd = options.set(element, values, node);

        if (cmd) {
          commands.push(cmd);
        }
      }

      var formField = getSelectedFormField(element, node),
          properties = {};

      properties[modelProperty] = values[modelProperty];

      commands.push(cmdHelper.updateBusinessObject(element, formField, properties));

      return commands;
    },

    disabled: function(element, node) {
      return formHelper.getFormType(element) === 'form-key' ||
             !getSelectedFormField(element, node);
    },
    validate: validate
  });
}

function ensureFormKeyAndDataSupported(element) {
  return (is(element, 'bpmn:StartEvent') && !is(element.parent, 'bpmn:SubProcess')) ||
         is(element, 'bpmn:UserTask');
}

module.exports = function(group, element, bpmnFactory) {

  if (!ensureFormKeyAndDataSupported(element)) {
    return;
  }

  /**
   * Return the currently selected form field querying the form field select box
   * from the DOM.
   *
   * @param  {djs.model.Base} element
   * @param  {DOMElement} node - DOM element of any form field text input
   *
   * @return {ModdleElement} the currently selected form field
   */
  function getSelectedFormField(element, node) {
    var selected = formFieldsEntry.getSelected(element, node.parentNode);

    if (selected.idx === -1) {
      return;
    }

    return formHelper.getFormField(element, selected.idx);
  }

  // form type select box
  group.entries.push({
    id: 'formType',
    html: '<div class="pp-row">' +
            '<label for="camunda-formType">Form Type</label>' +
            '<div class="pp-field-wrapper">' +
              '<select id="camunda-formType" name="formType" data-value>' +
                '<option value="form-key">Form Key</option>' +
                '<option value="form-data">Form Data</option>' +
              '</select>' +
            '</div>' +
          '</div>',
    get: function(element, node) {
      return {
        formType: formHelper.getFormType(element)
      };
    },
    set: function(element, values, node) {
      var bo = getBusinessObject(element);

      if (values.formType === 'form-key') {
        // Form Key is selected in the select box
        var entry = getExtensionElements(bo, 'camunda:FormData');

        return cmdHelper.removeElementsFromList(element, bo.extensionElements, 'values', 'extensionElements', entry);
      } else {
        // Form Data is selected in the select box
        var commands = [];

        commands.push(cmdHelper.updateBusinessObject(element, bo, { 'camunda:formKey': undefined }));

        var extensionElements = bo.get('extensionElements');
        if (!extensionElements) {
          extensionElements = elementHelper.createElement('bpmn:ExtensionElements', { values: [] }, bo, bpmnFactory);
          commands.push(cmdHelper.updateProperties(element, { extensionElements: extensionElements }));
        }

        var formData = elementHelper.createElement('camunda:FormData', { fields: [] }, extensionElements, bpmnFactory);
        commands.push(cmdHelper.addAndRemoveElementsFromList(
          element,
          extensionElements,
          'values',
          'extensionElements',
          [ formData ],
          []
        ));

        return commands;
      }
    }
  });

  // [FormKey] form key text input field
  group.entries.push(entryFactory.textField({
    id : 'form-key',
    label : 'Form Key',
    modelProperty: 'formKey',
    get: function(element, node) {
      var bo = getBusinessObject(element);

      return {
        formKey: bo.get('camunda:formKey')
      };
    },
    set: function(element, values, node) {
      var bo = getBusinessObject(element),
          formKey = values.formKey || undefined;

      return cmdHelper.updateBusinessObject(element, bo, { 'camunda:formKey': formKey });
    },
    disabled: function(element, node) {
      return formHelper.getFormType(element) === 'form-data';
    }
  }));

  // [FormData] form field select box
  var formFieldsEntry = extensionElements(element, bpmnFactory, {
    id : 'form-fields',
    label : 'Form Fields',
    modelProperty: 'id',
    prefix: 'FormField',
    createExtensionElement: function(element, extensionElements, value){
      var bo = getBusinessObject(element),
          formData = getExtensionElements(bo, 'camunda:FormData')[0],
          field = elementHelper.createElement('camunda:FormField', { id: value }, formData, bpmnFactory);

      if (typeof formData.fields !== 'undefined') {
        return cmdHelper.addElementsTolist(element, formData, 'fields', [ field ]);
      } else {
        return cmdHelper.updateBusinessObject(element, formData, {
          fields: [ field ]
        });
      }
    },
    removeExtensionElement: function(element, extensionElements, value, idx) {
      var formData = getExtensionElements(getBusinessObject(element), 'camunda:FormData')[0],
          entry = formData.fields[idx];

      return cmdHelper.removeElementsFromList(element, formData, 'fields', null, [ entry ]);
    },
    getExtensionElements: function(element) {
      return formHelper.getFormFields(element);
    },
    hideExtensionElements: function(element, node) {
      return formHelper.getFormType(element) === 'form-key';
    }
  });
  group.entries.push(formFieldsEntry);

  // [FormData] Form Field label
  group.entries.push(entryFactory.label({
    id: 'form-field-header',
    labelText: 'Form Field',
    showLabel: function(element, node) {
      return formHelper.getFormType(element) === 'form-data' && !!getSelectedFormField(element, node);
    }
  }));

  // [FormData] form field id text input field
  group.entries.push(entryFactory.validationAwareTextField({
    id: 'form-field-id',
    label: 'ID',
    modelProperty: 'id',

    getProperty: function(element, node) {
      var selectedFormField = getSelectedFormField(element, node) || {};

      return selectedFormField.id;
    },

    setProperty: function(element, properties, node) {
      var formField = getSelectedFormField(element, node);

      return cmdHelper.updateBusinessObject(element, formField, properties);
    },
    disabled: function(element, node) {
      return formHelper.getFormType(element) === 'form-key' ||
             !getSelectedFormField(element, node);
    },
    validate: function(element, values, node) {

      var formField = getSelectedFormField(element, node);

      if (formField) {

        var idValue = values.id;

        if (!idValue || idValue.trim() === '') {
          return { id: 'Form field id must not be empty' };
        }

        var formFields = formHelper.getFormFields(element);

        var existingFormField = find(formFields, function(f) {
          return f !== formField && f.id === idValue;
        });

        if (existingFormField) {
          return { id: 'Form field id already used in form data.' };
        }
      }
    }
  }));

  // [FormData] form field type combo box
  group.entries.push(entryFactory.comboBox({
    id : 'form-field-type',
    label: 'Type',
    selectOptions: [
      { name: 'string', value: 'string' },
      { name: 'long', value: 'long' },
      { name: 'boolean', value: 'boolean' },
      { name: 'date', value: 'date' },
      { name: 'enum', value: 'enum' },
    ],
    modelProperty: 'type',
    emptyParameter: true,

    get: function(element, node) {
      var selectedFormField = getSelectedFormField(element, node);

      if (selectedFormField) {
        return { type: selectedFormField.type };
      } else {
        return {};
      }
    },
    set: function(element, values, node) {
      var selectedFormField = getSelectedFormField(element, node),
          commands = [];

      if (selectedFormField.type === 'enum' && values.type !== 'enum') {
        // delete camunda:value objects from formField.values when switching from type enum
        commands.push(cmdHelper.updateBusinessObject(element, selectedFormField, { values: undefined }));
      }

      commands.push(cmdHelper.updateBusinessObject(element, selectedFormField, values));

      return commands;
    },
    disabled: function(element, node) {
      return formHelper.getFormType(element) !== 'form-data' || !getSelectedFormField(element, node);
    }
  }));

  // [FormData] form field label text input field
  group.entries.push(formFieldTextField({
    id : 'form-field-label',
    label : 'Label',
    modelProperty: 'label'
  }, getSelectedFormField));

  // [FormData] form field defaultValue text input field
  group.entries.push(formFieldTextField({
    id : 'form-field-defaultValue',
    label : 'Default Value',
    modelProperty: 'defaultValue'
  }, getSelectedFormField));


  // [FormData] form field enum values label
  group.entries.push(entryFactory.label({
    id: 'form-field-enum-values-header',
    labelText: 'Values',
    divider: true,
    showLabel: function(element, node) {
      var selectedFormField = getSelectedFormField(element, node);

      return selectedFormField && selectedFormField.type === 'enum';
    }
  }));

  // [FormData] form field enum values table
  group.entries.push(entryFactory.table({
    id: 'form-field-enum-values',
    labels: [ 'Id', 'Name' ],
    modelProperties: [ 'id', 'name' ],
    show: function(element, node) {
      var selectedFormField = getSelectedFormField(element, node);

      return selectedFormField && selectedFormField.type === 'enum';
    },
    getElements: function(element, node) {
      var selectedFormField = getSelectedFormField(element, node);

      return formHelper.getEnumValues(selectedFormField);
    },
    addElement: function(element, node) {
      var selectedFormField = getSelectedFormField(element, node),
          id = generateValueId();

      var enumValue = elementHelper.createElement('camunda:Value', { id: id, name: undefined },
        getBusinessObject(element), bpmnFactory);

      return cmdHelper.addElementsTolist(element, selectedFormField, 'values', [ enumValue ]);
    },
    removeElement: function(element, node, idx) {
      var selectedFormField = getSelectedFormField(element, node),
          enumValue = selectedFormField.values[idx];

      return cmdHelper.removeElementsFromList(element, selectedFormField, 'values', null, [ enumValue ]);
    },
    updateElement: function(element, value, node, idx) {
      var selectedFormField = getSelectedFormField(element, node),
          enumValue = selectedFormField.values[idx];

      value.name = value.name || undefined;

      return cmdHelper.updateBusinessObject(element, enumValue, value);
    },
    validate: function(element, value, node, idx) {

      var selectedFormField = getSelectedFormField(element, node),
          enumValue = selectedFormField.values[idx];

      if (enumValue) {
        // check if id is valid
        var validationError = utils.isIdValid(enumValue, value.id);

        if (validationError) {
          return { id: validationError };
        }
      }
    }
  }));

  // [FormData] Validation label
  group.entries.push(entryFactory.label({
    id: 'form-field-validation-header',
    labelText: 'Validation',
    divider: true,
    showLabel: function(element, node) {
      return formHelper.getFormType(element) === 'form-data' && !!getSelectedFormField(element, node);
    }
  }));

  // [FormData] form field constraints table
  group.entries.push(entryFactory.table({
    id: 'constraints-list',
    modelProperties: [ 'name', 'config' ],
    labels: [ 'Name', 'Config' ],
    addLabel: 'Add Constraint',
    getElements: function(element, node) {
      var formField = getSelectedFormField(element, node);

      return formHelper.getConstraints(formField);
    },
    addElement: function(element, node) {

      var commands = [],
          formField = getSelectedFormField(element, node),
          validation = formField.validation;

      if (!validation) {
        // create validation business object and add it to form data, if it doesn't exist
        validation = elementHelper.createElement('camunda:Validation', {}, getBusinessObject(element), bpmnFactory);

        commands.push(cmdHelper.updateBusinessObject(element, formField, { 'validation': validation }));
      }

      var newConstraint = elementHelper.createElement('camunda:Constraint',
        { name: undefined, config: undefined }, validation, bpmnFactory);

      commands.push(cmdHelper.addElementsTolist(element, validation, 'constraints', [ newConstraint ]));

      return commands;
    },
    updateElement: function(element, value, node, idx) {
      var formField = getSelectedFormField(element, node),
          constraint = formHelper.getConstraints(formField)[idx];

      value.name = value.name || undefined;
      value.config = value.config || undefined;

      return cmdHelper.updateBusinessObject(element, constraint, value);
    },
    removeElement: function(element, node, idx) {
      var commands = [],
          formField = getSelectedFormField(element, node),
          constraints = formHelper.getConstraints(formField),
          currentConstraint = constraints[idx];

      commands.push(cmdHelper.removeElementsFromList(element, formField.validation,
        'constraints', null, [ currentConstraint ]));

      if (constraints.length === 1) {
        // remove camunda:validation if the last existing constraint has been removed
        commands.push(cmdHelper.updateBusinessObject(element, formField, { validation: undefined }));
      }

      return commands;
    },
    show: function(element, node) {
      if (formHelper.getFormType(element) !== 'form-data') {
        return;
      }

      return !!getSelectedFormField(element, node);
    }
  }));

  // [FormData] Properties label
  group.entries.push(entryFactory.label({
    id: 'form-field-properties-header',
    labelText: 'Properties',
    divider: true,
    showLabel: function(element, node) {
      return formHelper.getFormType(element) === 'form-data' && !!getSelectedFormField(element, node);
    }
  }));

  // [FormData] camunda:properties table
  group.entries.push(properties(element, bpmnFactory, {
    id: 'form-field-properties',
    modelProperties: [ 'id', 'value' ],
    labels: [ 'Id', 'Value' ],
    getParent: function(element, node) {
      return getSelectedFormField(element, node);
    },
    show: function(element, node) {
      return formHelper.getFormType(element) === 'form-data' && !!getSelectedFormField(element, node);
    }
  }));
};
},{"../../../Utils":3,"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"../../../helper/ElementHelper":16,"../../../helper/ExtensionElementsHelper":18,"../../../helper/FormHelper":19,"./implementation/ExtensionElements":73,"./implementation/Properties":82,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/find":91}],57:[function(require,module,exports){
'use strict';

var inputOutputParameter = require('./implementation/InputOutputParameter');

var assign = require('lodash/object/assign');

module.exports = function(group, element, bpmnFactory, options) {

  group.entries = group.entries.concat(inputOutputParameter(element, bpmnFactory, assign({}, options)));

};

},{"./implementation/InputOutputParameter":78,"lodash/object/assign":150}],58:[function(require,module,exports){
'use strict';

var inputOutput = require('./implementation/InputOutput');

module.exports = function(group, element, bpmnFactory) {

  var inputOutputEntry = inputOutput(element, bpmnFactory);

  group.entries = group.entries.concat(inputOutputEntry.entries);

  return {
    getSelectedParameter: inputOutputEntry.getSelectedParameter
  };

};

},{"./implementation/InputOutput":77}],59:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

var jobPriority = require('./implementation/JobPriority'),
    jobRetryTimeCycle = require('./implementation/JobRetryTimeCycle');

module.exports = function(group, element, bpmnFactory) {
  var businessObject = getBusinessObject(element);

  if (is(element, 'camunda:JobPriorized') ||
      is(element, 'bpmn:Participant') && businessObject.get('processRef')) {

    group.entries = group.entries.concat(jobPriority(element, bpmnFactory, {
      getBusinessObject: function(element) {
        var bo = getBusinessObject(element);

        if (!is(bo, 'bpmn:Participant')) {
          return bo;
        }

        return bo.get('processRef');
      }
    }));
  }

  if (is(element, 'camunda:AsyncCapable')) {
    group.entries = group.entries.concat(jobRetryTimeCycle(element, bpmnFactory, {
      getBusinessObject: getBusinessObject
    }));
  }

};

},{"./implementation/JobPriority":79,"./implementation/JobRetryTimeCycle":80,"bpmn-js/lib/util/ModelUtil":168}],60:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    is = require('bpmn-js/lib/util/ModelUtil').is;

var multiInstanceLoopCharacteristics = require('./implementation/MultiInstanceLoopCharacteristics');

var jobRetryTimeCycle = require('./implementation/JobRetryTimeCycle'),
    asyncContinuation = require('./implementation/AsyncContinuation');


function getLoopCharacteristics(element) {
  var bo = getBusinessObject(element);
  return bo.loopCharacteristics;
}


function ensureMultiInstanceSupported(element) {
  var loopCharacteristics = getLoopCharacteristics(element);
  return !!loopCharacteristics && is(loopCharacteristics, 'camunda:Collectable');
}

module.exports = function(group, element, bpmnFactory) {

  if (!ensureMultiInstanceSupported(element)) {
    return;
  }

  // multi instance properties
  group.entries = group.entries.concat(multiInstanceLoopCharacteristics(element, bpmnFactory));

  // async continuation ///////////////////////////////////////////////////////
  group.entries = group.entries.concat(asyncContinuation(element, bpmnFactory, {
    getBusinessObject: getLoopCharacteristics,
    idPrefix: 'multiInstance-',
    labelPrefix: 'Multi Instance '
  }));


  // retry time cycle //////////////////////////////////////////////////////////
  group.entries = group.entries.concat(jobRetryTimeCycle(element, bpmnFactory, {
    getBusinessObject: getLoopCharacteristics,
    idPrefix: 'multiInstance-',
    labelPrefix: 'Multi Instance '
  }));
};

},{"./implementation/AsyncContinuation":70,"./implementation/JobRetryTimeCycle":80,"./implementation/MultiInstanceLoopCharacteristics":81,"bpmn-js/lib/util/ModelUtil":168}],61:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    properties = require('./implementation/Properties'),
    elementHelper = require('../../../helper/ElementHelper'),
    cmdHelper = require('../../../helper/CmdHelper');

module.exports = function(group, element, bpmnFactory) {

  group.entries.push(properties(element, bpmnFactory, {
    id: 'properties',
    modelProperties: [ 'name', 'value' ],
    labels: [ 'Name', 'Value' ],

    getParent: function(element, node) {
      var bo = getBusinessObject(element);
      return bo.extensionElements;
    },

    createParent: function(element) {
      var bo = getBusinessObject(element);
      var parent = elementHelper.createElement('bpmn:ExtensionElements', { values: [] }, bo, bpmnFactory);
      var cmd = cmdHelper.updateProperties(element, { extensionElements: parent });
      return {
        cmd: cmd,
        parent: parent
      };
    }
  }));
};
},{"../../../helper/CmdHelper":15,"../../../helper/ElementHelper":16,"./implementation/Properties":82,"bpmn-js/lib/util/ModelUtil":168}],62:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    is = require('bpmn-js/lib/util/ModelUtil').is,
    entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper'),
    script = require('./implementation/Script')('scriptFormat', 'script', false);


module.exports = function(group, element, bpmnFactory) {
  var bo;

  if (is(element, 'bpmn:ScriptTask')) {
    bo = getBusinessObject(element);
  }

  if (!bo) {
    return;
  }

  group.entries.push({
    id: 'script-implementation',
    description: 'Implementation for a Script.',
    label: 'Script',
    html: script.template,

    get: function (element) {
      return script.get(element, bo);
    },

    set: function(element, values, containerElement) {
      var properties = script.set(element, values, containerElement);

      return cmdHelper.updateProperties(element, properties);
    },

    validate: function(element, values) {
      return script.validate(element, values);
    },

    script : script,

    cssClasses: ['pp-textfield']

  });

  group.entries.push(entryFactory.textField({
    id : 'scriptResultVariable',
    description : 'Result Variable of a Service Task Script',
    label : 'Result Variable',
    modelProperty : 'scriptResultVariable',

    get: function(element, propertyName) {
      var boResultVariable = bo.get('camunda:resultVariable');

      return { scriptResultVariable : boResultVariable };
    },

    set: function(element, values, containerElement) {
      return cmdHelper.updateProperties(element, {
        'camunda:resultVariable': values.scriptResultVariable
      });
    }

  }));

};

},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"./implementation/Script":84,"bpmn-js/lib/util/ModelUtil":168}],63:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
  getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
  domQuery = require('min-dom/lib/query'),
  cmdHelper = require('../../../helper/CmdHelper'),
  elementHelper = require('../../../helper/ElementHelper'),

  script = require('./implementation/Script')('language', 'body', true);


module.exports = function(group, element, bpmnFactory) {
  var bo;

  if (is(element, 'bpmn:SequenceFlow')) {
    bo = getBusinessObject(element);
  }

  if (!bo) {
    return;
  }

  group.entries.push({
    id: 'condition',
    description: 'Configure the implementation of the task.',
    label: 'Condition',
    html: '<div class="pp-row">' +
              '<label for="cam-condition-type">Condition Type</label>' +
              '<div class="pp-field-wrapper">' +
                '<select id="cam-condition-type" name="conditionType" data-value>' +
                  '<option value="expression">Expression</option>' +
                  '<option value="script">Script</option>' +
                  '<option value="" selected></option>' +
                '</select>' +
              '</div>' +
            '</div>' +

            // expression
            '<div class="pp-row">' +
              '<label for="cam-condition" data-show="isExpression">Expression</label>' +
              '<div class="pp-field-wrapper" data-show="isExpression">' +
                '<input id="cam-condition" type="text" name="condition" />' +
                '<button class="clear" data-action="clear" data-show="canClear">' +
                  '<span>X</span>' +
                '</button>' +
              '</div>' +
              '<div data-show="isScript">' +
                script.template +
              '</div>' +
            '</div>',

    get: function (element, propertyName) {

      // read values from xml:
      var conditionExpression = bo.conditionExpression;

      var values = {},
        conditionType = '';

      if(conditionExpression) {
        var conditionLanguage = conditionExpression.language;
        if(typeof conditionLanguage !== 'undefined') {
          conditionType = 'script';
          values = script.get(element, conditionExpression);
        }
        else {
          conditionType = 'expression';
          values.condition = conditionExpression.get('body');
        }
      }

      values.conditionType = conditionType;

      return values;

    },

    set: function (element, values, containerElement) {
      var conditionType = values.conditionType;

      var conditionProps = {
        body: undefined
      };

      if(conditionType === 'script') {
        conditionProps = script.set(element, values, containerElement);
      }
      else {
        var condition = values.condition;
        conditionProps.body = condition;
      }

      var update = {
        "conditionExpression": undefined
      };

      if (conditionType) {
        update.conditionExpression = elementHelper.createElement
          (
            'bpmn:FormalExpression',
            conditionProps,
            bo,
            bpmnFactory
          );
      }

      return cmdHelper.updateBusinessObject(element, bo, update);
    },

    validate: function(element, values) {
      var validationResult = {};

      if(!values.condition && values.conditionType === 'expression') {
        validationResult.condition = "Must provide a value";
      }
      else if(values.conditionType === 'script') {
        validationResult = script.validate(element, values);
      }

      return validationResult;
    },

    isExpression: function(element, inputNode) {
      var conditionType = domQuery('select[name=conditionType]', inputNode);
      if(conditionType.selectedIndex >= 0) {
        return conditionType.options[conditionType.selectedIndex].value === 'expression';
      }
    },

    isScript: function(element, inputNode) {
      var conditionType = domQuery('select[name=conditionType]', inputNode);
      if(conditionType.selectedIndex >= 0) {
        return conditionType.options[conditionType.selectedIndex].value === 'script';
      }
    },

    clear: function(element, inputNode) {
      // clear text input
      domQuery('input[name=condition]', inputNode).value='';

      return true;
    },

    canClear: function(element, inputNode) {
      var input = domQuery('input[name=condition]', inputNode);

      return input.value !== '';
    },

    script : script,

    cssClasses: [ 'pp-textfield' ]
  });
};

},{"../../../helper/CmdHelper":15,"../../../helper/ElementHelper":16,"./implementation/Script":84,"bpmn-js/lib/util/ModelUtil":168,"min-dom/lib/query":161}],64:[function(require,module,exports){
'use strict';

var ImplementationTypeHelper = require('../../../helper/ImplementationTypeHelper'),
    InputOutputHelper        = require('../../../helper/InputOutputHelper');

var implementationType = require('./implementation/ImplementationType'),
    delegate           = require('./implementation/Delegate'),
    external           = require('./implementation/External'),
    callable           = require('./implementation/Callable'),
    resultVariable     = require('./implementation/ResultVariable');

var entryFactory = require('../../../factory/EntryFactory');

var domQuery   = require('min-dom/lib/query'),
    domClosest = require('min-dom/lib/closest'),
    domClasses = require('min-dom/lib/classes');

function getImplementationType(element) {
  return ImplementationTypeHelper.getImplementationType(element);
}

function getBusinessObject(element) {
  return ImplementationTypeHelper.getServiceTaskLikeBusinessObject(element);
}

function isDmnCapable(element) {
  return ImplementationTypeHelper.isDmnCapable(element);
}

function isExternalCapable(element) {
  return ImplementationTypeHelper.isExternalCapable(element);
}

function isServiceTaskLike(element) {
  return ImplementationTypeHelper.isServiceTaskLike(element);
}

module.exports = function(group, element, bpmnFactory) {

  if (!isServiceTaskLike(getBusinessObject(element))) {
    return;
  }

  var hasDmnSupport = isDmnCapable(element);
  var hasExternalSupport = isExternalCapable(getBusinessObject(element));

  // implementation type ////////////////////////////////////

  group.entries = group.entries.concat(implementationType(element, bpmnFactory, {
    getBusinessObject: getBusinessObject,
    getImplementationType: getImplementationType,
    hasDmnSupport: hasDmnSupport,
    hasExternalSupport: hasExternalSupport,
    hasServiceTaskLikeSupport: true
  }));


  // delegate (class, expression, delegateExpression) //////////

  group.entries = group.entries.concat(delegate(element, bpmnFactory, {
    getBusinessObject: getBusinessObject,
    getImplementationType: getImplementationType
  }));


  // result variable /////////////////////////////////////////

  group.entries = group.entries.concat(resultVariable(element, bpmnFactory, {
    getBusinessObject: getBusinessObject,
    getImplementationType: getImplementationType,
    hideResultVariable: function(element, node) {
      return getImplementationType(element) !== 'expression';
    }
  }));

  // external //////////////////////////////////////////////////

  if (hasExternalSupport) {
    group.entries = group.entries.concat(external(element, bpmnFactory, {
      getBusinessObject: getBusinessObject,
      getImplementationType: getImplementationType
    }));
  }


  // dmn ////////////////////////////////////////////////////////

  if (hasDmnSupport) {
    group.entries = group.entries.concat(callable(element, bpmnFactory, {
      getCallableType: getImplementationType
    }));
  }


  // connector ////////////////////////////////////////////////

  var isConnector = function(element) {
    return getImplementationType(element) === 'connector';
  };

  group.entries.push(entryFactory.link({
    id: 'configureConnectorLink',
    label: 'Configure Connector',
    getClickableElement: function(element, node) {
      var panel = domClosest(node, 'div.djs-properties-panel');
      return domQuery('a[data-tab-target="connector"]', panel);
    },
    hideLink: function(element, node) {
      var link = domQuery('a', node);
      link.innerHTML = link.textContent = '';
      domClasses(link).remove('pp-error-message');

      if (isConnector(element)) {
        var connectorId = InputOutputHelper.getConnector(element).get('connectorId');
        if (connectorId) {
          link.textContent = 'Configure Connector';
        }
        else {
          link.innerHTML = '<span class="pp-icon-warning"></span> Must configure Connector';
          domClasses(link).add('pp-error-message');
        }

        return false;
      }
      return true;
    }
  }));

};

},{"../../../factory/EntryFactory":6,"../../../helper/ImplementationTypeHelper":20,"../../../helper/InputOutputHelper":21,"./implementation/Callable":71,"./implementation/Delegate":72,"./implementation/External":74,"./implementation/ImplementationType":76,"./implementation/ResultVariable":83,"min-dom/lib/classes":157,"min-dom/lib/closest":159,"min-dom/lib/query":161}],65:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    is = require('bpmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;


module.exports = function(group, element) {

  var bo = getBusinessObject(element);

  if (!bo) {
    return;
  }

  if( is(element, 'camunda:Initiator') && !is(element.parent, 'bpmn:SubProcess') ) {
    group.entries.push(entryFactory.textField({
      id: 'initiator',
      description: 'Initiator of a process',
      label: 'Initiator',
      modelProperty: 'initiator'
    }));
  }
};
},{"../../../factory/EntryFactory":6,"bpmn-js/lib/util/ModelUtil":168}],66:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
  getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
  domQuery = require('min-dom/lib/query'),
  cmdHelper = require('../../../helper/CmdHelper'),
  elementHelper = require('../../../helper/ElementHelper'),
  forEach = require('lodash/collection/forEach'),
  domify = require('min-dom/lib/domify'),
  utils = require('../../../Utils'),

  script = require('./implementation/Script')('scriptFormat', 'value', true);


function createListenerTemplate(id) {
  return '<div class="djs-listener-area" data-scope>' +
            '<button class="clear" data-action="removeListener"><span>X</span></button>' +

            '<div class="pp-row">' +
              '<label for="cam-task-listener-event-type-'+id+'">Event Type</label>' +
                  '<div class="pp-field-wrapper">' +
                    '<select id="cam-task-listener-event-type-'+id+'" name="eventType" data-value>' +
                      '<option value="create">create</option>' +
                      '<option value="assignment">assignment</option>' +
                      '<option value="complete">complete</option>' +
                      '<option value="delete">delete</option>' +
                    '</select>' +
                  '</div>' +
            '</div>' +

            '<div class="pp-row">' +
              '<label for="cam-task-listener-type-'+id+'">Listener Type</label>' +
              '<div class="pp-field-wrapper">' +
                '<select id="cam-task-listener-type-'+id+'" name="listenerType" data-value>' +
                  '<option value="class">Java Class</option>' +
                  '<option value="expression">Expression</option>' +
                  '<option value="delegateExpression">Delegate Expression</option>' +
                  '<option value="script">Script</option>' +
                '</select>' +
              '</div>' +
            '</div>' +

            '<div class="pp-row">' +
              '<div data-show="isNotScript">' +
                '<label for="cam-task-listener-val-'+id+'">' +
                  '<span data-show="isJavaClass">Java Class</span>' +
                  '<span data-show="isExpression">Expression</span>' +
                  '<span data-show="isDelegateExpression">Delegate Expression</span>' +
                '</label>' +
                '<div class="pp-field-wrapper">' +
                  '<input id="cam-task-listener-val-'+id+'" type="text" name="listenerValue" />' +
                  '<button class="clear" data-action="clearListenerValue" data-show="canClearListenerValue">' +
                    '<span>X</span>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>'+

            '<div data-show="isScript">' +
              script.template +
            '</div>'+

          '</div>';
}

function getItem(element, bo) {
   // read values from xml:
  var boExpression = bo.get('expression'),
      boDelegate = bo.get('delegateExpression'),
      boClass = bo.get('class'),
      boEvent = bo.get('event'),
      boScript = bo.script;

  var values = {},
    listenerType = '';

  if(typeof boExpression !== 'undefined') {
    listenerType = 'expression';
    values.listenerValue = boExpression;
  }
  else if(typeof boDelegate !== 'undefined') {
    listenerType = 'delegateExpression';
    values.listenerValue = boDelegate;
  }
  else if(typeof boClass !== 'undefined') {
    listenerType = 'class';
    values.listenerValue = boClass;
  }
  else if (typeof boScript !== 'undefined') {
    listenerType = 'script';
    values = script.get(element, boScript);
  }

  values.listenerType = listenerType;
  values.eventType = boEvent;

  return values;
}

function setEmpty(update) {
  update.class = undefined;
  update.expression = undefined;
  update.delegateExpression = undefined;
  update.event = undefined;
  update.script = undefined;
}

function createTaskListener(element, values, extensionElements, taskListenerList, bpmnFactory) {
  // add task listener values to extension elements values
  forEach(values, function(value) {
    var update = {};
    setEmpty(update);
    update.event = value.eventType;

    var taskListener = elementHelper.createElement('camunda:TaskListener',
                                                     update, extensionElements, bpmnFactory);

    if (value.listenerType === 'script') {
      var scriptProps = script.set(element, value);
      taskListener.script = elementHelper.createElement('camunda:Script',
                                                     scriptProps, taskListener, bpmnFactory);
    }
    else {
      taskListener[value.listenerType] = value.listenerValue || '';
    }

    taskListenerList.push(taskListener);
  });

}

module.exports = function(group, element, bpmnFactory) {

  var bo;
  var lastIdx = 0;

  if (is(element, 'bpmn:UserTask')) {
    bo = getBusinessObject(element);
  }

  if (!bo) {
    return;
  }

  group.entries.push({
    id: 'taskListeners',
    description: 'Configure task listener.',
    label: 'Listener',
    html: '<div class="cam-add-listener">' +
              '<label for="addTaskListener">Add Task Listener </label>' +
              '<button class="add" id="addTaskListener" data-action="addListener"><span>+</span></button>' +
            '</div>' +
            '<div data-list-entry-container></div>',

    createListEntryTemplate: function(value, idx) {
      lastIdx = idx;
      return createListenerTemplate(idx);
    },

    get: function (element, propertyName) {
      var values = [];

      if (!!bo.extensionElements) {
        var extensionElementsValues = getBusinessObject(element).extensionElements.values;
        forEach(extensionElementsValues, function(extensionElement) {
          if (typeof extensionElement.$instanceOf === 'function' && is(extensionElement, 'camunda:TaskListener')) {
            values.push(getItem(element, extensionElement));
          }
        });
      }

      return values;
    },

    set: function (element, values, containerElement) {
      var cmd;

      var extensionElements = bo.extensionElements;
      var isExtensionElementsNew = false;

      if (!extensionElements) {
        isExtensionElementsNew = true;
        extensionElements = elementHelper.createElement('bpmn:ExtensionElements',
                                                        { values: [] }, bo, bpmnFactory);
      }

      if (isExtensionElementsNew) {
        var extensionValues = extensionElements.get('values');
        createTaskListener(element, values, extensionElements, extensionValues, bpmnFactory);

        cmd = cmdHelper.updateProperties(element, { extensionElements: extensionElements });

      } else {

        // remove all existing task listeners
        var objectsToRemove = [];
        forEach(extensionElements.get('values'), function(extensionElement) {
          if (is(extensionElement, 'camunda:TaskListener')) {
            objectsToRemove.push(extensionElement);
          }
        });

        // add all the listeners
        var objectsToAdd = [];
        createTaskListener(element, values, extensionElements, objectsToAdd, bpmnFactory);

        cmd = cmdHelper.addAndRemoveElementsFromList(element, extensionElements, 'values', 'extensionElements',
                                                      objectsToAdd, objectsToRemove);

      }

      return cmd;
    },

    validateListItem: function(element, values) {
      var validationResult = {};

      if(values.listenerType === 'script') {
        validationResult = script.validate(element, values);
      }
      else if(!values.listenerValue) {
        validationResult.listenerValue = "Must provide a value";
      }

      return validationResult;
    },

    addListener: function(element, inputNode) {
      var listenerContainer = domQuery('[data-list-entry-container]', inputNode);
      lastIdx++;
      var template = domify(createListenerTemplate(lastIdx));
      listenerContainer.appendChild(template);
      return true;
    },

    removeListener: function(element, entryNode, btnNode, scopeNode) {
      scopeNode.parentElement.removeChild(scopeNode);
      return true;
    },

    clearListenerValue:  function(element, entryNode, btnNode, scopeNode) {
      var input = domQuery('input[name=listenerValue]', scopeNode);
      input.value = '';
      return true;
    },

    canClearListenerValue: function(element, entryNode, btnNode, scopeNode) {
      var input = domQuery('input[name=listenerValue]', scopeNode);
      return input.value !== '';
    },

    isExpression: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type === 'expression';
    },

    isJavaClass: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type === 'class';
    },

    isDelegateExpression: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type === 'delegateExpression';
    },

    isScript: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type === 'script';
    },

    isNotScript: function(element, entryNode, btnNode, scopeNode) {
      var type = utils.selectedType('select[name=listenerType]', scopeNode);
      return type !== 'script';
    },

    script: script,

    cssClasses: [ 'pp-textfield' ]
   });

};

},{"../../../Utils":3,"../../../helper/CmdHelper":15,"../../../helper/ElementHelper":16,"./implementation/Script":84,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/forEach":92,"min-dom/lib/domify":160,"min-dom/lib/query":161}],67:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
  entryFactory = require('../../../factory/EntryFactory');


module.exports = function(group, element) {
  if(is(element, 'camunda:Assignable')) {

    // Assignee
    group.entries.push(entryFactory.textField({
      id : 'assignee',
      description : 'Assignee of the User Task',
      label : 'Assignee',
      modelProperty : 'assignee'
    }));

    // Candidate Users
    group.entries.push(entryFactory.textField({
      id : 'candidateUsers',
      description : 'A list of candidates for this User Task',
      label : 'Candidate Users',
      modelProperty : 'candidateUsers'
    }));

    // Candidate Groups
    group.entries.push(entryFactory.textField({
      id : 'candidateGroups',
      description : 'A list of candidate groups for this User Task',
      label : 'Candidate Groups',
      modelProperty : 'candidateGroups'
    }));

    // Due Date
    group.entries.push(entryFactory.textField({
      id : 'dueDate',
      description : 'The due date as an EL expression (e.g. ${someDate} or an ISO date (e.g. 2015-06-26T09:54:00)',
      label : 'Due Date',
      modelProperty : 'dueDate'
    }));

    // FollowUp Date
    group.entries.push(entryFactory.textField({
      id : 'followUpDate',
      description : 'The follow up date as an EL expression (e.g. ${someDate} or an ' +
                    'ISO date (e.g. 2015-06-26T09:54:00)',
      label : 'Follow Up Date',
      modelProperty : 'followUpDate'
    }));

    // priority
    group.entries.push(entryFactory.textField({
      id : 'priority',
      description : 'Priority of this User Task',
      label : 'Priority',
      modelProperty : 'priority'
    }));
  }
};

},{"../../../factory/EntryFactory":6,"bpmn-js/lib/util/ModelUtil":168}],68:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

var filter = require('lodash/collection/filter');

var extensionElementsHelper = require('../../../helper/ExtensionElementsHelper'),
    cmdHelper = require('../../../helper/CmdHelper'),
    elementHelper = require('../../../helper/ElementHelper');

var extensionElementsEntry = require('./implementation/ExtensionElements');

var entryFactory = require('../../../factory/EntryFactory');


var inOutTypeOptions = [
  {
    name: 'Source',
    value: 'source'
  },
  {
    name: 'Source Expression',
    value: 'sourceExpression'
  },
  {
    name: 'All',
    value: 'variables'
  }
];

/**
  * return depend on parameter 'type' camunda:in or camunda:out extension elements
  */
function getCamundaInOutMappings(element, type) {
  var bo = getBusinessObject(element);
  return extensionElementsHelper.getExtensionElements(bo, type) || [];
}

/**
  * return depend on parameter 'type' camunda:in or camunda:out extension elements
  * with source or sourceExpression attribute
  */
function getVariableMappings(element, type) {
  var camundaMappings = getCamundaInOutMappings(element, type);
  return filter(camundaMappings, function(mapping) {
    return !mapping.businessKey;
  });
}

function getInOutType(mapping) {
  var inOutType = 'source';

  if (mapping.variables === 'all') {
    inOutType = 'variables';
  }
  else if (typeof mapping.source !== 'undefined') {
    inOutType = 'source';
  }
  else if (typeof mapping.sourceExpression !== 'undefined') {
    inOutType = 'sourceExpression';
  }

  return inOutType;
}

var CAMUNDA_IN_EXTENSION_ELEMENT = 'camunda:In',
    CAMUNDA_OUT_EXTENSION_ELEMENT = 'camunda:Out';


module.exports = function(group, element, bpmnFactory) {

  if (!is(element, 'camunda:CallActivity')) {
    return;
  }

  var isSelected = function(element, node) {
    return !!getSelected(element, node);
  };

  var getSelected = function(element, node) {
    var parentNode = node.parentNode;
    var selection = inEntry.getSelected(element, parentNode);

    var parameter = getVariableMappings(element, CAMUNDA_IN_EXTENSION_ELEMENT)[selection.idx];
    if (!parameter && outEntry) {
      selection = outEntry.getSelected(element, parentNode);
      parameter = getVariableMappings(element, CAMUNDA_OUT_EXTENSION_ELEMENT)[selection.idx];
    }
    return parameter;
  };

  var setOptionLabelValue = function(type) {
    return function(element, node, option, property, value, idx) {
      var label = idx + ' : ';

      var variableMappings = getVariableMappings(element, type);
      var mappingValue = variableMappings[idx];
      var mappingType = getInOutType(mappingValue);

      if (mappingType === 'variables') {
        label = label + 'all';
      }
      else if (mappingType === 'source') {
        label = label + (mappingValue.source || '<empty>');
      }
      else if (mappingType === 'sourceExpression') {
        label = label + (mappingValue.sourceExpression || '<empty>');
      }
      else {
        label = label + '<empty>';
      }

      option.text = label;
    };
  };

  var newElement = function(type) {
    return function(element, extensionElements, value) {
      var newElem = elementHelper.createElement(type, { source : ''}, extensionElements, bpmnFactory);
      return cmdHelper.addElementsTolist(element, extensionElements, 'values', [ newElem ]);
    };
  };

  var removeElement = function(type) {
    return function(element, extensionElements, value, idx) {
      var variablesMappings= getVariableMappings(element, type);
      var mapping = variablesMappings[idx];
      if (mapping) {
        return extensionElementsHelper.removeEntry(getBusinessObject(element), element, mapping);
      }
    };
  };

  // in mapping for source and sourceExpression ///////////////////////////////////////////////////////////////

  var inEntry = extensionElementsEntry(element, bpmnFactory, {
    id: 'variableMapping-in',
    label: 'In Mapping',
    modelProperty: 'source',
    prefix: 'In',
    idGeneration: false,
    resizable: true,

    createExtensionElement: newElement(CAMUNDA_IN_EXTENSION_ELEMENT),
    removeExtensionElement: removeElement(CAMUNDA_IN_EXTENSION_ELEMENT),

    getExtensionElements: function(element) {
      return getVariableMappings(element, CAMUNDA_IN_EXTENSION_ELEMENT);
    },

    onSelectionChange: function(element, node, event, scope) {
      outEntry && outEntry.deselect(element, node.parentNode);
    },

    setOptionLabelValue: setOptionLabelValue(CAMUNDA_IN_EXTENSION_ELEMENT)
  });
  group.entries.push(inEntry);

  // out mapping for source and sourceExpression ///////////////////////////////////////////////////////

  var outEntry = extensionElementsEntry(element, bpmnFactory, {
    id: 'variableMapping-out',
    label: 'Out Mapping',
    modelProperty: 'source',
    prefix: 'Out',
    idGeneration: false,
    resizable: true,

    createExtensionElement: newElement(CAMUNDA_OUT_EXTENSION_ELEMENT),
    removeExtensionElement: removeElement(CAMUNDA_OUT_EXTENSION_ELEMENT),

    getExtensionElements: function(element) {
      return getVariableMappings(element, CAMUNDA_OUT_EXTENSION_ELEMENT);
    },

    onSelectionChange: function(element, node, event, scope) {
      inEntry.deselect(element, node.parentNode);
    },

    setOptionLabelValue: setOptionLabelValue(CAMUNDA_OUT_EXTENSION_ELEMENT)
  });
  group.entries.push(outEntry);

  // label for selected mapping ///////////////////////////////////////////////////////

  group.entries.push(entryFactory.label({
    id: 'variableMapping-typeLabel',
    get: function (element, node) {
      var mapping = getSelected(element, node);

      var value = '';
      if (is(mapping, CAMUNDA_IN_EXTENSION_ELEMENT)) {
        value = 'In Mapping';
      }
      else if (is(mapping, CAMUNDA_OUT_EXTENSION_ELEMENT)) {
        value = 'Out Mapping';
      }

      return {
        label: value
      };
    },

    showLabel: function(element, node) {
      return isSelected(element, node);
    }
  }));


  group.entries.push(entryFactory.selectBox({
    id: 'variableMapping-inOutType',
    label: 'Type',
    selectOptions: inOutTypeOptions,
    modelProperty: 'inOutType',
    get: function(element, node) {
      var mapping = getSelected(element, node) || {};
      return {
        inOutType: getInOutType(mapping)
      };
    },
    set: function(element, values, node) {
      var inOutType = values.inOutType;

      var props = {
        'source' : undefined,
        'sourceExpression' : undefined,
        'variables' : undefined
      };

      if (inOutType === 'source') {
        props.source = '';
      }
      else if (inOutType === 'sourceExpression') {
        props.sourceExpression = '';
      }
      else if (inOutType === 'variables') {
        props.variables = 'all';
      }

      var mapping = getSelected(element, node);
      return cmdHelper.updateBusinessObject(element, mapping, props);
    },
    disabled: function(element, node) {
      return !isSelected(element, node);
    }

  }));


  group.entries.push(entryFactory.textField({
    id: 'variableMapping-source',
    dataValueLabel: 'sourceLabel',
    modelProperty: 'source',
    get: function(element, node) {
      var mapping = getSelected(element, node) || {};

      var label = '';
      var inOutType = getInOutType(mapping);
      if (inOutType === 'source') {
        label = 'Source';
      }
      else if (inOutType === 'sourceExpression') {
        label = 'Source Expression';
      }

      return {
        source: mapping[inOutType],
        sourceLabel: label
      };
    },
    set: function(element, values, node) {
      values.source = values.source || undefined;

      var mapping = getSelected(element, node);
      var inOutType = getInOutType(mapping);

      var props = {};
      props[inOutType] = values.source || '';

      return cmdHelper.updateBusinessObject(element, mapping, props);
    },
    // one of both (source or sourceExpression) must have a value to make
    // the configuration easier and more understandable
    // it is not engine conform
    validate: function(element, values, node) {
      var mapping = getSelected(element, node);

      var validation = {};
      if (mapping) {
        if (!values.source) {
          validation.source = 'Mapping must have a ' + values.sourceLabel.toLowerCase() || 'value';
        }
      }

      return validation;
    },
    disabled: function(element, node) {
      var selectedMapping = getSelected(element, node);
      return !selectedMapping || (selectedMapping && selectedMapping.variables);
    }
  }));


  group.entries.push(entryFactory.textField({
    id: 'variableMapping-target',
    label: 'Target',
    modelProperty: 'target',
    get: function(element, node) {
      return {
        target: (getSelected(element, node) || {}).target
      };
    },
    set: function(element, values, node) {
      values.target = values.target || undefined;
      var mapping = getSelected(element, node);
      return cmdHelper.updateBusinessObject(element, mapping, values);
    },
    validate: function(element, values, node) {
      var mapping = getSelected(element, node);

      var validation = {};
      if (mapping) {
        var mappingType = getInOutType(mapping);
        if (!values.target && mappingType !== 'variables') {
          validation.target = 'Mapping must have a target';
        }
      }

      return validation;
    },
    disabled: function(element, node) {
      var selectedMapping = getSelected(element, node);
      return !selectedMapping || (selectedMapping && selectedMapping.variables);
    }
  }));


  group.entries.push(entryFactory.checkbox({
    id: 'variableMapping-local',
    label: 'Local',
    modelProperty: 'local',
    get: function(element, node) {
      return {
        local: (getSelected(element, node) || {}).local
      };
    },
    set: function(element, values, node) {
      values.local = values.local || false;
      var mapping = getSelected(element, node);
      return cmdHelper.updateBusinessObject(element, mapping, values);
    },
    disabled: function(element, node) {
      return !isSelected(element, node);
    }
  }));

};

},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"../../../helper/ElementHelper":16,"../../../helper/ExtensionElementsHelper":18,"./implementation/ExtensionElements":73,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/filter":90}],69:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper'),
    is = require('bpmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

module.exports = function(group, element) {

  var bo = getBusinessObject(element);

  if (!bo) {
    return;
  }

  if (is(element, 'bpmn:Process') || is(element, 'bpmn:Participant') && bo.get('processRef')) {
    var versionTagEntry = entryFactory.textField({
      id: 'versionTag',
      description: 'version tag of the process',
      label: 'Version Tag',
      modelProperty: 'versionTag'
    });

    // in participants we have to change the default behavior of set and get
    if (is(element, 'bpmn:Participant')) {
      versionTagEntry.get = function (element) {
        var processBo = bo.get('processRef');
        
        return {
          versionTag: processBo.get('camunda:versionTag')
        };
      };

      versionTagEntry.set = function (element, values) {
        var processBo = bo.get('processRef');

        return cmdHelper.updateBusinessObject(element, processBo, {
          'camunda:versionTag': values.versionTag || undefined
        });
      };
    }

    group.entries.push(versionTagEntry);

  }
};

},{"../../../factory/EntryFactory":6,"../../../helper/CmdHelper":15,"bpmn-js/lib/util/ModelUtil":168}],70:[function(require,module,exports){
'use strict';

var assign = require('lodash/object/assign');

var entryFactory = require('../../../../factory/EntryFactory');

var asyncCapableHelper = require('../../../../helper/AsyncCapableHelper'),
    cmdHelper = require('../../../../helper/CmdHelper');

function isAsyncBefore(bo) {
  return asyncCapableHelper.isAsyncBefore(bo);
}

function isAsyncAfter(bo) {
  return asyncCapableHelper.isAsyncAfter(bo);
}

function isExclusive(bo) {
  return asyncCapableHelper.isExclusive(bo);
}

function removeFailedJobRetryTimeCycle(bo, element) {
  return asyncCapableHelper.removeFailedJobRetryTimeCycle(bo, element);
}

module.exports = function(element, bpmnFactory, options) {

  var getBusinessObject = options.getBusinessObject;

  var idPrefix = options.idPrefix || '',
      labelPrefix = options.labelPrefix || '';


  var asyncBeforeEntry = entryFactory.checkbox({
    id: idPrefix + 'asyncBefore',
    label: labelPrefix + 'Asynchronous Before',
    modelProperty: 'asyncBefore',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      return {
        asyncBefore: isAsyncBefore(bo)
      };
    },

    set: function(element, values) {
      var bo = getBusinessObject(element);
      var asyncBefore = !!values.asyncBefore;

      var props = {
        'camunda:asyncBefore': asyncBefore,
        'camunda:async': false
      };

      var commands = [];
      if (!isAsyncAfter(bo) && !asyncBefore) {
        props = assign({ 'camunda:exclusive' : true }, props);
        commands.push(removeFailedJobRetryTimeCycle(bo, element));
      }

      commands.push(cmdHelper.updateBusinessObject(element, bo, props));
      return commands;
    }
  });


  var asyncAfterEntry = entryFactory.checkbox({
    id: idPrefix + 'asyncAfter',
    label: labelPrefix + 'Asynchronous After',
    modelProperty: 'asyncAfter',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      return {
        asyncAfter: isAsyncAfter(bo)
      };
    },

    set: function(element, values) {
      var bo = getBusinessObject(element);
      var asyncAfter = !!values.asyncAfter;

      var props = {
        'camunda:asyncAfter': asyncAfter
      };

      var commands = [];
      if (!isAsyncBefore(bo) && !asyncAfter) {
        props = assign({ 'camunda:exclusive' : true }, props);
        commands.push(removeFailedJobRetryTimeCycle(bo, element));
      }

      commands.push(cmdHelper.updateBusinessObject(element, bo, props));
      return commands;
    }
  });


  var exclusiveEntry = entryFactory.checkbox({
    id: idPrefix + 'exclusive',
    label: labelPrefix + 'Exclusive',
    modelProperty: 'exclusive',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      return { exclusive: isExclusive(bo) };
    },

    set: function(element, values) {
      var bo = getBusinessObject(element);
      return cmdHelper.updateBusinessObject(element, bo, { 'camunda:exclusive': !!values.exclusive });
    },

    disabled: function(element) {
      var bo = getBusinessObject(element);
      return bo && !isAsyncAfter(bo) && !isAsyncBefore(bo);
    }
  });

  return [ asyncBeforeEntry, asyncAfterEntry, exclusiveEntry ];
};
},{"../../../../factory/EntryFactory":6,"../../../../helper/AsyncCapableHelper":14,"../../../../helper/CmdHelper":15,"lodash/object/assign":150}],71:[function(require,module,exports){
'use strict';

var cmdHelper = require('../../../../helper/CmdHelper'),
    entryFactory = require('../../../../factory/EntryFactory'),
    elementHelper = require('../../../../helper/ElementHelper'),
    extensionElementsHelper = require('../../../../helper/ExtensionElementsHelper');


var resultVariable = require('./ResultVariable');

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;
var is = require('bpmn-js/lib/util/ModelUtil').is;

var forEach = require('lodash/collection/forEach');

var attributeInfo = {
  bpmn: {
    element: 'calledElement',
    binding: 'camunda:calledElementBinding',
    version: 'camunda:calledElementVersion'
  },

  cmmn: {
    element: 'camunda:caseRef',
    binding: 'camunda:caseBinding',
    version: 'camunda:caseVersion'
  },

  dmn: {
    element: 'camunda:decisionRef',
    binding: 'camunda:decisionRefBinding',
    version: 'camunda:decisionRefVersion'
  }
};

var bindingOptions = [
  {
    name: 'latest',
    value: 'latest'
  },
  {
    name: 'deployment',
    value: 'deployment'
  },
  {
    name: 'version',
    value: 'version'
  }
];

var mapDecisionResultOptions = [
  {
    name: 'singleEntry',
    value: 'singleEntry'
  },
  {
    name:'singleResult',
    value:'singleResult'
  },
  {
    name:'collectEntries',
    value:'collectEntries'
  },
  {
    name:'resultList',
    value:'resultList'
  }
];

function getCamundaInWithBusinessKey(element) {
  var camundaIn = [],
      bo = getBusinessObject(element);

  var camundaInParams = extensionElementsHelper.getExtensionElements(bo, 'camunda:In');
  if (camundaInParams) {
    forEach(camundaInParams, function(param) {
      if (param.businessKey) {
        camundaIn.push(param);
      }
    });
  }
  return camundaIn;
}

function setBusinessKey(element, bpmnFactory) {
  var bo = getBusinessObject(element);
  var commands = [];

  var extensionElements = bo.extensionElements;
  if (!extensionElements) {
    extensionElements = elementHelper.createElement('bpmn:ExtensionElements', { values: [] }, bo, bpmnFactory);
    commands.push(cmdHelper.updateProperties(element, { extensionElements: extensionElements }));
  }

  var camundaIn = elementHelper.createElement(
    'camunda:In',
    { 'businessKey': '#{execution.processBusinessKey}' },
    extensionElements,
    bpmnFactory
  );

  commands.push(cmdHelper.addAndRemoveElementsFromList(
    element,
    extensionElements,
    'values',
    'extensionElements',
    [ camundaIn ],[]
  ));

  return commands;
}

function deleteBusinessKey(element) {
  var camundaInExtensions = getCamundaInWithBusinessKey(element);
  var commands = [];
  forEach(camundaInExtensions, function(elem) {
    commands.push(extensionElementsHelper.removeEntry(getBusinessObject(element), element, elem));
  });
  return commands;
}

function isSupportedCallableType(type) {
  return [ 'bpmn', 'cmmn', 'dmn' ].indexOf(type) !== -1;
}

module.exports = function (element, bpmnFactory, options) {

  var getCallableType = options.getCallableType;

  var entries = [];

  function getAttribute(element, prop) {
    var type = getCallableType(element);
    return (attributeInfo[type] || {})[prop];
  }

  function getCallActivityBindingValue(element) {
    var type = getCallableType(element);
    var bo = getBusinessObject(element);
    var attr = (attributeInfo[type] || {}).binding;
    return bo.get(attr);
  }

  entries.push(entryFactory.textField({
    id: 'callable-element-ref',
    dataValueLabel: 'callableElementLabel',
    modelProperty: 'callableElementRef',

    get: function(element, node) {
      var callableElementRef;

      var attr = getAttribute(element, 'element');
      if (attr) {
        var bo = getBusinessObject(element);
        callableElementRef = bo.get(attr);
      }

      var label = '';
      var type = getCallableType(element);
      if (type === 'bpmn') {
        label = 'Called Element';
      }
      else if (type === 'cmmn') {
        label = 'Case Ref';
      }
      else if (type === 'dmn') {
        label = 'Decision Ref';
      }

      return {
        callableElementRef: callableElementRef,
        callableElementLabel: label
      };
    },

    set: function(element, values, node) {
      var newCallableElementRef = values.callableElementRef;
      var attr = getAttribute(element, 'element');

      var props = {};
      props[attr] = newCallableElementRef || '';

      return cmdHelper.updateProperties(element, props);
    },

    validate: function(element, values, node) {
      var elementRef = values.callableElementRef;
      var type = getCallableType(element);
      return isSupportedCallableType(type) && !elementRef ? { callableElementRef: 'Value must provide a value.' } : {};
    },

    disabled: function(element, node) {
      return !isSupportedCallableType(getCallableType(element));
    }

  }));


  entries.push(entryFactory.selectBox({
    id: 'callable-binding',
    label: 'Binding',
    selectOptions: bindingOptions,
    modelProperty: 'callableBinding',

    get: function(element, node) {
      var callableBinding;

      var attr = getAttribute(element, 'binding');
      if (attr) {
        var bo = getBusinessObject(element);
        callableBinding = bo.get(attr) || 'latest';
      }

      return {
        callableBinding: callableBinding,
      };
    },

    set: function(element, values, node) {
      var binding = values.callableBinding;
      var attr = getAttribute(element, 'binding'),
          attrVer = getAttribute(element, 'version');

      var props = {};
      props[attr] = binding;
      // set version value always on undefined to delete the existing value
      props[attrVer] = undefined;

      return cmdHelper.updateProperties(element, props);
    },

    disabled: function(element, node) {
      return !isSupportedCallableType(getCallableType(element));
    }

  }));


  entries.push(entryFactory.textField({
    id: 'callable-version',
    label: 'Version',
    modelProperty: 'callableVersion',

    get: function(element, node) {
      var callableVersion;

      var attr = getAttribute(element, 'version');
      if (attr) {
        var bo = getBusinessObject(element);
        callableVersion = bo.get(attr);
      }

      return {
        callableVersion: callableVersion,
      };
    },

    set: function(element, values, node) {
      var version = values.callableVersion;
      var attr = getAttribute(element, 'version');

      var props = {};
      props[attr] = version || undefined;

      return cmdHelper.updateProperties(element, props);
    },

    validate: function(element, values, node) {
      var version = values.callableVersion;

      var type = getCallableType(element);
      return isSupportedCallableType(type) && (getCallActivityBindingValue(element) === 'version') && !version ?
             { callableVersion: 'Value must provide a value.' } : {};
    },

    disabled: function(element, node) {
      var type = getCallableType(element);
      return !isSupportedCallableType(type) || getCallActivityBindingValue(element) !== 'version';
    }

  }));


  if (is(getBusinessObject(element), 'bpmn:CallActivity')) {
    entries.push(entryFactory.checkbox({
      id: 'callable-business-key',
      label: 'Business Key',
      modelProperty: 'callableBusinessKey',

      get: function(element, node) {
        var camundaIn = getCamundaInWithBusinessKey(element);
        return {
          callableBusinessKey: !!(camundaIn && camundaIn.length > 0)
        };
      },

      set: function(element, values, node) {
        if (values.callableBusinessKey) {
          return setBusinessKey(element, bpmnFactory);
        } else {
          return deleteBusinessKey(element);
        }
      }
    }));
  }


  entries = entries.concat(resultVariable(element, bpmnFactory, {
    id: 'dmn-resultVariable',
    getBusinessObject: getBusinessObject,
    getImplementationType: getCallableType,
    hideResultVariable: function(element, node) {
      return getCallableType(element) !== 'dmn';
    }
  }));


  entries.push(entryFactory.selectBox({
    id: 'dmn-map-decision-result',
    label: 'Map Decision Result',
    selectOptions: mapDecisionResultOptions,
    modelProperty: 'mapDecisionResult',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      return {
        mapDecisionResult: bo.get('camunda:mapDecisionResult') || 'resultList'
      };
    },

    set: function(element, values, node) {
      return cmdHelper.updateProperties(element, {
        'camunda:mapDecisionResult': values.mapDecisionResult || 'resultList'
      });
    },

    disabled: function(element, node) {
      var bo = getBusinessObject(element);
      var resultVariable = bo.get('camunda:resultVariable');
      return !(getCallableType(element) === 'dmn' && typeof resultVariable !== 'undefined');
    }

  }));

  return entries;
};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"../../../../helper/ExtensionElementsHelper":18,"./ResultVariable":83,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/forEach":92}],72:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory'),
    cmdHelper    = require('../../../../helper/CmdHelper');

var DELEGATE_TYPES = [
  'class',
  'expression',
  'delegateExpression'
];

var PROPERTIES = {
  class: 'camunda:class',
  expression: 'camunda:expression',
  delegateExpression: 'camunda:delegateExpression'
};

function isDelegate(type) {
  return DELEGATE_TYPES.indexOf(type) !== -1;
}

function getAttribute(type) {
  return PROPERTIES[type];
}

function getDelegationLabel(type) {
  switch(type) {
    case 'class':
        return 'Java Class';
    case 'expression':
        return 'Expression';
    case 'delegateExpression':
        return 'Delegate Expression';
    default:
        return '';
  }
}

module.exports = function(element, bpmnFactory, options) {

  var getImplementationType = options.getImplementationType,
      getBusinessObject     = options.getBusinessObject;

  var delegateEntry = entryFactory.textField({
    id: 'delegate',
    label: 'Value',
    dataValueLabel: 'delegationLabel',
    modelProperty: 'delegate',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      var type = getImplementationType(element);
      var attr = getAttribute(type);
      var label = getDelegationLabel(type);
      return {
        delegate: bo.get(attr),
        delegationLabel: label
      };
    },

    set: function(element, values, node) {
      var bo = getBusinessObject(element);
      var type = getImplementationType(element);
      var attr = getAttribute(type);
      var prop = {};
      prop[attr] = values.delegate || '';
      return cmdHelper.updateBusinessObject(element, bo, prop);
    },

    validate: function(element, values, node) {
      return isDelegate(getImplementationType(element)) && !values.delegate ? { delegate: 'Must provide a value'} : {};
    },

    disabled: function(element, node) {
      return !isDelegate(getImplementationType(element));
    }

  });

  return [ delegateEntry ];

};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15}],73:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

var domQuery = require('min-dom/lib/query'),
    domClosest = require('min-dom/lib/closest'),
    domify = require('min-dom/lib/domify'),
    forEach = require('lodash/collection/forEach');

var elementHelper = require('../../../../helper/ElementHelper'),
    cmdHelper = require('../../../../helper/CmdHelper'),
    utils = require('../../../../Utils');

function getSelectBox(node, id) {
  var currentTab = domClosest(node, 'div.djs-properties-tab');
  var query = 'select[name=selectedExtensionElement]' + (id ? '[id=cam-extensionElements-' + id + ']' : '');
  return domQuery(query, currentTab);
}

function getSelected(node, id) {
  var selectBox = getSelectBox(node, id);
  return {
    value: (selectBox || {}).value,
    idx: (selectBox || {}).selectedIndex
  };
}

function generateElementId(prefix) {
  prefix = prefix + '_';
  return utils.nextId(prefix);
}

var CREATE_EXTENSION_ELEMENT_ACTION = 'create-extension-element',
    REMOVE_EXTENSION_ELEMENT_ACTION = 'remove-extension-element';

module.exports = function (element, bpmnFactory, options) {

  var id     = options.id,
      prefix = options.prefix || 'elem',
      label  = options.label || id,
      idGeneration = (options.idGeneration === false) ? options.idGeneration : true;

  var modelProperty = options.modelProperty || 'id';

  var getElements = options.getExtensionElements;

  var createElement = options.createExtensionElement,
      canCreate     = typeof createElement === 'function';

  var removeElement = options.removeExtensionElement,
      canRemove     = typeof removeElement === 'function';

  var onSelectionChange = options.onSelectionChange;

  var hideElements = options.hideExtensionElements,
      canBeHidden  = typeof hideElements === 'function';

  var setOptionLabelValue = options.setOptionLabelValue;

  var defaultSize = options.size || 5,
      resizable   = options.resizable;

  var selectionChanged = function(element, node, event, scope) {
    if (typeof onSelectionChange === 'function') {
      return onSelectionChange(element, node, event, scope);
    }
  };

  var createOption = function(value) {
    return '<option value="' + value + '" data-value data-name="extensionElementValue">' + value + '</option>';
  };

  var initSelectionSize = function(selectBox, optionsLength) {
    if (resizable) {
      selectBox.size = optionsLength > defaultSize ? optionsLength : defaultSize;
    }
  };

  return {
    id: id,
    html: '<div class="pp-row pp-element-list" ' +
            (canBeHidden ? 'data-show="hideElements"' : '') + '>' +
            '<label for="cam-extensionElements-' + id + '">' + label + '</label>' +
            '<div class="pp-field-wrapper">' +
              '<select id="cam-extensionElements-' + id + '"' +
                      'name="selectedExtensionElement" ' +
                      'size="' + defaultSize + '" ' +
                      'data-list-entry-container ' +
                      'data-on-change="selectElement">' +
              '</select>' +
              (canCreate ? '<button class="add" ' +
                                   'id="cam-extensionElements-create-' + id + '" ' +
                                   'data-action="createElement">' +
                             '<span>+</span>' +
                           '</button>' : '') +
              (canRemove ? '<button class="clear" ' +
                                   'id="cam-extensionElements-remove-' + id + '" ' +
                                   'data-action="removeElement" ' +
                                   'data-disable="disableRemove">' +
                             '<span>-</span>' +
                           '</button>' : '') +
            '</div>' +
          '</div>',

    get: function(element, node) {
      var elements = getElements(element);

      var result = [];
      forEach(elements, function(elem) {
        result.push({
          extensionElementValue: elem.get(modelProperty)
        });
      });

      var selectBox = getSelectBox(node.parentNode, id);
      initSelectionSize(selectBox, result.length);

      return result;
    },

    set: function(element, values, node) {
      var action = this.__action;
      delete this.__action;

      var bo = getBusinessObject(element);
      var extensionElements = bo.get('extensionElements');

      if (action.id === CREATE_EXTENSION_ELEMENT_ACTION) {
        var commands = [];
        if (!extensionElements) {
          extensionElements = elementHelper.createElement('bpmn:ExtensionElements', { values: [] }, bo, bpmnFactory);
          commands.push(cmdHelper.updateProperties(element, { extensionElements: extensionElements }));
        }
        commands.push(createElement(element, extensionElements, action.value));
        return commands;

      }
      else if (action.id === REMOVE_EXTENSION_ELEMENT_ACTION) {
        return removeElement(element, extensionElements, action.value, action.idx);
      }

    },

    createListEntryTemplate: function(value, index, selectBox) {
      initSelectionSize(selectBox, selectBox.options.length + 1);
      return createOption(value.extensionElementValue);
    },

    deselect: function(element, node) {
      var selectBox = getSelectBox(node, id);
      selectBox.selectedIndex = -1;
    },

    getSelected: function(element, node) {
      return getSelected(node, id);
    },

    setControlValue: function(element, node, option, property, value, idx) {
      node.value = value;

      if (!setOptionLabelValue) {
        node.text = value;
      }
      else {
        setOptionLabelValue(element, node, option, property, value, idx);
      }
    },

    createElement: function(element, node) {
      // create option template
      var generatedId;
      if (idGeneration) {
        generatedId = generateElementId(prefix);
      }

      var selectBox = getSelectBox(node, id);
      var template = domify(createOption(generatedId));

      // add new empty option as last child element
      selectBox.appendChild(template);

      // select last child element
      selectBox.lastChild.selected = 'selected';
      selectionChanged(element, node);

      // update select box size
      initSelectionSize(selectBox, selectBox.options.length);

      this.__action = {
        id: CREATE_EXTENSION_ELEMENT_ACTION,
        value: generatedId
      };

      return true;
    },

    removeElement: function(element, node) {
      var selection = getSelected(node, id);

      var selectBox = getSelectBox(node, id);
      selectBox.removeChild(selectBox.options[selection.idx]);

      // update select box size
      initSelectionSize(selectBox, selectBox.options.length);

      this.__action = {
        id: REMOVE_EXTENSION_ELEMENT_ACTION,
        value: selection.value,
        idx: selection.idx
      };

      return true;
    },

    hideElements: function(element, entryNode, node, scopeNode) {
      return !hideElements(element, entryNode, node, scopeNode);
    },

    disableRemove: function(element, entryNode, node, scopeNode) {
      return (getSelected(entryNode, id) || {}).idx < 0;
    },

    selectElement: selectionChanged
  };

};

},{"../../../../Utils":3,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/forEach":92,"min-dom/lib/closest":159,"min-dom/lib/domify":160,"min-dom/lib/query":161}],74:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory'),
    cmdHelper    = require('../../../../helper/CmdHelper');

module.exports = function(element, bpmnFactory, options) {

  var getImplementationType = options.getImplementationType,
      getBusinessObject     = options.getBusinessObject;

  function isExternal(element) {
    return getImplementationType(element) === 'external';
  }

  var topicEntry = entryFactory.textField({
    id: 'externalTopic',
    label: 'Topic',
    modelProperty: 'externalTopic',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      return { externalTopic: bo.get('camunda:topic') };
    },

    set: function(element, values, node) {
      var bo = getBusinessObject(element);
      return cmdHelper.updateBusinessObject(element, bo, {
        'camunda:topic': values.externalTopic
      });
    },

    validate: function(element, values, node) {
      return isExternal(element) && !values.externalTopic ? { externalTopic: 'Must provide a value'} : {};
    },

    disabled: function(element, node) {
      return !isExternal(element);
    }

  });

  return [ topicEntry ];

};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15}],75:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory');

var cmdHelper = require('../../../../helper/CmdHelper');

module.exports = function(element, bpmnFactory, options) {

  var getBusinessObject = options.getBusinessObject;

  var externalTaskPriorityEntry = entryFactory.textField({
    id: 'externalTaskPriority',
    description: 'The attribute specifies the initial priority of an External Task when it is created.',
    label: 'Task Priority',
    modelProperty: 'taskPriority',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      return {
        taskPriority: bo.get('camunda:taskPriority')
      };
    },

    set: function(element, values) {
      var bo = getBusinessObject(element);
      return cmdHelper.updateBusinessObject(element, bo, {
        'camunda:taskPriority': values.taskPriority || undefined
      });
    }

  });

  return [ externalTaskPriorityEntry ];

};
},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15}],76:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory'),
    cmdHelper = require('../../../../helper/CmdHelper'),
    extensionElementsHelper = require('../../../../helper/ExtensionElementsHelper'),
    elementHelper = require('../../../../helper/ElementHelper');

var assign = require('lodash/object/assign');
var map = require('lodash/collection/map');

var DEFAULT_DELEGATE_PROPS = [ 'class', 'expression', 'delegateExpression' ];

var DELEGATE_PROPS = {
  'camunda:class': undefined,
  'camunda:expression': undefined,
  'camunda:delegateExpression': undefined,
  'camunda:resultVariable': undefined
};

var DMN_CAPABLE_PROPS = {
  'camunda:decisionRef': undefined,
  'camunda:decisionRefBinding': 'latest',
  'camunda:decisionRefVersion': undefined,
  'camunda:mapDecisionResult': 'resultList'
};


var EXTERNAL_CAPABLE_PROPS = {
  'camunda:type': undefined,
  'camunda:topic': undefined
};

var DEFAULT_OPTIONS = [
  { value: 'class', name: 'Java Class'},
  { value: 'expression', name: 'Expression'},
  { value: 'delegateExpression', name: 'Delegate Expression'}
];

var DMN_OPTION = [
  { value: 'dmn', name: 'DMN'}
];

var EXTERNAL_OPTION = [
  { value: 'external', name: 'External'}
];

var CONNECTOR_OPTION = [
  { value: 'connector', name: 'Connector'}
];

var SCRIPT_OPTION = [
  { value: 'script', name: 'Script'}
];

module.exports = function(element, bpmnFactory, options) {

  var getType           = options.getImplementationType,
      getBusinessObject = options.getBusinessObject;

  var hasDmnSupport             = options.hasDmnSupport,
      hasExternalSupport        = options.hasExternalSupport,
      hasServiceTaskLikeSupport = options.hasServiceTaskLikeSupport,
      hasScriptSupport          = options.hasScriptSupport;

  var entries = [];

  var selectOptions = DEFAULT_OPTIONS.concat([]);

  if (hasDmnSupport) {
    selectOptions = selectOptions.concat(DMN_OPTION);
  }

  if (hasExternalSupport) {
    selectOptions = selectOptions.concat(EXTERNAL_OPTION);
  }

  if (hasServiceTaskLikeSupport) {
    selectOptions = selectOptions.concat(CONNECTOR_OPTION);
  }

  if (hasScriptSupport) {
    selectOptions = selectOptions.concat(SCRIPT_OPTION);
  }

  selectOptions.push({ value: '' });

  entries.push(entryFactory.selectBox({
    id : 'implementation',
    description: 'Configure the implementation of the task.',
    label: 'Implementation',
    selectOptions: selectOptions,
    modelProperty: 'implType',

    get: function (element, node) {
      return {
        implType: getType(element) || ''
      };
    },

    set: function (element, values, node) {
      var bo = getBusinessObject(element);
      var oldType = getType(element);
      var newType = values.implType;

      var props = assign({}, DELEGATE_PROPS);

      if (DEFAULT_DELEGATE_PROPS.indexOf(newType) !== -1) {

        var newValue = '';
        if (DEFAULT_DELEGATE_PROPS.indexOf(oldType) !== -1) {
          newValue = bo.get('camunda:' + oldType);
        }
        props['camunda:' + newType] = newValue;
      }

      if (hasDmnSupport) {
        props = assign(props, DMN_CAPABLE_PROPS);
        if (newType === 'dmn') {
          props['camunda:decisionRef'] = '';
        }
      }

      if (hasExternalSupport) {
        props = assign(props, EXTERNAL_CAPABLE_PROPS);
        if (newType === 'external') {
          props['camunda:type'] = 'external';
          props['camunda:topic'] = '';
        }
      }

      if (hasScriptSupport) {      
        props['camunda:script'] = undefined;

        if (newType === 'script') {
          props['camunda:script'] = elementHelper.createElement('camunda:Script', {}, bo, bpmnFactory);
        }
      }

      var commands = [];
      commands.push(cmdHelper.updateBusinessObject(element, bo, props));

      if (hasServiceTaskLikeSupport) {
        var connectors = extensionElementsHelper.getExtensionElements(bo, 'camunda:Connector');
        commands.push(map(connectors, function(connector) {
          return extensionElementsHelper.removeEntry(bo, element, connector);
        }));

        if (newType === 'connector') {
          var extensionElements = bo.get('extensionElements');
          if (!extensionElements) {
            extensionElements = elementHelper.createElement('bpmn:ExtensionElements', { values: [] }, bo, bpmnFactory);
            commands.push(cmdHelper.updateBusinessObject(element, bo, { extensionElements: extensionElements }));
          }
          var connector = elementHelper.createElement('camunda:Connector', {}, extensionElements, bpmnFactory);
          commands.push(cmdHelper.addAndRemoveElementsFromList(
            element,
            extensionElements,
            'values',
            'extensionElements',
            [ connector ],
            []
          ));
        }
      }

      return commands;

    }
  }));

  return entries;

};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"../../../../helper/ExtensionElementsHelper":18,"lodash/collection/map":93,"lodash/object/assign":150}],77:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

var elementHelper = require('../../../../helper/ElementHelper'),
    extensionElementsHelper = require('../../../../helper/ExtensionElementsHelper'),
    inputOutputHelper = require('../../../../helper/InputOutputHelper'),
    cmdHelper = require('../../../../helper/CmdHelper');

var extensionElementsEntry = require('./ExtensionElements');


function getInputOutput(element, insideConnector) {
  return inputOutputHelper.getInputOutput(element, insideConnector);
}

function getConnector(element) {
  return inputOutputHelper.getConnector(element);
}

function getInputParameters(element, insideConnector) {
  return inputOutputHelper.getInputParameters(element, insideConnector);
}

function getOutputParameters(element, insideConnector) {
  return inputOutputHelper.getOutputParameters(element, insideConnector);
}

function getInputParameter(element, insideConnector, idx) {
  return inputOutputHelper.getInputParameter(element, insideConnector, idx);
}

function getOutputParameter(element, insideConnector, idx) {
  return inputOutputHelper.getOutputParameter(element, insideConnector, idx);
}


function createElement(type, parent, factory, properties) {
  return elementHelper.createElement(type, properties, parent, factory);
}

function createInputOutput(parent, bpmnFactory, properties) {
  return createElement('camunda:InputOutput', parent, bpmnFactory, properties);
}

function createParameter(type, parent, bpmnFactory, properties) {
  return createElement(type, parent, bpmnFactory, properties);
}


function ensureInputOutputSupported(element, insideConnector) {
  return inputOutputHelper.isInputOutputSupported(element, insideConnector);
}

function ensureOutparameterSupported(element, insideConnector) {
  return inputOutputHelper.areOutputParametersSupported(element, insideConnector);
}

var TYPE_LABEL = {
  'camunda:Map': 'Map',
  'camunda:List': 'List',
  'camunda:Script': 'Script'
};

module.exports = function(element, bpmnFactory, options) {

  options = options || {};

  var insideConnector = !!options.insideConnector,
      idPrefix        = options.idPrefix || '';

  var getSelected = function(element, node) {
    var selection = (inputEntry && inputEntry.getSelected(element, node)) || { idx: -1 };

    var parameter = getInputParameter(element, insideConnector, selection.idx);
    if (!parameter && outputEntry) {
      selection = outputEntry.getSelected(element, node);
      parameter = getOutputParameter(element, insideConnector, selection.idx);
    }
    return parameter;
  };

  var result = {
    getSelectedParameter: getSelected
  };

  var entries = result.entries = [];

  if (!ensureInputOutputSupported(element)) {
    return result;
  }

  var newElement = function(type, prop, factory) {

    return function(element, extensionElements, value) {
      var commands = [];

      var inputOutput = getInputOutput(element, insideConnector);
      if (!inputOutput) {
        var parent = !insideConnector ? extensionElements : getConnector(element);
        inputOutput = createInputOutput(parent, bpmnFactory, {
          inputParameters: [],
          outputParameters: []
        });

        if (!insideConnector) {
          commands.push(cmdHelper.addAndRemoveElementsFromList(
            element,
            extensionElements,
            'values',
            'extensionElements',
            [ inputOutput ],
            []
          ));
        }
        else {
          commands.push(cmdHelper.updateBusinessObject(element, parent, { inputOutput: inputOutput }));
        }
      }

      var newElem = createParameter(type, inputOutput, bpmnFactory, { name: value });
      commands.push(cmdHelper.addElementsTolist(element, inputOutput, prop, [ newElem ]));

      return commands;
    };
  };

  var removeElement = function(getter, prop, otherProp) {
    return function(element, extensionElements, value, idx) {
      var inputOutput = getInputOutput(element, insideConnector);
      var parameter = getter(element, insideConnector, idx);

      var commands = [];
      commands.push(cmdHelper.removeElementsFromList(element, inputOutput, prop, null, [ parameter ]));

      var firstLength = inputOutput.get(prop).length-1;
      var secondLength = (inputOutput.get(otherProp) || []).length;

      if (!firstLength && !secondLength) {

        if (!insideConnector) {
          commands.push(extensionElementsHelper.removeEntry(getBusinessObject(element), element, inputOutput));
        }
        else {
          var connector = getConnector(element);
          commands.push(cmdHelper.updateBusinessObject(element, connector, { inputOutput: undefined }));
        }

      }

      return commands;
    };
  };

  var setOptionLabelValue = function(getter) {
    return function(element, node, option, property, value, idx) {
      var parameter = getter(element, insideConnector, idx);

      var suffix = 'Text';

      var definition = parameter.get('definition');
      if (typeof definition !== 'undefined') {
        var type = definition.$type;
        suffix = TYPE_LABEL[type];
      }

      option.text = (value || '') + ' : ' + suffix;
    };
  };


  // input parameters ///////////////////////////////////////////////////////////////

  var inputEntry = extensionElementsEntry(element, bpmnFactory, {
    id: idPrefix + 'inputs',
    label: 'Input Parameters',
    modelProperty: 'name',
    prefix: 'Input',
    resizable: true,

    createExtensionElement: newElement('camunda:InputParameter', 'inputParameters'),
    removeExtensionElement: removeElement(getInputParameter, 'inputParameters', 'outputParameters'),

    getExtensionElements: function(element) {
      return getInputParameters(element, insideConnector);
    },

    onSelectionChange: function(element, node, event, scope) {
      outputEntry && outputEntry.deselect(element, node);
    },

    setOptionLabelValue: setOptionLabelValue(getInputParameter)

  });
  entries.push(inputEntry);


  // output parameters ///////////////////////////////////////////////////////

  if (ensureOutparameterSupported(element, insideConnector)) {
    var outputEntry = extensionElementsEntry(element, bpmnFactory, {
      id: idPrefix + 'outputs',
      label: 'Output Parameters',
      modelProperty: 'name',
      prefix: 'Output',
      resizable: true,

      createExtensionElement: newElement('camunda:OutputParameter', 'outputParameters'),
      removeExtensionElement: removeElement(getOutputParameter, 'outputParameters', 'inputParameters'),

      getExtensionElements: function(element) {
        return getOutputParameters(element, insideConnector);
      },

      onSelectionChange: function(element, node, event, scope) {
        inputEntry.deselect(element, node);
      },

      setOptionLabelValue: setOptionLabelValue(getOutputParameter)

    });
    entries.push(outputEntry);
  }

  return result;

};

},{"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"../../../../helper/ExtensionElementsHelper":18,"../../../../helper/InputOutputHelper":21,"./ExtensionElements":73,"bpmn-js/lib/util/ModelUtil":168}],78:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is;

var elementHelper = require('../../../../helper/ElementHelper'),
    inputOutputHelper = require('../../../../helper/InputOutputHelper'),
    cmdHelper = require('../../../../helper/CmdHelper'),
    utils = require('../../../../Utils');

var entryFactory = require('../../../../factory/EntryFactory'),
    script = require('./Script')('scriptFormat', 'value', true);


function createElement(type, parent, factory, properties) {
  return elementHelper.createElement(type, properties, parent, factory);
}

function isScript(elem) {
  return is(elem, 'camunda:Script');
}

function isList(elem) {
  return is(elem, 'camunda:List');
}

function isMap(elem) {
  return is(elem, 'camunda:Map');
}

function ensureInputOutputSupported(element, insideConnector) {
  return inputOutputHelper.isInputOutputSupported(element, insideConnector);
}

var typeInfo = {
  'camunda:Map': {
    value: 'map',
    label: 'Map'
  },
  'camunda:List': {
    value: 'list',
    label: 'List'
  },
  'camunda:Script': {
    value: 'script',
    label: 'Script'
  }
};

module.exports = function(element, bpmnFactory, options) {

  options = options || {};

  var insideConnector = !!options.insideConnector,
      idPrefix        = options.idPrefix || '';

  var getSelected = options.getSelectedParameter;

  if (!ensureInputOutputSupported(element, insideConnector)) {
    return [];
  }

  var entries = [];

  var isSelected = function(element, node) {
    return getSelected(element, node);
  };


  // parameter name ////////////////////////////////////////////////////////

  entries.push(entryFactory.validationAwareTextField({
    id: idPrefix + 'parameterName',
    label: 'Name',
    modelProperty: 'name',

    getProperty: function(element, node) {
      return (getSelected(element, node) || {}).name;
    },

    setProperty: function(element, values, node) {
      var param = getSelected(element, node);
      return cmdHelper.updateBusinessObject(element, param, values);
    },

    validate: function(element, values, node) {
      var bo = getSelected(element, node);

      var validation = {};
      if (bo) {
        var nameValue = values.name;

        if (nameValue) {
          if (utils.containsSpace(nameValue)) {
            validation.name = 'Name must not contain spaces';
          }
        }
        else {
          validation.name = 'Parameter must have a name';
        }
      }

      return validation;
    },

    disabled: function(element, node) {
      return !isSelected(element, node);
    }
  }));


  // parameter type //////////////////////////////////////////////////////

  var selectOptions = [
    { value: 'text', name: 'Text' },
    { value: 'script', name: 'Script' },
    { value: 'list', name: 'List' },
    { value: 'map', name: 'Map' }
  ];

  entries.push(entryFactory.selectBox({
    id : idPrefix + 'parameterType',
    label: 'Type',
    selectOptions: selectOptions,
    modelProperty: 'parameterType',

    get: function(element, node) {
      var bo = getSelected(element, node);

      var parameterType = 'text';

      if (typeof bo !== 'undefined') {
        var definition = bo.get('definition');
        if (typeof definition !== 'undefined') {
          var type = definition.$type;
          parameterType = typeInfo[type].value;
        }
      }

      return {
        parameterType: parameterType
      };
    },

    set: function(element, values, node) {
      var bo = getSelected(element, node);

      var properties = {
        value: undefined,
        definition: undefined
      };

      var createParameterTypeElem = function(type) {
        return createElement(type, bo, bpmnFactory);
      };

      var parameterType = values.parameterType;

      if (parameterType === 'script') {
        properties.definition = createParameterTypeElem('camunda:Script');
      }
      else if (parameterType === 'list') {
        properties.definition = createParameterTypeElem('camunda:List');
      }
      else if (parameterType === 'map') {
        properties.definition = createParameterTypeElem('camunda:Map');
      }

      return cmdHelper.updateBusinessObject(element, bo, properties);
    },

    show: function(element, node) {
      return isSelected(element, node);
    }

  }));


  // parameter value (type = text) ///////////////////////////////////////////////////////

  entries.push(entryFactory.textArea({
    id : idPrefix + 'parameterType-text',
    label : 'Value',
    modelProperty: 'value',
    get: function(element, node) {
      return {
        value: (getSelected(element, node) || {}).value
      };
    },

    set: function(element, values, node) {
      var param = getSelected(element, node);
      values.value = values.value || undefined;
      return cmdHelper.updateBusinessObject(element, param, values);
    },

    show: function(element, node) {
      var bo = getSelected(element, node);
      return bo && !bo.definition;
    }

  }));


  // parameter value (type = script) ///////////////////////////////////////////////////////

  entries.push({
    id: idPrefix + 'parameterType-script',
    html: '<div data-show="isScript">' +
            script.template +
          '</div>',
    get: function(element, node) {
      var bo = getSelected(element, node);
      return bo && isScript(bo.definition) ? script.get(element, bo.definition) : {};
    },

    set: function(element, values, node) {
      var bo = getSelected(element, node);
      var update = script.set(element, values);
      return cmdHelper.updateBusinessObject(element, bo.definition, update);
    },

    validate: function(element, values, node) {
      var bo = getSelected(element, node);
      return bo && isScript(bo.definition) ? script.validate(element, bo.definition) : {};
    },

    isScript: function(element, node) {
      var bo = getSelected(element, node);
      return bo && isScript(bo.definition);
    },

    script: script

  });


  // parameter value (type = list) ///////////////////////////////////////////////////////

  entries.push(entryFactory.table({
    id: idPrefix + 'parameterType-list',
    modelProperties: [ 'value' ],
    labels: [ 'Value' ],

    getElements: function(element, node) {
      var bo = getSelected(element, node);

      if (bo && isList(bo.definition)) {
        return bo.definition.items;
      }

      return [];
    },

    updateElement: function(element, values, node, idx) {
      var bo = getSelected(element, node);
      var item = bo.definition.items[idx];
      return cmdHelper.updateBusinessObject(element, item, values);
    },

    addElement: function(element, node) {
      var bo = getSelected(element, node);
      var newValue = createElement('camunda:Value', bo.definition, bpmnFactory, { value: undefined });
      return cmdHelper.addElementsTolist(element, bo.definition, 'items', [ newValue ]);
    },

    removeElement: function(element, node, idx) {
      var bo = getSelected(element, node);
      return cmdHelper.removeElementsFromList(element, bo.definition, 'items', null, [ bo.definition.items[idx] ]);
    },

    editable: function(element, node, prop, idx) {
      var bo = getSelected(element, node);
      var item = bo.definition.items[idx];
      return !isMap(item) && !isList(item) && !isScript(item);
    },

    setControlValue: function(element, node, input, prop, value, idx) {
      var bo = getSelected(element, node);
      var item = bo.definition.items[idx];

      if (!isMap(item) && !isList(item) && !isScript(item)) {
        input.value = value;
      }
      else {
        input.value = typeInfo[item.$type].label;
      }
    },

    show: function(element, node) {
      var bo = getSelected(element, node);
      return bo && bo.definition && isList(bo.definition);
    }

  }));


  // parameter value (type = map) ///////////////////////////////////////////////////////

  entries.push(entryFactory.table({
    id: idPrefix + 'parameterType-map',
    modelProperties: [ 'key', 'value' ],
    labels: [ 'Key', 'Value' ],
    addLabel: 'Add Entry',

    getElements: function(element, node) {
      var bo = getSelected(element, node);

      if (bo && isMap(bo.definition)) {
        return bo.definition.entries;
      }

      return [];
    },

    updateElement: function(element, values, node, idx) {
      var bo = getSelected(element, node);
      var entry = bo.definition.entries[idx];

      if (isMap(entry.definition) || isList(entry.definition) || isScript(entry.definition)) {
        values = {
          key: values.key
        };
      }

      return cmdHelper.updateBusinessObject(element, entry, values);
    },

    addElement: function(element, node) {
      var bo = getSelected(element, node);
      var newEntry = createElement('camunda:Entry', bo.definition, bpmnFactory, { key: undefined, value: undefined });
      return cmdHelper.addElementsTolist(element, bo.definition, 'entries', [ newEntry ]);
    },

    removeElement: function(element, node, idx) {
      var bo = getSelected(element, node);
      return cmdHelper.removeElementsFromList(element, bo.definition, 'entries', null, [ bo.definition.entries[idx] ]);
    },

    editable: function(element, node, prop, idx) {
      var bo = getSelected(element, node);
      var entry = bo.definition.entries[idx];
      return prop === 'key' || (!isMap(entry.definition) && !isList(entry.definition) && !isScript(entry.definition));
    },

    setControlValue: function(element, node, input, prop, value, idx) {
      var bo = getSelected(element, node);
      var entry = bo.definition.entries[idx];

      if (prop === 'key' || (!isMap(entry.definition) && !isList(entry.definition) && !isScript(entry.definition))) {
        input.value = value;
      }
      else {
        input.value = typeInfo[entry.definition.$type].label;
      }
    },

    show: function(element, node) {
      var bo = getSelected(element, node);
      return bo && bo.definition && isMap(bo.definition);
    }

  }));

  return entries;

};

},{"../../../../Utils":3,"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"../../../../helper/InputOutputHelper":21,"./Script":84,"bpmn-js/lib/util/ModelUtil":168}],79:[function(require,module,exports){
'use strict';

var entryFactory = require('../../../../factory/EntryFactory');

var cmdHelper = require('../../../../helper/CmdHelper');

module.exports = function(element, bpmnFactory, options) {

  var getBusinessObject = options.getBusinessObject;

  var jobPriorityEntry = entryFactory.textField({
    id: 'jobPriority',
    description: 'Priority of a job',
    label: 'Job Priority',
    modelProperty: 'jobPriority',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      return {
        jobPriority: bo.get('camunda:jobPriority')
      };
    },

    set: function(element, values) {
      var bo = getBusinessObject(element);
      return cmdHelper.updateBusinessObject(element, bo, {
        'camunda:jobPriority': values.jobPriority || undefined
      });
    }

  });

  return [ jobPriorityEntry ];

};
},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15}],80:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is;

var entryFactory = require('../../../../factory/EntryFactory');

var asyncCapableHelper = require('../../../../helper/AsyncCapableHelper');

var elementHelper = require('../../../../helper/ElementHelper'),
    eventDefinitionHelper = require('../../../../helper/EventDefinitionHelper'),
    cmdHelper = require('../../../../helper/CmdHelper');

function isAsyncBefore(bo) {
  return asyncCapableHelper.isAsyncBefore(bo);
}

function isAsyncAfter(bo) {
  return asyncCapableHelper.isAsyncAfter(bo);
}

function getFailedJobRetryTimeCycle(bo) {
  return asyncCapableHelper.getFailedJobRetryTimeCycle(bo);
}

function removeFailedJobRetryTimeCycle(bo, element) {
  return asyncCapableHelper.removeFailedJobRetryTimeCycle(bo, element);
}

function createExtensionElements(parent, bpmnFactory) {
  return elementHelper.createElement('bpmn:ExtensionElements', {values: [] }, parent, bpmnFactory);
}

function createFailedJobRetryTimeCycle(parent, bpmnFactory, cycle) {
  return elementHelper.createElement('camunda:FailedJobRetryTimeCycle', { body: cycle }, parent, bpmnFactory);
}

module.exports = function(element, bpmnFactory, options) {

  var getBusinessObject = options.getBusinessObject;

  var idPrefix    = options.idPrefix || '',
      labelPrefix = options.labelPrefix || '';

  var retryTimeCycleEntry = entryFactory.textField({
    id: idPrefix + 'retryTimeCycle',
    label: labelPrefix + 'Retry Time Cycle',
    modelProperty: 'cycle',

    get: function(element, node) {
      var retryTimeCycle = getFailedJobRetryTimeCycle(getBusinessObject(element));
      var value = retryTimeCycle && retryTimeCycle.get('body');
      return {
        cycle: value
      };
    },

    set: function(element, values, node) {
      var newCycle = values.cycle;
      var bo = getBusinessObject(element);

      if (newCycle === '' || typeof newCycle === 'undefined') {
        // remove retry time cycle element(s)
        return removeFailedJobRetryTimeCycle(bo, element);
      }

      var retryTimeCycle = getFailedJobRetryTimeCycle(bo);

      if (!retryTimeCycle) {
        // add new retry time cycle element
        var commands = [];

        var extensionElements = bo.get('extensionElements');
        if (!extensionElements) {
          extensionElements = createExtensionElements(bo, bpmnFactory);
          commands.push(cmdHelper.updateBusinessObject(element, bo, { extensionElements: extensionElements }));
        }

        retryTimeCycle = createFailedJobRetryTimeCycle(extensionElements, bpmnFactory, newCycle);
        commands.push(cmdHelper.addAndRemoveElementsFromList(
          element,
          extensionElements,
          'values',
          'extensionElements',
          [ retryTimeCycle ],
          []
        ));

        return commands;
      }

      // update existing retry time cycle element
      return cmdHelper.updateBusinessObject(element, retryTimeCycle, { body: newCycle });
    },

    disabled: function(element) {
      var bo = getBusinessObject(element);

      if (bo && (isAsyncBefore(bo) || isAsyncAfter(bo))) {
        return false;
      }

      if (is(element, 'bpmn:Event')) {
        return !eventDefinitionHelper.getTimerEventDefinition(element);
      }

      return true;
    }

  });

  return [ retryTimeCycleEntry ];

};
},{"../../../../factory/EntryFactory":6,"../../../../helper/AsyncCapableHelper":14,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"../../../../helper/EventDefinitionHelper":17,"bpmn-js/lib/util/ModelUtil":168}],81:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

var entryFactory = require('../../../../factory/EntryFactory');

var elementHelper = require('../../../../helper/ElementHelper'),
    cmdHelper = require('../../../../helper/CmdHelper');

var domClasses = require('min-dom/lib/classes');

/**
 * Get a property value of the loop characteristics.
 *
 * @param {djs.model.Base} element
 * @param {string} propertyName
 *
 * @return {any} the property value
 */
function getProperty(element, propertyName) {
  var loopCharacteristics = getLoopCharacteristics(element);
  return loopCharacteristics && loopCharacteristics.get(propertyName);
}

/**
 * Get the body of a given expression.
 *
 * @param {ModdleElement<bpmn:FormalExpression>} expression
 *
 * @return {string} the body (value) of the expression
 */
function getBody(expression) {
  return expression && expression.get('body');
}


/**
 * Get the loop characteristics of an element.
 *
 * @param {djs.model.Base} element
 *
 * @return {ModdleElement<bpmn:MultiInstanceLoopCharacteristics>} the loop characteristics
 */
function getLoopCharacteristics(element) {
  var bo = getBusinessObject(element);
  return bo.loopCharacteristics;
}

/**
 * Get the loop cardinality of the loop characteristics.
 *
 * @param {djs.model.Base} element
 *
 * @return {ModdleElement<bpmn:FormalExpression>} an expression representing the loop cardinality
 */
function getLoopCardinality(element) {
  return getProperty(element, 'loopCardinality');
}

/**
 * Get the loop cardinality value of the loop characteristics.
 *
 * @param {djs.model.Base} element
 *
 * @return {string} the loop cardinality value
 */
function getLoopCardinalityValue(element) {
  var loopCardinality = getLoopCardinality(element);
  return getBody(loopCardinality);
}

/**
 * Get the completion condition of the loop characteristics.
 *
 * @param {djs.model.Base} element
 *
 * @return {ModdleElement<bpmn:FormalExpression>} an expression representing the completion condition
 */
function getCompletionCondition(element) {
  return getProperty(element, 'completionCondition');
}

/**
 * Get the completion condition value of the loop characteristics.
 *
 * @param {djs.model.Base} element
 *
 * @return {string} the completion condition value
 */
function getCompletionConditionValue(element) {
  var completionCondition = getCompletionCondition(element);
  return getBody(completionCondition);
}

/**
 * Get the 'camunda:collection' attribute value of the loop characteristics.
 *
 * @param {djs.model.Base} element
 *
 * @return {string} the 'camunda:collection' value
 */
function getCollection(element) {
  return getProperty(element, 'camunda:collection');
}

/**
 * Get the 'camunda:elementVariable' attribute value of the loop characteristics.
 *
 * @param {djs.model.Base} element
 *
 * @return {string} the 'camunda:elementVariable' value
 */
function getElementVariable(element) {
  return getProperty(element, 'camunda:elementVariable');
}


/**
 * Creates 'bpmn:FormalExpression' element.
 *
 * @param {ModdleElement} parent
 * @param {string} body
 * @param {BpmnFactory} bpmnFactory
 *
 * @result {ModdleElement<bpmn:FormalExpression>} a formal expression
 */
function createFormalExpression(parent, body, bpmnFactory) {
  return elementHelper.createElement('bpmn:FormalExpression', { body: body }, parent, bpmnFactory);
}

/**
 * Updates a specific formal expression of the loop characteristics.
 *
 * @param {djs.model.Base} element
 * @param {string} propertyName
 * @param {string} newValue
 * @param {BpmnFactory} bpmnFactory
 */
function updateFormalExpression(element, propertyName, newValue, bpmnFactory) {
  var loopCharacteristics = getLoopCharacteristics(element);

  var expressionProps = {};

  if (!newValue) {
    // remove formal expression
    expressionProps[propertyName] = undefined;
    return cmdHelper.updateBusinessObject(element, loopCharacteristics, expressionProps);
  }

  var existingExpression = loopCharacteristics.get(propertyName);

  if (!existingExpression) {
    // add formal expression
    expressionProps[propertyName] = createFormalExpression(loopCharacteristics, newValue, bpmnFactory);
    return cmdHelper.updateBusinessObject(element, loopCharacteristics, expressionProps);
  }

  // edit existing formal expression
  return cmdHelper.updateBusinessObject(element, existingExpression, {
    body: newValue
  });
}


module.exports = function(element, bpmnFactory) {

  var entries = [];

  // error message /////////////////////////////////////////////////////////////////

  entries.push({
    id: 'multiInstance-errorMessage',
    html: '<div data-show="isValid">' +
             '<span class="pp-icon-warning"></span> ' +
             'Must provide either loop cardinality or collection' +
          '</div>',

    isValid: function(element, node, notification, scope) {
      var loopCharacteristics = getLoopCharacteristics(element);

      var isValid = true;
      if (loopCharacteristics) {
        var loopCardinality = getLoopCardinalityValue(element);
        var collection = getCollection(element);

        isValid = !loopCardinality && !collection;
      }

      domClasses(node).toggle('pp-hidden', !isValid);
      domClasses(notification).toggle('pp-error-message', isValid);

      return isValid;
    }
  });

  // loop cardinality //////////////////////////////////////////////////////////////

  entries.push(entryFactory.textField({
    id: 'multiInstance-loopCardinality',
    label: 'Loop Cardinality',
    modelProperty: 'loopCardinality',

    get: function(element, node) {
      return {
        loopCardinality: getLoopCardinalityValue(element)
      };
    },

    set: function(element, values) {
      return updateFormalExpression(element, 'loopCardinality', values.loopCardinality, bpmnFactory);
    }
  }));


  // collection //////////////////////////////////////////////////////////////////

  entries.push(entryFactory.textField({
    id: 'multiInstance-collection',
    label: 'Collection',
    modelProperty: 'collection',

    get: function(element, node) {
      return {
        collection: getCollection(element)
      };
    },

    set: function(element, values) {
      var loopCharacteristics = getLoopCharacteristics(element);
      return cmdHelper.updateBusinessObject(element, loopCharacteristics, {
        'camunda:collection': values.collection || undefined
      });
    },

    validate: function(element, values, node) {
      var collection = getCollection(element);
      var elementVariable = getElementVariable(element);

      if (!collection && elementVariable) {
        return { collection : 'Must provide a value' };
      }
    }
  }));


  // element variable ////////////////////////////////////////////////////////////

  entries.push(entryFactory.textField({
    id: 'multiInstance-elementVariable',
    label: 'Element Variable',
    modelProperty: 'elementVariable',

    get: function(element, node) {
      return {
        elementVariable: getElementVariable(element)
      };
    },

    set: function(element, values) {
      var loopCharacteristics = getLoopCharacteristics(element);
      return cmdHelper.updateBusinessObject(element, loopCharacteristics, {
        'camunda:elementVariable': values.elementVariable || undefined
      });
    }
  }));


  // Completion Condition //////////////////////////////////////////////////////

  entries.push(entryFactory.textField({
    id: 'multiInstance-completionCondition',
    description: '',
    label: 'Completion Condition',
    modelProperty: 'completionCondition',

    get: function(element) {
      return {
        completionCondition: getCompletionConditionValue(element)
      };
    },

    set: function(element, values) {
      return updateFormalExpression(element, 'completionCondition', values.completionCondition, bpmnFactory);
    }
  }));

  return entries;

};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"bpmn-js/lib/util/ModelUtil":168,"min-dom/lib/classes":157}],82:[function(require,module,exports){
'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;
var is = require('bpmn-js/lib/util/ModelUtil').is;

var factory = require('../../../../factory/EntryFactory');

var elementHelper = require('../../../../helper/ElementHelper'),
    extensionElementsHelper = require('../../../../helper/ExtensionElementsHelper'),
    cmdHelper = require('../../../../helper/CmdHelper'),
    utils = require('../../../../Utils');

var assign = require('lodash/object/assign'),
    forEach = require('lodash/collection/forEach'),
    find = require('lodash/collection/find');

function generatePropertyId() {
  return utils.nextId('Property_');
}

/**
 * Get all camunda:property objects for a specific business object
 *
 * @param  {ModdleElement} parent
 *
 * @return {Array<ModdleElement>} a list of camunda:property objects
 */
function getPropertyValues(parent) {
  var properties = parent && getPropertiesElement(parent);
  if (properties && properties.values) {
    return properties.values;
  }
  return [];
}

/**
 * Get all camunda:Properties object for a specific business object
 *
 * @param  {ModdleElement} parent
 *
 * @return {ModdleElement} a camunda:Properties object
 */
function getPropertiesElement(element) {
  if (!isExtensionElements(element)) {
    return element.properties;
  }
  else {
    return getPropertiesElementInsideExtensionElements(element);
  }
}

/**
 * Get first camunda:Properties object for a specific bpmn:ExtensionElements
 * business object.
 *
 * @param {ModdleElement} extensionElements
 *
 * @return {ModdleElement} a camunda:Properties object
 */
function getPropertiesElementInsideExtensionElements(extensionElements) {
  return find(extensionElements.values, function(elem) {
    return is(elem, 'camunda:Properties');
  });
}

/**
 * Returns true, if the given business object is a bpmn:ExtensionElements.
 *
 * @param {ModdleElement} element
 *
 * @return {boolean} a boolean value
 */
function isExtensionElements(element) {
  return is(element, 'bpmn:ExtensionElements');
}

/**
 * Create a camunda:property entry using tableEntryFactory
 *
 * @param  {djs.model.Base} element
 * @param  {BpmnFactory} bpmnFactory
 * @param  {Object} options
 * @param  {string} options.id
 * @param  {Array<string>} options.modelProperties
 * @param  {Array<string>} options.labels
 * @param  {function} options.getParent Gets the parent business object
 * @param  {function} options.show Indicate when the entry will be shown, should return boolean
 */
module.exports = function(element, bpmnFactory, options) {

  var getParent = options.getParent;

  var modelProperties = options.modelProperties,
      createParent    = options.createParent;

  assign(options, {
    addLabel: 'Add Property',
    getElements: function(element, node) {
      var parent = getParent(element, node);
      return getPropertyValues(parent);
    },
    addElement: function(element, node) {
      var commands = [],
          parent = getParent(element, node);

      if (!parent && typeof createParent === 'function') {
        var result = createParent(element);
        parent = result.parent;
        commands.push(result.cmd);
      }

      var properties = getPropertiesElement(parent);
      if (!properties) {
        properties = elementHelper.createElement('camunda:Properties', {}, parent, bpmnFactory);

        if (!isExtensionElements(parent)) {
          commands.push(cmdHelper.updateBusinessObject(element, parent, { 'properties': properties }));
        }
        else {
          commands.push(cmdHelper.addAndRemoveElementsFromList(
            element,
            parent,
            'values',
            'extensionElements',
            [ properties ],
            []
          ));
        }
      }

      var propertyProps = {};
      forEach(modelProperties, function(prop) {
        propertyProps[prop] = undefined;
      });

      // create id if necessary
      if (modelProperties.indexOf('id') >= 0) {
        propertyProps.id = generatePropertyId();
      }

      var property = elementHelper.createElement('camunda:Property', propertyProps, properties, bpmnFactory);
      commands.push(cmdHelper.addElementsTolist(element, properties, 'values', [ property ]));

      return commands;
    },
    updateElement: function(element, value, node, idx) {
      var parent = getParent(element, node),
          property = getPropertyValues(parent)[idx];

      forEach(modelProperties, function(prop) {
        value[prop] = value[prop] || undefined;
      });

      return cmdHelper.updateBusinessObject(element, property, value);
    },
    validate: function(element, value, node, idx) {
      // validate id if necessary
      if (modelProperties.indexOf('id') >= 0) {

        var parent = getParent(element, node),
            properties = getPropertyValues(parent),
            property = properties[idx];

        if (property) {
          // check if id is valid
          var validationError = utils.isIdValid(property, value.id);

          if (validationError) {
            return { id: validationError };
          }
        }
      }
    },
    removeElement: function(element, node, idx) {
      var commands = [],
          parent = getParent(element, node),
          properties = getPropertiesElement(parent),
          propertyValues = getPropertyValues(parent),
          currentProperty = propertyValues[idx];

      commands.push(cmdHelper.removeElementsFromList(element, properties, 'values', null, [ currentProperty ]));

      if (propertyValues.length === 1) {
        // remove camunda:properties if the last existing property has been removed
        if (!isExtensionElements(parent)) {
          commands.push(cmdHelper.updateBusinessObject(element, parent, { properties: undefined }));
        }
        else {
          var bo = getBusinessObject(element);
          forEach(parent.values, function(value) {
            if (is(value, 'camunda:Properties')) {
              commands.push(extensionElementsHelper.removeEntry(bo, element, value));
            }
          });
        }
      }

      return commands;
    }
  });

  return factory.table(options);
};

},{"../../../../Utils":3,"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"../../../../helper/ElementHelper":16,"../../../../helper/ExtensionElementsHelper":18,"bpmn-js/lib/util/ModelUtil":168,"lodash/collection/find":91,"lodash/collection/forEach":92,"lodash/object/assign":150}],83:[function(require,module,exports){
'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is;

var assign = require('lodash/object/assign');

var entryFactory = require('../../../../factory/EntryFactory'),
    cmdHelper    = require('../../../../helper/CmdHelper');

module.exports = function(element, bpmnFactory, options) {

  var getBusinessObject     = options.getBusinessObject,
      hideResultVariable    = options.hideResultVariable,
      id                    = options.id || 'resultVariable';


  var resultVariableEntry = entryFactory.textField({
    id: id,
    label: 'Result Variable',
    modelProperty: 'resultVariable',

    get: function(element, node) {
      var bo = getBusinessObject(element);
      return { resultVariable: bo.get('camunda:resultVariable') };
    },

    set: function(element, values, node) {
      var bo = getBusinessObject(element);

      var resultVariable = values.resultVariable || undefined;

      var props = {
        'camunda:resultVariable': resultVariable
      };

      if (is(bo, 'camunda:DmnCapable') && !resultVariable) {
        props = assign({ 'camunda:mapDecisionResult': 'resultList' }, props);
      }

      return cmdHelper.updateBusinessObject(element, bo, props);
    },

    disabled: function(element, node) {
      if (typeof hideResultVariable === 'function') {
        return hideResultVariable.apply(resultVariableEntry, arguments);
      }
    }

  });

  return [ resultVariableEntry ];

};

},{"../../../../factory/EntryFactory":6,"../../../../helper/CmdHelper":15,"bpmn-js/lib/util/ModelUtil":168,"lodash/object/assign":150}],84:[function(require,module,exports){
'use strict';

var domQuery = require('min-dom/lib/query'),

    utils = require('../../../../Utils');


function getScriptType(node) {
  return utils.selectedType('select[name=scriptType]', node.parentElement);
}


module.exports = function(scriptLanguagePropName, scriptValuePropName, isFormatRequired) {

return {
  template:
    '<div class="pp-row pp-textfield">' +
      '<label for="cam-script-format">Script Format</label>' +
      '<div class="pp-field-wrapper">' +
        '<input id="cam-script-format" type="text" name="scriptFormat" />' +
        '<button class="clear" data-action="script.clearScriptFormat" data-show="script.canClearScriptFormat">' +
          '<span>X</span>' +
        '</button>' +
      '</div>' +
    '</div>' +

    '<div class="pp-row">' +
      '<label for="cam-script-type">Script Type</label>' +
      '<div class="pp-field-wrapper">' +
        '<select id="cam-script-type" name="scriptType" data-value>' +
          '<option value="script" selected>Inline Script</option>' +
          '<option value="scriptResource">External Resource</option>' +
        '</select>' +
      '</div>' +
    '</div>' +

    '<div class="pp-row pp-textfield">' +
      '<label for="cam-script-resource-val" data-show="script.isScriptResource">Resource</label>' +
      '<div class="pp-field-wrapper" data-show="script.isScriptResource">' +
        '<input id="cam-script-resource-val" type="text" name="scriptResourceValue" />' +
        '<button class="clear" data-action="script.clearScriptResource" data-show="script.canClearScriptResource">' +
          '<span>X</span>' +
        '</button>' +
      '</div>' +
    '</div>' +

    '<div class="pp-row">' +
      '<label for="cam-script-val" data-show="script.isScript">Script</label>' +
      '<div class="pp-field-wrapper" data-show="script.isScript">' +
        '<textarea id="cam-script-val" type="text" name="scriptValue"></textarea>' +
      '</div>'+
    '</div>',

    get: function (element, bo) {
      var values = {};

      // read values from xml:
      var boScriptResource = bo.get('camunda:resource'),
          boScript = bo.get(scriptValuePropName),
          boScriptFormat = bo.get(scriptLanguagePropName);

      if (typeof boScriptResource !== 'undefined') {
        values.scriptResourceValue = boScriptResource;
        values.scriptType = 'scriptResource';
      }
      else {
        values.scriptValue = boScript;
        values.scriptType = 'script';
      }

      values.scriptFormat = boScriptFormat;

      return values;
    },

    set: function(element, values, containerElement) {
      var scriptFormat = values.scriptFormat,
          scriptType = values.scriptType,
          scriptResourceValue = values.scriptResourceValue,
          scriptValue = values.scriptValue;

      // init update
      var update = {
        "camunda:resource": undefined,
      };
      update[scriptValuePropName] = undefined;
      update[scriptLanguagePropName] = undefined;

      if (isFormatRequired) {
        // always set language
        update[scriptLanguagePropName] = scriptFormat || '';
      } else
        // set language only when scriptFormat has a value
        if (scriptFormat !== '') {
          update[scriptLanguagePropName] = scriptFormat;
      }

      // set either inline script or resource
      if('scriptResource' === scriptType) {
         update['camunda:resource'] = scriptResourceValue || '';
      }
      else {
         update[scriptValuePropName] = scriptValue || '';
      }

      return update;
    },

    validate: function(element, values) {
      var validationResult = {};

      if (values.scriptType === 'script' && !values.scriptValue) {
        validationResult.scriptValue = "Must provide a value";
      }

      if (values.scriptType === 'scriptResource' && !values.scriptResourceValue) {
        validationResult.scriptResourceValue = "Must provide a value";
      }

      if(isFormatRequired && (!values.scriptFormat || values.scriptFormat.length === 0)) {
        validationResult.scriptFormat = "Must provide a value";
      }

      return validationResult;
    },

    clearScriptFormat: function(element, inputNode, btnNode, scopeNode) {
      domQuery('input[name=scriptFormat]', scopeNode).value='';

      return true;
    },

    canClearScriptFormat: function(element, inputNode, btnNode, scopeNode) {
      var input = domQuery('input[name=scriptFormat]', scopeNode);

      return input.value !== '';
    },

    clearScriptResource: function(element, inputNode, btnNode, scopeNode) {
      domQuery('input[name=scriptResourceValue]', scopeNode).value='';

      return true;
    },

    canClearScriptResource: function(element, inputNode, btnNode, scopeNode) {
      var input = domQuery('input[name=scriptResourceValue]', scopeNode);

      return input.value !== '';
    },

    clearScript: function(element, inputNode, btnNode, scopeNode) {
      domQuery('textarea[name=scriptValue]', scopeNode).value='';

      return true;
    },

    canClearScript: function(element, inputNode, btnNode, scopeNode) {
      var input = domQuery('textarea[name=scriptValue]', scopeNode);

      return input.value !== '';
    },

    isScriptResource: function(element, inputNode, btnNode, scopeNode) {
      var scriptType = getScriptType(scopeNode);
      return scriptType === 'scriptResource';
    },

    isScript: function(element, inputNode,  btnNode, scopeNode) {
      var scriptType = getScriptType(scopeNode);
      return scriptType === 'script';
    }

  };

};

},{"../../../../Utils":3,"min-dom/lib/query":161}],85:[function(require,module,exports){
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
},{"hat":86}],86:[function(require,module,exports){
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

},{}],87:[function(require,module,exports){
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

},{}],88:[function(require,module,exports){
var baseFlatten = require('../internal/baseFlatten');

/**
 * Recursively flattens a nested array.
 *
 * @static
 * @memberOf _
 * @category Array
 * @param {Array} array The array to recursively flatten.
 * @returns {Array} Returns the new flattened array.
 * @example
 *
 * _.flattenDeep([1, [2, 3, [4]]]);
 * // => [1, 2, 3, 4]
 */
function flattenDeep(array) {
  var length = array ? array.length : 0;
  return length ? baseFlatten(array, true) : [];
}

module.exports = flattenDeep;

},{"../internal/baseFlatten":108}],89:[function(require,module,exports){
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

},{}],90:[function(require,module,exports){
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

},{"../internal/arrayFilter":96,"../internal/baseCallback":102,"../internal/baseFilter":105,"../lang/isArray":145}],91:[function(require,module,exports){
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

},{"../internal/baseEach":104,"../internal/createFind":126}],92:[function(require,module,exports){
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

},{"../internal/arrayEach":95,"../internal/baseEach":104,"../internal/createForEach":127}],93:[function(require,module,exports){
var arrayMap = require('../internal/arrayMap'),
    baseCallback = require('../internal/baseCallback'),
    baseMap = require('../internal/baseMap'),
    isArray = require('../lang/isArray');

/**
 * Creates an array of values by running each element in `collection` through
 * `iteratee`. The `iteratee` is bound to `thisArg` and invoked with three
 * arguments: (value, index|key, collection).
 *
 * If a property name is provided for `iteratee` the created `_.property`
 * style callback returns the property value of the given element.
 *
 * If a value is also provided for `thisArg` the created `_.matchesProperty`
 * style callback returns `true` for elements that have a matching property
 * value, else `false`.
 *
 * If an object is provided for `iteratee` the created `_.matches` style
 * callback returns `true` for elements that have the properties of the given
 * object, else `false`.
 *
 * Many lodash methods are guarded to work as iteratees for methods like
 * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
 *
 * The guarded methods are:
 * `ary`, `callback`, `chunk`, `clone`, `create`, `curry`, `curryRight`,
 * `drop`, `dropRight`, `every`, `fill`, `flatten`, `invert`, `max`, `min`,
 * `parseInt`, `slice`, `sortBy`, `take`, `takeRight`, `template`, `trim`,
 * `trimLeft`, `trimRight`, `trunc`, `random`, `range`, `sample`, `some`,
 * `sum`, `uniq`, and `words`
 *
 * @static
 * @memberOf _
 * @alias collect
 * @category Collection
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function|Object|string} [iteratee=_.identity] The function invoked
 *  per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Array} Returns the new mapped array.
 * @example
 *
 * function timesThree(n) {
 *   return n * 3;
 * }
 *
 * _.map([1, 2], timesThree);
 * // => [3, 6]
 *
 * _.map({ 'a': 1, 'b': 2 }, timesThree);
 * // => [3, 6] (iteration order is not guaranteed)
 *
 * var users = [
 *   { 'user': 'barney' },
 *   { 'user': 'fred' }
 * ];
 *
 * // using the `_.property` callback shorthand
 * _.map(users, 'user');
 * // => ['barney', 'fred']
 */
function map(collection, iteratee, thisArg) {
  var func = isArray(collection) ? arrayMap : baseMap;
  iteratee = baseCallback(iteratee, thisArg, 3);
  return func(collection, iteratee);
}

module.exports = map;

},{"../internal/arrayMap":97,"../internal/baseCallback":102,"../internal/baseMap":115,"../lang/isArray":145}],94:[function(require,module,exports){
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

},{}],95:[function(require,module,exports){
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

},{}],96:[function(require,module,exports){
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

},{}],97:[function(require,module,exports){
/**
 * A specialized version of `_.map` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

module.exports = arrayMap;

},{}],98:[function(require,module,exports){
/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

module.exports = arrayPush;

},{}],99:[function(require,module,exports){
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

},{}],100:[function(require,module,exports){
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

},{"../object/keys":151}],101:[function(require,module,exports){
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

},{"../object/keys":151,"./baseCopy":103}],102:[function(require,module,exports){
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

},{"../utility/identity":154,"../utility/property":155,"./baseMatches":116,"./baseMatchesProperty":117,"./bindCallback":122}],103:[function(require,module,exports){
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

},{}],104:[function(require,module,exports){
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

},{"./baseForOwn":110,"./createBaseEach":124}],105:[function(require,module,exports){
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

},{"./baseEach":104}],106:[function(require,module,exports){
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

},{}],107:[function(require,module,exports){
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

},{}],108:[function(require,module,exports){
var arrayPush = require('./arrayPush'),
    isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isArrayLike = require('./isArrayLike'),
    isObjectLike = require('./isObjectLike');

/**
 * The base implementation of `_.flatten` with added support for restricting
 * flattening and specifying the start index.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {boolean} [isDeep] Specify a deep flatten.
 * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, isDeep, isStrict, result) {
  result || (result = []);

  var index = -1,
      length = array.length;

  while (++index < length) {
    var value = array[index];
    if (isObjectLike(value) && isArrayLike(value) &&
        (isStrict || isArray(value) || isArguments(value))) {
      if (isDeep) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, isDeep, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

module.exports = baseFlatten;

},{"../lang/isArguments":144,"../lang/isArray":145,"./arrayPush":98,"./isArrayLike":134,"./isObjectLike":139}],109:[function(require,module,exports){
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

},{"./createBaseFor":125}],110:[function(require,module,exports){
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

},{"../object/keys":151,"./baseFor":109}],111:[function(require,module,exports){
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

},{"./toObject":142}],112:[function(require,module,exports){
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

},{"../lang/isObject":148,"./baseIsEqualDeep":113,"./isObjectLike":139}],113:[function(require,module,exports){
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

},{"../lang/isArray":145,"../lang/isTypedArray":149,"./equalArrays":128,"./equalByTag":129,"./equalObjects":130}],114:[function(require,module,exports){
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

},{"./baseIsEqual":112,"./toObject":142}],115:[function(require,module,exports){
var baseEach = require('./baseEach'),
    isArrayLike = require('./isArrayLike');

/**
 * The base implementation of `_.map` without support for callback shorthands
 * and `this` binding.
 *
 * @private
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function baseMap(collection, iteratee) {
  var index = -1,
      result = isArrayLike(collection) ? Array(collection.length) : [];

  baseEach(collection, function(value, key, collection) {
    result[++index] = iteratee(value, key, collection);
  });
  return result;
}

module.exports = baseMap;

},{"./baseEach":104,"./isArrayLike":134}],116:[function(require,module,exports){
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

},{"./baseIsMatch":114,"./getMatchData":132,"./toObject":142}],117:[function(require,module,exports){
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

},{"../array/last":89,"../lang/isArray":145,"./baseGet":111,"./baseIsEqual":112,"./baseSlice":120,"./isKey":137,"./isStrictComparable":140,"./toObject":142,"./toPath":143}],118:[function(require,module,exports){
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

},{}],119:[function(require,module,exports){
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

},{"./baseGet":111,"./toPath":143}],120:[function(require,module,exports){
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

},{}],121:[function(require,module,exports){
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

},{}],122:[function(require,module,exports){
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

},{"../utility/identity":154}],123:[function(require,module,exports){
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

},{"../function/restParam":94,"./bindCallback":122,"./isIterateeCall":136}],124:[function(require,module,exports){
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

},{"./getLength":131,"./isLength":138,"./toObject":142}],125:[function(require,module,exports){
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

},{"./toObject":142}],126:[function(require,module,exports){
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

},{"../lang/isArray":145,"./baseCallback":102,"./baseFind":106,"./baseFindIndex":107}],127:[function(require,module,exports){
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

},{"../lang/isArray":145,"./bindCallback":122}],128:[function(require,module,exports){
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

},{"./arraySome":99}],129:[function(require,module,exports){
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

},{}],130:[function(require,module,exports){
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

},{"../object/keys":151}],131:[function(require,module,exports){
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

},{"./baseProperty":118}],132:[function(require,module,exports){
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

},{"../object/pairs":153,"./isStrictComparable":140}],133:[function(require,module,exports){
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

},{"../lang/isNative":147}],134:[function(require,module,exports){
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

},{"./getLength":131,"./isLength":138}],135:[function(require,module,exports){
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

},{}],136:[function(require,module,exports){
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

},{"../lang/isObject":148,"./isArrayLike":134,"./isIndex":135}],137:[function(require,module,exports){
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

},{"../lang/isArray":145,"./toObject":142}],138:[function(require,module,exports){
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

},{}],139:[function(require,module,exports){
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

},{}],140:[function(require,module,exports){
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

},{"../lang/isObject":148}],141:[function(require,module,exports){
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

},{"../lang/isArguments":144,"../lang/isArray":145,"../object/keysIn":152,"./isIndex":135,"./isLength":138}],142:[function(require,module,exports){
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

},{"../lang/isObject":148}],143:[function(require,module,exports){
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

},{"../lang/isArray":145,"./baseToString":121}],144:[function(require,module,exports){
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

},{"../internal/isArrayLike":134,"../internal/isObjectLike":139}],145:[function(require,module,exports){
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

},{"../internal/getNative":133,"../internal/isLength":138,"../internal/isObjectLike":139}],146:[function(require,module,exports){
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

},{"./isObject":148}],147:[function(require,module,exports){
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

},{"../internal/isObjectLike":139,"./isFunction":146}],148:[function(require,module,exports){
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

},{}],149:[function(require,module,exports){
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

},{"../internal/isLength":138,"../internal/isObjectLike":139}],150:[function(require,module,exports){
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

},{"../internal/assignWith":100,"../internal/baseAssign":101,"../internal/createAssigner":123}],151:[function(require,module,exports){
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

},{"../internal/getNative":133,"../internal/isArrayLike":134,"../internal/shimKeys":141,"../lang/isObject":148}],152:[function(require,module,exports){
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

},{"../internal/isIndex":135,"../internal/isLength":138,"../lang/isArguments":144,"../lang/isArray":145,"../lang/isObject":148}],153:[function(require,module,exports){
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

},{"../internal/toObject":142,"./keys":151}],154:[function(require,module,exports){
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

},{}],155:[function(require,module,exports){
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

},{"../internal/baseProperty":118,"../internal/basePropertyDeep":119,"../internal/isKey":137}],156:[function(require,module,exports){
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
},{}],157:[function(require,module,exports){
module.exports = require('component-classes');
},{"component-classes":162}],158:[function(require,module,exports){
module.exports = function(el) {

  var c;

  while (el.childNodes.length) {
    c = el.childNodes[0];
    el.removeChild(c);
  }

  return el;
};
},{}],159:[function(require,module,exports){
module.exports = require('component-closest');
},{"component-closest":164}],160:[function(require,module,exports){
module.exports = require('domify');
},{"domify":167}],161:[function(require,module,exports){
module.exports = require('component-query');
},{"component-query":166}],162:[function(require,module,exports){
/**
 * Module dependencies.
 */

try {
  var index = require('indexof');
} catch (err) {
  var index = require('component-indexof');
}

/**
 * Whitespace regexp.
 */

var re = /\s+/;

/**
 * toString reference.
 */

var toString = Object.prototype.toString;

/**
 * Wrap `el` in a `ClassList`.
 *
 * @param {Element} el
 * @return {ClassList}
 * @api public
 */

module.exports = function(el){
  return new ClassList(el);
};

/**
 * Initialize a new ClassList for `el`.
 *
 * @param {Element} el
 * @api private
 */

function ClassList(el) {
  if (!el || !el.nodeType) {
    throw new Error('A DOM element reference is required');
  }
  this.el = el;
  this.list = el.classList;
}

/**
 * Add class `name` if not already present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.add = function(name){
  // classList
  if (this.list) {
    this.list.add(name);
    return this;
  }

  // fallback
  var arr = this.array();
  var i = index(arr, name);
  if (!~i) arr.push(name);
  this.el.className = arr.join(' ');
  return this;
};

/**
 * Remove class `name` when present, or
 * pass a regular expression to remove
 * any which match.
 *
 * @param {String|RegExp} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.remove = function(name){
  if ('[object RegExp]' == toString.call(name)) {
    return this.removeMatching(name);
  }

  // classList
  if (this.list) {
    this.list.remove(name);
    return this;
  }

  // fallback
  var arr = this.array();
  var i = index(arr, name);
  if (~i) arr.splice(i, 1);
  this.el.className = arr.join(' ');
  return this;
};

/**
 * Remove all classes matching `re`.
 *
 * @param {RegExp} re
 * @return {ClassList}
 * @api private
 */

ClassList.prototype.removeMatching = function(re){
  var arr = this.array();
  for (var i = 0; i < arr.length; i++) {
    if (re.test(arr[i])) {
      this.remove(arr[i]);
    }
  }
  return this;
};

/**
 * Toggle class `name`, can force state via `force`.
 *
 * For browsers that support classList, but do not support `force` yet,
 * the mistake will be detected and corrected.
 *
 * @param {String} name
 * @param {Boolean} force
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.toggle = function(name, force){
  // classList
  if (this.list) {
    if ("undefined" !== typeof force) {
      if (force !== this.list.toggle(name, force)) {
        this.list.toggle(name); // toggle again to correct
      }
    } else {
      this.list.toggle(name);
    }
    return this;
  }

  // fallback
  if ("undefined" !== typeof force) {
    if (!force) {
      this.remove(name);
    } else {
      this.add(name);
    }
  } else {
    if (this.has(name)) {
      this.remove(name);
    } else {
      this.add(name);
    }
  }

  return this;
};

/**
 * Return an array of classes.
 *
 * @return {Array}
 * @api public
 */

ClassList.prototype.array = function(){
  var className = this.el.getAttribute('class') || '';
  var str = className.replace(/^\s+|\s+$/g, '');
  var arr = str.split(re);
  if ('' === arr[0]) arr.shift();
  return arr;
};

/**
 * Check if class `name` is present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.has =
ClassList.prototype.contains = function(name){
  return this.list
    ? this.list.contains(name)
    : !! ~index(this.array(), name);
};

},{"component-indexof":163,"indexof":163}],163:[function(require,module,exports){
module.exports = function(arr, obj){
  if (arr.indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],164:[function(require,module,exports){
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

},{"matches-selector":165}],165:[function(require,module,exports){
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

},{"component-query":166,"query":166}],166:[function(require,module,exports){
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

},{}],167:[function(require,module,exports){

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

},{}],168:[function(require,module,exports){
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
