const St = imports.gi.St;
const Mainloop = imports.mainloop;

const Main = imports.ui.main;

const DBus = imports.gi.Gio.DBusConnection;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const Lang = imports.lang;

const KimpanelIFace = {
    name: 'org.kde.kimpanel.inputmethod',
    signals: [
        {name: 'UpdatePreeditText', inSignature: 's'},
        {name: 'UpdateAux', inSignature: 's'},
        {name: 'UpdateSpotLocation', inSignature: 'ii'},
        {name: 'UpdateLookupTable', inSignature: 'aa'},
        {name: 'UpdatePreeditCaret', inSignature: 'i'},
        {name: 'ShowPreedit', inSignature: 'b'},
        {name: 'ShowLookupTable', inSignature: 'b'},
        {name: 'ShowAux', inSignature: 'b'},
    ]
};

let kimpanel = null;
let inputpanel = null;

Kimpanel.prototype = {
    _init: function() 
	{
		this.conn = Gio.bus_get_sync( Gio.BusType.SESSION, null );
        this.preedit = '';
        this.aux = '';
        this.x = 0;
        this.y = 0;
        this.table = [];
        this.label = [];
        this.pos = 0;
        this.showPreedit = false;
        this.showLookupTable = false;
        this.showAux = false;
    }
	
}

function Kimpanel() {
    this._init.apply(this, arguments);
}

function _parseSignal(conn, sender, object, iface, signal, param, user_data)
{
	value = param.deep_unpack();
    switch(signal)
	{
	case 'UpdatePreeditText':
		kimpanel.preedit = value[0];
		break;
	case 'UpdateAux':
		kimpanel.aux = value[0];
		break;
	case 'UpdateSpotLocation':
		kimpanel.x = value[0];
		kimpanel.y = value[1];
		break;
	case 'UpdateLookupTable':
		kimpanel.label = value[0];	
		kimpanel.table = value[1];	
		break;
	case 'UpdatePreeditCaret':
		kimpanel.pos = value[0];
		break;
	case 'ShowPreedit':
		kimpanel.showPreedit = value[0];
		break;
	case 'ShowLookupTable':
		kimpanel.showLookupTable = value[0];
		break;
	case 'ShowAux':
		kimpanel.showAux = value[0];
		break;
	}
	_updateInputPanel();
}

function _updateInputPanel() {
    text = '';
    if (kimpanel.showAux)
        text = text + kimpanel.aux;
    if (kimpanel.showPreedit)
        text = text + kimpanel.preedit;
    if (kimpanel.showLookupTable)
    {
        text = text + "\n";
        i = 0;
        len = ( kimpanel.label.length > kimpanel.table.length ) ? kimpanel.table.length : kimpanel.label.length;
        for(i = 0; i < len ; i ++)
        {
            text = text + kimpanel.label[i] + kimpanel.table[i];
        }
    }
    inputpanel.text = text;
    let monitor = Main.layoutManager.focusMonitor;
    let x = kimpanel.x;
    let y = kimpanel.y;
    if (x + inputpanel.width > monitor.width)
        x = monitor.width - inputpanel.width;
    if (y + inputpanel.height > monitor.height)
        y = y - inputpanel.height - 20;
    if (x < 0)
        x = 0;
    if (y < 0)
        y = 0;
    inputpanel.set_position(x, y);
    inputpanel.visible = kimpanel.showAux || kimpanel.showPreedit || kimpanel.showLookupTable;
}

function init() {
}

function enable()
{
    if (!kimpanel) {
        kimpanel = new Kimpanel();
		signal = kimpanel.conn.signal_subscribe(
			null,
			"org.kde.kimpanel.inputmethod",
			null,
			null,
			null,
			Gio.DBusSignalFlags.NONE,
			_parseSignal,
			null,
			null
		);
    }

    if (!inputpanel)
    {
        inputpanel = new St.Label({ style_class: 'kimpanel-label', text: '' , visible: false});
        let monitor = Main.layoutManager.primaryMonitor;
	    Main.uiGroup.add_actor(inputpanel);
    }
}

function disable()
{
    kimpanel = null;
    inputpanel = null;
}
