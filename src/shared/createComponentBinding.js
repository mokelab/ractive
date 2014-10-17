import circular from 'circular';
import isEqual from 'utils/isEqual';

var runloop;

circular.push( () => runloop = circular.runloop );

var Binding = function ( ractive, keypath, otherInstance, otherKeypath ) {
	this.root = ractive;
	this.keypath = keypath;

	this.otherInstance = otherInstance;
	this.otherKeypath = otherKeypath;

	this.lock = () => this.updating = true;
	this.unlock = () => this.updating = false;

	this.bind();

	this.value = this.root.viewmodel.get( this.keypath );
};

Binding.prototype = {
	shuffle: function ( newIndices, value ) {
		this.propagateChange( value, newIndices );
	},

	setValue: function ( value ) {
		this.propagateChange( value );
	},

	propagateChange: function ( value, newIndices ) {
		var other;

		// Only *you* can prevent infinite loops
		if ( this.updating || this.counterpart && this.counterpart.updating ) {
			this.value = value;
			return;
		}

		if ( !isEqual( value, this.value ) ) {
			this.lock();

			// TODO maybe the case that `value === this.value` - should that result
			// in an update rather than a set?

			runloop.addViewmodel( other = this.otherInstance.viewmodel );


			if ( newIndices ) {
				other.smartUpdate( this.otherKeypath, value, newIndices );
			} else {
				if( isSettable( other, this.otherKeypath ) ) {
					other.set( this.otherKeypath, value );
				}
			}

			this.value = value;

			// TODO will the counterpart update after this line, during
			// the runloop end cycle? may be a problem...
			runloop.scheduleTask( this.unlock );
		}
	},

	refineValue: function ( bindingKeypath, keypath ) {

		var value, refinedKeypath, refinedValue, other;

		// Only *you* can prevent infinite loops
		if ( this.updating || this.counterpart && this.counterpart.updating ) {
			return;
		}

		value = this.root.viewmodel.get( bindingKeypath );

		refinedKeypath = keypath.replace( bindingKeypath + '.', this.otherKeypath + '.' );
		refinedValue = this.root.viewmodel.get( keypath );

		this.lock();

		runloop.addViewmodel( other = this.otherInstance.viewmodel );

		if( isSettable( other, refinedKeypath ) ) {
			other.set( refinedKeypath, refinedValue );
		}

		runloop.scheduleTask( this.unlock );
	},

	bind: function () {
		this.root.viewmodel.register( this.keypath, this );
	},

	rebind: function ( newKeypath ) {
		this.unbind();

		this.keypath = newKeypath;
		this.counterpart.otherKeypath = newKeypath;

		this.bind();
	},

	unbind: function () {
		this.root.viewmodel.unregister( this.keypath, this );
	}
};

function isSettable ( viewmodel, keypath ) {
	var computed = viewmodel.computations[ keypath ];
	return !computed || computed.setter;
}

export default function createComponentBinding ( component, parentInstance, parentKeypath, childKeypath ) {
	var hash, childInstance, bindings, parentToChildBinding, childToParentBinding;

	hash = parentKeypath + '=' + childKeypath;
	bindings = component.bindings;

	if ( bindings[ hash ] ) {
		// TODO does this ever happen?
		return;
	}

	childInstance = component.instance;

	parentToChildBinding = new Binding( parentInstance, parentKeypath, childInstance, childKeypath );
	bindings.push( parentToChildBinding );

	if ( childInstance.twoway ) {
		childToParentBinding = new Binding( childInstance, childKeypath, parentInstance, parentKeypath );
		bindings.push( childToParentBinding );

		parentToChildBinding.counterpart = childToParentBinding;
		childToParentBinding.counterpart = parentToChildBinding;
	}

	bindings[ hash ] = parentToChildBinding;
}