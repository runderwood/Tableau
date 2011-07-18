tableau = {};
tableau.tab_set_id_prefix = 'tabset-';
tableau.tab = function(o) {
    this.url = o.url || null;
    this.title = o.title || null;
}
tableau.tabset = function(set_nm, tabs) {
    this.name = set_nm;
    this.tabs = tabs || [];
}
tableau.tabset.wake = function(data) {
    if(typeof data === "string") {
        data = JSON.parse(data);
    }
    var tabs = [];
    for(var i=0; i<data.tabs.length; i++)
        tabs.push(new tableau.tab(data.tabs[i]));
    var inst = new tableau.tabset(data.name, tabs);
    return inst;
}
tableau.tabset.prototype.sleep = function() {
    return JSON.stringify(this);
}
tableau.tabset.prototype.get_slug = function() {
    var slug = this.name.toLowerCase().replace(/[^a-z0-9-]+/, '-');
    return slug;
}
tableau.tabset.prototype.get_id = function() {
    return tableau.tab_set_id_prefix+this.get_slug(); 
}
tableau.save_tab_set = function(tabset) {
    chrome.extension.sendRequest({"type": "store", "key": tabset.get_id(), "val": tabset.sleep()}, function(resp) { tableau.update_tab_sets_list_display(); });
}
tableau.load_tab_set = function(tabset_id, cb) {
    chrome.extension.sendRequest({"type": "load_tab_set", "tab_set_id": tabset_id}, cb);
}
tableau.delete_tab_set = function(tabset_id, cb) {
    chrome.extension.sendRequest({"type": "delete_tab_set", "tab_set_id": tabset_id}, cb);
}
tableau.list_tab_sets = function(cb) {
    chrome.extension.sendRequest({"type": "list_tab_sets"}, cb);
}
tableau.do_load_tab_set = function(tabset) {
    for(var i=0; i<tabset.tabs.length; i++) {
        chrome.tabs.create({"url": tabset.tabs[i].url});
    }
}
tableau.do_save_tab_set = function() {
    var name_el = document.getElementById('new-tab-set-name');
    var nm = name_el.value;
    if(!nm) {
        alert('Name required.');
        return;
    }
    var _nm = nm;
    var checkboxes = document.querySelectorAll('input:checked');
    var _tabs = [];
    var _maxt = checkboxes.length;
    var cb = function(t) {
        _tabs.push(t);
        if(_tabs.length === _maxt) {
            if(_tabs.length) {
                var new_tab_set = new tableau.tabset(_nm, _tabs);
                tableau.save_tab_set(new_tab_set);
            } else {
                alert('No tabs selected.');
                return;
            }
        }
    }
    for(var i=0; i<checkboxes.length; i++) {
        _curt = i;
        var checkbox = checkboxes[i];
        if(checkbox.checked) {
            chrome.tabs.get(parseInt(checkbox.value), cb);
        }
    }
    return;
}
tableau.update_tabs_display = function() {
    chrome.tabs.getAllInWindow(null, function(tabs) {
        if(tabs.length) {
            var list_el = document.createElement('div');
            list_el.setAttribute('id', 'tab-list');
            for(var i=0; i<tabs.length; i++) {
                var tab = tabs[i];
                var li_el = document.createElement('div');
                li_el.setAttribute('class', 'tab');
                var dat_el = document.createElement('div');
                var check_el = document.createElement('input');
                check_el.setAttribute('type', 'checkbox');
                check_el.setAttribute('class', 'tab-select');
                check_el.setAttribute('value', tab.id);
                dat_el.innerHTML = tab.title;
                li_el.appendChild(check_el);
                li_el.appendChild(dat_el);
                list_el.appendChild(li_el);
            }
            document.getElementById("tab-list-container").appendChild(list_el);
            document.getElementById('tab-list-container').appendChild(document.createElement('br'));
            var label_el = document.createElement('label');
            label_el.setAttribute('for', 'new-tab-set-name');
            label_el.innerHTML = 'Save as:';
            document.getElementById('tab-list-container').appendChild(label_el);
            var name_el = document.createElement('input');
            name_el.setAttribute('type', 'text');
            name_el.setAttribute('name', 'new-tab-set-name');
            name_el.setAttribute('id', 'new-tab-set-name');
            document.getElementById('tab-list-container').appendChild(name_el);
            var save_el = document.createElement('input');
            save_el.setAttribute('type', 'button');
            save_el.setAttribute('name', 'save-tab-set');
            save_el.setAttribute('value', 'Save');
            save_el.setAttribute('onclick', 'javascript:tableau.do_save_tab_set();');
            document.getElementById('tab-list-container').appendChild(save_el);
            document.getElementById('tab-list-container').appendChild(document.createElement('br'));
        }
    });
}
tableau.update_tab_sets_list_display = function() {
    document.getElementById('tab-set-list-container').innerHTML = 'loading...';
    var _cb = function(data) {
        document.getElementById('tab-set-list-container').innerHTML = '';
        var tabsets = data.tab_sets;
        var list_el = document.createElement('div');
        for(var i=0; i<tabsets.length; i++) {
            var tabset_el = document.createElement('div');
            tabset_el.innerHTML = tabsets[i].name;
            var _ts = tableau.tabset.wake(tabsets[i]);
            var _cb = (function() {
                var __ts = _ts;
                return function() {
                    tableau.do_load_tab_set(__ts);
                }
            })();
            var del_el = document.createElement('div');
            del_el.innerHTML = '[delete]';
            var _dcb = (function() {
                var _tsid = _ts.get_id();
                return function() {
                    tableau.delete_tab_set(_tsid, function() { tableau.update_tab_sets_list_display(); });
                }
            })();
            del_el.addEventListener("click", _dcb, true);
            del_el.setAttribute("style", "margin: .2em; color: red;");
            tabset_el.addEventListener("click", _cb);
            list_el.appendChild(tabset_el);
            list_el.appendChild(del_el);
        }
        if(!i) list_el.innerHTML = '<p>You don\'t have any saved tab sets.</p>';
        var ts_list_el = document.getElementById('tab-set-list-container');
        ts_list_el.appendChild(list_el);
    }
    tableau.list_tab_sets(_cb);
}

