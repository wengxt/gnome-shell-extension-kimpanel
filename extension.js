const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;

const DBus = imports.dbus;
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
let kimicon = null;

Kimpanel.prototype = {
    _init: function() {
        DBus.session.proxifyObject(this,
                'org.fcitx.Fcitx-0',
                '/kimpanel');
                
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

function show_about() {
	global.log("In show_about");
	kim_about = new St.Label({ style_class: 'kimpanel-label', text: 'About Kimpanel' , visible: true});
	global.log(kim_about.text);
	kim_about.visible = true;
}

KimIcon.prototype = {
	__proto__: PanelMenu.SystemStatusButton.prototype,

	_init: function(){
		PanelMenu.SystemStatusButton.prototype._init.call(this, 'input-keyboard');
		
		this._menuSection = new PopupMenu.PopupMenuSection();
		this.menu.addMenuItem(this._menuSection);
		
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		
		this.menu_item_show_about = new PopupMenu.PopupMenuItem("About Kimpanel");
		this.menu_item_show_about.connect('activate', Lang.bind(this, show_about));
		this.menu.addMenuItem(this.menu_item_show_about);
	},
}

function KimIcon() {
	this._init.apply(this, arguments);
}

DBus.proxifyPrototype(Kimpanel.prototype, KimpanelIFace);

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
    let monitor = Main.layoutManager.primaryMonitor;
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
    if(!kimicon){
    	kimicon=new KimIcon();
		Main.panel.addToStatusArea('kimpanel', kimicon);
    }
    if (!kimpanel) {
        kimpanel = new Kimpanel();
        kimpanel.connect('UpdatePreeditText', function(sender, text)
                {
                    kimpanel.preedit = text;
                    _updateInputPanel();
                });
        kimpanel.connect('UpdateAux', function(sender, text)
                {
                    kimpanel.aux = text;
                    _updateInputPanel();
                });
        kimpanel.connect('UpdateSpotLocation', function(sender, x, y)
                {
                    kimpanel.x = x;
                    kimpanel.y = y;
                    _updateInputPanel();
                });
        kimpanel.connect('UpdateLookupTable', function(sender, label, table)
                {
                    kimpanel.table = table;
                    kimpanel.label = label;
                    _updateInputPanel();
                });
        kimpanel.connect('UpdatePreeditCaret', function(sender, pos)
                {
                    kimpanel.pos = pos;
                    _updateInputPanel();
                });
        kimpanel.connect('ShowPreedit', function(sender, show)
                {
                    kimpanel.showPreedit = show;
                    _updateInputPanel();
                });
        kimpanel.connect('ShowLookupTable', function(sender, show)
                {
                    kimpanel.showLookupTable = show;
                    _updateInputPanel();
                });
        kimpanel.connect('ShowAux', function(sender, show)
                {
                    kimpanel.showAux = show;
                    _updateInputPanel();
                });
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
    kimicon.destroy();
    inputpanel = null;
}
