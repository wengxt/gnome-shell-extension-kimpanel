const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

const Main = imports.ui.main;

const DBus = imports.dbus;
const Gio = imports.gi.Gio;

const Lang = imports.lang;

let kimpanel = null;
let inputpanel = null;
let kimicon = null;

const KimpanelIFace = {
    name: 'org.kde.impanel',
    methods:[],
    signals:[
        { name: "SelectCandidate", inSignature:'i' },
        { name: "MovePreeditCaret", inSignature:'i' },
        { name: "LookupTablePageUp" },
        { name: "LookupTablePageDown" },
        { name: "TriggerProperty", inSignature:'s' },
        { name: "PanelCreated"},
        { name: "Exit" },
        { name: "ReloadConfig" },
        { name: "Configure" }
    ],
    properties:[]
};

function Kimpanel() {
    this._init.apply(this, arguments);
}

Kimpanel.prototype = {
    _init: function() 
    {
        DBus.session.proxifyObject(this, 'org.kde.impanel', '/org/kde/impanel');
        DBus.session.exportObject('/org/kde/impanel',this);
        DBus.session.acquire_name('org.kde.impanel',DBus.SINGLE_INSTANCE,null,null);
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
        this.enabled = false;
    },
    emit: function(signal)
    {
        DBus.session.emit_signal('/org/kde/impanel',
                                 'org.kde.impanel',
                                 signal, 
                                  '',[]
                                );
    
    },
    triggerProperty: function(arg)
    {
        DBus.session.emit_signal('/org/kde/impanel',
            'org.kde.impanel',
            'TriggerProperty', 
            's',[arg]
        );
    }
}



function _parseSignal(conn, sender, object, iface, signal, param, user_data)
{
    value = param.deep_unpack();
    switch(signal)
    {
    case 'RegisterProperties':
        let  properties = value[0];
        for( p in properties)
            kimicon._parseProperty(properties[p]);
        kimicon._updateProperties();
        break;
    case 'UpdateProperty':
        kimicon._parseProperty(value[0]);
        kimicon._updateProperties();
        break;
    case 'UpdateSpotLocation':
        kimpanel.x = value[0];
        kimpanel.y = value[1];
        break;
    case 'UpdatePreeditText':
        kimpanel.preedit = value[0];
        break;
    case 'UpdateAux':
        kimpanel.aux = value[0];
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
    case 'Enable':
        kimpanel.enabled = value[0];
        break;
    }
    _updateInputPanel();
}

KimIcon.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function(){
        this._properties = {
            "/Fcitx/im":{}, 
            "/Fcitx/chttrans":{},
            "/Fcitx/punc":{},
            "/Fcitx/fullwidth":{},
            "/Fcitx/remind":{}
        };
        this._propertySwitch = {};

        PanelMenu.SystemStatusButton.prototype._init.call(this, 'input-keyboard');
        
        this._setting = new PopupMenu.PopupMenuItem("Settings");
        this._setting.connect('activate', Lang.bind(this, function(){
            kimpanel.emit('Configure');
        }));
        this._reload = new PopupMenu.PopupMenuItem("Reload Configuration");
        this._reload.connect('activate', Lang.bind(this, function(){
            kimpanel.emit('ReloadConfig');
        }));
        this._menuSection = new PopupMenu.PopupMenuSection();
        this._initProperties(); 
        
        this.menu.addMenuItem(this._menuSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._reload);
        this.menu.addMenuItem(this._setting);
    },
    
    _parseProperty: function(property) {
        let p = property.split(":");
        key = p[0];
        if( key in this._properties ){
            this._properties[key] = {
                'label': p[1],
                'icon': p[2],
                'text': p[3]
            }
        }
    },
    
    
    _initProperties: function() {
        for ( key in this._properties )
        {
            if( key == '/Fcitx/im')
                continue;
            let item = new PopupMenu.PopupImageMenuItem("","");
            let _icon = new St.Icon({
                        icon_name:'fcitx',
                        icon_type: St.IconType.FULLCOLOR, 
                        style_class: 'popup-menu-icon'
                        });
            item._icon = _icon;
            item.addActor(item._icon);
            item._key = key;
            
            item.connect('activate', Lang.bind(this, function(){
                kimpanel.triggerProperty(item._key);
            }));
            
            this._propertySwitch[key] = item;
            this.menu.addMenuItem(this._propertySwitch[key]);
        }
    },

    _updateProperties: function( ) {
        for ( key in this._propertySwitch )
        {
            let property = this._properties[key];
            let item = this._propertySwitch[key]; 
            item.setIcon(property.icon);
            item.label.text = property.label;
        }
    },

    _clearActor: function() {
        if (this._iconActor != null) {
            this.actor.remove_actor(this._iconActor);
            this._iconActor.destroy();
            this._iconActor = null;
            this._iconName = null;
        }
        if (this._labelActor) {
            this.actor.remove_actor(this._labelActor);
            this._labelActor.destroy();
            this._labelActor = null;
            this._label = null;
        }
    },
    
    _setIcon: function(iconName,type) {
        this._clearActor();
        this._iconName = iconName;
        this._iconActor = new St.Icon({ icon_name: iconName,
                                        icon_type: type,
                                        style_class: 'system-status-icon' });
        this.actor.add_actor(this._iconActor);
        this.actor.queue_redraw();
    },

    _active: function(){
         this._setIcon(this._properties['/Fcitx/im'].icon,St.IconType.FULLCOLOR);   
    },

    _deactive: function(){
        this._setIcon('input-keyboard',St.IconType.SYMBOLIC);
    }
}

function KimIcon() {
    this._init.apply(this, arguments);
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
    if(kimpanel.enabled)
    {
        kimicon._active();    
    }else{
        kimicon._deactive();
    }
}

function init() {
    DBus.proxifyPrototype( Kimpanel.prototype, KimpanelIFace );
    DBus.conformExport(Kimpanel.prototype, KimpanelIFace );
}

function enable()
{
    if(!kimicon){
        kimicon=new KimIcon();
        Main.panel.addToStatusArea('kimpanel', kimicon);
    }

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
        kimpanel.emit('PanelCreated',[]);
    }

    if (!inputpanel)
    {
        inputpanel = new St.Label({ style_class: 'kimpanel-label', text: '' , visible: false});
        let monitor = Main.layoutManager.focusMonitor;
        Main.uiGroup.add_actor(inputpanel);
    }
}

function disable()
{
    kimpanel = null;
    kimicon.destroy();
    inputpanel = null;
}
// vim: set ts=4 sw=4 sts=4 expandtab
